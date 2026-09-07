use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct LinkInput {
    pub project_id: Uuid,
    pub repository: String,
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default = "yes")]
    pub auto_deploy: bool,
}

fn yes() -> bool {
    true
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub project_id: Uuid,
    pub repository: String,
    pub branch: String,
    pub auto_deploy: bool,
    /// 이 URL 로 push 훅을 걸면 자동 재배포된다.
    pub webhook_path: String,
    pub webhook_secret: String,
}
