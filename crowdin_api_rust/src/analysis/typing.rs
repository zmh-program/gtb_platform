use crate::text::is_special_string;
use crate::text::lcs_ratio;
use std::cmp::Ordering;

fn qwerty_layout(c: char) -> Option<(i32, i32, i32, i32)> {
    match c {
        '1' => Some((0, 0, 0, 0)),
        '2' => Some((0, 1, 0, 1)),
        '3' => Some((0, 2, 0, 2)),
        '4' => Some((0, 3, 0, 3)),
        '5' => Some((0, 4, 0, 3)),
        '6' => Some((0, 5, 1, 3)),
        '7' => Some((0, 6, 1, 3)),
        '8' => Some((0, 7, 1, 2)),
        '9' => Some((0, 8, 1, 1)),
        '0' => Some((0, 9, 1, 0)),
        '-' => Some((0, 10, 1, 0)),
        '=' => Some((0, 11, 1, 0)),
        'q' => Some((1, 0, 0, 0)),
        'w' => Some((1, 1, 0, 1)),
        'e' => Some((1, 2, 0, 2)),
        'r' => Some((1, 3, 0, 3)),
        't' => Some((1, 4, 0, 3)),
        'y' => Some((1, 5, 1, 3)),
        'u' => Some((1, 6, 1, 3)),
        'i' => Some((1, 7, 1, 2)),
        'o' => Some((1, 8, 1, 1)),
        'p' => Some((1, 9, 1, 0)),
        '[' => Some((1, 10, 1, 0)),
        ']' => Some((1, 11, 1, 0)),
        '\\' => Some((1, 12, 1, 0)),
        'a' => Some((2, 0, 0, 0)),
        's' => Some((2, 1, 0, 1)),
        'd' => Some((2, 2, 0, 2)),
        'f' => Some((2, 3, 0, 3)),
        'g' => Some((2, 4, 0, 3)),
        'h' => Some((2, 5, 1, 3)),
        'j' => Some((2, 6, 1, 3)),
        'k' => Some((2, 7, 1, 2)),
        'l' => Some((2, 8, 1, 1)),
        ';' => Some((2, 9, 1, 0)),
        '\'' => Some((2, 10, 1, 0)),
        'z' => Some((3, 0, 0, 0)),
        'x' => Some((3, 1, 0, 1)),
        'c' => Some((3, 2, 0, 2)),
        'v' => Some((3, 3, 0, 3)),
        'b' => Some((3, 4, 0, 3)),
        'n' => Some((3, 5, 1, 3)),
        'm' => Some((3, 6, 1, 3)),
        ',' => Some((3, 7, 1, 2)),
        '.' => Some((3, 8, 1, 1)),
        '/' => Some((3, 9, 1, 0)),
        _ => None,
    }
}

pub fn calculate_typing_complexity(shortcut: &str, reference_text: Option<&str>) -> f64 {
    if shortcut.is_empty() {
        return 0.0;
    }

    let mut score = 0.0;
    if let Some(reference_text) = reference_text {
        let similarity = lcs_ratio(&shortcut.to_lowercase(), &reference_text.to_lowercase());
        if similarity > 0.5 {
            score -= similarity * 5.0;
        }
    }

    let enter_key = (2, 11, 1, 0);
    let sequence: Vec<char> = shortcut.to_lowercase().chars().collect();
    let mut prev_info: Option<(i32, i32, i32, i32)> = None;

    for (i, cur) in sequence
        .iter()
        .copied()
        .map(Some)
        .chain(std::iter::once(None))
        .enumerate()
    {
        let is_enter = cur.is_none();
        let (row, col, hand, finger) = if is_enter {
            enter_key
        } else if let Some(info) = qwerty_layout(cur.unwrap()) {
            info
        } else {
            score += 3.0;
            prev_info = None;
            continue;
        };

        score += match row {
            0 => 2.0,
            1 => 0.5,
            2 => 0.0,
            3 => 1.0,
            _ => 2.0,
        };

        if hand == 1 {
            score *= 1.2;
        }

        if let Some((prev_row, prev_col, prev_hand, prev_finger)) = prev_info {
            if !is_enter && i > 0 && cur == Some(sequence[i - 1]) {
                score += 0.1;
            } else if hand != prev_hand {
                // hand swap = no penalty
            } else {
                let mut penalty = 0.5;
                if finger == prev_finger {
                    penalty += 2.0;
                } else if finger > prev_finger {
                    penalty -= 0.2;
                } else {
                    penalty += 0.3;
                }

                let row_diff = (row - prev_row).abs();
                if row_diff > 0 {
                    penalty += 0.3 * row_diff as f64;
                }

                let col_diff = (col - prev_col).abs();
                if col_diff > 0 {
                    penalty += 0.1 * col_diff as f64;
                }

                score += penalty;
            }
        }

        prev_info = Some((row, col, hand, finger));
    }

    score
}

pub fn sort_better_shortcut_key(shortcut: &str) -> (bool, usize, f64) {
    (
        is_special_string(shortcut),
        shortcut.chars().count(),
        calculate_typing_complexity(shortcut, None),
    )
}

pub fn cmp_shortcut(a: &str, b: &str) -> Ordering {
    let ka = sort_better_shortcut_key(a);
    let kb = sort_better_shortcut_key(b);
    ka.0.cmp(&kb.0)
        .then(ka.1.cmp(&kb.1))
        .then_with(|| ka.2.partial_cmp(&kb.2).unwrap_or(Ordering::Equal))
        .then_with(|| a.cmp(b))
}

pub fn cmp_shortcut_with_theme(
    a: &str,
    b: &str,
    theme_name: &str,
    duplicate_index_cost: impl Fn(&str) -> usize,
) -> Ordering {
    let ka = (
        is_special_string(a),
        a.chars().count(),
        duplicate_index_cost(a),
        calculate_typing_complexity(a, Some(theme_name)),
    );
    let kb = (
        is_special_string(b),
        b.chars().count(),
        duplicate_index_cost(b),
        calculate_typing_complexity(b, Some(theme_name)),
    );

    ka.0.cmp(&kb.0)
        .then(ka.1.cmp(&kb.1))
        .then(ka.2.cmp(&kb.2))
        .then_with(|| ka.3.partial_cmp(&kb.3).unwrap_or(Ordering::Equal))
        .then_with(|| a.cmp(b))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_typing_complexity_runs() {
        let a = calculate_typing_complexity("orage", Some("orange"));
        let b = calculate_typing_complexity("qzx/", Some("orange"));
        assert!(a < b);
    }
}

