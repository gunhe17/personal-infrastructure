use crate::module::common::exception::DomainError;
use crate::module::common::secret::Secret;

// #
// value

/// `[A-Za-z_][A-Za-z0-9_]*` — 셸과 compose 보간이 받는 이름만.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Key(String);

impl Key {
    // #
    // factory

    pub fn from_str(value: &str) -> Result<Self, DomainError> {
        let trimmed = value.trim();
        let mut chars = trimmed.chars();

        let valid = matches!(chars.next(), Some(c) if c.is_ascii_alphabetic() || c == '_')
            && chars.all(|c| c.is_ascii_alphanumeric() || c == '_');

        if !valid {
            return Err(DomainError::InvalidFormat { target: "EnvKey" });
        }

        Ok(Self(trimmed.to_owned()))
    }

    pub fn to_str(&self) -> &str {
        &self.0
    }
}

// #
// entity

#[derive(Debug, Clone)]
pub struct Env {
    pub key: Key,
    pub value: Secret,
    /// 목록에서 마스킹할지. 저장은 둘 다 봉인이다.
    pub secret: bool,
}

impl Env {
    pub fn to_output(&self, reveal: bool) -> contract::project::EnvOutput {
        contract::project::EnvOutput {
            key: self.key.to_str().to_owned(),
            value: if self.secret && !reveal {
                self.value.preview()
            } else {
                self.value.to_str().to_owned()
            },
            secret: self.secret,
        }
    }

    /// 컨테이너에 넣을 평문 쌍.
    pub fn to_pair(&self) -> (String, String) {
        (self.key.to_str().to_owned(), self.value.to_str().to_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_shape() {
        assert!(Key::from_str("DATABASE_URL").is_ok());
        assert!(Key::from_str("_x1").is_ok());
        assert!(Key::from_str("1abc").is_err());
        assert!(Key::from_str("A-B").is_err());
        assert!(Key::from_str("").is_err());
    }
}
