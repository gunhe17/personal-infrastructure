use std::path::Path;
use std::path::PathBuf;

use sqlx::PgPool;
use uuid::Uuid;

use crate::config;
use crate::infrastructure::docker;
use crate::module::deployment::domain::log;
use crate::module::deployment::pipeline::detect::Dockerfile;
use crate::shared::exception::AppError;

// #
// build

/// 이미지 태그는 배포 id 로 박제한다 — 롤백이 그 태그를 그대로 다시 띄운다.
pub async fn run(
    pool: &PgPool,
    deployment_id: Uuid,
    name: &str,
    context: &Path,
    dockerfile: &Dockerfile,
) -> Result<String, AppError> {
    let tag = format!("pi/{name}:{}", deployment_id.simple());

    let path = match dockerfile {
        Dockerfile::Existing(path) => path.clone(),
        Dockerfile::Generated(body) => write_generated(deployment_id, body).await?,
        // compose 는 이미지 빌드 단계를 타지 않는다 — 워커가 먼저 분기한다
        Dockerfile::Compose(path) => path.clone(),
    };

    docker::client::build(context, &path, &tag, async |line| {
        // 로그 한 줄이 실패해도 빌드를 죽이지 않는다 — 빌드가 본체다
        let _ = log::append(pool, deployment_id, "build", &line).await;
    })
    .await?;

    Ok(tag)
}

async fn write_generated(deployment_id: Uuid, body: &str) -> Result<PathBuf, AppError> {
    let path = config::get()
        .work_dir
        .join(format!("Dockerfile.{}", deployment_id.simple()));

    tokio::fs::write(&path, body).await?;

    Ok(path)
}
