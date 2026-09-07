use axum::Json;
use axum::http::HeaderMap;
use axum::http::StatusCode;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::mail::usecase;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_setup(
    headers: HeaderMap,
    Json(body): Json<usecase::setup::Input>,
) -> Result<Json<usecase::setup::Output>, AppError> {
    let status = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::setup::setup(&mut scope.transaction, body).await
    })
    .await?;

    Ok(Json(status))
}

pub async fn delete_remove(headers: HeaderMap) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::remove::remove(&mut scope.transaction).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// #
// query

pub async fn get_status(headers: HeaderMap) -> Result<Json<usecase::status::Output>, AppError> {
    let status = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::status::status(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(status))
}

pub async fn get_dns(headers: HeaderMap) -> Result<Json<Vec<usecase::dns::Output>>, AppError> {
    let records = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::dns::dns(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(records))
}
