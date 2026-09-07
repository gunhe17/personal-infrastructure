use std::convert::Infallible;
use std::time::Duration;

use axum::Json;
use axum::extract::Path;
use axum::extract::Query;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use axum::response::Sse;
use axum::response::sse::Event;
use axum::response::sse::KeepAlive;
use futures_util::Stream;
use futures_util::stream;
use serde::Deserialize;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::infrastructure::database;
use crate::module::deployment::domain::log;
use crate::module::deployment::domain::repository;
use crate::module::deployment::usecase;
use crate::shared::exception::AppError;

// #
// command

pub async fn post_start(
    headers: HeaderMap,
    Json(body): Json<usecase::start::Input>,
) -> Result<(StatusCode, Json<usecase::start::Output>), AppError> {
    let started = behavior::request_token(&headers, Scope::Deploy, async |scope| {
        usecase::start::start(&mut scope.transaction, body).await
    })
    .await?;

    Ok((StatusCode::ACCEPTED, Json(started)))
}

pub async fn post_rollback(
    headers: HeaderMap,
    Json(body): Json<usecase::rollback::Input>,
) -> Result<(StatusCode, Json<usecase::rollback::Output>), AppError> {
    let rolled = behavior::request_token(&headers, Scope::Deploy, async |scope| {
        usecase::rollback::rollback(&mut scope.transaction, body).await
    })
    .await?;

    Ok((StatusCode::ACCEPTED, Json(rolled)))
}

pub async fn post_promote(
    headers: HeaderMap,
    Json(body): Json<usecase::promote::Input>,
) -> Result<(StatusCode, Json<usecase::promote::Output>), AppError> {
    let promoted = behavior::request_token(&headers, Scope::Deploy, async |scope| {
        usecase::promote::promote(&mut scope.transaction, body).await
    })
    .await?;

    Ok((StatusCode::ACCEPTED, Json(promoted)))
}

pub async fn post_cancel(headers: HeaderMap, Path(id): Path<Uuid>) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::Deploy, async |scope| {
        usecase::cancel::cancel(&mut scope.transaction, id).await
    })
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// #
// query

#[derive(Deserialize)]
pub struct ListQuery {
    pub project_id: Uuid,
}

pub async fn get_list(
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<usecase::list::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        usecase::list::list(&mut scope.transaction, query.project_id).await
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

// #
// stream

/// 과거분을 DB 에서 먼저 흘리고 NOTIFY 로 이어붙인다 — 늦게 붙은 클라이언트가 앞부분을 받는다.
pub async fn get_logs(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> {
    behavior::request_token(&headers, Scope::ProjectRead, async |scope| {
        repository::get_by_id(&mut scope.transaction, id).await
    })
    .await?;

    // (cursor, listener, 종료 뒤 조용했던 틱 수) — 배포가 끝나도 포트 감사처럼 몇 초 뒤 오는 줄이 있어
    // 새 줄 없이 3틱(~6초)이 지나야 닫는다
    let stream = stream::unfold((0_i64, None, 0_u8), move |(cursor, listener, quiet)| async move {
        let pool = database::pool();

        // catch-up
        match log::list_since(pool, id, cursor).await {
            Ok(lines) if !lines.is_empty() => {
                let next = lines.last().map(|line| line.id).unwrap_or(cursor);
                let event = Event::default().json_data(&lines).unwrap_or_default();

                return Some((Ok(event), (next, listener, 0)));
            }
            Err(error) => {
                tracing::error!(%error, "log stream");

                return None;
            }
            _ => {}
        }

        // 종료 판정 — 끝났고, 유예 동안에도 새 줄이 없었다
        let finished = is_final(id).await.unwrap_or(false);
        if finished && quiet >= 3 {
            return None;
        }

        // wait
        let mut listener = match listener {
            Some(listener) => listener,
            None => database::listen(log::CHANNEL).await.ok()?,
        };

        let _ = tokio::time::timeout(Duration::from_secs(2), listener.recv()).await;

        Some((
            Ok(Event::default().comment("tick")),
            (cursor, Some(listener), if finished { quiet + 1 } else { 0 }),
        ))
    });

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

async fn is_final(id: Uuid) -> Result<bool, AppError> {
    let mut connection = database::pool().acquire().await?;
    let deployment = repository::get_by_id(&mut connection, id).await?;

    Ok(deployment.status.is_final())
}

pub mod mcp;
