---
paths:
  - "personal-infrastructure/api/src/behavior.rs"
  - "personal-infrastructure/api/src/behavior/**"
---

# behavior (봉투)

요청 하나(unit of work)를 감싸는 능동 정책 레이어 — 트랜잭션 경계·인증·스코프·감사가 여기 산다. 인터페이스가 늘어도 usecase가 안 바뀌는 이유.

루트: [module-layout.md](module-layout.md) · 핸들러: [endpoint.md](endpoint.md) · 워커 UoW: [worker.md](worker.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **봉투는 클로저를 받는 함수** | extractor는 핸들러 앞만 감싼다. 커밋·감사가 갈 자리가 없다 |
| **스코프 인자 필수** | `required: Scope`를 빠뜨릴 수 없다 — 부트 스캐너 불필요 |
| **트랜잭션 독점** | `database::begin()`은 `pub(in crate::behavior)` — **[INV-5]** |
| **인터페이스 축** | 봉투가 늘고 usecase는 안 바뀐다 |
| **MCP 차단** | `AgentScope`에 `SecretReveal`이 없어 컴파일이 막는다 |

---

## 왜 extractor가 아닌가

axum extractor는 핸들러 **앞**만 감쌀 수 있다. `yield` 뒤 — 커밋, 감사 기록, 이벤트 dispatch — 가 갈 자리가 없다. `middleware::from_fn`은 감싸지만 핸들러에 `&mut Transaction`을 넘길 수 없다.

인증을 extractor로 빼면 더 나쁘다: 멤버십 확인이 커넥션 A, 쓰기가 트랜잭션 B가 되어 **인가와 쓰기가 다른 트랜잭션**이 된다. 그 사이 권한이 회수되면 쓰기가 통과한다.

그래서 봉투는 **클로저를 받는 함수**다. Rust 2024의 async closure(`AsyncFnOnce`)가 `&mut Scope`를 빌려주는 lending을 지원해서 성립한다.

---

## 봉투 목록

| 봉투 | 인터페이스 | 시점 |
|---|---|---|
| `request()` | 공개 — 헬스체크, GitHub 웹훅(서명 검증이 인증을 대신) | 지금 |
| `request_token(Scope)` | PAT — CLI · 스크립트 · REST | 지금 |
| `request_session(Scope)` | 웹 대시보드 — 쿠키 세션 | 나중 |
| `request_agent(AgentScope)` | MCP — 매 호출 승인 재확인 | 나중 |
| `worker::with_job(JobKind)` | 큐 소비 — [worker.md](worker.md) | 지금 |
| `worker::with_lock(id)` | 주기 + 배타 — [worker.md](worker.md) | 지금 |

봉투가 늘어도 **usecase는 안 바뀐다.** endpoint가 scope 하나로 받아 usecase엔 primitive로 풀기 때문이다. 그게 이 레이어의 값어치다.

---

## 형태

```rust
// #
// request token

pub async fn request_token<T>(
    headers: &HeaderMap,
    required: Scope,
    handle: impl AsyncFnOnce(&mut TokenScope) -> Result<T, AppError>,
) -> Result<T, AppError> {
    let mut transaction = database::begin().await?;

    // authenticate
    let token = access::authenticate_token(&mut transaction, headers).await?;

    // authorize
    access::authorize_scope(&token, required)?;

    let mut scope = TokenScope {
        transaction,
        token_id: token.id,
        source: token.source,
    };

    // yield
    let handled = handle(&mut scope).await?;

    // audit
    audit::record(&mut scope.transaction, &scope, required).await?;

    scope.transaction.commit().await?;

    Ok(handled)
}
```

- `required: Scope`가 **필수 인자**라 빠뜨릴 수 없다. openship은 `secureRouter`가 permission tag를 강제하고 부트 스캐너가 누락 라우트를 찾아 기동을 거부하는데, 여기선 시그니처가 그 일을 해 스캐너가 없다
- 감사도 봉투 안이라 endpoint가 잊을 수 없다. 호출 출처(CLI/REST)는 User-Agent가 아니라 토큰 발급 시 기록한 `source` — 위조되지 않는다
- 핸들러가 에러를 내면 `?`로 빠져나가며 `scope`가 drop되어 트랜잭션이 롤백되고, 감사와 커밋은 실행되지 않는다
- 정본 순서는 봉투가 소유한다. 직선 코드라 `set_action`/`run_action` 레지스트리가 없다

---

## scope — `Option`을 두지 않는다

```rust
// #
// scope

pub struct RequestScope {
    pub transaction: Transaction<'static, Postgres>,
}

pub struct TokenScope {
    pub transaction: Transaction<'static, Postgres>,
    pub token_id: Uuid,
    pub source: Source,
}
```

봉투가 실제로 산출하는 필드만 담는다. `token_id: Option<Uuid>`로 두면 인증을 빠뜨려도 통과한다 — 봉투마다 타입을 나눠 **얻은 시점에 존재가 컴파일러 보증**이 되게 한다.

엔드포인트는 scope 하나로 받아 usecase엔 primitive로 푼다. scope 타입은 behavior 내부다.

---

## 스코프 enum — MCP가 비밀키에 닿지 못하는 이유

```rust
// #
// scope

pub enum Scope {
    ProjectRead, ProjectWrite, Deploy, DomainWrite,
    SecretReveal, TokenAdmin, SystemAdmin,
}

pub enum AgentScope {
    ProjectRead, ProjectWrite, Deploy,
}
```

`AgentScope`에 `SecretReveal`이 없다. `request_agent` 봉투로 그 usecase에 도달하는 코드는 **컴파일되지 않는다** — "비밀키는 절대 안 열림"이 문서가 아니라 타입 보증이 된다.

단일 사용자라 "누가"는 없고 "이 토큰이 무엇을 할 수 있나"만 있다. 그래서 permission이 아니라 scope다 — 봉투가 인가를 끝내므로 **repository 쿼리에 소유자 필터가 붙지 않는다**([../root.md](../root.md) "확정된 결정").

대시보드가 와도 계정은 하나다. `request_session`이 생겨도 산출하는 것은 `SessionScope { transaction, scope }`이지 `account_id`가 아니다.

---

## 트랜잭션 독점 — [INV-5]

```rust
// api/src/behavior/mod.rs — pub 없음. behavior 와 그 자식 모듈에서만 보인다
async fn begin() -> Result<Transaction<'static, Postgres>, AppError> {
    let transaction = database::pool().begin().await?;

    Ok(transaction)
}
```

`infrastructure` 에 두고 `pub(in crate::behavior)` 로 여는 방법은 **불가능하다** — Rust 가시성은 조상 모듈로만 제한할 수 있어서 형제 모듈을 지목할 수 없다(E0742). 그래서 `begin()` 자체를 봉투 안으로 옮긴다.

이러면 `begin()` 은 봉투 밖에서 호출되지 않지만, `database::pool()` 이 공개라 `pool().begin()` 으로 우회하는 것까지는 막히지 않는다. 파이프라인·로그가 트랜잭션 밖 풀 쓰기를 하려면 `pool()` 이 필요해서 감출 수 없다 — 그 한 줄은 리뷰가 잡는다.

---

## 안티패턴

- 인증·인가를 extractor로 분리 → 쓰기와 다른 트랜잭션이 된다. 봉투 안에서
- scope 필드를 `Option`으로 → 봉투를 나눠 non-`Option`으로
- usecase가 `database::begin()` 호출 → 컴파일 에러. 봉투가 소유 **[INV-5]**
- endpoint에서 감사 기록 → 봉투가 진다. 잊을 수 있는 자리에 두지 않는다
- 정책 조합을 런타임 집합(`set[type]`)으로 → enum. 빠뜨린 조합이 컴파일 에러가 된다
- MCP 도구가 `Scope`를 받음 → `AgentScope`. 타입이 다르다
