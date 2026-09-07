use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::domain_name::domain::repository as domain_repository;
use crate::module::git::domain::repository as link_repository;
use crate::module::project::domain::repository;
use crate::module::volume::domain::repository as volume_repository;
use crate::shared::exception::AppError;

pub use contract::project::RemovalPreview as Output;

// #
// usecase

/// 지우기 전에 — 무엇이 같이 사라지는지.
pub async fn removal(connection: &mut PgConnection, id: Uuid) -> Result<Output, AppError> {
    let project = repository::get_by_id(&mut *connection, id).await?;

    Ok(Output {
        container: project.container(),
        ports: repository::list_ports(connection, id).await?,
        domains: domain_repository::list_hosts_by_project(connection, id).await?,
        volumes: volume_repository::list_by_project(connection, id)
            .await?
            .into_iter()
            .map(|volume| volume.name)
            .collect(),
        git_linked: link_repository::find(connection, id).await?.is_some(),
    })
}
