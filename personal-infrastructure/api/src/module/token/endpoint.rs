use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::token::usecase;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_create(
    headers: HeaderMap,
    Json(body): Json<usecase::create::Input>,
) -> Result<Json<usecase::create::Output>, AppError> {
    let created = behavior::request_token(&headers, Scope::TokenAdmin, async |scope| {
        usecase::create::create(&mut scope.transaction, body).await
    })
    .await?;

    Ok(Json(created))
}

pub async fn delete_revoke(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::TokenAdmin, async |scope| {
        usecase::revoke::revoke(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// #
// query

pub async fn get_list(headers: HeaderMap) -> Result<Json<Vec<usecase::list::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::TokenAdmin, async |scope| {
        usecase::list::list(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}
