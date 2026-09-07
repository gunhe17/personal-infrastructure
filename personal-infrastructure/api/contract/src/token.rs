use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

// #
// scope

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Scope {
    ProjectRead,
    ProjectWrite,
    Deploy,
    DomainWrite,
    CredentialRead,
    CredentialWrite,
    BackupWrite,
    DatabaseWrite,
    TokenAdmin,
    SystemAdmin,
}

impl Scope {
    pub const ALL: [Scope; 10] = [
        Scope::ProjectRead,
        Scope::ProjectWrite,
        Scope::Deploy,
        Scope::DomainWrite,
        Scope::CredentialRead,
        Scope::CredentialWrite,
        Scope::BackupWrite,
        Scope::DatabaseWrite,
        Scope::TokenAdmin,
        Scope::SystemAdmin,
    ];

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ProjectRead => "project_read",
            Self::ProjectWrite => "project_write",
            Self::Deploy => "deploy",
            Self::DomainWrite => "domain_write",
            Self::CredentialRead => "credential_read",
            Self::CredentialWrite => "credential_write",
            Self::BackupWrite => "backup_write",
            Self::DatabaseWrite => "database_write",
            Self::TokenAdmin => "token_admin",
            Self::SystemAdmin => "system_admin",
        }
    }
}

/// MCP 에이전트가 요구할 수 있는 스코프. 비밀값 계열(`CredentialRead`)이 없어서
/// 평문을 여는 usecase 에 도달하는 코드는 컴파일되지 않는다.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentScope {
    ProjectRead,
    ProjectWrite,
    Deploy,
    DomainWrite,
}

impl AgentScope {
    pub fn to_scope(self) -> Scope {
        match self {
            Self::ProjectRead => Scope::ProjectRead,
            Self::ProjectWrite => Scope::ProjectWrite,
            Self::Deploy => Scope::Deploy,
            Self::DomainWrite => Scope::DomainWrite,
        }
    }
}

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInput {
    pub name: String,
    pub scopes: Vec<Scope>,
}

// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub name: String,
    pub scopes: Vec<Scope>,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

/// 발급 직후 한 번만 평문 비밀값을 돌려준다.
#[derive(Debug, Serialize, Deserialize)]
pub struct Created {
    #[serde(flatten)]
    pub token: Output,
    pub secret: String,
}
