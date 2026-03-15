import base64
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from playwright.sync_api import sync_playwright
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


def decode_jwt_payload(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding
        return json.loads(base64.urlsafe_b64decode(payload))
    except Exception:
        return


def format_expiry(exp_timestamp: float) -> str:
    exp_dt = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
    diff = exp_dt - datetime.now(tz=timezone.utc)
    secs = int(diff.total_seconds())
    if secs < 0:
        return f"[red]EXPIRED[/red]"
    days, rem = divmod(secs, 86400)
    hours, rem = divmod(rem, 3600)
    mins = rem // 60
    if days > 0:
        return f"[green]{days}d {hours}h {mins}m[/green]"
    return f"[green]{hours}h {mins}m[/green]"


def is_token_valid(exp_timestamp: float) -> bool:
    return exp_timestamp > datetime.now(tz=timezone.utc).timestamp()


def extract_credentials(cookies: list) -> dict:
    result = {"cookie": "", "csrf_token": "", "token_expiry": None, "csrf_expiry": None}
    cookie_parts = []
    for c in cookies:
        if c.get("domain", "").endswith("crowdin.com"):
            cookie_parts.append(f"{c['name']}={c['value']}")
            if c["name"] == "csrf_token":
                payload = decode_jwt_payload(c["value"])
                result["csrf_expiry"] = payload.get("exp")
                result["csrf_token"] = c["value"]
            elif c["name"] == "token":
                result["token_expiry"] = decode_jwt_payload(c["value"]).get("exp")
    result["cookie"] = "; ".join(cookie_parts)
    return result


def update_env_file(env_file: Path, creds: dict) -> None:
    updates = {
        "CROWDIN_COOKIE": f"'{creds['cookie']}'",
        "CROWDIN_CSRF_TOKEN": f"'{creds['csrf_token']}'",
    }
    if env_file.exists():
        lines = env_file.read_text(encoding="utf-8").splitlines()
        new_lines = []
        found = set()
        for line in lines:
            key = line.split("=")[0] if "=" in line else None
            if key in updates:
                new_lines.append(f"{key}={updates[key]}")
                found.add(key)
            else:
                new_lines.append(line)
        for key, val in updates.items():
            if key not in found:
                new_lines.append(f"{key}={val}")
        env_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    else:
        env_file.write_text(
            "\n".join(f"{k}={v}" for k, v in updates.items()) + "\n", encoding="utf-8"
        )


def fetch_project_languages(creds: dict) -> list:
    resp = requests.post(
        "https://crowdin.com/backend/project/hypixel/info",
        headers={
            "Cookie": creds["cookie"],
            "x-csrf-token": creds["csrf_token"],
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success") or "data" not in data:
        return []
    return data["data"].get("project", {}).get("target_languages", [])


def display_languages(languages: list) -> None:
    yes = "[green]✓[/green]"
    no = "[dim]-[/dim]"

    table = Table(title="Crowdin Target Languages", show_lines=True)
    table.add_column("Name", style="bold")
    table.add_column("ID", justify="center")
    table.add_column("Code", justify="center")
    table.add_column("Joined", justify="center")
    table.add_column("Translate", justify="center")
    table.add_column("Proofread", justify="center")
    table.add_column("Hidden Strings", justify="center")

    joined = []
    for lang in languages:
        is_joined = not lang.get("can_join", True)
        if is_joined:
            joined.append(lang)
        table.add_row(
            lang["name"],
            str(lang["id"]),
            lang.get("code", ""),
            yes if is_joined else no,
            yes if lang.get("translate_permission") else no,
            yes if lang.get("proofread_permission") else no,
            yes if lang.get("has_access_to_hidden_strings") else no,
        )

    console.print()
    console.print(table)

    if not joined:
        console.print(
            Panel(
                "You haven't joined any translation group.\n"
                "Join one at https://crowdin.com/project/hypixel before running the crawler.",
                title="[bold]Error[/bold]",
                border_style="red",
            )
        )
        return

    options = " or ".join(f"[cyan]{l['name']} ({l['id']})[/cyan]" for l in joined)
    console.print(
        Panel(
            f"In GitHub Actions, set [bold]Meta Language[/bold] to: {options}",
            title="[bold]Tip[/bold]",
            border_style="blue",
        )
    )


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    env_file = script_dir / ".env"
    user_data_dir = os.environ.get("CROWDIN_USER_DATA_DIR")
    if not user_data_dir:
        tmp = Path(os.environ.get("TEMP", str(script_dir.parent / ".tmp")))
        user_data_dir = str(tmp / "crowdin_pw_profile")
    url = os.environ.get("CROWDIN_URL", "https://crowdin.com/")

    with sync_playwright() as p:
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                channel="chrome",
                headless=False,
                args=["--disable-blink-features=AutomationControlled"],
            )
        except Exception:
            context = p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                headless=False,
                args=["--disable-blink-features=AutomationControlled"],
            )

        page = context.pages[0] if context.pages else context.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=60000)

        with console.status("[bold blue]Waiting for credentials..."):
            while True:
                try:
                    if not context.pages:
                        console.print("[yellow]Browser closed[/yellow]")
                        return
                except Exception:
                    console.print("[yellow]Browser closed[/yellow]")
                    return

                creds = extract_credentials(context.cookies())
                if creds["csrf_token"] and creds["token_expiry"]:
                    if is_token_valid(creds["token_expiry"]) and (
                        not creds["csrf_expiry"] or is_token_valid(creds["csrf_expiry"])
                    ):
                        break
                time.sleep(1)

        update_env_file(env_file, creds)

        console.print(f"\n[bold]Cookie:[/bold]")
        print(creds["cookie"])
        console.print(f"\n[bold]CSRF Token:[/bold]")
        print(creds["csrf_token"])

        info = f"Token: {format_expiry(creds['token_expiry'])}"
        if creds["csrf_expiry"]:
            info += f"  |  CSRF: {format_expiry(creds['csrf_expiry'])}"
        console.print()
        console.print(
            Panel(
                f"{info}\nSaved to [bold]{env_file}[/bold]",
                title="[bold]Credentials Updated[/bold]",
                border_style="green",
            )
        )

        context.close()

        try:
            languages = fetch_project_languages(creds)
            display_languages(languages)
        except Exception as e:
            console.print(f"\n[red]Failed to fetch project info: {e}[/red]")


if __name__ == "__main__":
    main()
