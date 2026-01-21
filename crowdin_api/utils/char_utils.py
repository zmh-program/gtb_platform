import unicodedata
from difflib import SequenceMatcher
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


def calculate_typing_complexity(shortcut: str, reference_text: str = None) -> float:
    """
    Calculates a typing difficulty score based on QWERTY layout.
    
    Algorithm considers:
    1. Base Key Costs: Home row < Top row < Bottom row < Number row.
    2. Hand Bias: Right hand penalty (+1.1) as left hand is preferred.
    3. Transition Costs:
       - Hand Swaps: Optimal (0 cost).
       - Same Hand:
         - Inward Rolls (Pinky->Index): Fast (-0.2 bonus).
         - Outward Rolls (Index->Pinky): Slow (+0.3 penalty).
         - Same Finger: Very Slow (+2.0 penalty).
         - Row Jumps: Penalty based on distance.
         - Lateral Stretches: Penalty for long reaches.
    4. "Enter" Key:
       - Every shortcut effectively ends with an Enter press.
       - Enter is Right Hand, Pinky, Home Row (approx).
    5. Reflex/Familiarity Bonus:
       - If shortcut is similar to reference_text (common English word),
         apply a bonus (negative score) to represent muscle memory.
    """
    if not shortcut:
        return 0.0
        
    score = 0.0
    
    # 0. Reflex/Familiarity Bonus
    if reference_text:
        # Calculate similarity (0.0 to 1.0)
        # Using SequenceMatcher to capture subsequence/typo similarity (e.g. "orage" ~ "orange")
        matcher = SequenceMatcher(None, shortcut.lower(), reference_text.lower())
        similarity = matcher.ratio()
        
        # Apply bonus if similarity is significant
        # Weight can be adjusted. 5.0 is a strong bonus (offsets length/complexity).
        if similarity > 0.5:
            score -= (similarity * 5.0)
    
    # Define Enter key properties: Row 2 (Home), Col 11.5, Right Hand, Pinky
    ENTER_KEY = (2, 11, 1, 0) 
    
    # Prepare sequence: shortcut characters + Enter
    sequence_chars = list(shortcut.lower())
    
    # Tracking state
    prev_char_info = None
    
    # Row costs: Home(2)=0, Top(1)=0.5, Bot(3)=1.0, Num(0)=2.0
    row_costs = {0: 2.0, 1: 0.5, 2: 0.0, 3: 1.0}
    
    for i, char in enumerate(sequence_chars + ["MATCH_ENTER"]):
        is_enter = (char == "MATCH_ENTER")
        
        if is_enter:
            row, col, hand, finger = ENTER_KEY
        elif char not in QWERTY_LAYOUT:
            # Unknown char - high penalty
            score += 3.0
            prev_char_info = None
            continue
        else:
            row, col, hand, finger = QWERTY_LAYOUT[char]
        
        # 1. Base cost for position (Finger travel distance from home position)
        score += row_costs.get(row, 2.0)
        
        # 2. Right hand penalty
        if hand == 1:
            score *= 1.2
            
        # 3. Transition Logic
        if prev_char_info:
            prev_row, prev_col, prev_hand, prev_finger = prev_char_info
            
            # Same Key (Double tap) - Fast
            if not is_enter and i > 0 and char == sequence_chars[i-1]:
                score += 0.1
                
            # Hand Swap - Fastest Flow
            elif hand != prev_hand:
                pass # 0 cost
                
            # Same Hand Transitions
            else:
                base_same_hand_penalty = 0.5
                
                # Finger Logic
                if finger == prev_finger:
                    # Same finger = very bad (unless same key, handled above)
                    score += 2.0 
                else:
                    # Rolling Logic
                    # Finger indices: 0=Pinky, 1=Ring, 2=Middle, 3=Index
                    # Inward roll: lower -> higher index (Pinky -> Index)
                    # Outward roll: higher -> lower index (Index -> Pinky)
                    
                    if finger > prev_finger:
                        # Inward roll (good)
                        base_same_hand_penalty -= 0.2
                    else:
                        # Outward roll (bad)
                        base_same_hand_penalty += 0.3
                        
                # Row Jumps (e.g. Top to Bottom)
                row_diff = abs(row - prev_row)
                if row_diff > 0:
                     base_same_hand_penalty += (0.3 * row_diff)
                     
                # Lateral Stretches (Col distance)
                col_diff = abs(col - prev_col)
                if col_diff > 0:
                     base_same_hand_penalty += (0.1 * col_diff)

                score += base_same_hand_penalty

        prev_char_info = (row, col, hand, finger)
        
    return score


def sort_better_shortcut(shortcut: str) -> Tuple[bool, int, float]:
    """Sort key function for shortcuts."""
    # This is a legacy/default wrapper. For context-aware sorting, use appropriate lambda.
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
