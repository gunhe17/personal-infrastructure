use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// error

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Body {
    Client { error: String },
    Develop { error_id: Uuid },
}

impl Body {
    pub fn message(&self) -> String {
        match self {
            Self::Client { error } => error.clone(),
            Self::Develop { error_id } => {
                format!("서버 오류입니다. 로그를 확인하세요 (error_id: {error_id})")
            }
        }
    }
}
