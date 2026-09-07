use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusCount {
    pub status: i32,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PathCount {
    pub host: String,
    pub path: String,
    pub count: i64,
}

/// 엣지 access log 집계 — 지난 24시간.
#[derive(Debug, Serialize, Deserialize)]
pub struct Summary {
    pub since: DateTime<Utc>,
    pub total: i64,
    pub statuses: Vec<StatusCount>,
    pub top_paths: Vec<PathCount>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UsageRow {
    pub container: String,
    pub cpu_avg: f32,
    pub mem_max_bytes: i64,
    pub samples: i64,
}
