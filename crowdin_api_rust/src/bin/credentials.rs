use anyhow::{bail, Context, Result};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use chrono::{DateTime, Duration, TimeZone, Utc};
use crowdin_api_rust::common::envfile::update_env_file;
use crowdin_api_rust::common::paths::RepoPaths;
use serde_json::Value;
use std::collections::BTreeMap;
use std::env;
use std::path::PathBuf;

#[derive(Debug)]
struct Args {
    cookie: Option<String>,
    csrf_token: Option<String>,
    open: bool,
    env_file: Option<PathBuf>,
    print_only: bool,
}

fn parse_args() -> Result<Args> {
    let mut args = Args {
        cookie: None,
        csrf_token: None,
        open: false,
        env_file: None,
        print_only: false,
    };

    let raw: Vec<String> = env::args().skip(1).collect();
    let mut i = 0;
    while i < raw.len() {
        match raw[i].as_str() {
            "--cookie" => {
                args.cookie = Some(
                    raw.get(i + 1)
                        .cloned()
                        .ok_or_else(|| anyhow::anyhow!("--cookie requires a value"))?,
                );
                i += 1;
            }
            "--csrf-token" => {
                args.csrf_token = Some(
                    raw.get(i + 1)
                        .cloned()
                        .ok_or_else(|| anyhow::anyhow!("--csrf-token requires a value"))?,
                );
                i += 1;
            }
            "--open" => args.open = true,
            "--print-only" => args.print_only = true,
            "--env-file" => {
                args.env_file =
                    Some(PathBuf::from(raw.get(i + 1).cloned().ok_or_else(|| {
                        anyhow::anyhow!("--env-file requires a path")
                    })?));
                i += 1;
            }
            "--help" | "-h" => {
                print_help();
                std::process::exit(0);
            }
            other => bail!("Unknown argument: {}", other),
        }
        i += 1;
    }

    Ok(args)
}

fn print_help() {
    println!("crowdin_api_rust credentials helper");
    println!();
    println!("Usage:");
    println!("  cargo run --bin credentials -- [options]");
    println!();
    println!("Options:");
    println!("  --open                 Open crowdin.com in the default browser");
    println!("  --cookie <value>       Set CROWDIN_COOKIE");
    println!("  --csrf-token <value>   Set CROWDIN_CSRF_TOKEN");
    println!("  --env-file <path>      Override target .env file");
    println!("  --print-only           Print token status without writing .env");
    println!("  -h, --help             Show this help");
}

fn decode_jwt_payload(token: &str) -> Option<Value> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }
    let payload_b64 = parts[1];
    let bytes = URL_SAFE_NO_PAD.decode(payload_b64.as_bytes()).ok()?;
    serde_json::from_slice(&bytes).ok()
}

fn extract_exp(token: &str) -> Option<i64> {
    decode_jwt_payload(token)?
        .get("exp")
        .and_then(Value::as_i64)
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

fn main() -> Result<()> {
    let args = parse_args()?;
    let repo_paths = RepoPaths::from_cwd()?;
    let env_file = args
        .env_file
        .clone()
        .unwrap_or_else(|| repo_paths.crowdin_api_dir.join(".env"));

    if args.open {
        webbrowser::open("https://crowdin.com/")
            .context("failed to open browser to crowdin.com")?;
        println!("Opened https://crowdin.com/ in your default browser.");
    }

    let cookie = args.cookie.or_else(|| env::var("CROWDIN_COOKIE").ok());
    let csrf = args
        .csrf_token
        .or_else(|| env::var("CROWDIN_CSRF_TOKEN").ok());

    if cookie.is_none() && csrf.is_none() {
        println!(
            "No credentials provided. Use --cookie/--csrf-token or set environment variables."
        );
        println!(
            "Tip: run with --open to open Crowdin, then copy credentials manually from DevTools."
        );
        return Ok(());
    }

    if let Some(csrf_token) = csrf.as_deref() {
        let exp = extract_exp(csrf_token);
        println!("CSRF token expiry: {}", format_expiry(exp));
    } else {
        println!("CSRF token expiry: missing");
    }

    if let Some(cookie_value) = cookie.as_deref() {
        // Try extracting `token=` cookie JWT and display expiry if present.
        let token_cookie = cookie_value
            .split(';')
            .map(str::trim)
            .find(|p| p.starts_with("token="))
            .and_then(|p| p.split_once('=').map(|(_, v)| v));
        let exp = token_cookie.and_then(extract_exp);
        println!("Crowdin session token expiry: {}", format_expiry(exp));
    } else {
        println!("Crowdin session token expiry: missing");
    }

    if args.print_only {
        return Ok(());
    }

    let mut updates = BTreeMap::new();
    if let Some(cookie_value) = cookie {
        updates.insert("CROWDIN_COOKIE".to_string(), quote_env_value(&cookie_value));
    }
    if let Some(csrf_value) = csrf {
        updates.insert(
            "CROWDIN_CSRF_TOKEN".to_string(),
            quote_env_value(&csrf_value),
        );
    }

    if updates.is_empty() {
        bail!("Nothing to write: no cookie or csrf token provided");
    }

    update_env_file(&env_file, &updates)?;
    println!("Updated credentials file: {}", env_file.display());
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
}
