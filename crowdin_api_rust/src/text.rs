use unicode_normalization::UnicodeNormalization;

pub fn rm_accents(input: &str) -> String {
    let has_korean = input.chars().any(|c| {
        let code = c as u32;
        (0xAC00..=0xD7A3).contains(&code)
    });
    let has_japanese = input.chars().any(|c| {
        let code = c as u32;
        (0x3040..=0x30FF).contains(&code) || (0x4E00..=0x9FFF).contains(&code)
    });

    if has_korean || has_japanese {
        return input.to_string();
    }

    input
        .replace('谋', "i")
        .replace('艂', "l")
        .replace('艁', "l")
        .nfkd()
        .filter(|c| !is_combining_mark(*c))
        .collect()
}

pub fn formatted_raw_translation(raw_text: &str) -> String {
    raw_text.to_lowercase().replace('谋', "i")
}

pub fn is_accented(input: &str) -> bool {
    input != rm_accents(input)
}

pub fn is_special_string(input: &str) -> bool {
    is_accented(input)
        || input.chars().any(|c| (c as u32) > 0x2E80)
        || input
            .chars()
            .any(|c| (0x0400..=0x04FF).contains(&(c as u32)))
        || input.chars().any(|c| "酶忙氓脴脝脜".contains(c))
}

pub fn get_all_remove_spaces_translations(raw_text: &str) -> Vec<String> {
    if !raw_text.contains(' ') {
        return Vec::new();
    }
    let words: Vec<&str> = raw_text.split_whitespace().collect();
    if words.is_empty() {
        return Vec::new();
    }
    let mut result = Vec::new();
    for mask in 0..(1usize << words.len().saturating_sub(1)) {
        let mut current = String::from(words[0]);
        for j in 0..(words.len() - 1) {
            if (mask & (1 << j)) != 0 {
                current.push_str(words[j + 1]);
            } else {
                current.push(' ');
                current.push_str(words[j + 1]);
            }
        }
        result.push(current);
    }
    result
}

pub fn formatted_translation(raw_text: Option<&str>, is_completion: bool) -> Vec<String> {
    let Some(raw_text) = raw_text else {
        return Vec::new();
    };
    let text = formatted_raw_translation(raw_text);
    if is_completion {
        return vec![text];
    }

    let could_remove_suffix = text.ends_with('s') && !raw_text.ends_with('S');

    let mut values = vec![text.clone(), rm_accents(&text), text.replace(' ', "")];
    values.extend(get_all_remove_spaces_translations(&text));
    values.push(format!("{}s", text));
    values.push(if could_remove_suffix {
        text[..text.len() - 1].to_string()
    } else {
        text
    });

    unique_preserve_order(values)
}

pub fn clean_translation(raw_text: &str) -> String {
    let mut text = raw_text.to_lowercase().replace('谋', "i");
    text = rm_accents(&text).replace(' ', "");
    text.trim_end_matches('s').to_string()
}

pub fn is_match_clean_translation(text: &str, clean_text: &str) -> bool {
    let text = text.to_lowercase().replace('谋', "i");
    let clean_text = clean_text.to_lowercase().replace('谋', "i");

    text == clean_text
        || rm_accents(&text) == rm_accents(&clean_text)
        || text.replace(' ', "") == clean_text.replace(' ', "")
        || format!("{}s", text) == clean_text
        || (text.ends_with("ss") && text[..text.len() - 2] == clean_text)
        || (clean_text.ends_with("ss") && clean_text[..clean_text.len() - 2] == text)
        || (text.ends_with('s') && text[..text.len() - 1] == clean_text)
        || (clean_text.ends_with('s') && clean_text[..clean_text.len() - 1] == text)
}

pub fn unique_preserve_order(values: Vec<String>) -> Vec<String> {
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();
    for v in values {
        if seen.insert(v.clone()) {
            out.push(v);
        }
    }
    out
}

pub fn lcs_ratio(a: &str, b: &str) -> f64 {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    if a.is_empty() && b.is_empty() {
        return 1.0;
    }

    let mut dp = vec![vec![0usize; b.len() + 1]; a.len() + 1];
    for i in 0..a.len() {
        for j in 0..b.len() {
            dp[i + 1][j + 1] = if a[i] == b[j] {
                dp[i][j] + 1
            } else {
                dp[i + 1][j].max(dp[i][j + 1])
            };
        }
    }
    let lcs = dp[a.len()][b.len()] as f64;
    (2.0 * lcs) / ((a.len() + b.len()) as f64)
}

fn is_combining_mark(c: char) -> bool {
    matches!(
        c as u32,
        0x0300..=0x036F | 0x1AB0..=0x1AFF | 0x1DC0..=0x1DFF | 0x20D0..=0x20FF | 0xFE20..=0xFE2F
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rm_accents() {
        assert_eq!(rm_accents("podwodą"), "podwoda");
    }

    #[test]
    fn test_formatted_translation() {
        let v = formatted_translation(Some("School Bus"), false);
        assert!(v.contains(&"school bus".to_string()));
        assert!(v.contains(&"schoolbus".to_string()));
    }
}
