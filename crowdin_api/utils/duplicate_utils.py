from collections import defaultdict
from typing import Dict, List, Tuple

from utils.char_utils import *
from utils.config_utils import read_polyfill


def is_match_ref(
    source: List[Tuple[str, str, str]], target: List[Tuple[str, str, str]]
) -> bool:
    """
    Check if the source is a match of the target.
    if it is, then the target is useless
    """
    source_match = {theme for theme, _, _ in source}
    target_match = {theme for theme, _, _ in target}

    # if target has something that source doesn't have, then the target is not useless
    return all(
        t in source_match for t in target_match
    )  # check if all target themes are in source themes


def get_useless_multiwords(
    duplicates: Dict[str, List[Tuple[str, str, str]]],
) -> List[str]:
    """
    Get useless multiwords.
    """
    # find duplicates (multiwords)
    key_map = defaultdict(list)
    for k in duplicates.keys():
        key_map[clean_translation(k)].append(k)

    # find useless multiwords
    matched_keys = []
    for keys in key_map.values():
        if len(keys) > 1:
            keys = sorted(keys, key=sort_better_shortcut)

            for i in range(len(keys)):
                for j in range(i + 1, len(keys)):
                    if is_match_ref(duplicates[keys[i]], duplicates[keys[j]]):
                        matched_keys.append(keys[j])  # so the keys[j] is useless

    return list(set(matched_keys))


def get_special_duplicates(
    duplicates: Dict[str, List[Tuple[str, str, str]]],
    accent_translations: Dict[Tuple[str, str, str], str],
) -> Dict[str, List[Tuple[str, str, str]]]:
    """
    Get special duplicates.
    """
    accent_keys = defaultdict(list)
    for k in duplicates.keys():
        if is_accented(k):
            formatted_k = rm_accents(k)
            if k not in accent_keys[formatted_k]:
                accent_keys[formatted_k].append(k)

    special_duplicates = defaultdict(list)

    for k, v in accent_keys.items():
        if len(v) > 1:
            elements = [d for e in v for d in duplicates[e]]  # expand duplicates[e]

            themes = {e[0] for e in elements}
            if len(themes) > 1:
                special_duplicates[tuple(v)] = elements

    return special_duplicates


def find_duplicate_translations(
    all_translations: List[dict],
    config: dict,
) -> Dict[str, List[Tuple[str, str, str]]]:
    """
    Find duplicate translations across all themes and languages.
    Returns a dictionary mapping normalized translations to lists of (theme, language, original_text) tuples.

    Args:
        console: Rich console instance for output
        all_translations: List of theme translation data
        config: Configuration dictionary containing language mappings
        remove_suffix: Whether to remove suffixes when normalizing text
        remove_accents: Whether to remove accents when normalizing text
        remove_spaces: Whether to remove spaces when normalizing text
        output_distribution: Whether to output language distribution statistics

    Returns:
        Dictionary mapping normalized translations to lists of (theme, language, original_text) tuples
    """
    duplicates = defaultdict(list)
    accent_translations = {}
    lang_map = {lang["id"]: lang["name"] for lang in config["target_languages"]}
    polyfill = read_polyfill()

    for theme_data in all_translations:
        theme = theme_data["theme"]

        for normalized_text in formatted_translation(theme):
            duplicates[normalized_text].append((theme, "English", theme))

        for lang_name, polyfill_translations in polyfill.items():
            for polyfill_theme, polyfill_translation in polyfill_translations.items():
                if theme.lower() == polyfill_theme.lower():
                    duplicates[polyfill_translation].append(
                        (theme, lang_name, polyfill_theme)
                    )

        for trans in theme_data["translations"]:
            if trans["text"] and trans["is_approved"]:
                lang_name = lang_map.get(trans["language_id"])
                if lang_name:
                    translation_text = trans["text"]

                    if is_accented(formatted_raw_translation(translation_text)):
                        accent_translations[(theme, lang_name, translation_text)] = (
                            formatted_raw_translation(translation_text)
                        )

                    for normalized_text in formatted_translation(
                        translation_text, is_completion=lang_name == "Complement"
                    ):
                        duplicates[normalized_text].append(
                            (theme, lang_name, translation_text)
                        )

    special_duplicates = get_special_duplicates(duplicates, accent_translations)

    for apply_keys, special_duplicate in special_duplicates.items():
        for special_key in apply_keys:
            # handle duplicates[special_key], these keys should all apply to the themes in duplicates[special_key]
            # if duplicates[special_key] dont have all theme, then we need to add the missing themes to duplicates[special_key]
            db_themes = {d[0] for d in duplicates[special_key]}
            for _duplicate_theme, _duplicate_lang, _duplicate_text in special_duplicate:
                if _duplicate_theme in db_themes:
                    continue
                if is_match_clean_translation(_duplicate_text, special_key):
                    duplicates[special_key].append(
                        (_duplicate_theme, _duplicate_lang, _duplicate_text)
                    )
                    db_themes.add(_duplicate_theme)

    filtered_duplicates = {}
    for k, v in duplicates.items():
        unique_themes = {entry[0] for entry in v}
        if len(unique_themes) > 1:
            filtered_duplicates[k] = v

    for k in get_useless_multiwords(filtered_duplicates):
        filtered_duplicates.pop(k)

    # group by theme
    theme_grouped = {}
    for norm_text, entries in filtered_duplicates.items():
        theme_lang_map = defaultdict(list)
        for theme, lang, orig_text in entries:
            theme_lang_map[theme].append((lang, orig_text))
        combined_entries = []
        for theme, lang_entries in theme_lang_map.items():
            if len(lang_entries) > 1:
                langs = " / ".join(lang for lang, _ in lang_entries)
                combined_entries.append((theme, langs, lang_entries[0][1]))
            else:
                combined_entries.append((theme, lang_entries[0][0], lang_entries[0][1]))
        if len({entry[0] for entry in combined_entries}) > 1:
            theme_grouped[norm_text] = combined_entries

    return dict(sorted(theme_grouped.items()))
