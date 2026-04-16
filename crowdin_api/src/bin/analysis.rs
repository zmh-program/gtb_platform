use anyhow::{bail, Context, Result};
use crowdin_api::analysis::duplicates::find_duplicate_translations;
use crowdin_api::analysis::generate::{generate_output, write_json_pretty, write_versions};
use crowdin_api::analysis::load::{load_inputs, resolve_analysis_paths};
use crowdin_api::common::crowdin_api_dir;
use serde::Serialize;
use std::env;
use std::path::PathBuf;

#[derive(Debug)]
struct Args {
    dry_run: bool,
    json: bool,
    out_dir: Option<PathBuf>,
}

#[derive(Debug, Serialize)]
struct AnalysisRunReport {
    dry_run: bool,
    source_input: String,
    output_translations: String,
    output_versions: String,
    filtered_theme_count: usize,
    duplicate_group_count: usize,
    output_theme_count: usize,
}

fn parse_args() -> Result<Args> {
    let mut dry_run = false;
    let mut json = false;
    let mut out_dir = None;
    let raw: Vec<String> = env::args().skip(1).collect();
    let mut i = 0;
    while i < raw.len() {
        match raw[i].as_str() {
            "--dry-run" => dry_run = true,
            "--json" => json = true,
            "--out-dir" => {
                out_dir =
                    Some(PathBuf::from(raw.get(i + 1).ok_or_else(|| {
                        anyhow::anyhow!("--out-dir requires a path")
                    })?));
                i += 1;
            }
            "--help" | "-h" => {
                println!(
                    "Usage: cargo run --bin analysis -- [--dry-run] [--json] [--out-dir <dir>]"
                );
                std::process::exit(0);
            }
            other => bail!("Unknown argument: {}", other),
        }
        i += 1;
    }
    Ok(Args {
        dry_run,
        json,
        out_dir,
    })
}

fn main() -> Result<()> {
    let args = parse_args()?;
    let crowdin_api_dir = crowdin_api_dir()?;
    let paths = resolve_analysis_paths(args.out_dir.as_deref())?;

    let inputs = load_inputs(&crowdin_api_dir, &paths).context("failed to load analysis inputs")?;
    let duplicates =
        find_duplicate_translations(&inputs.all_translations, &inputs.config, &inputs.polyfill);
    let output = generate_output(&inputs.all_translations, &inputs.config, &duplicates);

    let report = AnalysisRunReport {
        dry_run: args.dry_run,
        source_input: paths.source_input.display().to_string(),
        output_translations: paths.output_translations.display().to_string(),
        output_versions: paths.output_versions.display().to_string(),
        filtered_theme_count: inputs.all_translations.len(),
        duplicate_group_count: duplicates.len(),
        output_theme_count: output.len(),
    };

    if !args.dry_run {
        write_json_pretty(&paths.output_translations, &output)
            .context("failed to write translations-data.json")?;
        write_versions(&paths.output_versions).context("failed to write versions.json")?;
    }

    if args.json {
        println!("{}", serde_json::to_string_pretty(&report)?);
    } else {
        println!("Analysis completed.");
        println!("  source: {}", report.source_input);
        println!("  output translations: {}", report.output_translations);
        println!("  output versions: {}", report.output_versions);
        println!("  filtered themes: {}", report.filtered_theme_count);
        println!("  duplicate groups: {}", report.duplicate_group_count);
        println!("  output themes: {}", report.output_theme_count);
        if args.dry_run {
            println!("  mode: dry-run (no files written)");
        }
    }

    Ok(())
}
