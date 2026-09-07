use crate::config;
use crate::infrastructure::database;
use crate::infrastructure::docker;
use crate::shared::exception::AppError;
use crate::worker;

/// 로그는 무한히 자란다 — 30일치만 남긴다.
const LOG_RETENTION_DAYS: i32 = 30;

// #
// run

pub async fn run() {
    worker::repeat("gc", config::every(3600), tick).await
}

pub async fn tick() -> Result<(), AppError> {
    let pool = database::pool();

    // log
    sqlx::query!(
        r#"delete from deployment_log
           where created_at < now() - make_interval(days => $1::int)"#,
        LOG_RETENTION_DAYS
    )
    .execute(pool)
    .await?;

    // audit — 읽기 요청까지 남기므로 같은 창으로 자른다
    sqlx::query!(
        "delete from audit_entry where created_at < now() - make_interval(days => $1::int)",
        LOG_RETENTION_DAYS
    )
    .execute(pool)
    .await?;

    // request stat — 7일이면 충분하다. 분 단위 버킷은 금방 쌓인다
    sqlx::query!("delete from request_stat where bucket < now() - interval '7 days'")
        .execute(pool)
        .await?;

    sqlx::query!("delete from usage_sample where sampled_at < now() - interval '7 days'")
        .execute(pool)
        .await?;

    // job — 끝난 job 기록도 같이
    sqlx::query!(
        r#"delete from job
           where status in ('succeeded', 'failed')
             and created_at < now() - make_interval(days => $1::int)"#,
        LOG_RETENTION_DAYS
    )
    .execute(pool)
    .await?;

    // image — superseded 배포의 이미지는 롤백 대상이 아니므로 정리한다.
    // 최근 5개는 남긴다: 롤백은 그 안에서 일어난다
    let stale = sqlx::query!(
        r#"select image_ref from deployment
           where status = 'superseded' and image_ref is not null
             and created_at < now() - interval '7 days'
           order by created_at desc offset 5"#
    )
    .fetch_all(pool)
    .await?;

    for row in stale {
        let Some(image) = row.image_ref else {
            continue;
        };

        docker::client::remove_image(&image).await;
    }

    Ok(())
}
