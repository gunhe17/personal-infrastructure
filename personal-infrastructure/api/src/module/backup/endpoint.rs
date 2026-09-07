use axum::Json;
use axum::http::HeaderMap;
use axum::http::StatusCode;
use uuid::Uuid;

use crate::behavior;
use crate::behavior::Scope;
use crate::infrastructure::database;
use crate::module::backup::domain::repository;
use crate::module::backup::domain::repository::Schedule;
use crate::module::backup::usecase;
use crate::shared::exception::AppError;

// #
// query

pub async fn get_list(headers: HeaderMap) -> Result<Json<Vec<contract::backup::Output>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::BackupWrite, async |scope| {
        repository::list_backups(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

pub async fn get_destinations(
    headers: HeaderMap,
) -> Result<Json<Vec<contract::backup::DestinationOutput>>, AppError> {
    let listed = behavior::request_token(&headers, Scope::BackupWrite, async |scope| {
        repository::list_destinations(&mut scope.transaction).await
    })
    .await?;

    Ok(Json(listed))
}

// #
// command

pub async fn post_destination(
    headers: HeaderMap,
    Json(body): Json<contract::backup::CreateDestinationInput>,
) -> Result<(StatusCode, Json<contract::backup::DestinationOutput>), AppError> {
    let created = behavior::request_token(&headers, Scope::BackupWrite, async |scope| {
        let destination = contract::backup::DestinationOutput {
            id: Uuid::new_v4(),
            name: body.name.clone(),
            kind: body.kind,
            location: body.location.clone(),
        };

        repository::add_destination(&mut scope.transaction, &destination).await?;

        Ok(destination)
    })
    .await?;

    Ok((StatusCode::CREATED, Json(created)))
}

/// 즉시 실행 — 덤프가 오래 걸릴 수 있어 요청 안에서 돌리되 응답까지 기다린다.
/// (예약 백업은 워커가 돌린다.)
pub async fn post_run(
    headers: HeaderMap,
    Json(body): Json<contract::backup::RunInput>,
) -> Result<Json<contract::backup::Output>, AppError> {
    behavior::request_token(&headers, Scope::BackupWrite, async |_scope| {
        Ok::<(), AppError>(())
    })
    .await?;

    let pool = database::pool();
    let id = usecase::run::run(pool, body.destination_id, body.target_kind, body.target_id).await?;
    let created = repository::get_backup(pool, id).await?;

    Ok(Json(created))
}

pub async fn post_schedule(
    headers: HeaderMap,
    Json(body): Json<contract::backup::ScheduleInput>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::BackupWrite, async |scope| {
        let schedule = Schedule {
            id: Uuid::new_v4(),
            destination_id: body.destination_id,
            target_kind: body.target_kind,
            target_id: Some(body.target_id),
            every_seconds: body.every_seconds,
            last_run_at: None,
        };

        repository::add_schedule(&mut scope.transaction, &schedule).await
    })
    .await?;

    Ok(StatusCode::CREATED)
}

pub async fn post_restore(
    headers: HeaderMap,
    Json(body): Json<contract::backup::RestoreInput>,
) -> Result<StatusCode, AppError> {
    behavior::request_token(&headers, Scope::BackupWrite, async |_scope| {
        Ok::<(), AppError>(())
    })
    .await?;

    usecase::restore::restore(database::pool(), body.backup_id).await?;

    Ok(StatusCode::NO_CONTENT)
}
