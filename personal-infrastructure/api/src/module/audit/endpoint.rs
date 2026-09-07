use axum::Json;
use axum::http::HeaderMap;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::audit::domain::repository;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_list(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::system::AuditEntry>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        repository::list_recent(&mut scope.transaction, 100).await
    })
    .await?;

    Ok(Json(listed))
}
