use uuid::Uuid;

use crate::infrastructure::cipher::client as cipher;
use crate::module::common::exception::DomainError;
use crate::shared::hex;

// #
// value

/// 평문을 감싸고 Debug 에서 마스킹한다 — `tracing::error!(?value)` 한 줄에 키가 새지 않는다.
/// DB 에는 봉인된(age) 형태로만 들어간다.
#[derive(Clone)]
pub struct Secret(String);

impl std::fmt::Debug for Secret {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Secret(***)")
    }
}

impl Secret {
    // #
    // factory

    pub fn from_str(value: &str) -> Self {
        Self(value.to_owned())
    }

    pub fn generate() -> Self {
        Self(format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple()))
    }

    /// DB 에서 — 못 열면 키 파일이 바뀐 것이다.
    pub fn open(sealed: &str) -> Result<Self, DomainError> {
        let bytes = hex::decode(sealed).ok_or(DomainError::InvalidFormat { target: "Secret" })?;
        let plain = cipher::open(&bytes).map_err(|_| DomainError::InvalidFormat { target: "Secret" })?;

        Ok(Self(String::from_utf8_lossy(&plain).into_owned()))
    }

    pub fn to_str(&self) -> &str {
        &self.0
    }

    /// DB 로 — age 봉인을 hex 로.
    pub fn seal(&self) -> String {
        hex::encode(&cipher::seal(self.0.as_bytes()))
    }

    // #
    // mask

    /// 목록에 나가는 미리보기 — 앞 4자만 남긴다.
    pub fn preview(&self) -> String {
        let head: String = self.0.chars().take(4).collect();

        format!("{head}****")
    }
}
