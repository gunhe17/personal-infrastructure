---
paths:
  - "personal-infrastructure/api/src/bin/*.rs"
  - "personal-infrastructure/api/src/bootstrap.rs"
  - "personal-infrastructure/api/src/lib.rs"
---

# bin 패턴 (합성 루트 둘)

`bin/server.rs`(HTTP)와 `bin/worker.rs`(장기 작업). 프로세스가 둘이고 합성 루트도 둘이다. 등록·조립만 — 비즈니스 로직 0, 도메인 의존 0.

루트: [module-layout.md](module-layout.md) · 핸들러: [endpoint.md](endpoint.md) · 러너: [worker.md](worker.md) · 봉투: [behavior.md](behavior.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **프로세스 둘** | self-update가 API를 재시작해도 진행 중인 배포가 안 죽는다 |
| **대칭** | `router()` ↔ `runners()`. 기동·등록·봉투·종료 네 자리가 같은 모양 |
| **래퍼 금지** | `axum::Router`와 `tokio::JoinSet`을 직접 쓴다. `Server`/`Worker` 프리미티브를 만들지 않는다 |
| **등록 단일 출처** | endpoint·러너는 자기를 등록하지 않는다 — **[INV-14]** |

---

## 프로세스를 둘로 나누는 이유

`system update`가 API를 재시작하는데 워커가 같은 프로세스면 **진행 중인 배포가 같이 죽는다.** 자기 자신을 업데이트하는 배포 도구라 이건 실제로 일어난다.

로그 스트리밍은 프로세스가 갈려도 된다 — 워커가 DB에 적고 서버가 tail한다. 늦게 붙은 클라이언트를 위해 어차피 영속이 필요하다([worker.md](worker.md) "로그").

---

## 공유 기동 — `bootstrap.rs`

두 bin이 같은 절차로 뜬다. 여기 없는 것을 bin에 인라인하지 않는다.

```rust
// #
// init

pub async fn init(name: &'static str) -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    database::connect(&config::get().database_url).await?;
    docker::connect().await?;

    tracing::info!(process = name, version = env!("CARGO_PKG_VERSION"), "started");

    Ok(())
}


// #
// shutdown

pub async fn shutdown() {
    let interrupt = async { signal::ctrl_c().await.ok(); };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(SignalKind::terminate()).expect("SIGTERM").recv().await;
    };

    tokio::select! {
        _ = interrupt => {}
        _ = terminate => {}
    }
}
```

---

## `bin/server.rs`

```rust
// #
// router

fn router() -> Router {
    Router::new()
        .route("/health", get(system::endpoint::get_health))
        .route("/projects", get(project::endpoint::get_list)
                            .post(project::endpoint::post_create))
        .route("/projects/{id}", get(project::endpoint::get_detail)
                                 .delete(project::endpoint::delete_remove))
        .route("/deployments", post(deployment::endpoint::post_start))
        .route("/deployments/{id}/logs", get(deployment::endpoint::get_logs))
        .route("/domains", post(domain_name::endpoint::post_attach))
        .layer(TraceLayer::new_for_http())
}


// #
// run

#[tokio::main]
async fn main() -> Result<()> {
    bootstrap::init("server").await?;

    // 엣지가 유일한 공개 창구 — API 자신도 루프백에만 뜬다
    let listener = TcpListener::bind(("127.0.0.1", config::get().port)).await?;

    axum::serve(listener, router())
        .with_graceful_shutdown(bootstrap::shutdown())
        .await?;

    Ok(())
}
```

- endpoint는 모듈 namespace로 import (`use crate::module::project;` → `project::endpoint::post_create`)
- 핸들러 이름은 HTTP 메서드 접두 — [endpoint.md](endpoint.md)
- 예외 핸들러 등록이 없다. `impl IntoResponse for AppError` 가 등록 없이 쓰인다 — [exception.md](exception.md)
- `// #` `router` / `run` 섹션 마커로 구획

---

## `bin/worker.rs`

```rust
// #
// runner

fn runners() -> JoinSet<()> {
    let mut set = JoinSet::new();

    set.spawn(worker::deploy::run());
    set.spawn(worker::ssl_renew::run());
    set.spawn(worker::backup::run());
    set.spawn(worker::monitor::run());
    set.spawn(worker::gc::run());

    set
}


// #
// run

#[tokio::main]
async fn main() -> Result<()> {
    bootstrap::init("worker").await?;

    let mut set = runners();

    bootstrap::shutdown().await;
    set.shutdown().await;

    Ok(())
}
```

`router()` ↔ `runners()` — 둘 다 등록의 단일 출처고, 둘 다 값을 반환한다.

---

## 대칭

| | `bin/server.rs` | `bin/worker.rs` |
|---|---|---|
| 기동 | `bootstrap::init("server")` | `bootstrap::init("worker")` |
| 등록 단일 출처 | `router()` | `runners()` |
| 봉투 | `request` · `request_token(Scope)` | `with_job(JobKind)` · `with_lock(id)` |
| 트랜잭션 | 봉투가 소유 | 봉투가 소유 |
| 감사 | 봉투가 기록 | 봉투가 기록 |
| 종료 | `with_graceful_shutdown` | `set.shutdown()` |
| 래퍼 | `axum::Router` 직접 | `tokio::JoinSet` 직접 |

---

## 래퍼를 만들지 않는다

Python 쪽 `server/`(Server·Router·Middleware·Lifecycle)와 `worker/`(Worker·Work·Pool·Lifecycle) 프리미티브는 **옮기지 않는다.** `axum::Router`의 빌더와 `tokio::JoinSet`이 이미 그것이고, 감싸면 래퍼 위 래퍼다.

`Lifecycle`(시그널)만 살아남아 `bootstrap::shutdown()`이 됐다 — 두 bin이 공유해야 해서지 추상화가 필요해서가 아니다.

---

## 안티패턴

- endpoint·러너가 자기를 등록 → 합성 루트 단일 출처 **[INV-14]**
- `Server`/`Worker` 래퍼 신설 → `Router`/`JoinSet` 직접
- bin에 라우팅·검증·시그널 처리 인라인 → 본문은 endpoint·`bootstrap.rs`에, bin은 등록 호출만
- 서버가 워커 태스크를 spawn → 프로세스 분리가 무의미해진다. self-update가 배포를 죽인다
- 기동 절차를 bin마다 다르게 → `bootstrap::init` 하나
