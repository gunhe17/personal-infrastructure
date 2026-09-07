use axum::Json;
use axum::http::HeaderMap;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::analytics::domain::repository;
use crate::module::analytics::domain::usage;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_summary(headers: HeaderMap) -> Result<Json<contract::analytics::Summary>, AppError> {
    let summarized = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        repository::summary(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(summarized))
}

pub async fn get_usage(headers: HeaderMap) -> Result<Json<Vec<contract::analytics::UsageRow>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        usage::summary(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}
