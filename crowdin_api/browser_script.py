import base64
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright


def decode_jwt_payload(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return {}
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except Exception:
        return {}


def format_expiry(exp_timestamp: float) -> str:
    exp_dt = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    diff = exp_dt - now

    if diff.total_seconds() < 0:
        return f"EXPIRED at {exp_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}"

    hours, remainder = divmod(int(diff.total_seconds()), 3600)
    minutes, seconds = divmod(remainder, 60)

    if hours > 24:
        days = hours // 24
        hours = hours % 24
        return f"Expires in {days}d {hours}h {minutes}m ({exp_dt.strftime('%Y-%m-%d %H:%M:%S UTC')})"
    return f"Expires in {hours}h {minutes}m {seconds}s ({exp_dt.strftime('%Y-%m-%d %H:%M:%S UTC')})"


def is_token_valid_by_exp(exp_timestamp: float) -> bool:
    now = datetime.now(tz=timezone.utc).timestamp()
    return exp_timestamp > now


def extract_credentials(cookies: list) -> dict:
    result = {
        "cookie": "",
        "csrf_token": "",
        "token_expiry": None,
        "csrf_expiry": None,
    }

    cookie_parts = []
    for c in cookies:
        if c.get("domain", "").endswith("crowdin.com"):
            cookie_parts.append(f"{c['name']}={c['value']}")

            if c["name"] == "csrf_token":
                payload = decode_jwt_payload(c["value"])
                if "exp" in payload:
                    result["csrf_expiry"] = payload["exp"]
                result["csrf_token"] = c["value"]

            if c["name"] == "token":
                payload = decode_jwt_payload(c["value"])
                if "exp" in payload:
                    result["token_expiry"] = payload["exp"]

    result["cookie"] = "; ".join(cookie_parts)
    return result


def save_credentials(creds: dict, env_file: Path) -> None:
    print("\n" + "=" * 60)
    print("CROWDIN CREDENTIALS")
    print("=" * 60)

    if creds["token_expiry"]:
        print(f"\nSession Token: {format_expiry(creds['token_expiry'])}")
    if creds["csrf_expiry"]:
        print(f"CSRF Token:    {format_expiry(creds['csrf_expiry'])}")

    print(f"\nCROWDIN_COOKIE='{creds['cookie']}'")
    print(f"\nCROWDIN_CSRF_TOKEN='{creds['csrf_token']}'")

    if env_file.exists():
        content = env_file.read_text(encoding="utf-8")
        lines = content.splitlines()
        new_lines = []
        updated_cookie = False
        updated_csrf = False

        for line in lines:
            if line.startswith("CROWDIN_COOKIE="):
                new_lines.append(f"CROWDIN_COOKIE='{creds['cookie']}'")
                updated_cookie = True
            elif line.startswith("CROWDIN_CSRF_TOKEN="):
                new_lines.append(f"CROWDIN_CSRF_TOKEN='{creds['csrf_token']}'")
                updated_csrf = True
            else:
                new_lines.append(line)

        if not updated_cookie:
            new_lines.append(f"CROWDIN_COOKIE='{creds['cookie']}'")
        if not updated_csrf:
            new_lines.append(f"CROWDIN_CSRF_TOKEN='{creds['csrf_token']}'")

        env_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        print(f"\nUpdated: {env_file}")
    else:
        env_content = f"CROWDIN_COOKIE='{creds['cookie']}'\nCROWDIN_CSRF_TOKEN='{creds['csrf_token']}'\n"
        env_file.write_text(env_content, encoding="utf-8")
        print(f"\nCreated: {env_file}")

    print("=" * 60)


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    env_file = script_dir / ".env"

    user_data_dir = os.environ.get("CROWDIN_USER_DATA_DIR")
    if user_data_dir:
        user_data_dir_path = Path(user_data_dir)
    else:
        tmp = Path(os.environ.get("TEMP", str(repo_root / ".tmp")))
        user_data_dir_path = tmp / "crowdin_pw_profile"

    url = os.environ.get("CROWDIN_URL", "https://crowdin.com/")

    with sync_playwright() as p:
        try:
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir_path),
                channel="chrome",
                headless=False,
                args=["--disable-blink-features=AutomationControlled"],
            )
        except Exception:
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir_path),
                headless=False,
                args=["--disable-blink-features=AutomationControlled"],
            )

        page = context.pages[0] if context.pages else context.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=60000)

        print("Waiting for valid credentials (polling cookies every second)...")
        while True:
            try:
                if not context.pages:
                    print("Browser closed by user.")
                    return
            except Exception:
                print("Browser closed by user.")
                return

            creds = extract_credentials(context.cookies())
            if creds["csrf_token"] and creds["token_expiry"]:
                token_ok = is_token_valid_by_exp(creds["token_expiry"])
                csrf_ok = creds["csrf_expiry"] is None or is_token_valid_by_exp(creds["csrf_expiry"])
                if token_ok and csrf_ok:
                    print("\nDetected valid credentials from cookies.")
                    break

            time.sleep(1)

        save_credentials(creds, env_file)
        context.close()


if __name__ == "__main__":
    main()
