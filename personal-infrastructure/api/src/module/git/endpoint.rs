use axum::Json;
use axum::body::Bytes;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::infrastructure::database;
use crate::infrastructure::git::client as git;
use crate::module::common::exception::DomainError;
use crate::module::deployment::domain::Deployment;
use crate::module::deployment::domain::Trigger;
use crate::module::deployment::domain::repository as deployment_repository;
use crate::module::git::domain::repository as link_repository;
use crate::module::git::usecase;
use crate::module::job::domain::Job;
use crate::module::job::domain::JobKind;
use crate::module::job::domain::repository as job_repository;
use crate::module::project::domain::Status as ProjectStatus;
use crate::module::project::domain::repository as project_repository;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_link(
    headers: HeaderMap,
    Json(body): Json<usecase::link::Input>,
) -> Result<Json<usecase::link::Output>, AppError> {
    let linked = behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::link::link(&mut scope.transaction, body).await
    })
    .await?;

    Ok(Json(linked))
}

pub async fn delete_unlink(
    headers: HeaderMap,
    Path(project_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        link_repository::unlink(&mut scope.transaction, project_id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// #
// webhook

/// 공개 라우트 — 서명 검증이 인증을 대신한다. 토큰 봉투를 쓰지 않는다.
pub async fn post_push(
    Path(project_id): Path<Uuid>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, AppError> {
    let link = link_repository::get_by_pool(database::pool(), project_id).await?;

    let signature = headers
        .get("x-hub-signature-256")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();

    if !git::verify_signature(&link.secret, &body, signature) {
        return Err(DomainError::Unauthenticated)?;
    }

    if !link.auto_deploy {
        return Ok(StatusCode::ACCEPTED);
    }

    // 브랜치가 다르면 무시한다 — 모노레포에서 다른 브랜치 push 가 배포를 트리거하면 안 된다
    if let Ok(payload) = serde_json::from_slice::<serde_json::Value>(&body)
        && let Some(reference) = payload.get("ref").and_then(|value| value.as_str())
        && reference != format!("refs/heads/{}", link.branch)
    {
        return Ok(StatusCode::ACCEPTED);
    }

    behavior::request(async |scope| {
        let deployment = Deployment::new(project_id, Trigger::Webhook);

        deployment_repository::add(&mut scope.transaction, &deployment).await?;
        project_repository::update_status(&mut *scope.transaction, project_id, ProjectStatus::Deploying)
            .await?;

        let job = Job::new(JobKind::Deploy, deployment.id);
        job_repository::enqueue(&mut scope.transaction, &job).await
    })
    .await?;

    Ok(StatusCode::ACCEPTED)
}
