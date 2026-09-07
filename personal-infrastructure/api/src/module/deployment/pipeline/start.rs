use sqlx::PgPool;
use uuid::Uuid;

use crate::infrastructure::docker;
use crate::infrastructure::docker::client::Run;
use crate::module::deployment::domain::log;
use crate::module::project::domain::Port;
use crate::module::project::domain::Project;
use crate::module::volume::domain::repository as volume_repository;
use crate::shared::exception::AppError;

// #
// start

/// 이전 컨테이너를 내리고 새 이미지를 같은 이름으로 올린다. env·리밋은 프로젝트에서.
pub async fn run(
    pool: &PgPool,
    deployment_id: Uuid,
    project: &Project,
    image: &str,
    host_port: Port,
    container_port: Port,
    env: Vec<(String, String)>,
) -> Result<String, AppError> {
    let name = project.container();

    // volumes — 등록만 되고 실제 마운트가 안 되던 구멍. 이름이 / 로 시작하면 바인드 마운트
    let mut connection = pool.acquire().await?;
    let mounts: Vec<(String, String)> = volume_repository::list_by_project(&mut connection, project.id)
        .await?
        .into_iter()
        .map(|volume| (volume.name, volume.mount_path))
        .collect();

    // stop
    docker::client::remove(&name).await;

    // start
    let container_id = docker::client::run(Run {
        name: name.clone(),
        image: image.to_owned(),
        publish: Some((host_port.to_u16(), container_port.to_u16())),
        env,
        mounts,
        cpus: project.cpus,
        memory_mb: project.memory_mb,
        ..Default::default()
    })
    .await?;

    let _ = log::append(
        pool,
        deployment_id,
        "run",
        &format!(
            "started {name} at 127.0.0.1:{} -> {}",
            host_port.to_u16(),
            container_port.to_u16()
        ),
    )
    .await;

    Ok(container_id)
}
