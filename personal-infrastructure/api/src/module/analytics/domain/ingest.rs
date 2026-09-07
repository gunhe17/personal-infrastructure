use std::collections::HashMap;
use std::sync::Mutex;

use chrono::DateTime;
use chrono::Utc;
use sqlx::PgPool;

use crate::infrastructure::docker;
use crate::infrastructure::edge::client as edge;
use crate::module::analytics::domain::repository;
use crate::shared::exception::AppError;

/// 마지막으로 읽은 시각 — 겹쳐 세지 않는다.
static LAST: Mutex<Option<DateTime<Utc>>> = Mutex::new(None);

// #
// ingest

/// 엣지 access log(`host status method path`)를 30초마다 집계한다. 요청당 DB 쓰기 없음.
pub async fn run(pool: &PgPool) -> Result<(), AppError> {
    if !docker::client::is_running(edge::CONTAINER).await {
        return Ok(());
    }

    let now = Utc::now();
    let since = LAST.lock().expect("ingest lock").unwrap_or(now - chrono::Duration::seconds(30));
    let raw = docker::client::logs_since(edge::CONTAINER, &since.to_rfc3339()).await?;
    *LAST.lock().expect("ingest lock") = Some(now);

    let counted = aggregate(&raw);

    if counted.is_empty() {
        return Ok(());
    }

    let bucket = now.with_timezone(&Utc).date_naive().and_hms_opt(now.format("%H").to_string().parse().unwrap_or(0), now.format("%M").to_string().parse().unwrap_or(0), 0).expect("minute").and_utc();

    for ((host, status, path), count) in counted {
        repository::add(pool, bucket, &host, status, &path, count).await?;
    }

    Ok(())
}

fn aggregate(raw: &str) -> HashMap<(String, i32, String), i32> {
    let mut counted = HashMap::new();

    for line in raw.lines() {
        let mut fields = line.split_whitespace();
        let (Some(host), Some(status), Some(_method), Some(path)) =
            (fields.next(), fields.next(), fields.next(), fields.next())
        else {
            continue;
        };
        let Ok(status) = status.parse::<i32>() else {
            continue;
        };

        // 경로는 첫 두 세그먼트까지만 — /api/users/123 과 /api/users/456 이 한 줄이 된다
        let trimmed: String = path.split('/').take(3).collect::<Vec<_>>().join("/");

        *counted.entry((host.to_owned(), status, trimmed)).or_insert(0) += 1;
    }

    counted
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn groups_by_host_status_and_short_path() {
        let raw = "a.test 200 GET /api/users/1\na.test 200 GET /api/users/2\na.test 404 GET /x\ngarbage\n";
        let counted = aggregate(raw);

        assert_eq!(counted[&("a.test".into(), 200, "/api/users".into())], 2);
        assert_eq!(counted[&("a.test".into(), 404, "/x".into())], 1);
        assert_eq!(counted.len(), 2);
    }
}
