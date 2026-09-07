use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInput {
    pub name: String,
    pub kind: String,
    pub secret: String,
}

// #
// output

/// 읽어도 비밀값은 나오지 않는다 — 마스킹된 미리보기만.
#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub name: String,
    pub kind: String,
    pub preview: String,
    pub created_at: DateTime<Utc>,
}

/// 평문은 credential_read 스코프로만, 별도 요청에서만.
#[derive(Debug, Serialize, Deserialize)]
pub struct Revealed {
    pub secret: String,
}
