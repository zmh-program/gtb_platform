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


# Keyboard layout constants for typing difficulty calculation
# Maps character -> (row, column, hand, finger)
# Row: 0=Number, 1=Top, 2=Home, 3=Bottom
# Hand: 0=Left, 1=Right
# Finger: 0=Pinky, 1=Ring, 2=Middle, 3=Index
QWERTY_LAYOUT = {
    # Number Row
    "1": (0, 0, 0, 0), "2": (0, 1, 0, 1), "3": (0, 2, 0, 2), "4": (0, 3, 0, 3), "5": (0, 4, 0, 3),
    "6": (0, 5, 1, 3), "7": (0, 6, 1, 3), "8": (0, 7, 1, 2), "9": (0, 8, 1, 1), "0": (0, 9, 1, 0),
    "-": (0, 10, 1, 0), "=": (0, 11, 1, 0),
    
    # Top Row
    "q": (1, 0, 0, 0), "w": (1, 1, 0, 1), "e": (1, 2, 0, 2), "r": (1, 3, 0, 3), "t": (1, 4, 0, 3),
    "y": (1, 5, 1, 3), "u": (1, 6, 1, 3), "i": (1, 7, 1, 2), "o": (1, 8, 1, 1), "p": (1, 9, 1, 0),
    "[": (1, 10, 1, 0), "]": (1, 11, 1, 0), "\\": (1, 12, 1, 0),
    
    # Home Row
    "a": (2, 0, 0, 0), "s": (2, 1, 0, 1), "d": (2, 2, 0, 2), "f": (2, 3, 0, 3), "g": (2, 4, 0, 3),
    "h": (2, 5, 1, 3), "j": (2, 6, 1, 3), "k": (2, 7, 1, 2), "l": (2, 8, 1, 1), ";": (2, 9, 1, 0),
    "'": (2, 10, 1, 0),
    
    # Bottom Row
    "z": (3, 0, 0, 0), "x": (3, 1, 0, 1), "c": (3, 2, 0, 2), "v": (3, 3, 0, 3), "b": (3, 4, 0, 3),
    "n": (3, 5, 1, 3), "m": (3, 6, 1, 3), ",": (3, 7, 1, 2), ".": (3, 8, 1, 1), "/": (3, 9, 1, 0),
}


def calculate_typing_complexity(shortcut: str) -> float:
    """
    Calculates a typing difficulty score based on QWERTY layout.
    Lower score means easier/faster to type.
    
    Algorithm:
    1. Base cost per character based on row position (Home row is easiest).
    2. Penalties for difficult transitions:
       - Same hand usage (+0.5)
       - Same finger usage (+2.0) - very difficult/slow
       - Row jumping (e.g. Top to Bottom) (+0.5 per row distance)
    3. Bonuses/Neutrality:
       - Alternating hands (0 penalty) - fastest typing flow
       - Same key (double letter) (+0.1) - very fast re-press
    4. Hand Bias:
       - Right hand penalty (+1.1) per key (prefer Left hand as Right hand is on mouse)
    """
    if not shortcut:
        return 0.0
        
    score = 0.0
    prev_char_info = None
    
    # Row costs: Home(2)=0, Top(1)=0.5, Bot(3)=1.0, Num(0)=1.5
    row_costs = {0: 1.5, 1: 0.5, 2: 0.0, 3: 1.0}
    
    normalized_shortcut = shortcut.lower()
    
    for i, char in enumerate(normalized_shortcut):
        # Default difficult chars (not in map) get high penalty
        if char not in QWERTY_LAYOUT:
             score += 3.0
             prev_char_info = None
             continue
             
        row, col, hand, finger = QWERTY_LAYOUT[char]
        
        # 1. Base cost for position
        score += row_costs.get(row, 2.0)
        
        # 2. Right hand penalty (user request)
        if hand == 1:
            score += 1.1
        
        # 3. Transition cost
        if prev_char_info:
            prev_row, prev_col, prev_hand, prev_finger = prev_char_info
            
            # Same key (double letter) - minimal penalty
            if char == normalized_shortcut[i-1]:
                score += 0.1
            
            # Different hand - Optimal flow (0 penalty)
            elif hand != prev_hand:
                pass # Alternating hands is fast
                
            # Same hand
            else:
                score += 0.5 # Same hand penalty
                
                # Same finger (bad!)
                if finger == prev_finger:
                    score += 2.0 # High penalty for same-finger contortions
                
                # Row jump penalty (distance > 1 row)
                if abs(row - prev_row) > 1:
                    score += 0.5 * abs(row - prev_row)
                    
                # Lateral stretch (same hand, far columns)
                if abs(col - prev_col) > 4:
                    score += 0.5
                    
        prev_char_info = (row, col, hand, finger)
        
    return score


def sort_better_shortcut(shortcut: str) -> Tuple[bool, int, float]:
    """Sort key function for shortcuts."""
    # Sort order:
    # 1. Special strings (accented/unicode) last (True > False)
    # 2. Length (shorter is better)
    # 3. Typing complexity (lower score is better/faster)
    return (is_special_string(shortcut), len(shortcut), calculate_typing_complexity(shortcut))


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
