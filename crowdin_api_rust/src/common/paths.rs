use anyhow::{anyhow, bail, Context, Result};
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct RepoPaths {
    pub repo_root: PathBuf,
    pub crowdin_api_dir: PathBuf,
}

impl RepoPaths {
    pub fn from_cwd() -> Result<Self> {
        let crowdin_api_rust_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .canonicalize()
            .context("failed to resolve crowdin_api_rust directory")?;
        let repo_root = crowdin_api_rust_dir
            .parent()
            .map(PathBuf::from)
            .ok_or_else(|| anyhow!("failed to resolve repository root"))?;
        let crowdin_api_dir = repo_root.join("crowdin_api");

        if !crowdin_api_dir.join("conf").join("config.json").exists() {
            bail!(
                "Could not locate crowdin_api/conf/config.json under {}",
                repo_root.display()
            );
        }

        Ok(Self {
            repo_root,
            crowdin_api_dir,
        })
    }
}
