pub mod env;
pub mod name;
pub mod port;
pub mod repository;
pub mod source;

use chrono::DateTime;
use chrono::Utc;
use uuid::Uuid;

pub use contract::project::SourceKind;
pub use contract::project::Status;
pub use env::Env;
pub use env::Key;
pub use name::Name;
pub use port::Port;
pub use source::Source;

// #
// entity

#[derive(Debug, Clone)]
pub struct Project {
    pub id: Uuid,
    pub name: Name,
    /// 환경 묶음 — 같은 group 의 프로젝트끼리 승격한다.
    pub group: Name,
    pub environment: Name,
    pub source: Source,
    pub stack: Option<String>,
    pub port: Option<Port>,
    pub status: Status,
    pub cpus: Option<f32>,
    pub memory_mb: Option<i32>,
    /// env 가 마지막으로 바뀐 시각 — 돌고 있는 배포보다 뒤면 restart 만으론 반영이 안 된다.
    pub env_updated_at: Option<DateTime<Utc>>,
    /// 지금 돌고 있는 배포의 커밋.
    pub commit: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl Project {
    // #
    // factory

    pub fn new(
        name: Name,
        group: Option<Name>,
        environment: Option<Name>,
        source: Source,
        port: Option<Port>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            group: group.unwrap_or_else(|| name.clone()),
            environment: environment.unwrap_or_else(|| Name::from_str("production").expect("literal")),
            name,
            source,
            stack: None,
            port,
            status: Status::Created,
            cpus: None,
            memory_mb: None,
            env_updated_at: None,
            commit: None,
            created_at: Utc::now(),
        }
    }

    // #
    // query

    pub fn is_compose(&self) -> bool {
        self.stack.as_deref() == Some("compose")
    }

    /// compose 프로젝트의 네임스페이스. 단일 컨테이너는 이름 그대로 뜬다.
    pub fn container(&self) -> String {
        if self.is_compose() {
            format!("pi-{}", self.name.to_str())
        } else {
            self.name.to_str().to_owned()
        }
    }

    /// env 가 지금 돌고 있는 배포 뒤에 바뀌었나 — restart 로는 반영되지 않는다.
    pub fn env_stale_since(&self, running_since: DateTime<Utc>) -> bool {
        self.env_updated_at.is_some_and(|changed| changed > running_since)
    }

    pub fn to_output(&self) -> contract::project::Output {
        contract::project::Output {
            id: self.id,
            name: self.name.to_str().to_owned(),
            group: self.group.to_str().to_owned(),
            environment: self.environment.to_str().to_owned(),
            source_kind: self.source.kind(),
            source_ref: self.source.to_str().to_owned(),
            stack: self.stack.clone(),
            port: self.port.map(Port::to_u16),
            status: self.status,
            cpus: self.cpus,
            memory_mb: self.memory_mb.map(|mb| mb as u32),
            commit: self.commit.clone(),
            created_at: self.created_at,
        }
    }
}
