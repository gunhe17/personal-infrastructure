use crate::config;
use crate::infrastructure::database;
use crate::module::backup::domain::repository;
use crate::module::backup::usecase;
use crate::module::common::exception::DomainError;
use crate::shared::exception::AppError;
use crate::worker;

// #
// run

pub async fn run() {
    worker::repeat("backup", config::every(60), tick).await
}

pub async fn tick() -> Result<(), AppError> {
    let pool = database::pool();

    for schedule in repository::list_due(pool).await? {
        let Some(target_id) = schedule.target_id else {
            continue;
        };

        // 실행 표시를 먼저 — 실패해도 다음 주기까지 기다린다(무한 재시도 방지)
        repository::mark_ran(pool, schedule.id).await?;

        match usecase::run::run(pool, schedule.destination_id, schedule.target_kind, target_id).await {
            Ok(_) => {}
            // 대상이 사라졌으면 예약도 치운다 — 매 주기 같은 오류를 내지 않는다
            Err(AppError::Domain(DomainError::NotFound { .. })) => {
                tracing::warn!(schedule = %schedule.id, "백업 대상이 없어 예약을 지웁니다");
                repository::remove_schedules_for(pool, target_id).await?;
            }
            Err(error) => tracing::error!(%error, "예약 백업 실패"),
        }
    }

    Ok(())
}
