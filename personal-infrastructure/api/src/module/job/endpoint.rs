use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;
use axum::http::StatusCode;

use crate::behavior;
use crate::behavior::Scope;
use crate::module::common::exception::DomainError;
use crate::module::job::domain::repository;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_list(headers: HeaderMap) -> Result<Json<Vec<contract::system::JobOutput>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::SystemAdmin, async |scope| {
        repository::list_recent(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

/// 주기 워커를 지금 한 번 — 서버 프로세스 안에서 같은 tick 을 돈다.
pub async fn post_run(headers: HeaderMap, Path(name): Path<String>) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::SystemAdmin, async |_| {
        match name.as_str() {
            "ssl_renew" => crate::worker::ssl_renew::tick().await,
            "backup" => crate::worker::backup::tick().await,
            "monitor" => crate::worker::monitor::tick().await,
            "gc" => crate::worker::gc::tick().await,
            _ => Err(DomainError::NotFound {
                target: "Job",
                identifier: name.clone(),
            })?,
        }
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}
