use crate::module::common::exception::DomainError;

// #
// value

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Name(String);

impl Name {
    // #
    // factory

    pub fn from_str(value: &str) -> Result<Self, DomainError> {
        // format
        if value.trim().is_empty() {
            return Err(DomainError::InvalidFormat { target: "Name" });
        }

        // length
        if value.chars().count() > 64 {
            return Err(DomainError::InvalidFormat { target: "Name" });
        }

        Ok(Self(value.trim().to_owned()))
    }

    pub fn to_str(&self) -> &str {
        &self.0
    }
}
