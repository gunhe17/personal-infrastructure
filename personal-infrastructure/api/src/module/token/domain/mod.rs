pub mod name;
pub mod repository;
pub mod secret;

use chrono::DateTime;
use chrono::Utc;
use uuid::Uuid;

pub use contract::token::Scope;
pub use name::Name;
pub use secret::Secret;

// #
// entity

#[derive(Debug, Clone)]
pub struct Token {
    pub id: Uuid,
    pub name: Name,
    pub scopes: Vec<Scope>,
    pub source: String,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

impl Token {
    // #
    // factory

    pub fn new(name: Name, scopes: Vec<Scope>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            scopes,
            source: "api".to_owned(),
            created_at: Utc::now(),
            revoked_at: None,
        }
    }

    // #
    // query

    pub fn allows(&self, required: Scope) -> bool {
        self.scopes.contains(&Scope::SystemAdmin) || self.scopes.contains(&required)
    }

    pub fn to_output(&self) -> contract::token::Output {
        contract::token::Output {
            id: self.id,
            name: self.name.to_str().to_owned(),
            scopes: self.scopes.clone(),
            created_at: self.created_at,
            revoked_at: self.revoked_at,
        }
    }
}
