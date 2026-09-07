use axum::Json;
use axum::http::HeaderMap;
use axum::http::StatusCode;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::setting::domain::repository;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_list(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::system::Setting>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        repository::list_all(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

// #
// command

pub async fn put_set(
    headers: HeaderMap,
    Json(body): Json<contract::system::SetSettingInput>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        repository::set(&mut scope.transaction, &body.key, &body.value).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
