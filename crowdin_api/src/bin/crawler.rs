use anyhow::{anyhow, bail, Context, Result};
use crowdin_api::common::crowdin_api_dir;
use futures::{stream, StreamExt, TryStreamExt};
use indicatif::{ProgressBar, ProgressStyle};
use reqwest::{header, Client};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{self, IsTerminal};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

const CROWDIN_PHRASES_URL: &str = "https://crowdin.com/backend/phrases/phrases_with_suggestions";
const CROWDIN_ALL_LANG_URL: &str = "https://crowdin.com/backend/suggestions/all_languages";
const DEFAULT_CONCURRENCY: usize = 32;
const MAX_CONCURRENCY: usize = 64;
const PAGE_PROGRESS_STEP: usize = 5;
const THEME_PROGRESS_STEP: usize = 100;

fn progress_bar(total: usize, template: &str) -> ProgressBar {
    let progress = if io::stderr().is_terminal() {
        ProgressBar::new(total as u64)
    } else {
        ProgressBar::hidden()
    };
    progress.set_style(
        ProgressStyle::with_template(template)
            .expect("valid progress template")
            .progress_chars("=> "),
    );
    progress
}

fn crawler_concurrency() -> usize {
    env::var("CROWDIN_MAX_CONCURRENCY")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .map(|value| value.clamp(1, MAX_CONCURRENCY))
        .unwrap_or(DEFAULT_CONCURRENCY)
}

fn custom_filter_payload() -> String {
    // Keep this payload aligned with the request shape Crowdin accepts for bulk phrase queries.
    json!({
        "added_from": "",
        "added_to": "",
        "updated_from": "",
        "updated_to": "",
        "changed_from": "",
        "changed_to": "",
        "verbal_expression": "",
        "verbal_expression_scope": "translations",
        "translations": "",
        "duplicates": "",
        "tm_and_mt": "",
        "pre_translation": "",
        "approvals": "",
        "comments": "",
        "screenshots": "",
        "visibility": "",
        "qa_issues": "",
        "labels": [],
        "exclude_labels": [],
        "string_type": "",
        "votes": "",
        "votes_count": Value::Null,
        "translated_by_user": "",
        "not_translated_by_user": "",
        "approved_by_user": "",
        "not_approved_by_user": "",
        "approved_by_step": 0,
        "approved_step": 0,
        "sort_method": 0,
        "sort_ascending": 1,
        "em": 0,
        "croql_expression": "",
        "ai_query": ""
    })
    .to_string()
}

#[derive(Debug, Clone, Deserialize)]
struct Config {
    project_id: String,
    file_id: String,
    meta_language_id: String,
    target_languages: Vec<TargetLanguage>,
}

#[derive(Debug, Clone, Deserialize)]
struct TargetLanguage {
    id: String,
}

#[derive(Debug, Clone)]
struct Paths {
    env_file: PathBuf,
    config_file: PathBuf,
    output_file: PathBuf,
}

#[derive(Debug, Clone)]
struct Credentials {
    cookie: String,
    csrf_token: String,
}

#[derive(Debug, Clone)]
struct CrowdinCrawler {
    client: Client,
    creds: Arc<Credentials>,
    config: Arc<Config>,
    language_order: Arc<HashMap<String, usize>>,
}

#[derive(Debug, Clone)]
struct MetaItem {
    id: String,
    theme: String,
}

#[derive(Debug, Clone, Serialize)]
struct OutputTheme {
    id: Value,
    theme: String,
    translations: Vec<OutputTranslation>,
}

#[derive(Debug, Clone, Serialize)]
struct OutputTranslation {
    id: Option<String>,
    text: Option<String>,
    language_id: Option<String>,
    is_approved: bool,
    approved_by: Option<String>,
    approved_at: Option<String>,
}

impl CrowdinCrawler {
    fn new(config: Arc<Config>, creds: Arc<Credentials>) -> Result<Self> {
        let client = Client::builder()
            .build()
            .context("failed to build HTTP client")?;
        let language_order = config
            .target_languages
            .iter()
            .enumerate()
            .map(|(index, language)| (language.id.clone(), index))
            .collect();

        Ok(Self {
            client,
            creds,
            config,
            language_order: Arc::new(language_order),
        })
    }

    fn request_headers(&self) -> Result<header::HeaderMap> {
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::USER_AGENT,
            header::HeaderValue::from_static(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            ),
        );
        headers.insert(
            header::ACCEPT,
            header::HeaderValue::from_static("application/json, text/javascript, */*"),
        );
        headers.insert(
            header::CONTENT_TYPE,
            header::HeaderValue::from_static("application/x-www-form-urlencoded"),
        );
        headers.insert(
            "x-csrf-token",
            header::HeaderValue::from_str(&self.creds.csrf_token)
                .context("invalid csrf token header value")?,
        );
        headers.insert(
            header::COOKIE,
            header::HeaderValue::from_str(&self.creds.cookie)
                .context("invalid cookie header value")?,
        );
        Ok(headers)
    }

    async fn get_crowdin_page(&self, page: usize) -> Result<Value> {
        let payload = [
            ("project_id", self.config.project_id.clone()),
            ("target_language_id", self.config.meta_language_id.clone()),
            ("file_id", self.config.file_id.clone()),
            ("page", page.to_string()),
            ("filter", "0".to_string()),
            ("custom_filter", custom_filter_payload()),
            ("query", "".to_string()),
            ("request", "3".to_string()),
            ("search_option", "0".to_string()),
            ("case_sensitive", "false".to_string()),
            ("search_full_match", "false".to_string()),
            ("search_strict", "false".to_string()),
            ("view_in_context", "0".to_string()),
            ("multilingual_without_languages", "0".to_string()),
        ];

        let resp = self
            .client
            .post(CROWDIN_PHRASES_URL)
            .headers(self.request_headers()?)
            .form(&payload)
            .send()
            .await
            .context("request to phrases_with_suggestions failed")?;

        let status = resp.status();
        let text = resp
            .text()
            .await
            .context("failed to read phrases response body")?;

        if !status.is_success() {
            bail!("HTTP error {} from phrases endpoint: {}", status, text);
        }

        let root: Value =
            serde_json::from_str(&text).context("failed to parse phrases endpoint JSON")?;

        if root.get("error").and_then(Value::as_bool).unwrap_or(false) {
            let msg = root
                .get("msg")
                .and_then(Value::as_str)
                .unwrap_or("Unknown error");
            bail!("Crowdin phrases endpoint error: {}", msg);
        }

        let data = root
            .get("data")
            .cloned()
            .ok_or_else(|| anyhow!("No data found in phrases endpoint response"))?;

        Ok(data)
    }

    async fn get_all_languages_for_translation(&self, translation_id: &str) -> Result<Vec<Value>> {
        let payload = [
            ("project_id", self.config.project_id.clone()),
            ("translation_id", translation_id.to_string()),
            ("plural_id", "-1".to_string()),
            ("target_language_id", self.config.meta_language_id.clone()),
        ];

        let resp = self
            .client
            .post(CROWDIN_ALL_LANG_URL)
            .headers(self.request_headers()?)
            .form(&payload)
            .send()
            .await
            .context("request to all_languages failed")?;

        let status = resp.status();
        let text = resp
            .text()
            .await
            .context("failed to read all_languages response body")?;

        if !status.is_success() {
            bail!(
                "HTTP error {} from all_languages endpoint: {}",
                status,
                text
            );
        }

        let root: Value =
            serde_json::from_str(&text).context("failed to parse all_languages JSON")?;

        if root.get("error").and_then(Value::as_bool).unwrap_or(false) {
            let msg = root
                .get("msg")
                .and_then(Value::as_str)
                .unwrap_or("Unknown error");
            bail!("Crowdin all_languages endpoint error: {}", msg);
        }

        let data_obj = root
            .get("data")
            .and_then(Value::as_object)
            .ok_or_else(|| anyhow!("Missing `data` object in all_languages response"))?;

        if !data_obj
            .get("success")
            .and_then(Value::as_bool)
            .unwrap_or(true)
        {
            let msg = data_obj
                .get("msg")
                .and_then(Value::as_str)
                .unwrap_or("Unknown error");
            bail!("Crowdin all_languages `data.success` error: {}", msg);
        }

        // Crowdin can split joined-language results into `assistance` and `other`.
        let assistance = data_obj
            .get("assistance")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        let other = data_obj
            .get("other")
            .and_then(Value::as_array)
            .cloned()
            .ok_or_else(|| anyhow!("Missing `data.other` array in all_languages response"))?;
        let mut deduped = HashMap::new();

        for item in assistance.into_iter().chain(other) {
            let Some(language_id) = item.get("language_id").and_then(value_to_string_ref) else {
                continue;
            };
            deduped.entry(language_id).or_insert(item);
        }

        let mut merged: Vec<Value> = deduped.into_values().collect();
        // Preserve the configured target language order so downstream JSON stays diff-stable.
        merged.sort_by_key(|item| {
            item.get("language_id")
                .and_then(value_to_string_ref)
                .and_then(|language_id| self.language_order.get(&language_id).copied())
                .unwrap_or(self.language_order.len())
        });

        Ok(merged)
    }

    async fn crawl(&self) -> Result<Vec<OutputTheme>> {
        let started_at = Instant::now();
        let interactive = io::stderr().is_terminal();
        let concurrency = crawler_concurrency();
        let first_page = self.get_crowdin_page(1).await?;
        let total_pages = extract_positive_usize(&first_page, "pages")
            .context("invalid `pages` in first phrases response")?;
        extract_positive_usize(&first_page, "found")
            .context("invalid `found` in first phrases response")?;

        let mut meta_items = Vec::new();
        let mut meta_translations: HashMap<String, OutputTranslation> = HashMap::new();

        parse_page_phrases(
            &first_page,
            &self.config.meta_language_id,
            &mut meta_items,
            &mut meta_translations,
        )
        .context("failed to parse first page phrases")?;

        let page_bar = progress_bar(
            total_pages,
            "pages  [{bar:32.cyan/blue}] {pos:>3}/{len:3} {elapsed_precise}",
        );
        page_bar.set_position(1);
        if !interactive {
            eprintln!("crawler: using concurrency {concurrency}");
            eprintln!("crawler: fetched phrase pages 1/{total_pages}");
        }

        if total_pages > 1 {
            let pages: Vec<usize> = (2..=total_pages).collect();
            let page_progress = Arc::new(AtomicUsize::new(1));
            let page_bar = page_bar.clone();
            let page_results: Vec<(usize, Value)> = stream::iter(pages)
                .map(|page| {
                    let crawler = self.clone();
                    let page_progress = page_progress.clone();
                    let page_bar = page_bar.clone();
                    async move {
                        let data = crawler.get_crowdin_page(page).await?;
                        let done = page_progress.fetch_add(1, Ordering::Relaxed) + 1;
                        if interactive {
                            page_bar.set_position(done as u64);
                        } else if should_log_progress(done, total_pages, PAGE_PROGRESS_STEP) {
                            eprintln!("crawler: fetched phrase pages {done}/{total_pages}");
                        }
                        Ok::<(usize, Value), anyhow::Error>((page, data))
                    }
                })
                .buffer_unordered(concurrency)
                .try_collect()
                .await?;

            let mut page_results = page_results;
            page_results.sort_by_key(|(page, _)| *page);
            for (page, data) in page_results {
                parse_page_phrases(
                    &data,
                    &self.config.meta_language_id,
                    &mut meta_items,
                    &mut meta_translations,
                )
                .with_context(|| format!("failed to parse phrases page {}", page))?;
            }
        }
        if interactive {
            page_bar.finish_with_message(format!("pages  done ({total_pages} pages)"));
        }

        let items = Arc::new(meta_items);
        let meta_map = Arc::new(meta_translations);
        let theme_total = items.len();
        let theme_progress = Arc::new(AtomicUsize::new(0));
        let theme_bar = progress_bar(
            theme_total,
            "themes [{bar:32.green/blue}] {pos:>4}/{len:4} {elapsed_precise}",
        );

        if !interactive {
            eprintln!("crawler: fetching translations for {theme_total} themes");
        }

        let crawled: Vec<OutputTheme> = stream::iter(items.iter().cloned())
            .map(|item| {
                let crawler = self.clone();
                let meta_map = meta_map.clone();
                let theme_progress = theme_progress.clone();
                let theme_bar = theme_bar.clone();
                async move {
                    let meta_translation = meta_map.get(&item.id).cloned().ok_or_else(|| {
                        anyhow!("missing meta translation for item id {}", item.id)
                    })?;
                    let others = crawler
                        .get_all_languages_for_translation(&item.id)
                        .await
                        .with_context(|| format!("failed all_languages for id {}", item.id))?;
                    let output = build_output_theme(
                        item,
                        meta_translation,
                        others,
                        crawler.language_order.as_ref(),
                    )?;
                    let done = theme_progress.fetch_add(1, Ordering::Relaxed) + 1;
                    if interactive {
                        theme_bar.set_position(done as u64);
                    } else if should_log_progress(done, theme_total, THEME_PROGRESS_STEP) {
                        eprintln!("crawler: fetched theme translations {done}/{theme_total}");
                    }
                    Ok::<OutputTheme, anyhow::Error>(output)
                }
            })
            .buffer_unordered(concurrency)
            .try_collect()
            .await?;
        if interactive {
            theme_bar.finish_with_message(format!(
                "themes done ({} themes, {:.1}s)",
                crawled.len(),
                started_at.elapsed().as_secs_f32()
            ));
        }
        eprintln!(
            "crawler: completed {} themes in {:.1}s",
            crawled.len(),
            started_at.elapsed().as_secs_f32()
        );
        Ok(crawled)
    }
}

fn should_log_progress(done: usize, total: usize, step: usize) -> bool {
    done == 1 || done == total || done.is_multiple_of(step)
}

fn parse_page_phrases(
    page_data: &Value,
    meta_language_id: &str,
    meta_items: &mut Vec<MetaItem>,
    meta_translations: &mut HashMap<String, OutputTranslation>,
) -> Result<()> {
    let phrases = page_data
        .get("phrases")
        .and_then(Value::as_array)
        .ok_or_else(|| anyhow!("missing `phrases` array"))?;

    for phrase in phrases {
        let translation = phrase
            .get("translation")
            .and_then(Value::as_object)
            .ok_or_else(|| anyhow!("phrase missing `translation` object"))?;

        let id_value = translation
            .get("id")
            .ok_or_else(|| anyhow!("translation missing `id`"))?
            .clone();
        let id = value_to_string(&id_value).ok_or_else(|| anyhow!("invalid translation id"))?;
        let theme = translation
            .get("key")
            .and_then(Value::as_str)
            .ok_or_else(|| anyhow!("translation missing `key`"))?
            .to_string();

        meta_items.push(MetaItem {
            id: id.clone(),
            theme,
        });

        let suggestions = phrase
            .get("suggestions")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();

        let suggestion = suggestions
            .first()
            .cloned()
            .unwrap_or(Value::Object(Default::default()));
        let validation = suggestion
            .get("validations")
            .and_then(|v| v.get("2"))
            .cloned()
            .unwrap_or(Value::Object(Default::default()));

        let item = OutputTranslation {
            id: suggestion.get("id").and_then(value_to_string_ref),
            text: suggestion.get("text").and_then(value_to_string_ref),
            language_id: Some(meta_language_id.to_string()),
            is_approved: validation
                .get("approved")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            approved_by: validation.get("approved_by").and_then(value_to_string_ref),
            approved_at: validation
                .get("approved_date_iso")
                .and_then(value_to_string_ref),
        };

        meta_translations.insert(id, item);
    }

    Ok(())
}

fn build_output_theme(
    item: MetaItem,
    meta_translation: OutputTranslation,
    others: Vec<Value>,
    language_order: &HashMap<String, usize>,
) -> Result<OutputTheme> {
    let mut translations = Vec::with_capacity(others.len() + 1);
    // The phrases endpoint only gives the meta language suggestion for the current context.
    translations.push(meta_translation);

    for other in others {
        let approved = other
            .get("validations")
            .and_then(|v| v.get("2"))
            .cloned()
            .unwrap_or(Value::Object(Default::default()));

        translations.push(OutputTranslation {
            id: other.get("id").and_then(value_to_string_ref),
            text: other.get("text").and_then(value_to_string_ref),
            language_id: other.get("language_id").and_then(value_to_string_ref),
            is_approved: approved
                .get("approved")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            approved_by: approved.get("approved_by").and_then(value_to_string_ref),
            approved_at: approved
                .get("approved_date_iso")
                .and_then(value_to_string_ref),
        });
    }
    translations.sort_by_key(|translation| {
        translation
            .language_id
            .as_ref()
            .and_then(|language_id| language_order.get(language_id).copied())
            .unwrap_or(language_order.len())
    });

    Ok(OutputTheme {
        id: parse_id_value(&item.id),
        theme: item.theme,
        translations,
    })
}

fn parse_id_value(s: &str) -> Value {
    if let Ok(n) = s.parse::<u64>() {
        Value::Number(n.into())
    } else if let Ok(n) = s.parse::<i64>() {
        Value::Number(n.into())
    } else {
        Value::String(s.to_string())
    }
}

fn value_to_string(v: &Value) -> Option<String> {
    match v {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        Value::Bool(b) => Some(b.to_string()),
        Value::Null => None,
        _ => Some(v.to_string()),
    }
}

fn value_to_string_ref(v: &Value) -> Option<String> {
    value_to_string(v)
}

fn extract_positive_usize(v: &Value, key: &str) -> Result<usize> {
    let n = v
        .get(key)
        .and_then(Value::as_u64)
        .ok_or_else(|| anyhow!("missing `{}` as u64", key))?;
    if n == 0 {
        bail!("`{}` must be > 0", key);
    }
    Ok(n as usize)
}

fn read_json_file<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<T> {
    let raw =
        fs::read_to_string(path).with_context(|| format!("failed to read {}", path.display()))?;
    serde_json::from_str(&raw).with_context(|| format!("failed to parse JSON {}", path.display()))
}

fn parse_meta_language_id(raw: &str) -> String {
    if let Some(start) = raw.rfind('(') {
        if let Some(end) = raw.rfind(')') {
            if start < end {
                return raw[start + 1..end].to_string();
            }
        }
    }
    raw.to_string()
}

fn resolve_paths() -> Result<Paths> {
    let crowdin_api_dir = crowdin_api_dir()?;
    Ok(Paths {
        env_file: crowdin_api_dir.join(".env"),
        config_file: crowdin_api_dir.join("conf").join("config.json"),
        output_file: crowdin_api_dir.join("result").join("source.json"),
    })
}

fn load_credentials(env_file: &Path) -> Result<Credentials> {
    if env_file.exists() {
        let _ = dotenvy::from_path(env_file);
    } else {
        let _ = dotenvy::dotenv();
    }

    let cookie = env::var("CROWDIN_COOKIE")
        .context("missing CROWDIN_COOKIE (run credentials first or set env manually)")?;
    let csrf_token = env::var("CROWDIN_CSRF_TOKEN")
        .context("missing CROWDIN_CSRF_TOKEN (run credentials first or set env manually)")?;

    Ok(Credentials { cookie, csrf_token })
}

fn write_output(path: &Path, data: &[OutputTheme]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("failed to create output dir {}", parent.display()))?;
    }

    let file =
        fs::File::create(path).with_context(|| format!("failed to create {}", path.display()))?;
    serde_json::to_writer_pretty(file, data)
        .with_context(|| format!("failed to write JSON {}", path.display()))?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    let paths = resolve_paths()?;
    let mut config: Config = read_json_file(&paths.config_file)?;
    config.meta_language_id =
        parse_meta_language_id(&env::var("META_LANGUAGE_ID").unwrap_or(config.meta_language_id));
    let creds = load_credentials(&paths.env_file)?;

    let crawler = CrowdinCrawler::new(Arc::new(config), Arc::new(creds))?;
    let data = crawler.crawl().await?;
    write_output(&paths.output_file, &data)?;
    Ok(())
}
