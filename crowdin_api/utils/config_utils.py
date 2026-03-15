import json
import os
import re
from typing import Any, Dict, List, Set


def mix_completions(theme: Dict, completions: Dict) -> Dict:
    for completion, themes in completions.items():
        if theme["theme"] in themes:
            return {
                **theme,
                "translations": [
                    {
                        "id": "-1",
                        "text": completion,
                        "language_id": "-1",
                        "is_approved": True,
                        "approved_at": "",
                        "approved_by": "",
                    },
                    *theme["translations"],
                ],
            }
    return theme


def read_json_file(file_path: str) -> Any:
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_meta_language_id(value: str) -> str:
    if value.isdigit():
        return value
    m = re.search(r"\((\d+)\)", value)
    return m.group(1) if m else value


def read_config() -> Dict:
    config = read_json_file("conf/config.json")
    config["meta_language_id"] = parse_meta_language_id(
        os.getenv("META_LANGUAGE_ID") or config["meta_language_id"]
    )
    return config


def read_themes() -> List[str]:
    themes = read_json_file("conf/themes.json")
    return [theme.lower() for theme in themes]


def read_completions() -> Dict:
    return read_json_file("conf/completions.json")


def read_excluded_themes() -> Set[str]:
    return set(read_json_file("conf/exclude.json"))


def read_polyfill() -> Dict:
    return read_json_file("conf/polyfill.json")


def read_all_translations(
    valid_themes: Set[str], completions: Dict, excluded_themes: Set[str]
) -> List[Dict]:
    translations = read_json_file("result/source.json")
    filtered_translations = [
        mix_completions(t, completions)
        for t in translations
        if t["theme"].lower() in valid_themes and t["theme"] not in excluded_themes
    ]
    return sorted(filtered_translations, key=lambda x: x["theme"].lower())
