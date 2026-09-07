use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::database::usecase;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_create(
    headers: HeaderMap,
    Json(body): Json<usecase::create::Input>,
) -> Result<(StatusCode, Json<usecase::create::Output>), AppError> {
    let created = behavior::request_token(&headers, Scope::DatabaseWrite, async |scope| {
        usecase::create::create(&mut scope.transaction, body).await
    })
    .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn delete_remove(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::DatabaseWrite, async |scope| {
        usecase::remove::remove(&mut scope.transaction, id).await
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

/// 비밀번호가 실린다 — credential_read 스코프로만.
pub async fn get_connection(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<usecase::reveal::Output>, AppError> {
    let revealed = behavior::request_token(&headers, Scope::CredentialRead, async |scope| {
        usecase::reveal::reveal(scope, id).await
    })
    .await?;

    Ok(Json(revealed))
}

/// 카탈로그 — 인증 없이도 무해하지만 같은 스코프로 맞춘다.
pub async fn get_engines(headers: HeaderMap) -> Result<Json<Vec<contract::database::EngineInfo>>, AppError> {
    behavior::request_token(&headers, Scope::ProjectRead, async |_| Ok(())).await?;

    Ok(Json(crate::module::database::domain::engine::catalog()))
}

/// 접속 문자열을 프로젝트 env 에 — 돌려주는 건 키 이름뿐.
pub async fn post_connect(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(body): Json<usecase::connect::Input>,
) -> Result<Json<String>, AppError> {
    let key = behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::connect::connect(&mut scope.transaction, id, body).await
    })
    .await?;

    Ok(Json(key))
}
