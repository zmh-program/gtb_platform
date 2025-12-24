import json
from datetime import date
from typing import Any, Dict, List, Optional

from utils.char_utils import (
    formatted_translation,
    is_special_string,
    sort_better_shortcut,
)
from utils.config_utils import (
    read_all_translations,
    read_completions,
    read_config,
    read_excluded_themes,
    read_themes,
)
from utils.duplicate_utils import find_duplicate_translations


def find_shortcut_for_theme(theme_data: Dict[str, Any]) -> Optional[str]:
    """Find the shortest valid shortcut for a theme."""

    all_translations = list(
        filter(
            lambda x: x is not None and x.strip() != "" and not is_special_string(x),
            [
                collection
                for translation in theme_data["translations"]
                if translation.get("is_approved")
                for collection in formatted_translation(
                    translation["text"],
                    is_completion=translation["language_id"] == "-1",
                )
            ],
        )
    )

    assert all_translations, f"No translations found for theme {theme_data['theme']}"

    k = min(all_translations, key=sort_better_shortcut)

    min_theme_len = min(len(t) for t in formatted_translation(theme_data["theme"]))
    if len(k) >= min_theme_len:
        return None
    return k


def generate_themes_json(
    all_translations: List[Dict[str, Any]],
    config: Dict[str, Any],
    duplicates: Dict[str, Any],
) -> None:
    themes_data = []

    lang_map = {lang["id"]: lang["code"] for lang in config["target_languages"]}

    for theme_data in all_translations:
        themes_data.append(
            {
                "id": theme_data["id"],
                "theme": theme_data["theme"],
                "shortcut": find_shortcut_for_theme(theme_data),
                "multiwords": sorted(
                    [
                        {
                            "multiword": mw,
                            "occurrences": [
                                {"theme": o[0], "reference": o[1]} for o in occurrences
                            ],
                        }
                        for mw, occurrences in duplicates.items()
                        if any(
                            theme_data["theme"].lower() == o[0].lower()
                            for o in occurrences
                        )
                    ],
                    key=lambda x: (
                        -len(x["occurrences"]),
                        sort_better_shortcut(x["multiword"]),
                    ),
                ),
                "translations": {
                    lang_map[translation["language_id"]]: {
                        "translation": translation["text"],
                        "is_approved": translation["is_approved"],
                        "approved_at": translation["approved_at"],
                    }
                    for translation in theme_data["translations"]
                },
            }
        )

    with open("../lib/source/translations-data.json", "w", encoding="utf-8") as f:
        json.dump(themes_data, f, indent=2, ensure_ascii=False)

    with open("../lib/source/versions.json", "w", encoding="utf-8") as f:
        json.dump(
            {"last_updated": date.today().strftime("%Y/%m/%d")},
            f,
            indent=2,
            ensure_ascii=False,
        )


if __name__ == "__main__":
    conf = read_config()
    all_translations = read_all_translations(
        read_themes(),
        read_completions(),
        read_excluded_themes(),
    )

    duplicates = find_duplicate_translations(
        all_translations,
        conf,
    )

    generate_themes_json(all_translations, conf, duplicates)
