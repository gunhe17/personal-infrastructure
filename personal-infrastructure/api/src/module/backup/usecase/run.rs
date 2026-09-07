use std::path::PathBuf;

use sqlx::PgPool;
use uuid::Uuid;

use contract::backup::TargetKind;
use contract::database::Engine;

use crate::infrastructure::docker;
use crate::module::backup::domain::repository;
use crate::module::database::domain::repository as database_repository;
use crate::module::volume::domain::repository as volume_repository;
use crate::shared::exception::AppError;

// #
// usecase

/// 워커가 부른다. 트랜잭션 밖에서 도는 장기 작업이라 상태는 풀에 직접 쓴다.
pub async fn run(
    pool: &PgPool,
    destination_id: Uuid,
    target_kind: TargetKind,
    target_id: Uuid,
) -> Result<Uuid, AppError> {
    let id = Uuid::new_v4();
    let destination = repository::get_destination(pool, destination_id).await?;

    repository::start(pool, id, destination_id, target_kind, target_id).await?;

    match dump(pool, &destination.location, id, target_kind, target_id).await {
        Ok((artifact, size)) => {
            repository::succeed(pool, id, &artifact, size).await?;

            Ok(id)
        }
        Err(error) => {
            repository::fail(pool, id, &error.to_string()).await?;

            Err(error)
        }
    }
}

async fn dump(
    pool: &PgPool,
    location: &str,
    id: Uuid,
    target_kind: TargetKind,
    target_id: Uuid,
) -> Result<(String, i64), AppError> {
    let dir = PathBuf::from(location);
    tokio::fs::create_dir_all(&dir).await?;

    let (bytes, extension) = match target_kind {
        TargetKind::Database => dump_database(pool, target_id).await?,
        TargetKind::Volume => dump_volume(pool, target_id).await?,
    };

    let artifact = dir.join(format!("{}.{extension}", id.simple()));
    let size = bytes.len() as i64;

    tokio::fs::write(&artifact, &bytes).await?;

    Ok((artifact.display().to_string(), size))
}

/// 엔진마다 덤프 명령이 다르다. 컨테이너 안에서 돌려 호스트에 클라이언트를 깔지 않는다.
async fn dump_database(pool: &PgPool, id: Uuid) -> Result<(Vec<u8>, &'static str), AppError> {
    let instance = database_repository::get_by_pool(pool, id).await?;
    let container = instance.container();

    let bytes = match instance.engine {
        Engine::Postgres => {
            docker::client::exec(
                &container,
                &[
                    "pg_dump",
                    "-U",
                    &instance.username,
                    "-d",
                    &instance.database,
                ],
            )
            .await?
        }
        Engine::Mysql => {
            docker::client::exec(
                &container,
                &[
                    "mysqldump",
                    &format!("-u{}", instance.username),
                    &format!("-p{}", instance.password.to_str()),
                    &instance.database,
                ],
            )
            .await?
        }
        Engine::Redis => {
            docker::client::exec(
                &container,
                &[
                    "sh",
                    "-c",
                    "redis-cli --rdb /tmp/d.rdb >/dev/null && cat /tmp/d.rdb",
                ],
            )
            .await?
        }
        Engine::Mongo => {
            docker::client::exec(&container, &["sh", "-c", "mongodump --archive"]).await?
        }
        // 오브젝트 스토리지는 데이터 폴더가 곧 상태다 — 볼륨을 통째로
        Engine::Minio => docker::client::export_volume(&instance.volume).await?,
    };

    Ok((bytes, "dump"))
}

/// 볼륨은 도우미 컨테이너로 tar 를 떠서 stdout 으로 받는다.
async fn dump_volume(pool: &PgPool, id: Uuid) -> Result<(Vec<u8>, &'static str), AppError> {
    let mut connection = pool.acquire().await?;
    let volume = volume_repository::get_by_id(&mut connection, id).await?;

    Ok((docker::client::export_volume(&volume.name).await?, "tar"))
}
