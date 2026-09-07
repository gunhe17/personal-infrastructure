pub mod repository;

use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobKind {
    Deploy,
    DatabaseCreate,
}

// #
// entity

#[derive(Debug, Clone)]
pub struct Job {
    pub id: Uuid,
    pub kind: JobKind,
    pub target_id: Uuid,
    pub created_at: DateTime<Utc>,
}

impl Job {
    // #
    // factory

    pub fn new(kind: JobKind, target_id: Uuid) -> Self {
        Self {
            id: Uuid::new_v4(),
            kind,
            target_id,
            created_at: Utc::now(),
        }
    }
}
