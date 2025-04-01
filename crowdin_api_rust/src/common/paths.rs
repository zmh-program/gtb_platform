use anyhow::{bail, Context, Result};
use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct RepoPaths {
    pub repo_root: PathBuf,
    pub crowdin_api_dir: PathBuf,
    pub crowdin_api_rust_dir: PathBuf,
}

impl RepoPaths {
    pub fn from_cwd() -> Result<Self> {
        let cwd = env::current_dir().context("failed to read current directory")?;

        if cwd.join("crowdin_api").join("conf").join("config.json").exists() {
            return Ok(Self {
                repo_root: cwd.clone(),
                crowdin_api_dir: cwd.join("crowdin_api"),
                crowdin_api_rust_dir: cwd.join("crowdin_api_rust"),
            });
        }

        if cwd
            .join("..")
            .join("crowdin_api")
            .join("conf")
            .join("config.json")
            .exists()
        {
            let root = cwd
                .join("..")
                .canonicalize()
                .unwrap_or_else(|_| cwd.join(".."));
            return Ok(Self {
                repo_root: root.clone(),
                crowdin_api_dir: root.join("crowdin_api"),
                crowdin_api_rust_dir: root.join("crowdin_api_rust"),
            });
        }

        bail!(
            "Could not locate repository root from current directory: {}",
            cwd.display()
        );
    }
}

