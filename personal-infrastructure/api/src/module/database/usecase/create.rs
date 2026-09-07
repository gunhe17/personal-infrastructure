use chrono::Utc;
use sqlx::PgConnection;
use uuid::Uuid;

use contract::database::Status;

use crate::module::common::secret::Secret;
use crate::module::database::domain::engine;
use crate::module::database::domain::repository;
use crate::module::database::domain::repository::Instance;
use crate::module::job::domain::Job;
use crate::module::job::domain::JobKind;
use crate::module::job::domain::repository as job_repository;
use crate::module::project::domain::repository as project_repository;
use crate::shared::exception::AppError;

pub use contract::database::CreateInput as Input;
pub use contract::database::Output;

// #
// usecase

/// 포트는 예약대장에서 받고, 컨테이너 기동은 job 으로 넘긴다 [INV-13].
pub async fn create(connection: &mut PgConnection, input: Input) -> Result<Output, AppError> {
    // claim
    let host_port =
        project_repository::claim_port(connection, None, &format!("database:{}", input.name))
            .await?;

    // build
    let id = Uuid::new_v4();
    let instance = Instance {
        id,
        name: input.name.clone(),
        engine: input.engine,
        version: input
            .version
            .unwrap_or_else(|| engine::default_version(input.engine).to_owned()),
        host_port: host_port.to_i32(),
        // minio 는 access key 가 3자 이상이어야 한다
        username: if input.engine == contract::database::Engine::Minio { "piadmin" } else { "pi" }.to_owned(),
        password: Secret::generate(),
        database: input.name.replace('-', "_"),
        volume: format!("pi-db-{}", id.simple()),
        status: Status::Creating,
        created_at: Utc::now(),
    };

    // persist
    repository::add(connection, &instance).await?;

    // enqueue
    let job = Job::new(JobKind::DatabaseCreate, id);
    job_repository::enqueue(connection, &job).await?;

    // return
    let created = instance.to_output();

    Ok(created)
}
