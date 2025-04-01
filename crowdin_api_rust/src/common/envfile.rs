use anyhow::{Context, Result};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

pub fn update_env_file(path: &Path, updates: &BTreeMap<String, String>) -> Result<()> {
    let mut final_lines = Vec::new();
    let mut found = BTreeMap::<String, bool>::new();

    if path.exists() {
        let content =
            fs::read_to_string(path).with_context(|| format!("failed to read {}", path.display()))?;
        for line in content.lines() {
            let key = line.split_once('=').map(|(k, _)| k.trim().to_string());
            if let Some(k) = key {
                if let Some(value) = updates.get(&k) {
                    final_lines.push(format!("{}={}", k, value));
                    found.insert(k, true);
                    continue;
                }
            }
            final_lines.push(line.to_string());
        }
    }

    for (k, v) in updates {
        if !found.contains_key(k) {
            final_lines.push(format!("{}={}", k, v));
        }
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("failed to create directory {}", parent.display()))?;
    }
    fs::write(path, format!("{}\n", final_lines.join("\n")))
        .with_context(|| format!("failed to write {}", path.display()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn test_update_env_file() {
        let mut tmp = std::env::temp_dir();
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        tmp.push(format!("crowdin_api_rust_env_test_{}.env", nanos));

        fs::write(&tmp, "A=1\nB=2\n").unwrap();

        let mut updates = BTreeMap::new();
        updates.insert("B".to_string(), "'updated'".to_string());
        updates.insert("C".to_string(), "'3'".to_string());
        update_env_file(&tmp, &updates).unwrap();

        let content = fs::read_to_string(&tmp).unwrap();
        assert!(content.contains("A=1"));
        assert!(content.contains("B='updated'"));
        assert!(content.contains("C='3'"));

        let _ = fs::remove_file(&tmp);
    }
}

