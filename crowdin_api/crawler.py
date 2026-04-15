import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple

import requests
from dotenv import load_dotenv
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeRemainingColumn,
)
from utils.config_utils import read_config


def get_crowdin_page(
    project_id: str,
    file_id: str,
    cookie: str,
    csrf_token: str,
    target_language_id: str,
    page: int = 1,
):
    url = "https://crowdin.com/backend/phrases/phrases_with_suggestions"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Cookie": cookie,
        "Accept": "application/json, text/javascript, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "x-csrf-token": csrf_token,
    }

    payload = {
        "project_id": project_id,
        "target_language_id": target_language_id,
        "file_id": file_id,
        "page": page,
        "filter": "0",
        "custom_filter": json.dumps(
            {
                "added_from": "",
                "added_to": "",
                "updated_from": "",
                "updated_to": "",
                "changed_from": "",
                "changed_to": "",
                "verbal_expression": "",
                "verbal_expression_scope": "translations",
                "translations": "",
                "duplicates": "",
                "tm_and_mt": "",
                "pre_translation": "",
                "approvals": "",
                "comments": "",
                "screenshots": "",
                "visibility": "",
                "qa_issues": "",
                "labels": [],
                "exclude_labels": [],
                "string_type": "",
                "votes": "",
                "votes_count": None,
                "translated_by_user": "",
                "not_translated_by_user": "",
                "approved_by_user": "",
                "not_approved_by_user": "",
                "approved_by_step": 0,
                "approved_step": 0,
                "sort_method": 0,
                "sort_ascending": 1,
                "em": 0,
                "croql_expression": "",
                "ai_query": "",
            }
        ),
        "query": "",
        "request": "3",
        "search_option": "0",
        "case_sensitive": "false",
        "search_full_match": "false",
        "search_strict": "false",
        "view_in_context": "0",
        "multilingual_without_languages": "0",
    }

    response = requests.post(url, headers=headers, data=payload)

    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        raise Exception(f"HTTP error occurred: {e}\nResponse: {response.json()}")

    data = response.json()

    if data.get("error", False):
        msg_info = data.get("msg", "Unknown error")
        raise Exception(msg_info)

    if not data.get("data"):
        raise Exception("No data found.")

    return data.get("data")


def get_crowdin_filed_all_languages(
    project_id: str,
    translation_id: str,
    target_language_id: str,
    cookie: str,
    csrf_token: str,
):
    url = "https://crowdin.com/backend/suggestions/all_languages"

    headers = {
        "Cookie": cookie,
        "Content-Type": "application/x-www-form-urlencoded",
        "x-csrf-token": csrf_token,
    }

    payload = {
        "project_id": project_id,
        "translation_id": translation_id,
        "plural_id": -1,
        "target_language_id": target_language_id,
    }

    response = requests.post(url, headers=headers, data=payload)

    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        raise Exception(f"HTTP error occurred: {e}\nResponse: {response.json()}")

    data = response.json()

    if data.get("error", False):
        msg_info = data.get("msg", "Unknown error")
        raise Exception(msg_info)

    res = data.get("data", [])
    if not res.get("success", True):
        raise Exception(res.get("msg", "Unknown error"))

    merged = [*res.get("assistance", []), *res.get("other", [])]
    deduped = {}
    for item in merged:
        language_id = item.get("language_id")
        if language_id is None or language_id in deduped:
            continue
        deduped[language_id] = item

    return list(deduped.values())


def get_total_pages(project_id, file_id, cookie, csrf_token, target_language_id):
    result = get_crowdin_page(
        project_id, file_id, cookie, csrf_token, target_language_id, page=1
    )

    if result is None:
        raise Exception("No data found.")

    page = result.get("pages", 0)
    found = result.get("found", 0)

    if page <= 0 or found <= 0:
        raise Exception("Invalid page number or found number.")

    return page


def parse_meta(output):
    def extract_translation_and_suggestion(item):
        translation = item["translation"]
        return {
            "id": translation["id"],
            "theme": translation["key"],
            "metadata": translation["metadata"],
            "context": translation["context"].replace("&gt;", ">"),
        }

    return list(
        map(
            extract_translation_and_suggestion,
            output,
        ),
    )


def parse_meta_translations(language_id, output):
    def extract_translation_and_suggestion(item):
        translation = item["translation"]
        suggestion = (
            item["suggestions"][0]
            if item["suggestions"] and len(item["suggestions"]) > 0
            else {}
        )
        validation = suggestion.get("validations", {}).get("2", {})

        return translation["id"], {
            "id": suggestion["id"],
            "text": suggestion["text"],
            "language_id": language_id,
            "is_approved": validation.get("approved", False),
            "approved_by": validation.get("approved_by", None),
            "approved_at": validation.get("approved_date_iso", None),
        }

    return {
        key: value
        for key, value in map(
            extract_translation_and_suggestion,
            output,
        )
    }


def parse_all_languages(_id, theme, output, meta_translation):
    def extract_all_languages(item):
        approved = item.get("validations", {}).get("2", {})

        return {
            "id": item.get("id"),
            "text": item.get("text", None),
            "language_id": item.get("language_id"),
            "is_approved": approved.get("approved", False),
            "approved_by": approved.get("approved_by", None),
            "approved_at": approved.get("approved_date_iso", None),
        }

    res = list(
        map(
            extract_all_languages,
            output,
        ),
    )

    return {
        "id": _id,
        "theme": theme,
        "translations": [meta_translation, *res],
    }


def fetch_crowdin_translations(
    project_id: str,
    file_id: str,
    cookie: str,
    csrf_token: str,
    target_language_id: str,
    progress: Progress = None,
) -> Tuple[List[Dict], Dict[str, str]]:
    total_pages = get_total_pages(
        project_id, file_id, cookie, csrf_token, target_language_id
    )

    parsed_items = []
    meta_translations = {}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        TimeRemainingColumn(),
    ) as progress_bar:
        task = progress_bar.add_task("[cyan]Fetching Metadata", total=total_pages)

        def fetch_page(page):
            return get_crowdin_page(
                project_id,
                file_id,
                cookie,
                csrf_token,
                target_language_id,
                page=page,
            )

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(fetch_page, page) for page in range(1, total_pages + 1)
            ]
            for future in as_completed(futures):
                result = future.result()
                phrases = result.get("phrases", [])
                parsed_items.extend(parse_meta(phrases))
                meta_translations.update(
                    parse_meta_translations(target_language_id, phrases)
                )
                progress_bar.update(task, advance=1)

    return parsed_items, meta_translations


def fetch_crowdin_all_languages(
    project_id: str,
    meta_language_id: str,
    cookie: str,
    csrf_token: str,
    meta: List[Dict],
    meta_translations: Dict[str, str],
    target_languages: List[Dict],
) -> List[Dict]:
    parsed_items = []
    language_order = {
        str(language["id"]): index for index, language in enumerate(target_languages)
    }

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        TimeRemainingColumn(),
    ) as progress_bar:
        task = progress_bar.add_task("[cyan]Fetching All Languages", total=len(meta))

        def fetch_item(item, meta_translation):
            result = get_crowdin_filed_all_languages(
                project_id,
                item["id"],
                meta_language_id,
                cookie,
                csrf_token,
            )

            parsed = parse_all_languages(
                item["id"],
                item["theme"],
                result,
                meta_translation,
            )

            parsed["translations"] = sorted(
                parsed["translations"],
                key=lambda translation: (
                    language_order.get(
                        str(translation["language_id"]),
                        len(language_order),
                    ),
                    str(translation["language_id"]),
                ),
            )

            return parsed

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [
                executor.submit(fetch_item, item, meta_translations[item["id"]].copy())
                for item in meta
            ]
            for future in as_completed(futures):
                parsed_items.append(future.result())
                progress_bar.update(task, advance=1)

    if not os.path.exists("result"):
        os.mkdir("result")

    with open("result/source.json", "w", encoding="utf-8") as f:
        json.dump(parsed_items, f, indent=2, ensure_ascii=False)

    return parsed_items


def store_all_translations(
    project_id: str,
    file_id: str,
    cookie: str,
    csrf_token: str,
    meta_language_id: str,
    target_languages: List[Dict],
    **kwargs,
) -> Dict[str, float]:
    meta, meta_translations = fetch_crowdin_translations(
        project_id,
        file_id,
        cookie,
        csrf_token,
        meta_language_id,
    )

    return fetch_crowdin_all_languages(
        project_id,
        meta_language_id,
        cookie,
        csrf_token,
        meta,
        meta_translations,
        target_languages,
    )


if __name__ == "__main__":
    load_dotenv()

    store_all_translations(
        **read_config(),
        cookie=os.getenv("CROWDIN_COOKIE"),
        csrf_token=os.getenv("CROWDIN_CSRF_TOKEN"),
    )
