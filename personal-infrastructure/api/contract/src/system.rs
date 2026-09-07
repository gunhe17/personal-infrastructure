use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// port

#[derive(Debug, Serialize, Deserialize)]
pub struct Listener {
    pub port: u16,
    pub process: String,
    /// 0.0.0.0 이면 외부 노출, 127.0.0.1 이면 내부 전용
    pub address: String,
    pub public: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PortClaim {
    pub port: u16,
    pub project_id: Option<Uuid>,
    pub reason: String,
    /// 예약대장에는 있는데 실제로 아무도 안 듣고 있으면 false
    pub listening: bool,
}

// #
// issue

#[derive(Debug, Serialize, Deserialize)]
pub struct Issue {
    pub id: Uuid,
    pub scope: String,
    pub subject: String,
    pub severity: String,
    pub message: String,
}

// #
// doctor

/// `status` 가 "앱"이면 `doctor` 는 "박스".
#[derive(Debug, Serialize, Deserialize)]
pub struct Check {
    pub name: String,
    pub ok: bool,
    pub detail: String,
}

// #
// status

#[derive(Debug, Serialize, Deserialize)]
pub struct Status {
    pub version: String,
    pub projects: i64,
    pub running: i64,
    pub deployments_today: i64,
    pub open_issues: i64,
    pub edge_running: bool,
}

// #
// audit

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: i64,
    pub token_id: Option<Uuid>,
    pub source: String,
    pub action: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

// #
// setting

#[derive(Debug, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetSettingInput {
    pub key: String,
    pub value: serde_json::Value,
}

// #
// job

#[derive(Debug, Serialize, Deserialize)]
pub struct JobOutput {
    pub id: Uuid,
    pub kind: String,
    pub target_id: Uuid,
    pub status: String,
    pub attempts: i32,
    pub error: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}
