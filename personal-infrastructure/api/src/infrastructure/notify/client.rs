use std::time::Duration;

use contract::notification::ChannelKind;
use hmac::Hmac;
use hmac::Mac;
use sha2::Sha256;

// #
// notify

/// 알림 실패가 본 작업을 되돌리지 않는다 — 로그만 남기고 삼킨다.
pub async fn send(channels: &[(ChannelKind, String)], text: &str) {
    let client = reqwest::Client::new();

    for (kind, target) in channels {
        let body = match kind {
            ChannelKind::Slack => serde_json::json!({ "text": text }),
            ChannelKind::Webhook => serde_json::json!({ "message": text }),
        };

        let sent = client
            .post(target)
            .timeout(Duration::from_secs(5))
            .json(&body)
            .send()
            .await
            .and_then(|response| response.error_for_status());

        if let Err(error) = sent {
            tracing::warn!(%error, target, "notification failed");
        }
    }
}

// #
// webhook

/// 이벤트 웹훅 — secret 이 있으면 본문을 HMAC-SHA256 으로 서명한다(GitHub 과 같은 형식).
/// 돌려주는 값은 (HTTP 상태, 오류) — 전달 이력에 그대로 남긴다.
pub async fn post_event(
    url: &str,
    secret: Option<&str>,
    event: &str,
    body: &[u8],
) -> (Option<u16>, Option<String>) {
    let mut request = reqwest::Client::new()
        .post(url)
        .timeout(Duration::from_secs(10))
        .header("Content-Type", "application/json")
        .header("X-PI-Event", event)
        .body(body.to_vec());

    if let Some(secret) = secret
        && let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
    {
        mac.update(body);
        request = request.header("X-PI-Signature", format!("sha256={:x}", mac.finalize().into_bytes()));
    }

    match request.send().await {
        Ok(response) => {
            let status = response.status().as_u16();
            let error = (!response.status().is_success()).then(|| format!("HTTP {status}"));

            (Some(status), error)
        }
        Err(error) => (None, Some(error.to_string())),
    }
}
