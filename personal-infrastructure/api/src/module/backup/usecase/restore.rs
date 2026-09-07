use sqlx::PgPool;
use uuid::Uuid;

use contract::backup::TargetKind;
use contract::database::Engine;

use crate::infrastructure::docker;
use crate::module::backup::domain::repository;
use crate::module::common::exception::DomainError;
use crate::module::database::domain::repository as database_repository;
use crate::module::volume::domain::repository as volume_repository;
use crate::shared::exception::AppError;

// #
// usecase

/// 원클릭 복원 — 아티팩트를 그대로 되돌려 넣는다.
pub async fn restore(pool: &PgPool, backup_id: Uuid) -> Result<(), AppError> {
    // find
    let backup = repository::get_backup(pool, backup_id).await?;

    let artifact = backup.artifact.ok_or(DomainError::InvalidTransition {
        target: "Backup",
        actual: "아티팩트가 없습니다".to_owned(),
    })?;

    let target_id = backup.target_id.ok_or(DomainError::InvalidTransition {
        target: "Backup",
        actual: "대상이 없습니다".to_owned(),
    })?;

    let bytes = tokio::fs::read(&artifact).await?;

    // restore
    match backup.target_kind {
        TargetKind::Database => restore_database(pool, target_id, &bytes).await,
        TargetKind::Volume => restore_volume(pool, target_id, &bytes).await,
    }
}

async fn restore_database(pool: &PgPool, id: Uuid, bytes: &[u8]) -> Result<(), AppError> {
    let instance = database_repository::get_by_pool(pool, id).await?;
    let container = instance.container();

    match instance.engine {
        Engine::Postgres => {
            docker::client::exec_stdin(
                &container,
                &["psql", "-U", &instance.username, "-d", &instance.database],
                bytes,
            )
            .await?
        }
        Engine::Mysql => {
            docker::client::exec_stdin(
                &container,
                &[
                    "mysql",
                    &format!("-u{}", instance.username),
                    &format!("-p{}", instance.password.to_str()),
                    &instance.database,
                ],
                bytes,
            )
            .await?
        }
        Engine::Minio => docker::client::import_volume(&instance.volume, bytes).await?,
        Engine::Redis | Engine::Mongo => {
            return Err(DomainError::InvalidTransition {
                target: "Restore",
                actual: format!("{:?} 복원은 아직 지원하지 않습니다", instance.engine),
            })?;
        }
    }

    Ok(())
}

async fn restore_volume(pool: &PgPool, id: Uuid, bytes: &[u8]) -> Result<(), AppError> {
    let mut connection = pool.acquire().await?;
    let volume = volume_repository::get_by_id(&mut connection, id).await?;

    docker::client::import_volume(&volume.name, bytes).await?;

    Ok(())
}
