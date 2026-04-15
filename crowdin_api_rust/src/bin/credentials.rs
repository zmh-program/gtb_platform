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
use futures::{SinkExt, StreamExt};
use reqwest::header::{COOKIE, CONTENT_TYPE};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use tokio::time::{sleep, Duration as TokioDuration};
use tokio_tungstenite::{connect_async, tungstenite::Message};

const CROWDIN_URL: &str = "https://crowdin.com/";
const CROWDIN_PROJECT_INFO_URL: &str = "https://crowdin.com/backend/project/hypixel/info";
const DEVTOOLS_HOST: &str = "127.0.0.1";

#[derive(Debug, Clone)]
struct Args {
    cookie: Option<String>,
    csrf_token: Option<String>,
    open: bool,
    env_file: Option<PathBuf>,
    print_only: bool,
    browser: Option<String>,
    chrome_profile: Option<String>,
    user_data_dir: Option<PathBuf>,
    timeout_secs: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum BrowserMode {
    Chrome,
    Edge,
    Firefox,
    Safari,
    All,
}

#[derive(Debug, Deserialize)]
struct DevtoolsTarget {
    #[serde(rename = "type")]
    kind: String,
    url: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    websocket_debugger_url: Option<String>,
}

#[derive(Debug)]
struct BrowserProcess {
    child: Option<Child>,
}

impl BrowserProcess {
    fn spawn(executable: &Path, args: &[String]) -> Result<Self> {
        let child = Command::new(executable)
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .with_context(|| format!("failed to launch browser {}", executable.display()))?;
        Ok(Self { child: Some(child) })
    }

    fn ensure_running(&mut self) -> Result<()> {
        if let Some(child) = &mut self.child {
            if let Some(status) = child.try_wait().context("failed to inspect browser process")? {
                bail!("browser process exited early with status {}", status);
            }
        }
        Ok(())
    }
}

impl Drop for BrowserProcess {
    fn drop(&mut self) {
        if let Some(child) = &mut self.child {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

struct CdpConnection {
    stream: tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>,
    next_id: u64,
}

impl CdpConnection {
    async fn connect(ws_url: &str) -> Result<Self> {
        let (stream, _) = connect_async(ws_url)
            .await
            .with_context(|| format!("failed to connect to devtools target {ws_url}"))?;
        Ok(Self { stream, next_id: 1 })
    }

    async fn command(&mut self, method: &str, params: Value) -> Result<Value> {
        let id = self.next_id;
        self.next_id += 1;
        self.stream
            .send(Message::Text(json!({"id": id, "method": method, "params": params}).to_string()))
            .await
            .with_context(|| format!("failed to send devtools command {method}"))?;

        while let Some(message) = self.stream.next().await {
            let message = message.context("failed to receive devtools response")?;
            match message {
                Message::Text(text) => {
                    let value: Value = serde_json::from_str(&text)
                        .with_context(|| format!("failed to parse devtools JSON for {method}"))?;
                    if value.get("id").and_then(Value::as_u64) != Some(id) {
                        continue;
                    }
                    if let Some(error) = value.get("error") {
                        bail!("devtools command {method} failed: {error}");
                    }
                    return Ok(value.get("result").cloned().unwrap_or(Value::Null));
                }
                Message::Close(_) => bail!("devtools connection closed while waiting for {method}"),
                _ => {}
            }
        }

        bail!("devtools connection ended while waiting for {method}")
    }
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
        user_data_dir: None,
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
            "--user-data-dir" => {
                args.user_data_dir = Some(PathBuf::from(
                    raw.get(i + 1)
                        .cloned()
                        .ok_or_else(|| anyhow!("--user-data-dir requires a path"))?,
                ));
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
                    "Usage: cargo run --bin credentials -- [--open] [--browser chrome|edge|firefox|safari|all] [--chrome-profile <name>] [--user-data-dir <dir>] [--timeout <secs>] [--cookie <value>] [--csrf-token <value>] [--print-only]"
                );
                std::process::exit(0);
            }
            other => bail!("Unknown argument: {}", other),
        }
        i += 1;
    }

    Ok(args)
}

fn parse_browser_mode(raw: Option<&str>) -> Result<BrowserMode> {
    match raw.unwrap_or("chrome").trim().to_lowercase().as_str() {
        "chrome" | "chromium" => Ok(BrowserMode::Chrome),
        "edge" => Ok(BrowserMode::Edge),
        "firefox" => Ok(BrowserMode::Firefox),
        "safari" => Ok(BrowserMode::Safari),
        "all" => Ok(BrowserMode::All),
        other => bail!("Unsupported browser: {}", other),
    }
}

fn default_user_data_dir(repo_paths: &RepoPaths, args: &Args) -> PathBuf {
    args.user_data_dir
        .clone()
        .or_else(|| env::var("CROWDIN_USER_DATA_DIR").ok().map(PathBuf::from))
        // Match browser_script.py so the browser login profile is shared across Python and Rust.
        .unwrap_or_else(|| repo_paths.repo_root.join(".tmp").join("crowdin_pw_profile"))
}

fn crowdin_url() -> String {
    env::var("CROWDIN_URL").unwrap_or_else(|_| CROWDIN_URL.to_string())
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
        format!("{}d {}h {}m (until {})", days, hours, mins, exp_dt.to_rfc3339())
    } else {
        format!("{}h {}m (until {})", diff.num_hours(), mins, exp_dt.to_rfc3339())
    }
}

fn quote_env_value(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn build_cookie_header(cookies: &[Value]) -> Option<String> {
    let parts: Vec<String> = cookies
        .iter()
        .filter(|cookie| {
            cookie
                .get("domain")
                .and_then(Value::as_str)
                .is_some_and(|domain| domain.ends_with("crowdin.com"))
        })
        .filter_map(|cookie| {
            Some(format!(
                "{}={}",
                cookie.get("name")?.as_str()?,
                cookie.get("value")?.as_str()?
            ))
        })
        .collect();

    if parts.is_empty() {
        None
    } else {
        Some(parts.join("; "))
    }
}

fn extract_credentials_from_cookies(cookies: &[Value]) -> Option<(String, String)> {
    let cookie_header = build_cookie_header(cookies)?;
    let token = cookies.iter().find_map(|cookie| {
        (cookie.get("name").and_then(Value::as_str) == Some("token"))
            .then(|| cookie.get("value").and_then(Value::as_str))
            .flatten()
            .map(str::to_string)
    })?;
    let csrf = cookies.iter().find_map(|cookie| {
        (cookie.get("name").and_then(Value::as_str) == Some("csrf_token"))
            .then(|| cookie.get("value").and_then(Value::as_str))
            .flatten()
            .map(str::to_string)
    })?;

    let now = Utc::now().timestamp();
    let token_valid = extract_exp(&token).is_some_and(|exp| exp > now);
    let csrf_valid = extract_exp(&csrf).map(|exp| exp > now).unwrap_or(true);

    if token_valid && csrf_valid {
        Some((cookie_header, csrf))
    } else {
        None
    }
}

fn find_free_port() -> Result<u16> {
    let listener = TcpListener::bind((DEVTOOLS_HOST, 0)).context("failed to reserve a free port")?;
    let port = listener.local_addr().context("failed to inspect free port")?.port();
    drop(listener);
    Ok(port)
}

fn first_existing(paths: &[&str]) -> Option<PathBuf> {
    paths.iter().map(PathBuf::from).find(|path| path.exists())
}

fn find_in_path(candidates: &[&str]) -> Option<PathBuf> {
    let resolver = if cfg!(windows) { "where" } else { "which" };
    for candidate in candidates {
        let Ok(output) = Command::new(resolver).arg(candidate).output() else {
            continue;
        };
        if !output.status.success() {
            continue;
        }
        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        let Some(line) = stdout
            .lines()
            .find(|line| !line.trim().is_empty())
        else {
            continue;
        };
        let path = PathBuf::from(line.trim());
        if path.exists() {
            return Some(path);
        }
    }
    None
}

fn resolve_browser_executable(mode: BrowserMode) -> Result<PathBuf> {
    if let Ok(path) = env::var("CROWDIN_BROWSER_PATH") {
        let path = PathBuf::from(path);
        if path.exists() {
            return Ok(path);
        }
    }

    let mac = match mode {
        BrowserMode::Chrome => vec![
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
        ],
        BrowserMode::Edge => vec![
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta",
        ],
        _ => Vec::new(),
    };
    if let Some(path) = first_existing(&mac) {
        return Ok(path);
    }

    let linux = match mode {
        BrowserMode::Chrome => vec!["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"],
        BrowserMode::Edge => vec!["microsoft-edge", "microsoft-edge-stable", "microsoft-edge-beta"],
        _ => Vec::new(),
    };
    if let Some(path) = find_in_path(&linux) {
        return Ok(path);
    }

    #[cfg(target_os = "windows")]
    {
        let windows = match mode {
            BrowserMode::Chrome => vec![
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            ],
            BrowserMode::Edge => vec![
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            ],
            _ => Vec::new(),
        };
        if let Some(path) = first_existing(&windows) {
            return Ok(path);
        }
    }

    bail!("failed to locate a supported browser executable")
}

fn launch_args(url: &str, port: u16, user_data_dir: &Path, profile: Option<&str>) -> Vec<String> {
    let mut args = vec![
        format!("--remote-debugging-port={port}"),
        format!("--user-data-dir={}", user_data_dir.display()),
        "--no-first-run".to_string(),
        "--no-default-browser-check".to_string(),
        "--disable-blink-features=AutomationControlled".to_string(),
        "--disable-features=DialMediaRouteProvider".to_string(),
        url.to_string(),
    ];
    if let Some(profile) = profile {
        args.push(format!("--profile-directory={profile}"));
    }
    args
}

async fn wait_for_devtools(port: u16, deadline: std::time::Instant) -> Result<()> {
    let client = reqwest::Client::new();
    let url = format!("http://{DEVTOOLS_HOST}:{port}/json/version");

    loop {
        if std::time::Instant::now() >= deadline {
            bail!("timed out waiting for browser devtools endpoint")
        }
        if let Ok(response) = client.get(&url).send().await {
            if response.status().is_success() {
                return Ok(());
            }
        }
        sleep(TokioDuration::from_millis(250)).await;
    }
}

async fn fetch_targets(port: u16) -> Result<Vec<DevtoolsTarget>> {
    let url = format!("http://{DEVTOOLS_HOST}:{port}/json/list");
    reqwest::Client::new()
        .get(url)
        .send()
        .await
        .context("failed to query browser targets")?
        .error_for_status()
        .context("browser targets request failed")?
        .json::<Vec<DevtoolsTarget>>()
        .await
        .context("failed to parse browser targets JSON")
}

async fn wait_for_page_target(port: u16, crowdin_url: &str, deadline: std::time::Instant) -> Result<DevtoolsTarget> {
    loop {
        if std::time::Instant::now() >= deadline {
            bail!("timed out waiting for browser page target")
        }
        let targets = fetch_targets(port).await?;
        if let Some(target) = targets.into_iter().find(|target| {
            target.kind == "page"
                && target.websocket_debugger_url.is_some()
                && (target.url.contains("crowdin.com") || target.url == "about:blank" || target.url.is_empty() || target.url == crowdin_url)
        }) {
            return Ok(target);
        }
        sleep(TokioDuration::from_millis(250)).await;
    }
}

async fn open_controlled_browser(
    mode: BrowserMode,
    repo_paths: &RepoPaths,
    args: &Args,
    crowdin_url: &str,
) -> Result<(BrowserProcess, u16)> {
    let user_data_dir = default_user_data_dir(repo_paths, args);
    fs::create_dir_all(&user_data_dir)
        .with_context(|| format!("failed to create {}", user_data_dir.display()))?;
    let port = find_free_port()?;
    let executable = resolve_browser_executable(mode)?;
    let launch = launch_args(crowdin_url, port, &user_data_dir, args.chrome_profile.as_deref());
    let process = BrowserProcess::spawn(&executable, &launch)?;
    Ok((process, port))
}

async fn wait_for_cdp_credentials(
    process: &mut BrowserProcess,
    port: u16,
    crowdin_url: &str,
    timeout_secs: u64,
) -> Result<(String, String)> {
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(timeout_secs);
    wait_for_devtools(port, deadline).await?;

    let mut websocket_url = String::new();
    let mut connection = None;

    loop {
        process.ensure_running()?;
        if std::time::Instant::now() >= deadline {
            bail!("Timed out waiting for Crowdin credentials in controlled browser")
        }

        let target = wait_for_page_target(port, crowdin_url, deadline).await?;
        let target_ws = target
            .websocket_debugger_url
            .clone()
            .ok_or_else(|| anyhow!("missing page websocket URL"))?;

        if websocket_url != target_ws {
            websocket_url = target_ws.clone();
            let mut client = CdpConnection::connect(&target_ws).await?;
            let _ = client.command("Page.enable", json!({})).await?;
            let _ = client.command("Network.enable", json!({})).await?;
            if target.url != crowdin_url {
                let _ = client.command("Page.navigate", json!({"url": crowdin_url})).await?;
            }
            connection = Some(client);
        }

        let client = connection
            .as_mut()
            .ok_or_else(|| anyhow!("missing devtools connection"))?;
        let result = client
            .command("Network.getCookies", json!({"urls": [crowdin_url]}))
            .await?;
        let cookies = result
            .get("cookies")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default();
        if let Some(credentials) = extract_credentials_from_cookies(&cookies) {
            return Ok(credentials);
        }

        sleep(TokioDuration::from_secs(1)).await;
    }
}

async fn wait_for_cookie_store_credentials(args: &Args, crowdin_url: &str) -> Result<(String, String)> {
    if args.open {
        webbrowser::open(crowdin_url).context("failed to open browser")?;
    }

    let browsers = match parse_browser_mode(args.browser.as_deref())? {
        BrowserMode::Chrome => vec![BrowserName::Chrome],
        BrowserMode::Edge => vec![BrowserName::Edge],
        BrowserMode::Firefox => vec![BrowserName::Firefox],
        BrowserMode::Safari => vec![BrowserName::Safari],
        BrowserMode::All => vec![
            BrowserName::Chrome,
            BrowserName::Edge,
            BrowserName::Firefox,
            BrowserName::Safari,
        ],
    };
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(args.timeout_secs);

    loop {
        let result = get_cookies(
            GetCookiesOptions::new(crowdin_url)
                .browsers(browsers.clone())
                .mode(CookieMode::First)
                .names(vec!["token".into(), "csrf_token".into()]),
        )
        .await;
        let cookie_header = to_cookie_header(&result.cookies, &CookieHeaderOptions::default());
        let cookies: Vec<Value> = result
            .cookies
            .into_iter()
            .map(|cookie| {
                json!({
                    "name": cookie.name,
                    "value": cookie.value,
                    "domain": cookie.domain,
                    "path": cookie.path,
                })
            })
            .collect();

        if let Some((_, csrf)) = extract_credentials_from_cookies(&cookies) {
            if !cookie_header.is_empty() {
                return Ok((cookie_header, csrf));
            }
        }

        if std::time::Instant::now() >= deadline {
            bail!("Timed out waiting for Crowdin credentials in browser cookies")
        }

        sleep(TokioDuration::from_secs(1)).await;
    }
}

async fn wait_for_browser_credentials(args: &Args, repo_paths: &RepoPaths) -> Result<(String, String)> {
    let crowdin_url = crowdin_url();
    match parse_browser_mode(args.browser.as_deref())? {
        mode @ (BrowserMode::Chrome | BrowserMode::Edge) => {
            let (mut process, port) = open_controlled_browser(mode, repo_paths, args, &crowdin_url).await?;
            wait_for_cdp_credentials(&mut process, port, &crowdin_url, args.timeout_secs).await
        }
        BrowserMode::Firefox | BrowserMode::Safari | BrowserMode::All => {
            wait_for_cookie_store_credentials(args, &crowdin_url).await
        }
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
        // Hypixel access is tied to joining at least one target language group.
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

    let mut cookie = args.cookie.clone().or_else(|| env::var("CROWDIN_COOKIE").ok());
    let mut csrf = args
        .csrf_token
        .clone()
        .or_else(|| env::var("CROWDIN_CSRF_TOKEN").ok());

    if cookie.is_none() || csrf.is_none() {
        let mut wait_args = args.clone();
        if !wait_args.open {
            wait_args.open = true;
        }
        let (detected_cookie, detected_csrf) = wait_for_browser_credentials(&wait_args, &repo_paths).await?;
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
    use std::time::{SystemTime, UNIX_EPOCH};

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
    fn test_parse_browser_mode() {
        assert_eq!(parse_browser_mode(None).unwrap(), BrowserMode::Chrome);
        assert_eq!(parse_browser_mode(Some("edge")).unwrap(), BrowserMode::Edge);
        assert_eq!(parse_browser_mode(Some("all")).unwrap(), BrowserMode::All);
    }

    #[test]
    fn test_joined_groups() {
        let groups = joined_groups(&[
            serde_json::json!({"name": "Chinese Simplified", "id": 55, "can_join": false}),
            serde_json::json!({"name": "German", "id": 11, "can_join": true}),
        ]);
        assert_eq!(groups, vec!["Chinese Simplified (55)".to_string()]);
    }

    #[test]
    fn test_extract_credentials_from_cdp_cookies() {
        let token = "eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.";
        let csrf = "eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.";
        let cookies = vec![
            json!({"name": "token", "value": token, "domain": ".crowdin.com"}),
            json!({"name": "csrf_token", "value": csrf, "domain": ".crowdin.com"}),
            json!({"name": "other", "value": "1", "domain": ".crowdin.com"}),
        ];
        let (cookie, csrf_value) = extract_credentials_from_cookies(&cookies).unwrap();
        assert!(cookie.contains("token="));
        assert!(cookie.contains("csrf_token="));
        assert_eq!(csrf_value, csrf);
    }

    #[test]
    fn test_launch_args() {
        let mut dir = std::env::temp_dir();
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        dir.push(format!("crowdin_browser_profile_{}", nanos));
        let args = launch_args("https://crowdin.com/", 9222, &dir, Some("Default"));
        assert!(args.iter().any(|arg| arg == "--remote-debugging-port=9222"));
        assert!(args.iter().any(|arg| arg.contains("--user-data-dir=")));
        assert!(args.iter().any(|arg| arg == "--profile-directory=Default"));
    }
}
