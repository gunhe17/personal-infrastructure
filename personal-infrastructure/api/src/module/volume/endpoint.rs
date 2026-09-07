use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::infrastructure::docker;
use crate::module::backup::domain::repository as backup_repository;
use crate::module::volume::domain::repository;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_list(headers: HeaderMap) -> Result<Json<Vec<contract::volume::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        repository::list_all(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

// #
// command

pub async fn post_create(
    headers: HeaderMap,
    Json(body): Json<contract::volume::CreateInput>,
) -> Result<(StatusCode, Json<contract::volume::Output>), AppError> {
    let created = behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        let output = contract::volume::Output {
            id: Uuid::new_v4(),
            project_id: body.project_id,
            name: body.name.clone(),
            mount_path: body.mount_path.clone(),
        };

        docker::client::create_volume(&output.name).await?;
        repository::add(&mut scope.transaction, &output).await?;

        Ok(output)
    })
    .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn delete_remove(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        let volume = repository::get_by_id(&mut scope.transaction, id).await?;

        docker::client::remove_volume(&volume.name).await;
        backup_repository::remove_schedules_for(&mut *scope.transaction, id).await?;
        repository::remove(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
