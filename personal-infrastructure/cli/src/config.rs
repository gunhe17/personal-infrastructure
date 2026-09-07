use std::path::PathBuf;

use serde::Deserialize;
use serde::Serialize;

// #
// config

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Context {
    pub api_url: Option<String>,
    pub token: Option<String>,
}

pub fn path() -> PathBuf {
    let base = std::env::var("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".into())).join(".config")
        });

    base.join("personal-infrastructure").join("context.json")
}

pub fn load() -> Context {
    std::fs::read_to_string(path())
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

pub fn save(context: &Context) -> anyhow::Result<()> {
    let path = path();

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    std::fs::write(&path, serde_json::to_string_pretty(context)?)?;

    Ok(())
}

// #
// resolve

pub fn api_url() -> String {
    env("PI_API_URL")
        .or_else(|| load().api_url)
        .unwrap_or_else(|| "http://127.0.0.1:7878".to_owned())
}

pub fn token() -> Option<String> {
    env("PI_TOKEN").or_else(|| load().token)
}

fn env(key: &str) -> Option<String> {
    std::env::var(key).ok().filter(|value| !value.is_empty())
}
