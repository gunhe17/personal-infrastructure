use sqlx::PgPool;

use contract::webhook::Event;

use crate::infrastructure::notify::client as notify;
use crate::module::common::text;
use crate::module::webhook::domain::repository;

// #
// dispatch

/// 이벤트를 구독한 웹훅 전부에 쏘고 전달 이력을 남긴다. 실패가 본 작업을 되돌리지 않는다.
pub async fn fire(pool: &PgPool, event: Event, payload: serde_json::Value) {
    let Ok(hooks) = repository::list_for(pool, event).await else {
        return;
    };

    let body = serde_json::json!({ "event": text::of(&event), "data": payload });
    let Ok(bytes) = serde_json::to_vec(&body) else {
        return;
    };

    for hook in hooks {
        let secret = hook.secret.as_ref().map(|secret| secret.to_str().to_owned());
        let (status, error) = notify::post_event(&hook.url, secret.as_deref(), &text::of(&event), &bytes).await;

        if let Some(error) = &error {
            tracing::warn!(url = hook.url, error, "webhook delivery failed");
        }

        let _ = repository::record_delivery(pool, hook.id, status, error.as_deref()).await;
    }
}
