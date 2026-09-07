---
paths:
  - "personal-infrastructure/api/src/module/*/endpoint.rs"
  - "personal-infrastructure/api/src/module/*/endpoint/**"
---

# endpoint 패턴

axum 핸들러. extractor 파싱 → 봉투 열기 → usecase 호출 → 직렬화. 비즈니스 로직 0. `module/{aggregate}/endpoint.rs`에 산다.

루트: [module-layout.md](module-layout.md) · 봉투: [behavior.md](behavior.md) · 흐름: [usecase-flow.md](usecase-flow.md) · 등록: [bin.md](bin.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **책임** | extractor + 봉투 + usecase 호출 + 직렬화만 |
| **핸들러 네이밍** | HTTP 메서드 접두 — `post_create` / `get_detail` |
| **등록** | endpoint가 아니라 `bin/server.rs`에서 — **[INV-14]** |
| **예외** | `try/catch` 없음. `?`와 `IntoResponse`가 진다 — **[INV-4]** |

---

## 형태

```rust
use axum::Json;
use axum::extract::Path;
use axum::http::HeaderMap;

use crate::behavior;
use crate::behavior::access::Scope;
use crate::module::project::usecase;
use crate::shared::exception::AppError;


// #
// command

pub async fn post_create(
    headers: HeaderMap,
    Json(body): Json<usecase::create::Input>,
) -> Result<Json<usecase::create::Output>, AppError> {
    let created = behavior::request_token(&headers, Scope::ProjectWrite, async |scope| {
        usecase::create::create(&mut scope.transaction, body).await
    })
    .await?;

    Ok(Json(created))
}


// #
// query

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
```

- 핸들러는 HTTP 메서드 접두 — `post_create`/`get_detail`. 라우트 메서드를 이름에서 읽는다(usecase 함수명 `create`/`detail`과 구분)
- extractor가 파싱·검증을 끝낸다. 본문에서 수동 파싱하면 잘못 짠 것. body extractor(`Json`)는 반드시 마지막 인자
- `Scope`는 봉투의 필수 인자라 빠뜨릴 수 없다 — [behavior.md](behavior.md)
- `to_dict()` 자리를 `Json()`이, `try/except` 자리를 `?`가 대신한다
- 검증·도메인 조작·트랜잭션 조정은 전부 아래 레이어가 — endpoint는 얇게
- 등록은 `bin/server.rs`에서. endpoint는 핸들러만 정의 — **[INV-14]**

---

## 스트리밍은 SSE

로그·진행 상황은 `Sse<impl Stream>`을 반환한다. 대시보드가 `EventSource`를 쓰므로 NDJSON이 아니라 SSE로 통일 — 스트림 하나로 CLI·대시보드·MCP를 먹인다.

```rust
pub async fn get_logs(
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, AppError> { ... }
```

늦게 붙은 클라이언트가 앞부분을 받아야 하므로 **DB의 기존 로그를 먼저 흘리고 broadcast 구독으로 이어붙인다**([worker.md](worker.md) "로그").

---

## MCP 어댑터가 붙을 때

`endpoint.rs`를 `endpoint/{http,mcp}.rs`로 나눈다. 지금은 파일 하나라 평탄하게 둔다 — 나중에 `git mv` 한 번이다.

MCP 핸들러는 `request_agent(AgentScope)` 봉투를 쓴다. 같은 usecase를 부르되 봉투가 다르다.

---

## 안티패턴

- endpoint에서 입력 검증·도메인 조작 → 아래 레이어로, endpoint는 얇게
- 예외를 endpoint에서 `match`/`if let Err` → `?` + `IntoResponse` **[INV-4]**
- usecase 결과를 재가공·래핑 → `Json(output)` 그대로 **[INV-7]**
- 봉투 없이 usecase 직접 호출 → 트랜잭션·감사가 사라진다 **[INV-5]**
- endpoint가 자기를 라우터에 등록 → `bin/server.rs` 단일 출처 **[INV-14]**
- 스트리밍을 NDJSON으로 → SSE 하나로 통일
