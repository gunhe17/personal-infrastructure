use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// value

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceKind {
    Folder,
    Git,
    /// 이미지를 그대로 — 흡수(adopt)한 컨테이너. 감지·빌드 없이 pull 하고 띄운다
    Image,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Created,
    Deploying,
    Running,
    Failed,
    Stopped,
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInput {
    pub name: String,
    pub source_kind: SourceKind,
    pub source_ref: String,
    /// 컨테이너가 듣는 포트. 비우면 감지 결과를 쓴다.
    pub port: Option<u16>,
    /// 환경 묶음. 비우면 name — 프로젝트 하나짜리 그룹.
    #[serde(default)]
    pub group: Option<String>,
    /// production | staging | preview … 비우면 production.
    #[serde(default)]
    pub environment: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LimitsInput {
    pub cpus: Option<f32>,
    pub memory_mb: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvEntry {
    pub key: String,
    pub value: String,
    #[serde(default)]
    pub secret: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnvInput {
    pub entries: Vec<EnvEntry>,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub name: String,
    pub group: String,
    pub environment: String,
    pub source_kind: SourceKind,
    pub source_ref: String,
    pub stack: Option<String>,
    pub port: Option<u16>,
    pub status: Status,
    pub cpus: Option<f32>,
    pub memory_mb: Option<u32>,
    /// 지금 돌고 있는 배포의 커밋.
    pub commit: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// 상세는 원격 HEAD 까지 물어본다 — 목록에서는 하지 않는다(원격 호출).
#[derive(Debug, Serialize, Deserialize)]
pub struct Detail {
    #[serde(flatten)]
    pub project: Output,
    pub remote_commit: Option<String>,
}

/// 값은 secret 이면 마스킹. reveal 로만 평문.
#[derive(Debug, Serialize, Deserialize)]
pub struct EnvOutput {
    pub key: String,
    pub value: String,
    pub secret: bool,
}

/// 지우면 같이 사라지는 것 — 지우기 전에 보여준다.
#[derive(Debug, Serialize, Deserialize)]
pub struct RemovalPreview {
    pub container: String,
    pub ports: Vec<u16>,
    pub domains: Vec<String>,
    pub volumes: Vec<String>,
    pub git_linked: bool,
}
