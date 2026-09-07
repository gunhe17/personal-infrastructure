use sha2::Digest;
use sha2::Sha256;
use uuid::Uuid;

// #
// value

/// 평문은 발급 순간에만 존재한다. 저장되는 것은 해시뿐이다.
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

    pub fn generate() -> Self {
        Self(format!("pi_{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple()))
    }

    pub fn to_str(&self) -> &str {
        &self.0
    }

    // #
    // hash

    pub fn hash(&self) -> String {
        hash_of(&self.0)
    }
}

pub fn hash_of(value: &str) -> String {
    format!("{:x}", Sha256::digest(value.as_bytes()))
}
