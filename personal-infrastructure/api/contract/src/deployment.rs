use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Queued,
    Detecting,
    Building,
    Starting,
    Running,
    Failed,
    Cancelled,
    Superseded,
}

impl Status {
    pub fn is_final(&self) -> bool {
        matches!(
            self,
            Self::Running | Self::Failed | Self::Cancelled | Self::Superseded
        )
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Trigger {
    Manual,
    Rollback,
    Webhook,
    /// 다른 환경이 빌드한 아티팩트를 그대로 올린다.
    Promote,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct StartInput {
    pub project_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RollbackInput {
    pub deployment_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PromoteInput {
    pub deployment_id: Uuid,
    pub target_project_id: Uuid,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub project_id: Uuid,
    pub status: Status,
    pub trigger: Trigger,
    pub stack: Option<String>,
    pub image_ref: Option<String>,
    pub host_port: Option<u16>,
    pub commit: Option<String>,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
}

// #
// stream

#[derive(Debug, Serialize, Deserialize)]
pub struct LogLine {
    pub id: i64,
    pub stream: String,
    pub line: String,
}
