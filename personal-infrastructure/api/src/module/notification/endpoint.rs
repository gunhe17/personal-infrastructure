use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::notification::domain::repository;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_list(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::notification::ChannelOutput>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        repository::list_all(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

// #
// command

pub async fn post_create(
    headers: HeaderMap,
    Json(body): Json<contract::notification::CreateChannelInput>,
) -> Result<(StatusCode, Json<contract::notification::ChannelOutput>), AppError> {
    let created = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        let channel = contract::notification::ChannelOutput {
            id: Uuid::new_v4(),
            name: body.name.clone(),
            kind: body.kind,
            target: body.target.clone(),
        };

        repository::add(&mut scope.transaction, &channel).await?;

        Ok(channel)
    })
    .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn delete_remove(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        repository::remove(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
