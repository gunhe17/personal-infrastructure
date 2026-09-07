use serde::Deserialize;
use serde::Serialize;

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct UpInput {
    /// Cloudflare Zero Trust 에서 만든 터널 토큰. 비우면 지난번 것
    #[serde(default)]
    pub token: Option<String>,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Status {
    pub running: bool,
    pub configured: bool,
}
