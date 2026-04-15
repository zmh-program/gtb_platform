use crate::analysis::types::{Config, DuplicateEntry, DuplicatesMap, SourceTheme};
use crate::analysis::typing::cmp_shortcut;
use crate::text::{
    clean_translation, formatted_translation, is_accented, is_match_clean_translation,
};
use indexmap::IndexMap;
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

fn is_match_ref(source: &[DuplicateEntry], target: &[DuplicateEntry]) -> bool {
    let source_themes: HashSet<&str> = source.iter().map(|(theme, _, _)| theme.as_str()).collect();
    target
        .iter()
        .all(|(theme, _, _)| source_themes.contains(theme.as_str()))
}

fn get_useless_multiwords(duplicates: &DuplicatesMap) -> Vec<String> {
    let mut key_map: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for key in duplicates.keys() {
        key_map
            .entry(clean_translation(key))
            .or_default()
            .push(key.clone());
    }

    let mut matched_keys = BTreeSet::new();

    for mut keys in key_map.into_values() {
        if keys.len() <= 1 {
            continue;
        }
        keys.sort_by(|a, b| cmp_shortcut(a, b));

        for i in 0..keys.len() {
            for j in (i + 1)..keys.len() {
                let source = duplicates.get(&keys[i]).expect("key exists");
                let target = duplicates.get(&keys[j]).expect("key exists");
                // If one normalized key already covers every theme of a longer variant,
                // keep the broader key and drop the narrower duplicate.
                if is_match_ref(source, target) {
                    matched_keys.insert(keys[j].clone());
                }
            }
        }
    }

    matched_keys.into_iter().collect()
}

fn get_special_duplicates(
    duplicates: &DuplicatesMap,
) -> BTreeMap<Vec<String>, Vec<DuplicateEntry>> {
    let mut accent_keys: BTreeMap<String, Vec<String>> = BTreeMap::new();

    for key in duplicates.keys() {
        if is_accented(key) {
            let formatted = crate::text::rm_accents(key);
            let bucket = accent_keys.entry(formatted).or_default();
            if !bucket.contains(key) {
                bucket.push(key.clone());
            }
        }
    }

    let mut special_duplicates = BTreeMap::new();
    for (_normalized, keys) in accent_keys {
        if keys.len() <= 1 {
            continue;
        }

        let mut elements = Vec::new();
        for k in &keys {
            if let Some(entries) = duplicates.get(k) {
                elements.extend(entries.clone());
            }
        }

        let themes: HashSet<&str> = elements
            .iter()
            .map(|(theme, _, _)| theme.as_str())
            .collect();
        if themes.len() > 1 {
            special_duplicates.insert(keys, elements);
        }
    }

    special_duplicates
}

pub fn find_duplicate_translations(
    all_translations: &[SourceTheme],
    config: &Config,
    polyfill: &HashMap<String, HashMap<String, String>>,
) -> DuplicatesMap {
    let mut duplicates: DuplicatesMap = IndexMap::new();
    let lang_map: HashMap<&str, &str> = config
        .target_languages
        .iter()
        .map(|lang| (lang.id.as_str(), lang.name.as_str()))
        .collect();

    for theme_data in all_translations {
        let theme = &theme_data.theme;

        // Theme names always participate in duplicate detection.
        for normalized_text in formatted_translation(Some(theme), false) {
            duplicates.entry(normalized_text).or_default().push((
                theme.clone(),
                "English".to_string(),
                theme.clone(),
            ));
        }

        // polyfill.json restores duplicate coverage for filtered or missing entries.
        for (lang_name, polyfill_translations) in polyfill {
            for (polyfill_theme, polyfill_translation) in polyfill_translations {
                if theme.eq_ignore_ascii_case(polyfill_theme) {
                    duplicates
                        .entry(polyfill_translation.clone())
                        .or_default()
                        .push((theme.clone(), lang_name.clone(), polyfill_theme.clone()));
                }
            }
        }

        for trans in &theme_data.translations {
            let Some(text) = trans.text.as_ref() else {
                continue;
            };
            if !trans.is_approved {
                continue;
            }
            let Some(lang_name) = lang_map.get(trans.language_id.as_str()) else {
                continue;
            };
            // `Complement` is injected from completions.json.
            let is_completion = *lang_name == "Complement";
            for normalized_text in formatted_translation(Some(text), is_completion) {
                duplicates.entry(normalized_text).or_default().push((
                    theme.clone(),
                    (*lang_name).to_string(),
                    text.clone(),
                ));
            }
        }
    }

    let special_duplicates = get_special_duplicates(&duplicates);
    for (apply_keys, special_duplicate) in special_duplicates {
        for special_key in apply_keys {
            // Accent variants should share the same theme coverage once their normalized text matches.
            let mut db_themes: HashSet<String> = duplicates
                .get(&special_key)
                .map(|entries| entries.iter().map(|(theme, _, _)| theme.clone()).collect())
                .unwrap_or_default();

            for (dup_theme, dup_lang, dup_text) in &special_duplicate {
                if db_themes.contains(dup_theme) {
                    continue;
                }
                if is_match_clean_translation(dup_text, &special_key) {
                    duplicates.entry(special_key.clone()).or_default().push((
                        dup_theme.clone(),
                        dup_lang.clone(),
                        dup_text.clone(),
                    ));
                    db_themes.insert(dup_theme.clone());
                }
            }
        }
    }

    let mut filtered_duplicates: DuplicatesMap = duplicates
        .into_iter()
        .filter(|(_k, v)| {
            let unique_themes: HashSet<&str> = v.iter().map(|entry| entry.0.as_str()).collect();
            unique_themes.len() > 1
        })
        .collect();

    for k in get_useless_multiwords(&filtered_duplicates) {
        filtered_duplicates.shift_remove(&k);
    }

    let mut theme_grouped: Vec<(String, Vec<DuplicateEntry>)> = Vec::new();
    for (norm_text, entries) in filtered_duplicates {
        let mut theme_lang_map: IndexMap<String, Vec<(String, String)>> = IndexMap::new();
        for (theme, lang, orig_text) in entries {
            theme_lang_map
                .entry(theme)
                .or_default()
                .push((lang, orig_text));
        }

        let mut combined_entries: Vec<DuplicateEntry> = Vec::new();
        for (theme, lang_entries) in theme_lang_map {
            if lang_entries.len() > 1 {
                // Multi-language hits are rendered as `Lang A / Lang B`.
                let langs = lang_entries
                    .iter()
                    .map(|(lang, _)| lang.clone())
                    .collect::<Vec<_>>()
                    .join(" / ");
                combined_entries.push((theme, langs, lang_entries[0].1.clone()));
            } else if let Some((lang, orig_text)) = lang_entries.first() {
                combined_entries.push((theme, lang.clone(), orig_text.clone()));
            }
        }

        let theme_count = combined_entries
            .iter()
            .map(|(theme, _, _)| theme.as_str())
            .collect::<HashSet<_>>()
            .len();
        if theme_count > 1 {
            theme_grouped.push((norm_text, combined_entries));
        }
    }

    theme_grouped.sort_by(|a, b| a.0.cmp(&b.0));
    theme_grouped.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_useless_multiwords_prefers_broader_match() {
        let mut d: DuplicatesMap = IndexMap::new();
        d.insert(
            "cat".into(),
            vec![
                ("Cat".into(), "English".into(), "Cat".into()),
                ("Tiger".into(), "English".into(), "Tiger".into()),
            ],
        );
        d.insert(
            "cats".into(),
            vec![("Cat".into(), "English".into(), "Cat".into())],
        );

        let useless = get_useless_multiwords(&d);
        assert!(useless.contains(&"cats".to_string()));
    }
}
