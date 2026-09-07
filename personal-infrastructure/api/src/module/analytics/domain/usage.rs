use sqlx::PgConnection;
use sqlx::PgPool;

use crate::infrastructure::docker;
use crate::shared::exception::AppError;

// #
// sample

/// monitor 주기마다 우리 컨테이너의 CPU·메모리를 한 줄씩. 라벨로 남의 것은 뺀다.
pub async fn sample(pool: &PgPool) -> Result<(), AppError> {
    let managed: Vec<String> = docker::client::list_managed()
        .await
        .unwrap_or_default()
        .into_iter()
        .map(|(name, _)| name)
        .collect();

    for (container, cpu, mem) in docker::client::stats().await.unwrap_or_default() {
        if !managed.contains(&container) {
            continue;
        }

        sqlx::query!(
            "insert into usage_sample (sampled_at, container, cpu_percent, mem_bytes) values (now(), $1, $2, $3)",
            container,
            cpu,
            mem
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

// #
// query

/// 지난 24시간 — 컨테이너별 평균 CPU, 최대 메모리.
pub async fn summary(connection: &mut PgConnection) -> Result<Vec<contract::analytics::UsageRow>, AppError> {
    let listed = sqlx::query_as!(
        contract::analytics::UsageRow,
        r#"select container, avg(cpu_percent)::real as "cpu_avg!", max(mem_bytes) as "mem_max_bytes!",
                  count(*) as "samples!"
           from usage_sample where sampled_at > now() - interval '24 hours'
           group by container order by container"#
    )
    .fetch_all(connection)
    .await?;

    Ok(listed)
}
