use crate::module::common::exception::DomainError;

// #
// value

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Name(String);

impl Name {
    // #
    // factory

    pub fn from_str(value: &str) -> Result<Self, DomainError> {
        let trimmed = value.trim();

        // format — 컨테이너 이름과 도메인 라벨로 쓰이므로 [a-z0-9-] 만 받는다
        if trimmed.is_empty() || trimmed.len() > 40 {
            return Err(DomainError::InvalidFormat { target: "Name" });
        }

        if !trimmed
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        {
            return Err(DomainError::InvalidFormat { target: "Name" });
        }

        if trimmed.starts_with('-') || trimmed.ends_with('-') {
            return Err(DomainError::InvalidFormat { target: "Name" });
        }

        Ok(Self(trimmed.to_owned()))
    }

    pub fn to_str(&self) -> &str {
        &self.0
    }
}
