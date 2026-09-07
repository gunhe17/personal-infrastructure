use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DestinationKind {
    Local,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TargetKind {
    Database,
    Volume,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Running,
    Succeeded,
    Failed,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDestinationInput {
    pub name: String,
    pub kind: DestinationKind,
    pub location: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunInput {
    pub destination_id: Uuid,
    pub target_kind: TargetKind,
    pub target_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScheduleInput {
    pub destination_id: Uuid,
    pub target_kind: TargetKind,
    pub target_id: Uuid,
    pub every_seconds: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreInput {
    pub backup_id: Uuid,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct DestinationOutput {
    pub id: Uuid,
    pub name: String,
    pub kind: DestinationKind,
    pub location: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub target_kind: TargetKind,
    pub target_id: Option<Uuid>,
    pub artifact: Option<String>,
    pub size_bytes: Option<i64>,
    pub status: Status,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
}
