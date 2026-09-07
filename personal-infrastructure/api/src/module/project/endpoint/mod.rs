use axum::Json;
use axum::extract::Path;
use axum::extract::Query;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use serde::Deserialize;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::project::usecase;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_create(
    headers: HeaderMap,
    Json(body): Json<usecase::create::Input>,
) -> Result<(StatusCode, Json<usecase::create::Output>), AppError> {
    let created = behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::create::create(&mut scope.transaction, body).await
    })
    .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn delete_remove(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::remove::remove(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn post_start(headers: HeaderMap, Path(id): Path<Uuid>) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::start::start(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn post_stop(headers: HeaderMap, Path(id): Path<Uuid>) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::stop::stop(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
pub struct RestartQuery {
    #[serde(default)]
    pub force: bool,
}

pub async fn post_restart(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Query(query): Query<RestartQuery>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::restart::restart(&mut scope.transaction, id, query.force).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn put_limits(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(body): Json<usecase::limits::Input>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::limits::limits(&mut scope.transaction, id, body).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// #
// env

pub async fn get_env(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<usecase::env_list::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        usecase::env_list::list(&mut scope.transaction, id).await
    })
    .await?;

    Ok(Json(listed))
}

/// 평문은 credential_read 로만 — 목록 스코프로는 마스킹된 것만 본다.
pub async fn get_env_reveal(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<usecase::env_list::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::CredentialRead, async |scope| {
        usecase::env_reveal::reveal(scope, id).await
    })
    .await?;

    Ok(Json(listed))
}

pub async fn put_env(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(body): Json<usecase::env_set::Input>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::env_set::set(&mut scope.transaction, id, body).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_env(
    headers: HeaderMap,
    Path((id, key)): Path<(Uuid, String)>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::env_unset::unset(&mut scope.transaction, id, &key).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// #
// query

pub async fn get_list(headers: HeaderMap) -> Result<Json<Vec<usecase::list::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        usecase::list::list(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

pub async fn get_detail(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<usecase::detail::Output>, AppError> {
    let detailed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        usecase::detail::detail(&mut scope.transaction, id).await
    })
    .await?;

    Ok(Json(detailed))
}

pub async fn get_removal(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<usecase::removal::Output>, AppError> {
    let previewed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        usecase::removal::removal(&mut scope.transaction, id).await
    })
    .await?;

    Ok(Json(previewed))
}

pub mod mcp;
