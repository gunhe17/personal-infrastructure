use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::webhook::usecase;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_create(
    headers: HeaderMap,
    Json(body): Json<usecase::create::Input>,
) -> Result<(StatusCode, Json<usecase::create::Output>), AppError> {
    let created = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::create::create(&mut scope.transaction, body).await
    })
    .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn delete_remove(headers: HeaderMap, Path(id): Path<Uuid>) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::remove::remove(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// #
// query

pub async fn get_list(headers: HeaderMap) -> Result<Json<Vec<usecase::list::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::list::list(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

pub async fn get_deliveries(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<usecase::deliveries::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::deliveries::deliveries(&mut scope.transaction, id).await
    })
    .await?;

    Ok(Json(listed))
}
