use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::common::exception::DomainError;
use crate::module::common::exception::unique_or;
use crate::shared::exception::AppError;

// #
// query

pub async fn list_all(
    connection: &mut PgConnection,
) -> Result<Vec<contract::volume::Output>, AppError> {
    let listed = sqlx::query_as!(
        contract::volume::Output,
        "select id, project_id, name, mount_path from volume order by name"
    )
    .fetch_all(connection)
    .await?;

    Ok(listed)
}

pub async fn get_by_id(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<contract::volume::Output, AppError> {
    let found = sqlx::query_as!(
        contract::volume::Output,
        "select id, project_id, name, mount_path from volume where id = $1",
        id
    )
    .fetch_optional(connection)
    .await?;

    Ok(found.ok_or(DomainError::NotFound {
        target: "Volume",
        identifier: id.to_string(),
    })?)
}

pub async fn list_by_project(
    connection: &mut PgConnection,
    project_id: Uuid,
) -> Result<Vec<contract::volume::Output>, AppError> {
    let listed = sqlx::query_as!(
        contract::volume::Output,
        "select id, project_id, name, mount_path from volume where project_id = $1 order by name",
        project_id
    )
    .fetch_all(connection)
    .await?;

    Ok(listed)
}

// #
// command

pub async fn add(
    connection: &mut PgConnection,
    output: &contract::volume::Output,
) -> Result<(), AppError> {
    sqlx::query!(
        "insert into volume (id, project_id, name, mount_path) values ($1, $2, $3, $4)",
        output.id,
        output.project_id,
        output.name,
        output.mount_path
    )
    .execute(connection)
    .await
    .map_err(|error| unique_or(error, "Volume", &output.name))?;

    Ok(())
}

pub async fn remove(connection: &mut PgConnection, id: Uuid) -> Result<(), AppError> {
    sqlx::query!("delete from volume where id = $1", id)
        .execute(connection)
        .await?;

    Ok(())
}
