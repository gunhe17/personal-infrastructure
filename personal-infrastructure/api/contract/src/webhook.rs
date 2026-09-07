use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Event {
    DeploySucceeded,
    DeployFailed,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInput {
    pub event: Event,
    pub url: String,
    /// 있으면 본문을 HMAC-SHA256 으로 서명해 `X-PI-Signature: sha256=<hex>` 로 보낸다
    #[serde(default)]
    pub secret: Option<String>,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub event: Event,
    pub url: String,
    pub signed: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Delivery {
    pub id: i64,
    pub status: Option<i32>,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
}
