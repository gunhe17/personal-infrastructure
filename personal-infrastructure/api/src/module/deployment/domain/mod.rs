pub mod log;
pub mod repository;

use chrono::DateTime;
use chrono::Utc;
use uuid::Uuid;

pub use contract::deployment::Status;
pub use contract::deployment::Trigger;

use crate::module::project::domain::Port;

// #
// entity

#[derive(Debug, Clone)]
pub struct Deployment {
    pub id: Uuid,
    pub project_id: Uuid,
    pub status: Status,
    pub trigger: Trigger,
    pub stack: Option<String>,
    pub image_ref: Option<String>,
    pub host_port: Option<Port>,
    /// 컨테이너가 듣는 포트 — 롤백이 감지를 다시 돌리지 않고 이 값을 쓴다.
    pub container_port: Option<Port>,
    pub commit: Option<String>,
    pub error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
}

impl Deployment {
    // #
    // factory

    pub fn new(project_id: Uuid, trigger: Trigger) -> Self {
        Self {
            id: Uuid::new_v4(),
            project_id,
            status: Status::Queued,
            trigger,
            stack: None,
            image_ref: None,
            host_port: None,
            container_port: None,
            commit: None,
            error: None,
            created_at: Utc::now(),
            finished_at: None,
        }
    }

    pub fn to_output(&self) -> contract::deployment::Output {
        contract::deployment::Output {
            id: self.id,
            project_id: self.project_id,
            status: self.status,
            trigger: self.trigger,
            stack: self.stack.clone(),
            image_ref: self.image_ref.clone(),
            host_port: self.host_port.map(Port::to_u16),
            commit: self.commit.clone(),
            error: self.error.clone(),
            created_at: self.created_at,
            finished_at: self.finished_at,
        }
    }
}
