import unicodedata
from typing import List, Tuple


def is_accented(input_str: str) -> bool:
    """Check if a string contains accented characters."""
    return input_str != rm_accents(input_str)


def is_special_string(input_str: str) -> bool:
    """Check if a string contains special characters (non-Latin)."""
    return (
        is_accented(input_str)
        or any(ord(c) > 0x2E80 for c in input_str)
        or any(ord("\u0400") <= ord(c) <= ord("\u04ff") for c in input_str)
        or any(c in "øæåØÆÅ" for c in input_str)
    )


def sort_better_shortcut(shortcut: str) -> Tuple[bool, int, str]:
    """Sort key function for shortcuts."""
    return (is_special_string(shortcut), len(shortcut), shortcut)


def rm_accents(input_str: str) -> str:
    """Remove accents from a string while preserving special characters."""
    has_korean = any(ord("가") <= ord(c) <= ord("힣") for c in input_str)
    has_japanese = any(
        ord("\u3040") <= ord(c) <= ord("\u30ff")
        or ord("\u4e00") <= ord(c) <= ord("\u9fff")
        for c in input_str
    )
    if has_korean or has_japanese:
        return input_str

    input_str = input_str.replace("ı", "i").replace("ł", "l").replace("Ł", "l")

    nfkd_form = unicodedata.normalize("NFKD", input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])


def formatted_raw_translation(raw_text: str) -> str:
    if raw_text is None:
        return None

    return raw_text.lower().replace("ı", "i")


def get_all_remove_spaces_translations(raw_text: str) -> List[str]:
    if raw_text is None or " " not in raw_text:
        return []

    result = []
    words = raw_text.split()
    n = len(words)

    for i in range(1 << (n - 1)):
        current = words[0]
        for j in range(n - 1):
            if i & (1 << j):
                current += words[j + 1]
            else:
                current += " " + words[j + 1]
        result.append(current)

    return result


def formatted_translation(raw_text: str, is_completion: bool = False) -> List[str]:
    """Format a translation text according to specified rules."""
    # skip null values
    if raw_text is None:
        return None

    # replace dotless i to i directly
    text = formatted_raw_translation(raw_text)

    # if it is a completion, return the raw text (e.g. vr, mayo)
    if is_completion:
        return [text]

    could_remove_suffix = text.endswith("s") and not raw_text.endswith("S")

    collections = [
        text,
        rm_accents(text),
        text.replace(" ", ""),
        *get_all_remove_spaces_translations(text),
        text + "s",
        text[:-1] if could_remove_suffix else text,
    ]

    return list(set(collections))


def is_match_clean_translation(text: str, clean_text: str) -> bool:
    """Check if a text matches a clean translation."""
    text = text.lower().replace("ı", "i")
    clean_text = clean_text.lower().replace("ı", "i")

    condition = (
        text == clean_text
        or rm_accents(text) == rm_accents(clean_text)
        or text.replace(" ", "") == clean_text.replace(" ", "")
        or text + "s" == clean_text
        or (text.endswith("ss") and text[:-2] == clean_text)
        or (clean_text.endswith("ss") and clean_text[:-2] == text)
        or (text.endswith("s") and text[:-1] == clean_text)
        or (clean_text.endswith("s") and clean_text[:-1] == text)
    )

    return condition


def clean_translation(raw_text: str) -> str:
    if raw_text is None:
        return None

    # clean chars
    text = raw_text.lower().replace("ı", "i")

    # remove accents
    text = rm_accents(text).replace(" ", "")

    # clean +s
    if text.endswith("s"):
        text = text.rstrip("s")

    return text


def parse_struction(text: str) -> str:
    """Parse the structure of a text by word lengths."""
    return "-".join(str(len(part)) for part in text.split(" "))


def get_structure_length(text: str) -> int:
    """Get the total length of a structure string."""
    return sum(int(v) for v in text.split("-")) + text.count("-")
