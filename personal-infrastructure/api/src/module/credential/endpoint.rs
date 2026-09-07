use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::credential::domain::Secret;
use crate::module::credential::domain::repository;
use crate::module::credential::usecase;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_list(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::credential::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::CredentialWrite, async |scope| {
        repository::list_all(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

/// 평문은 별도 스코프로 별도 요청에서만 — 목록에는 절대 실리지 않는다.
pub async fn get_reveal(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Json<contract::credential::Revealed>, AppError> {
    let revealed = behavior::request_token(&headers, Scope::CredentialRead, async |scope| {
        usecase::reveal::reveal(scope, id).await
    })
    .await?;

    Ok(Json(revealed))
}

// #
// command

pub async fn post_create(
    headers: HeaderMap,
    Json(body): Json<contract::credential::CreateInput>,
) -> Result<(StatusCode, Json<contract::credential::Output>), AppError> {
    let created = behavior::request_token(&headers, Scope::CredentialWrite, async |scope| {
        let id = Uuid::new_v4();
        let secret = Secret::from_str(&body.secret);

        let created_at =
            repository::add(&mut scope.transaction, id, &body.name, &body.kind, &secret).await?;

        Ok(contract::credential::Output {
            id,
            name: body.name.clone(),
            kind: body.kind.clone(),
            preview: secret.preview(),
            created_at,
        })
    })
    .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn delete_remove(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::CredentialWrite, async |scope| {
        repository::remove(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
