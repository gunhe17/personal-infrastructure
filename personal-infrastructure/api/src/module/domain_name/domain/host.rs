use crate::module::common::exception::DomainError;

// #
// value

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Host(String);

impl Host {
    // #
    // factory

    pub fn from_str(value: &str) -> Result<Self, DomainError> {
        let trimmed = value.trim().trim_end_matches('.').to_ascii_lowercase();

        // format — 라벨은 영숫자와 하이픈, 각 라벨 63자 이하
        if trimmed.is_empty() || trimmed.len() > 253 || !trimmed.contains('.') {
            return Err(DomainError::InvalidFormat { target: "Host" });
        }

        let valid = trimmed.split('.').all(|label| {
            !label.is_empty()
                && label.len() <= 63
                && !label.starts_with('-')
                && !label.ends_with('-')
                && label
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '*')
        });

        if !valid {
            return Err(DomainError::InvalidFormat { target: "Host" });
        }

        Ok(Self(trimmed))
    }

    pub fn to_str(&self) -> &str {
        &self.0
    }

    // #
    // query

    /// `*.example.com` — DNS-01 이 필요하고 HTTP-01 로는 못 받는다.
    pub fn is_wildcard(&self) -> bool {
        self.0.starts_with("*.")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_case_and_trailing_dot() {
        assert_eq!(
            Host::from_str("App.Example.COM.").unwrap().to_str(),
            "app.example.com"
        );
    }

    #[test]
    fn rejects_bare_label_and_bad_shape() {
        assert!(Host::from_str("localhost").is_err());
        assert!(Host::from_str("-bad.example.com").is_err());
        assert!(Host::from_str("").is_err());
    }

    #[test]
    fn detects_wildcard() {
        assert!(Host::from_str("*.example.com").unwrap().is_wildcard());
        assert!(!Host::from_str("app.example.com").unwrap().is_wildcard());
    }
}
