use std::time::Duration;

use crate::behavior::scope::WorkerScope;
use crate::behavior::worker::with_job;
use crate::infrastructure::database;
use crate::infrastructure::docker;
use crate::infrastructure::docker::client::Run;
use crate::module::database::domain::Status;
use crate::module::database::domain::engine;
use crate::module::database::domain::repository;
use crate::module::database::domain::repository::Instance;
use crate::module::job::domain::Job;
use crate::module::job::domain::JobKind;
use crate::shared::exception::AppError;
use crate::worker;

// #
// run

pub async fn run() {
    worker::repeat("database", Duration::from_secs(1), tick).await
}

async fn tick() -> Result<(), AppError> {
    with_job(JobKind::DatabaseCreate, create).await?;

    Ok(())
}

// #
// job

/// 컨테이너 기동은 요청 안에서 돌지 않는다 [INV-13] — usecase 가 넣은 job 을 여기서 집행한다.
async fn create(scope: &mut WorkerScope, job: Job) -> Result<(), AppError> {
    let pool = database::pool();
    let instance = repository::get_by_pool(pool, job.target_id).await?;

    match start(&instance).await {
        Ok(()) => {
            repository::update_status(&mut *scope.transaction, instance.id, Status::Running).await?;
            tracing::info!(name = instance.name, "database started");

            Ok(())
        }
        Err(error) => {
            // 봉투 트랜잭션은 롤백된다 — 실패 상태는 풀로 직접
            repository::update_status(pool, instance.id, Status::Failed).await?;

            Err(error)
        }
    }
}

async fn start(instance: &Instance) -> Result<(), AppError> {
    let spec = engine::spec(
        instance.engine,
        &instance.version,
        &instance.username,
        instance.password.to_str(),
        &instance.database,
    );

    docker::client::create_volume(&instance.volume).await?;
    docker::client::remove(&instance.container()).await;
    docker::client::run(Run {
        name: instance.container(),
        image: spec.image,
        publish: Some((instance.host_port as u16, spec.container_port)),
        env: spec.env,
        mounts: vec![(instance.volume.clone(), spec.data_path.to_owned())],
        args: spec.args,
        ..Default::default()
    })
    .await?;

    Ok(())
}
