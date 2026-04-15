use crate::analysis::types::{
    AnalysisInputs, AnalysisPaths, Config, SourceTheme, SourceTranslation,
};
use crate::common::repo_root;
use anyhow::{bail, Context, Result};
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn read_json_file<T: for<'de> serde::Deserialize<'de>>(path: &Path) -> Result<T> {
    let text =
        fs::read_to_string(path).with_context(|| format!("failed to read {}", path.display()))?;
    serde_json::from_str(&text).with_context(|| format!("failed to parse JSON {}", path.display()))
}

pub fn resolve_analysis_paths(out_dir: Option<&Path>) -> Result<AnalysisPaths> {
    let repo_root = repo_root()?;
    let source_input = repo_root
        .join("crowdin_api")
        .join("result")
        .join("source.json");
    let (output_translations, output_versions) = if let Some(out_dir) = out_dir {
        let cwd = env::current_dir().context("failed to read current dir")?;
        let base = if out_dir.is_absolute() {
            out_dir.to_path_buf()
        } else {
            cwd.join(out_dir)
        };
        (
            base.join("translations-data.json"),
            base.join("versions.json"),
        )
    } else if let Ok(translations_path) = env::var("GTB_RUST_OUTPUT_TRANSLATIONS") {
        let translations = PathBuf::from(translations_path);
        let versions = env::var("GTB_RUST_OUTPUT_VERSIONS")
            .map(PathBuf::from)
            .unwrap_or_else(|_| repo_root.join("lib").join("source").join("versions.json"));
        (translations, versions)
    } else {
        (
            repo_root
                .join("lib")
                .join("source")
                .join("translations-data.json"),
            repo_root.join("lib").join("source").join("versions.json"),
        )
    };

    Ok(AnalysisPaths {
        source_input,
        output_translations,
        output_versions,
    })
}

fn read_config(crowdin_api_dir: &Path) -> Result<Config> {
    read_json_file(&crowdin_api_dir.join("conf").join("config.json"))
}

fn read_themes(crowdin_api_dir: &Path) -> Result<Vec<String>> {
    read_json_file(&crowdin_api_dir.join("conf").join("themes.json"))
}

fn read_excluded_themes(crowdin_api_dir: &Path) -> Result<HashSet<String>> {
    let items: Vec<String> = read_json_file(&crowdin_api_dir.join("conf").join("exclude.json"))?;
    Ok(items.into_iter().collect())
}

fn read_completions(crowdin_api_dir: &Path) -> Result<HashMap<String, Vec<String>>> {
    read_json_file(&crowdin_api_dir.join("conf").join("completions.json"))
}

fn read_polyfill(crowdin_api_dir: &Path) -> Result<HashMap<String, HashMap<String, String>>> {
    read_json_file(&crowdin_api_dir.join("conf").join("polyfill.json"))
}

fn read_source(path: &Path) -> Result<Vec<SourceTheme>> {
    read_json_file(path)
}

fn mix_completions(theme: &SourceTheme, completions: &HashMap<String, Vec<String>>) -> SourceTheme {
    for (completion, themes) in completions {
        if themes.iter().any(|t| t == &theme.theme) {
            let mut translations = Vec::with_capacity(theme.translations.len() + 1);
            // completions.json is injected as pseudo-language `-1` / Complement.
            translations.push(SourceTranslation {
                id: "-1".to_string(),
                text: Some(completion.clone()),
                language_id: "-1".to_string(),
                is_approved: true,
                approved_at: Some(String::new()),
                approved_by: Some(String::new()),
            });
            translations.extend(theme.translations.clone());
            return SourceTheme {
                id: theme.id.clone(),
                theme: theme.theme.clone(),
                translations,
            };
        }
    }
    theme.clone()
}

fn filter_and_mix_translations(
    raw: Vec<SourceTheme>,
    valid_themes: &[String],
    excluded_themes: &HashSet<String>,
    completions: &HashMap<String, Vec<String>>,
) -> Vec<SourceTheme> {
    let valid_lower: HashSet<String> = valid_themes
        .iter()
        .map(|theme| theme.to_lowercase())
        .collect();
    // themes.json is the allowlist; exclude.json trims keys that should stay out of output.
    let mut out: Vec<SourceTheme> = raw
        .iter()
        .filter(|t| {
            valid_lower.contains(&t.theme.to_lowercase()) && !excluded_themes.contains(&t.theme)
        })
        .map(|t| mix_completions(t, completions))
        .collect();
    let found_lower: HashSet<String> = out.iter().map(|theme| theme.theme.to_lowercase()).collect();
    let missing: Vec<String> = valid_themes
        .iter()
        .filter(|theme| {
            !found_lower.contains(&theme.to_lowercase()) && !excluded_themes.contains(*theme)
        })
        .cloned()
        .collect();

    if !missing.is_empty() {
        println!(
            "Missing {} themes from Crowdin (polyfilled):",
            missing.len()
        );
        for theme in &missing {
            println!("  - {}", theme);
        }

        // Keep missing allowlist themes in output so generated JSON stays shape-stable.
        out.extend(missing.into_iter().map(|theme| SourceTheme {
            id: serde_json::Value::from(-1),
            theme,
            translations: Vec::new(),
        }));
    }

    out.sort_by(|a, b| a.theme.to_lowercase().cmp(&b.theme.to_lowercase()));
    out
}

pub fn load_inputs(crowdin_api_dir: &Path, paths: &AnalysisPaths) -> Result<AnalysisInputs> {
    if !paths.source_input.exists() {
        bail!(
            "Missing source crawl file: {} (run crawler first)",
            paths.source_input.display()
        );
    }

    let config = read_config(crowdin_api_dir)?;
    let valid_themes = read_themes(crowdin_api_dir)?;
    let excluded_themes = read_excluded_themes(crowdin_api_dir)?;
    let completions = read_completions(crowdin_api_dir)?;
    let polyfill = read_polyfill(crowdin_api_dir)?;
    let raw = read_source(&paths.source_input)?;
    let all_translations =
        filter_and_mix_translations(raw, &valid_themes, &excluded_themes, &completions);

    Ok(AnalysisInputs {
        config,
        polyfill,
        all_translations,
    })
}
