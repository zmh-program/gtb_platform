use anyhow::{anyhow, bail, Context, Result};
use base64::engine::general_purpose::URL_SAFE;
use base64::Engine;
use chrono::{DateTime, Duration, TimeZone, Utc};
use cookie_scoop::{
    get_cookies, to_cookie_header, BrowserName, CookieHeaderOptions, CookieMode,
    GetCookiesOptions,
};
use crowdin_api_rust::common::envfile::update_env_file;
use crowdin_api_rust::common::paths::RepoPaths;
use reqwest::header::{COOKIE, CONTENT_TYPE};
use serde_json::Value;
use std::collections::BTreeMap;
use std::env;
use std::path::PathBuf;
use tokio::time::{sleep, Duration as TokioDuration};

const CROWDIN_URL: &str = "https://crowdin.com/";
const CROWDIN_PROJECT_INFO_URL: &str = "https://crowdin.com/backend/project/hypixel/info";

#[derive(Debug, Clone)]
struct Args {
    cookie: Option<String>,
    csrf_token: Option<String>,
    open: bool,
    env_file: Option<PathBuf>,
    print_only: bool,
    browser: Option<String>,
    chrome_profile: Option<String>,
    timeout_secs: u64,
}

fn parse_args() -> Result<Args> {
    let mut args = Args {
        cookie: None,
        csrf_token: None,
        open: false,
        env_file: None,
        print_only: false,
        browser: None,
        chrome_profile: None,
        timeout_secs: 300,
    };

    let raw: Vec<String> = env::args().skip(1).collect();
    let mut i = 0;
    while i < raw.len() {
        match raw[i].as_str() {
            "--cookie" => {
                args.cookie = Some(
                    raw.get(i + 1)
                        .cloned()
                        .ok_or_else(|| anyhow!("--cookie requires a value"))?,
                );
                i += 1;
            }
            "--csrf-token" => {
                args.csrf_token = Some(
                    raw.get(i + 1)
                        .cloned()
                        .ok_or_else(|| anyhow!("--csrf-token requires a value"))?,
                );
                i += 1;
            }
            "--open" => args.open = true,
            "--print-only" => args.print_only = true,
            "--env-file" => {
                args.env_file = Some(PathBuf::from(
                    raw.get(i + 1)
                        .cloned()
                        .ok_or_else(|| anyhow!("--env-file requires a path"))?,
                ));
                i += 1;
            }
            "--browser" => {
                args.browser = Some(
                    raw.get(i + 1)
                        .cloned()
                        .ok_or_else(|| anyhow!("--browser requires a value"))?,
                );
                i += 1;
            }
            "--chrome-profile" => {
                args.chrome_profile = Some(
                    raw.get(i + 1)
                        .cloned()
                        .ok_or_else(|| anyhow!("--chrome-profile requires a value"))?,
                );
                i += 1;
            }
            "--timeout" => {
                args.timeout_secs = raw
                    .get(i + 1)
                    .ok_or_else(|| anyhow!("--timeout requires seconds"))?
                    .parse()
                    .context("invalid --timeout value")?;
                i += 1;
            }
            "--help" | "-h" => {
                println!(
                    "Usage: cargo run --bin credentials -- [--open] [--browser chrome|edge|firefox|safari|all] [--chrome-profile <name>] [--timeout <secs>] [--cookie <value>] [--csrf-token <value>] [--print-only]"
                );
                std::process::exit(0);
            }
            other => bail!("Unknown argument: {}", other),
        }
        i += 1;
    }

    Ok(args)
}

fn decode_jwt_payload(token: &str) -> Option<Value> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let mut payload = parts[1].to_string();
    let padding = (4 - payload.len() % 4) % 4;
    if padding > 0 {
        payload.push_str(&"=".repeat(padding));
    }
    let bytes = URL_SAFE.decode(payload.as_bytes()).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn extract_exp(token: &str) -> Option<i64> {
    let exp = decode_jwt_payload(token)?.get("exp")?.clone();
    exp.as_i64().or_else(|| exp.as_f64().map(|value| value as i64))
}

fn format_expiry(exp: Option<i64>) -> String {
    let Some(exp) = exp else {
        return "unknown".to_string();
    };
    let Some(exp_dt): Option<DateTime<Utc>> = Utc.timestamp_opt(exp, 0).single() else {
        return "invalid".to_string();
    };
    let now = Utc::now();
    if exp_dt <= now {
        return format!("EXPIRED ({})", exp_dt.to_rfc3339());
    }
    let diff: Duration = exp_dt - now;
    let days = diff.num_days();
    let hours = diff.num_hours() % 24;
    let mins = diff.num_minutes() % 60;
    if days > 0 {
        format!(
            "{}d {}h {}m (until {})",
            days,
            hours,
            mins,
            exp_dt.to_rfc3339()
        )
    } else {
        format!(
            "{}h {}m (until {})",
            diff.num_hours(),
            mins,
            exp_dt.to_rfc3339()
        )
    }
}

fn quote_env_value(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn parse_browsers(raw: Option<&str>) -> Result<Vec<BrowserName>> {
    let raw = raw.unwrap_or("chrome");
    let mut browsers = Vec::new();
    for value in raw.split(',').map(|value| value.trim().to_lowercase()) {
        match value.as_str() {
            "chrome" => browsers.push(BrowserName::Chrome),
            "edge" => browsers.push(BrowserName::Edge),
            "firefox" => browsers.push(BrowserName::Firefox),
            "safari" => browsers.push(BrowserName::Safari),
            "all" => {
                browsers.extend([
                    BrowserName::Chrome,
                    BrowserName::Edge,
                    BrowserName::Firefox,
                    BrowserName::Safari,
                ]);
            }
            "" => {}
            other => bail!("Unsupported browser: {}", other),
        }
    }
    if browsers.is_empty() {
        bail!("No browser selected");
    }
    Ok(browsers)
}

async fn wait_for_browser_credentials(args: &Args) -> Result<(String, String)> {
    if args.open {
        webbrowser::open(CROWDIN_URL).context("failed to open browser")?;
    }

    let browsers = parse_browsers(args.browser.as_deref())?;
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(args.timeout_secs);

    loop {
        let mut options = GetCookiesOptions::new(CROWDIN_URL)
            .browsers(browsers.clone())
            .mode(CookieMode::First)
            .names(vec!["token".into(), "csrf_token".into()]);
        if let Some(profile) = &args.chrome_profile {
            options = options.chrome_profile(profile.clone());
        }

        let result = get_cookies(options).await;
        let cookie_header = to_cookie_header(&result.cookies, &CookieHeaderOptions::default());
        let mut token = None;
        let mut csrf = None;

        for cookie in result.cookies {
            match cookie.name.as_str() {
                "token" => token = Some(cookie.value),
                "csrf_token" => csrf = Some(cookie.value),
                _ => {}
            }
        }

        if let (Some(token), Some(csrf_token)) = (token, csrf) {
            let token_exp = extract_exp(&token);
            let csrf_exp = extract_exp(&csrf_token);
            let token_valid = token_exp.is_some_and(|exp| exp > Utc::now().timestamp());
            let csrf_valid =
                csrf_exp.map(|exp| exp > Utc::now().timestamp()).unwrap_or(true);
            if token_valid && csrf_valid && !cookie_header.is_empty() {
                return Ok((cookie_header, csrf_token));
            }
        }

        if std::time::Instant::now() >= deadline {
            bail!("Timed out waiting for Crowdin credentials in browser cookies");
        }

        sleep(TokioDuration::from_secs(1)).await;
    }
}

async fn fetch_project_languages(cookie: &str, csrf_token: &str) -> Result<Vec<Value>> {
    let client = reqwest::Client::new();
    let response = client
        .post(CROWDIN_PROJECT_INFO_URL)
        .header(COOKIE, cookie)
        .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
        .header("x-csrf-token", csrf_token)
        .send()
        .await
        .context("failed to fetch project info")?;

    let response = response
        .error_for_status()
        .context("project info request failed")?;
    let root: Value = response.json().await.context("failed to parse project info JSON")?;
    if !root.get("success").and_then(Value::as_bool).unwrap_or(false) {
        bail!("Crowdin project info returned unsuccessful response");
    }

    Ok(root
        .get("data")
        .and_then(|data| data.get("project"))
        .and_then(|project| project.get("target_languages"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default())
}

fn print_joined_groups(languages: &[Value]) {
    let joined = joined_groups(languages);

    if joined.is_empty() {
        println!("No joined translation group found for Crowdin project Hypixel.");
        return;
    }

    println!("Meta Language options: {}", joined.join(", "));
}

fn joined_groups(languages: &[Value]) -> Vec<String> {
    languages
        .iter()
        .filter(|language| !language.get("can_join").and_then(Value::as_bool).unwrap_or(true))
        .filter_map(|language| {
            Some(format!(
                "{} ({})",
                language.get("name")?.as_str()?,
                language.get("id")?.as_i64()?
            ))
        })
        .collect()
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = parse_args()?;
    let repo_paths = RepoPaths::from_cwd()?;
    let env_file = args
        .env_file
        .clone()
        .unwrap_or_else(|| repo_paths.crowdin_api_dir.join(".env"));

    if env_file.exists() {
        let _ = dotenvy::from_path(&env_file);
    } else {
        let _ = dotenvy::dotenv();
    }

    let mut cookie = args
        .cookie
        .clone()
        .or_else(|| env::var("CROWDIN_COOKIE").ok());
    let mut csrf = args
        .csrf_token
        .clone()
        .or_else(|| env::var("CROWDIN_CSRF_TOKEN").ok());

    if cookie.is_none() || csrf.is_none() {
        let mut wait_args = args.clone();
        if !wait_args.open {
            wait_args.open = true;
        }
        let (detected_cookie, detected_csrf) = wait_for_browser_credentials(&wait_args).await?;
        cookie.get_or_insert(detected_cookie);
        csrf.get_or_insert(detected_csrf);
    }

    let cookie = cookie.ok_or_else(|| anyhow!("missing Crowdin cookie"))?;
    let csrf = csrf.ok_or_else(|| anyhow!("missing Crowdin CSRF token"))?;

    println!(
        "Crowdin session token expiry: {}",
        format_expiry(
            cookie
                .split(';')
                .map(str::trim)
                .find(|part| part.starts_with("token="))
                .and_then(|part| part.split_once('=').map(|(_, value)| value))
                .and_then(extract_exp)
        )
    );
    println!("CSRF token expiry: {}", format_expiry(extract_exp(&csrf)));

    if !args.print_only {
        let mut updates = BTreeMap::new();
        updates.insert("CROWDIN_COOKIE".to_string(), quote_env_value(&cookie));
        updates.insert("CROWDIN_CSRF_TOKEN".to_string(), quote_env_value(&csrf));
        update_env_file(&env_file, &updates)?;
        println!("Updated credentials file: {}", env_file.display());
    }

    match fetch_project_languages(&cookie, &csrf).await {
        Ok(languages) => print_joined_groups(&languages),
        Err(error) => eprintln!("Warning: failed to fetch project info: {error}"),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_invalid_jwt() {
        assert!(decode_jwt_payload("bad").is_none());
    }

    #[test]
    fn test_quote_env_value() {
        assert_eq!(quote_env_value("abc"), "'abc'");
        assert_eq!(quote_env_value("a'b"), "'a''b'");
    }

    #[test]
    fn test_parse_browsers() {
        assert_eq!(parse_browsers(None).unwrap(), vec![BrowserName::Chrome]);
        assert_eq!(
            parse_browsers(Some("chrome,firefox")).unwrap(),
            vec![BrowserName::Chrome, BrowserName::Firefox]
        );
    }

    #[test]
    fn test_joined_groups() {
        let groups = joined_groups(&[
            serde_json::json!({"name": "Chinese Simplified", "id": 55, "can_join": false}),
            serde_json::json!({"name": "German", "id": 11, "can_join": true}),
        ]);
        assert_eq!(groups, vec!["Chinese Simplified (55)".to_string()]);
    }
}
