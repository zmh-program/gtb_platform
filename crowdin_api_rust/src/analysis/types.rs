use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::path::PathBuf;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub target_languages: Vec<TargetLanguage>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TargetLanguage {
    pub id: String,
    pub name: String,
    pub code: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SourceTheme {
    pub id: Value,
    pub theme: String,
    pub translations: Vec<SourceTranslation>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SourceTranslation {
    pub id: String,
    pub text: Option<String>,
    pub language_id: String,
    #[serde(default)]
    pub is_approved: bool,
    pub approved_at: Option<String>,
    pub approved_by: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OutputTheme {
    pub id: Value,
    pub theme: String,
    pub shortcut: Option<String>,
    pub multiwords: Vec<MultiwordOutput>,
    pub translations: BTreeMap<String, OutputTranslation>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MultiwordOutput {
    pub multiword: String,
    pub occurrences: Vec<OccurrenceOutput>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OccurrenceOutput {
    pub theme: String,
    pub reference: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct OutputTranslation {
    pub translation: String,
    pub is_approved: bool,
    pub approved_at: Option<String>,
}

pub type DuplicateEntry = (String, String, String); // (theme, language/ref, original_text)
pub type DuplicatesMap = BTreeMap<String, Vec<DuplicateEntry>>;

#[derive(Debug, Clone)]
pub struct AnalysisInputs {
    pub config: Config,
    pub themes_whitelist: HashSet<String>,
    pub excluded_themes: HashSet<String>,
    pub completions: HashMap<String, Vec<String>>,
    pub polyfill: HashMap<String, HashMap<String, String>>,
    pub all_translations: Vec<SourceTheme>,
}

#[derive(Debug, Clone)]
pub struct AnalysisPaths {
    pub source_input: PathBuf,
    pub output_translations: PathBuf,
    pub output_versions: PathBuf,
}

