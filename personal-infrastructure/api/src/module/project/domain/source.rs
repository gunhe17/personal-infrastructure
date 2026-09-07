use contract::project::SourceKind;

use crate::module::common::exception::DomainError;

// #
// value

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Source {
    Folder(String),
    Git(String),
    /// 흡수한 컨테이너 — 이미지 참조 그대로. 감지·빌드 없이 pull 하고 띄운다
    Image(String),
}

impl Source {
    // #
    // factory

    pub fn from_parts(kind: SourceKind, value: &str) -> Result<Self, DomainError> {
        let trimmed = value.trim();

        if trimmed.is_empty() {
            return Err(DomainError::InvalidFormat { target: "Source" });
        }

        match kind {
            SourceKind::Folder => {
                // format — 절대 경로만. 상대 경로는 데몬의 cwd 에 따라 달라진다
                if !trimmed.starts_with('/') {
                    return Err(DomainError::InvalidFormat { target: "Source" });
                }

                Ok(Self::Folder(trimmed.to_owned()))
            }
            SourceKind::Git => {
                // http(s)·ssh(user@host:)·file:// — 로컬 bare 저장소도 소스가 된다
                if !trimmed.starts_with("http") && !trimmed.starts_with("file://") && !trimmed.contains('@') {
                    return Err(DomainError::InvalidFormat { target: "Source" });
                }

                Ok(Self::Git(trimmed.to_owned()))
            }
            SourceKind::Image => Ok(Self::Image(trimmed.to_owned())),
        }
    }

    pub fn kind(&self) -> SourceKind {
        match self {
            Self::Folder(_) => SourceKind::Folder,
            Self::Git(_) => SourceKind::Git,
            Self::Image(_) => SourceKind::Image,
        }
    }

    pub fn to_str(&self) -> &str {
        match self {
            Self::Folder(value) | Self::Git(value) | Self::Image(value) => value,
        }
    }
}
