use anyhow::Context as _;
use anyhow::anyhow;
use futures_util::StreamExt;
use reqwest::Client;
use reqwest::Method;
use reqwest::Response;
use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::config;

// #
// client

fn client() -> Client {
    Client::builder()
        .user_agent(concat!("pi-cli/", env!("CARGO_PKG_VERSION")))
        .build()
        .expect("http client")
}

async fn send(
    method: Method,
    path: &str,
    body: Option<serde_json::Value>,
) -> anyhow::Result<Response> {
    let url = format!("{}{path}", config::api_url());
    let mut request = client().request(method, &url);

    if let Some(token) = config::token() {
        request = request.bearer_auth(token);
    }

    if let Some(body) = body {
        request = request.json(&body);
    }

    let response = request
        .send()
        .await
        .with_context(|| format!("{url} 에 연결하지 못했습니다"))?;

    Ok(response)
}

/// 상태가 실패면 본문을 오류로 바꾼다 — 모든 verb 가 이 하나를 지난다.
async fn ok(response: Response) -> anyhow::Result<Response> {
    let status = response.status();

    if status.is_success() {
        return Ok(response);
    }

    Err(failure(status.as_u16(), &response.text().await?))
}

async fn parse<T: DeserializeOwned>(response: Response) -> anyhow::Result<T> {
    let raw = ok(response).await?.text().await?;

    serde_json::from_str(&raw).with_context(|| format!("응답을 해석하지 못했습니다: {raw}"))
}

/// 4xx 는 메시지를, 5xx 는 error_id 를 보여준다.
fn failure(status: u16, raw: &str) -> anyhow::Error {
    match serde_json::from_str::<contract::error::Body>(raw) {
        Ok(body) => anyhow!("{} ({status})", body.message()),
        Err(_) => anyhow!("요청이 실패했습니다 ({status}): {raw}"),
    }
}

// #
// verb

pub async fn get<T: DeserializeOwned>(path: &str) -> anyhow::Result<T> {
    parse(send(Method::GET, path, None).await?).await
}

pub async fn post<B: Serialize, T: DeserializeOwned>(path: &str, body: &B) -> anyhow::Result<T> {
    parse(send(Method::POST, path, Some(serde_json::to_value(body)?)).await?).await
}

/// 본문 없는 응답(204/201)을 받는 POST.
pub async fn post_empty<B: Serialize>(path: &str, body: &B) -> anyhow::Result<()> {
    ok(send(Method::POST, path, Some(serde_json::to_value(body)?)).await?).await?;

    Ok(())
}

pub async fn put_empty<B: Serialize>(path: &str, body: &B) -> anyhow::Result<()> {
    ok(send(Method::PUT, path, Some(serde_json::to_value(body)?)).await?).await?;

    Ok(())
}

/// 상태와 본문을 그대로 — `pi api` 가 쓴다. 실패도 오류가 아니라 응답이다.
pub async fn raw(
    method: &str,
    path: &str,
    body: Option<serde_json::Value>,
) -> anyhow::Result<(u16, String)> {
    let method = Method::from_bytes(method.as_bytes())?;
    let response = send(method, path, body).await?;

    Ok((response.status().as_u16(), response.text().await?))
}

pub async fn delete(path: &str) -> anyhow::Result<()> {
    ok(send(Method::DELETE, path, None).await?).await?;

    Ok(())
}

// #
// stream

/// SSE — `data:` 접두 + 빈 줄 구분. 프레이밍이 이것뿐이라 파서를 따로 두지 않는다.
pub async fn stream_logs(path: &str, mut on_line: impl FnMut(&str)) -> anyhow::Result<()> {
    let response = ok(send(Method::GET, path, None).await?).await?;
    let mut body = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = body.next().await {
        buffer.push_str(&String::from_utf8_lossy(&chunk?));

        while let Some(index) = buffer.find('\n') {
            let line = buffer[..index].trim_end().to_owned();
            buffer.drain(..=index);

            let Some(payload) = line.strip_prefix("data:") else {
                continue;
            };

            let Ok(lines) =
                serde_json::from_str::<Vec<contract::deployment::LogLine>>(payload.trim())
            else {
                continue;
            };

            for log in lines {
                on_line(&log.line);
            }
        }
    }

    Ok(())
}
