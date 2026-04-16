use crate::analysis::types::{
    Config, DuplicatesMap, MultiwordOutput, OccurrenceOutput, OutputTheme, OutputTranslation,
    SourceTheme,
};
use crate::analysis::typing::{cmp_shortcut, cmp_shortcut_with_theme};
use crate::text::{formatted_translation, is_special_string};
use anyhow::{Context, Result};
use chrono::Local;
use indexmap::IndexMap;
use rayon::prelude::*;
use serde_json::{Map, Value};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

fn duplicate_index_cost(shortcut: &str, duplicates: &DuplicatesMap, theme_name: &str) -> usize {
    duplicates
        .get(shortcut)
        .and_then(|items| items.iter().position(|(theme, _, _)| theme == theme_name))
        .unwrap_or(999)
}

fn build_multiwords_by_theme(duplicates: &DuplicatesMap) -> HashMap<&str, Vec<MultiwordOutput>> {
    let mut grouped = HashMap::new();

    for (multiword, occurrences) in duplicates {
        let output = MultiwordOutput {
            multiword: multiword.clone(),
            occurrences: occurrences
                .iter()
                .map(|(theme, reference, _)| OccurrenceOutput {
                    theme: theme.clone(),
                    reference: reference.clone(),
                })
                .collect(),
        };
        let mut seen = HashSet::new();

        for (theme, _, _) in occurrences {
            if seen.insert(theme.as_str()) {
                grouped
                    .entry(theme.as_str())
                    .or_insert_with(Vec::new)
                    .push(output.clone());
            }
        }
    }

    grouped
}

pub fn find_shortcut_for_theme(
    theme_data: &SourceTheme,
    duplicates: &DuplicatesMap,
) -> Option<String> {
    let mut best: Option<String> = None;
    let mut seen = HashSet::new();

    for translation in &theme_data.translations {
        if !translation.is_approved {
            continue;
        }
        let is_completion = translation.language_id == "-1";
        for candidate in formatted_translation(translation.text.as_deref(), is_completion) {
            if candidate.trim().is_empty() || is_special_string(&candidate) {
                continue;
            }
            if !seen.insert(candidate.clone()) {
                continue;
            }
            let replace = best
                .as_ref()
                .map(|current| {
                    cmp_shortcut_with_theme(&candidate, current, &theme_data.theme, |k| {
                        duplicate_index_cost(k, duplicates, &theme_data.theme)
                    })
                    .is_lt()
                })
                .unwrap_or(true);
            if replace {
                best = Some(candidate);
            }
        }
    }
    let best = best?;
    let min_theme_len = formatted_translation(Some(&theme_data.theme), false)
        .into_iter()
        .map(|t| t.len())
        .min()
        .unwrap_or(usize::MAX);

    if best.len() >= min_theme_len {
        None
    } else {
        Some(best)
    }
}

pub fn generate_output(
    all_translations: &[SourceTheme],
    config: &Config,
    duplicates: &DuplicatesMap,
) -> Vec<OutputTheme> {
    let lang_map: HashMap<&str, &str> = config
        .target_languages
        .iter()
        .map(|lang| (lang.id.as_str(), lang.code.as_str()))
        .collect();
    let multiwords_by_theme = build_multiwords_by_theme(duplicates);

    all_translations
        .par_iter()
        .map(|theme_data| {
            let shortcut = find_shortcut_for_theme(theme_data, duplicates);
            let mut multiwords = multiwords_by_theme
                .get(theme_data.theme.as_str())
                .cloned()
                .unwrap_or_default();

            multiwords.sort_by(|a, b| {
                b.occurrences
                    .len()
                    .cmp(&a.occurrences.len())
                    .then_with(|| cmp_shortcut(&a.multiword, &b.multiword))
                    .then_with(|| a.multiword.cmp(&b.multiword))
            });

            let mut translations = IndexMap::new();
            for translation in &theme_data.translations {
                let Some(code) = lang_map.get(translation.language_id.as_str()) else {
                    continue;
                };

                translations.insert(
                    (*code).to_string(),
                    OutputTranslation {
                        translation: translation.text.clone(),
                        is_approved: translation.is_approved,
                        approved_at: translation.approved_at.clone(),
                    },
                );
            }

            OutputTheme {
                id: theme_data.id.clone(),
                theme: theme_data.theme.clone(),
                shortcut,
                multiwords,
                translations,
            }
        })
        .collect()
}

pub fn write_json_pretty<T: serde::Serialize>(path: &Path, value: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("failed to create directory {}", parent.display()))?;
    }

    let file =
        fs::File::create(path).with_context(|| format!("failed to create {}", path.display()))?;
    serde_json::to_writer_pretty(file, value)
        .with_context(|| format!("failed to write JSON {}", path.display()))
}

pub fn write_versions(path: &Path) -> Result<()> {
    let mut obj = Map::new();
    obj.insert(
        "last_updated".to_string(),
        Value::String(Local::now().format("%Y/%m/%d").to_string()),
    );
    write_json_pretty(path, &obj)
}

#[cfg(test)]
mod tests {
    use crate::analysis::typing::calculate_typing_complexity;

    #[test]
    fn test_typing_bonus_used_in_sort() {
        let a = calculate_typing_complexity("orage", Some("orange"));
        let b = calculate_typing_complexity("qzx/", Some("orange"));
        assert!(a < b);
    }
}
