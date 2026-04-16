use anyhow::{bail, Context, Result};
use serde_json::Value;
use std::collections::{BTreeSet, HashMap};
use std::env;
use std::fs;
use std::path::PathBuf;

#[derive(Debug)]
struct Args {
    current: PathBuf,
    previous: PathBuf,
}

fn parse_args() -> Result<Args> {
    let mut current = None;
    let mut previous = None;
    let raw: Vec<String> = env::args().skip(1).collect();
    let mut i = 0;
    while i < raw.len() {
        match raw[i].as_str() {
            "--current" => {
                current = Some(PathBuf::from(
                    raw.get(i + 1).context("--current requires a path")?,
                ));
                i += 1;
            }
            "--previous" => {
                previous = Some(PathBuf::from(
                    raw.get(i + 1).context("--previous requires a path")?,
                ));
                i += 1;
            }
            "--help" | "-h" => {
                println!("Usage: cargo run --bin summary -- --current <file> --previous <file>");
                std::process::exit(0);
            }
            other => bail!("Unknown argument: {}", other),
        }
        i += 1;
    }

    Ok(Args {
        current: current.context("missing --current")?,
        previous: previous.context("missing --previous")?,
    })
}

fn load_items(path: &PathBuf) -> Result<Vec<Value>> {
    let content =
        fs::read_to_string(path).with_context(|| format!("failed to read {}", path.display()))?;
    serde_json::from_str(&content).with_context(|| format!("invalid JSON in {}", path.display()))
}

fn theme_map(items: Vec<Value>) -> HashMap<String, Value> {
    items
        .into_iter()
        .filter_map(|item| {
            let theme = item.get("theme").and_then(Value::as_str).map(str::to_owned);
            theme.map(|theme| (theme, item))
        })
        .collect()
}

fn translation_map(item: Option<&Value>) -> HashMap<String, Value> {
    item.and_then(|value| value.get("translations"))
        .and_then(Value::as_object)
        .map(|translations| {
            translations
                .iter()
                .map(|(language, translation)| (language.clone(), translation.clone()))
                .collect()
        })
        .unwrap_or_default()
}

fn change_counts(current: Vec<Value>, previous: Vec<Value>) -> (usize, usize) {
    let current_map = theme_map(current);
    let previous_map = theme_map(previous);
    let themes: BTreeSet<_> = current_map
        .keys()
        .chain(previous_map.keys())
        .cloned()
        .collect();

    let mut changed_themes = 0;
    let mut changed_translations = 0;

    for theme in themes {
        let current_item = current_map.get(&theme);
        let previous_item = previous_map.get(&theme);

        if current_item != previous_item {
            changed_themes += 1;
        }

        let current_translations = translation_map(current_item);
        let previous_translations = translation_map(previous_item);
        let languages: BTreeSet<_> = current_translations
            .keys()
            .chain(previous_translations.keys())
            .cloned()
            .collect();

        for language in languages {
            if current_translations.get(&language) != previous_translations.get(&language) {
                changed_translations += 1;
            }
        }
    }

    (changed_themes, changed_translations)
}

fn main() -> Result<()> {
    let args = parse_args()?;
    let current = load_items(&args.current)?;
    let previous = load_items(&args.previous)?;
    let (changed_themes, changed_translations) = change_counts(current, previous);

    println!(
        "commit_message=chore(crowdin): sync translations db ({} themes, {} translations)",
        changed_themes, changed_translations
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::change_counts;
    use serde_json::json;

    #[test]
    fn counts_theme_and_translation_changes() {
        let previous = vec![json!({
            "theme": "A",
            "translations": {
                "en": { "translation": "a" },
                "fr": { "translation": "b" }
            }
        })];
        let current = vec![
            json!({
                "theme": "A",
                "translations": {
                    "en": { "translation": "a" },
                    "fr": { "translation": "c" }
                }
            }),
            json!({
                "theme": "B",
                "translations": {
                    "en": { "translation": "x" }
                }
            }),
        ];

        let (themes, translations) = change_counts(current, previous);
        assert_eq!((themes, translations), (2, 2));
    }
}
