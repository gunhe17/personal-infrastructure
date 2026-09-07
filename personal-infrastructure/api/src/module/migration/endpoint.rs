use axum::Json;
use axum::http::HeaderMap;
use axum::http::StatusCode;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::migration::usecase;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_scan(headers: HeaderMap) -> Result<Json<Vec<usecase::scan::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::SystemAdmin, async |_| {
        usecase::scan::scan().await
    })
    .await?;

    Ok(Json(listed))
}

// #
// command

pub async fn post_adopt(
    headers: HeaderMap,
    Json(body): Json<usecase::adopt::Input>,
) -> Result<(StatusCode, Json<usecase::adopt::Output>), AppError> {
    let adopted = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        usecase::adopt::adopt(&mut scope.transaction, body).await
    })
    .await?;

    Ok((StatusCode::ACCEPTED, Json(adopted)))
}
