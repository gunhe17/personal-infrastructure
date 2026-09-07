use serde::de::DeserializeOwned;

use crate::module::common::exception::DomainError;

pub use contract::text::of;

// #
// text

/// DB 에서 읽은 문자열을 enum 으로. 못 읽으면 저장된 값이 깨진 것이다.
pub fn parse<T: DeserializeOwned>(target: &'static str, value: &str) -> Result<T, DomainError> {
    contract::text::parse(value).ok_or(DomainError::InvalidFormat { target })
}
