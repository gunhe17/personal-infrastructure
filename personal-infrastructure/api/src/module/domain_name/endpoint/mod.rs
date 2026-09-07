use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::infrastructure::database;
use crate::module::certificate::domain::repository as certificate_repository;
use crate::module::domain_name::usecase;
use crate::module::edge::domain::reconcile;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_attach(
    headers: HeaderMap,
    Json(body): Json<usecase::attach::Input>,
) -> Result<(StatusCode, Json<usecase::attach::Output>), AppError> {
    let attached = behavior::request_token(&headers, Scope::DomainWrite, async |scope| {
        usecase::attach::attach(&mut scope.transaction, body).await
    })
    .await?;

    // 커밋 뒤에 엣지를 다시 그린다 — 트랜잭션 안에서 파일을 쓰면 롤백돼도 파일이 남는다
    reconcile::run(database::pool()).await?;

    Ok((StatusCode::CREATED, Json(attached)))
}

pub async fn delete_detach(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::DomainWrite, async |scope| {
        usecase::detach::detach(&mut scope.transaction, id).await
    })
    .await?;

    reconcile::run(database::pool()).await?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn post_certificate(
    headers: HeaderMap,
    Json(body): Json<usecase::upload_certificate::Input>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::DomainWrite, async |_scope| {
        usecase::upload_certificate::upload(body).await
    })
    .await?;

    reconcile::run(database::pool()).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// 지금 발급하고 엣지에 반영한다.
pub async fn post_ssl(headers: HeaderMap, Path(id): Path<Uuid>) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::DomainWrite, async |scope| {
        usecase::ssl::ssl(&mut scope.transaction, id).await
    })
    .await?;

    reconcile::run(database::pool()).await?;

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

pub async fn get_certificates(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::domain_name::CertificateOutput>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::DomainWrite, async |scope| {
        certificate_repository::list_all(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

pub mod mcp;
