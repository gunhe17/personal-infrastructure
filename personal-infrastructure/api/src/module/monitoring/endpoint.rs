use axum::Json;
use axum::http::HeaderMap;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::monitoring::domain::repository;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_issues(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::system::Issue>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        repository::list_open(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}
