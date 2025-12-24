import os
from pathlib import Path

from playwright.sync_api import sync_playwright


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent

    output_path = os.environ.get(
        "CROWDIN_STORAGE_STATE_PATH", "crowdin_api/temp/crowdin-storage-state.json"
    )
    output_file = Path(output_path)
    if not output_file.is_absolute():
        output_file = repo_root / output_file

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
                args=[
                    "--disable-blink-features=AutomationControlled",
                ],
            )
        except Exception:
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir_path),
                headless=False,
                args=[
                    "--disable-blink-features=AutomationControlled",
                ],
            )

        page = context.pages[0] if context.pages else context.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        input("Type enter after logging in... ")

        output_file.parent.mkdir(parents=True, exist_ok=True)
        context.storage_state(path=str(output_file))
        print(f"Saved storageState: {output_file}")

        context.close()


if __name__ == "__main__":
    main()
