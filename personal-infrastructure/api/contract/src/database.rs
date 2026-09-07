use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Engine {
    Postgres,
    Mysql,
    Redis,
    Mongo,
    /// S3 호환 오브젝트 스토리지 — 카탈로그 항목. 접속 문자열은 s3://
    Minio,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Creating,
    Running,
    Stopped,
    Failed,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInput {
    pub name: String,
    pub engine: Engine,
    #[serde(default)]
    pub version: Option<String>,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub name: String,
    pub engine: Engine,
    pub version: String,
    pub host_port: u16,
    pub status: Status,
    pub created_at: DateTime<Utc>,
}

/// 카탈로그 — 무엇을 띄울 수 있나.
#[derive(Debug, Serialize, Deserialize)]
pub struct EngineInfo {
    pub engine: Engine,
    pub image: String,
    pub default_version: String,
    pub description: String,
}

/// 접속 문자열은 별도 요청에서만 — 목록에는 비밀값이 실리지 않는다.
#[derive(Debug, Serialize, Deserialize)]
pub struct Connection {
    pub url: String,
}

/// 접속 문자열을 프로젝트 env 에 secret 으로 넣는다. 호출자는 값을 보지 못한다.
#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectInput {
    pub project_id: Uuid,
    /// 비우면 DATABASE_URL (minio 는 S3_URL)
    #[serde(default)]
    pub key: Option<String>,
}
