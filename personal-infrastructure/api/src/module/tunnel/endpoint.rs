use axum::Json;
use axum::http::HeaderMap;
use axum::http::StatusCode;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::tunnel::usecase;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_up(
    headers: HeaderMap,
    Json(body): Json<contract::tunnel::UpInput>,
) -> Result<Json<usecase::up::Output>, AppError> {
    let token = body.token;
    let started = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::up::up(&mut scope.transaction, token).await
    })
    .await?;

    Ok(Json(started))
}

pub async fn post_down(headers: HeaderMap) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::SystemAdmin, async |_| {
        usecase::down::down().await;

        Ok(())
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
