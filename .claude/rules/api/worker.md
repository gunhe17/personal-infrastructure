---
paths:
  - "personal-infrastructure/api/src/worker.rs"
  - "personal-infrastructure/api/src/worker/**"
  - "personal-infrastructure/api/src/behavior/worker.rs"
---

# worker 패턴

장기 작업 러너. 배포·인증서 갱신·백업·모니터링·정리가 전부 여기 산다. `bin/worker.rs`가 조립하고([bin.md](bin.md)), 각 러너는 `worker/{name}.rs`.

루트: [module-layout.md](module-layout.md) · 합성 루트: [bin.md](bin.md) · UoW: [behavior.md](behavior.md) · enqueue: [usecase-flow.md](usecase-flow.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **러너 형태** | `run()` 하나가 public. `worker::repeat(name, every, tick)` 위에 얹는다 |
| **두 UoW** | `with_job(JobKind)` 큐 소비 · `with_lock(id)` 주기+배타 |
| **claim은 lease** | 워커가 죽으면 claim만 남는다. lease를 넘긴 job은 다시 집는다 |
| **실패 격리** | 한 틱의 실패가 루프를 끝내지 않는다 |
| **로그** | DB 영속 + broadcast. 서버가 tail해 SSE로 흘린다 |

---

## 공유 루프 — `worker.rs`

```rust
// #
// repeat

pub async fn repeat<F, Fut>(name: &'static str, every: Duration, tick: F)
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<(), AppError>>,
{
    let mut ticker = tokio::time::interval(every);
    ticker.set_missed_tick_behavior(MissedTickBehavior::Delay);

    loop {
        ticker.tick().await;

        // 한 틱의 실패가 루프를 끝내지 않는다 — 끝나면 그 종류의 작업이 전부 멈춘다
        if let Err(error) = tick().await {
            tracing::error!(worker = name, ?error);
        }
    }
}
```

러너마다 반복될 폴링 루프 하나만 공유한다. 그 이상의 프리미티브(`Worker`/`Work`/`Pool` 래퍼)는 만들지 않는다 — `JoinSet`이 이미 런타임이다([bin.md](bin.md)).

---

## 큐 소비형 — `worker/deploy.rs`

```rust
// #
// run

pub async fn run() {
    worker::repeat("deploy", Duration::from_secs(1), tick).await
}


async fn tick() -> Result<(), AppError> {
    with_job(JobKind::Deploy, deploy).await?;

    Ok(())
}


// #
// job

async fn deploy(scope: &mut WorkerScope, job: Job) -> Result<(), AppError> {
    // detect
    let detected = pipeline::detect::run(scope, &job).await?;

    // build
    let built = pipeline::build::run(scope, &job, detected).await?;

    // run
    pipeline::run::start(scope, &job, built).await?;

    Ok(())
}
```

- `run()`만 public. `tick`과 job 핸들러는 비공개
- 흐름은 그 모듈의 `pipeline/`에 산다 — 워커는 순서만([module-layout.md](module-layout.md))

---

## 주기형 — `worker/ssl_renew.rs`

```rust
// #
// run

pub async fn run() {
    worker::repeat("ssl_renew", Duration::from_secs(6 * 3600), tick).await
}


async fn tick() -> Result<(), AppError> {
    let expiring = certificate::domain::repository::list_expiring(RENEW_WINDOW).await?;

    for certificate in expiring {
        // 도메인별 잠금 — 두 워커가 같은 도메인에 ACME 를 두 번 치면 rate limit 에 걸린다
        with_lock(certificate.domain_id, async |scope| {
            certificate::usecase::renew::renew(scope, certificate).await
        })
        .await?;
    }

    Ok(())
}
```

---

## UoW — `behavior/worker.rs`

```rust
// #
// job

pub async fn with_job<T>(
    kind: JobKind,
    handle: impl AsyncFnOnce(&mut WorkerScope, Job) -> Result<T, AppError>,
) -> Result<Option<T>, AppError> {
    let mut transaction = database::begin().await?;

    // claim
    let Some(claimed) = job::claim(&mut transaction, kind).await? else {
        return Ok(None);
    };

    let mut scope = WorkerScope { transaction, job_id: claimed.id };

    // succeed / fail
    match handle(&mut scope, claimed.clone()).await {
        Ok(handled) => {
            job::succeed(&mut scope.transaction, claimed.id).await?;
            scope.transaction.commit().await?;

            Ok(Some(handled))
        }
        Err(error) => {
            // 롤백된 트랜잭션 밖에서 새 커넥션으로 — 같이 롤백되면 job 이 영원히 재시도된다
            job::fail(claimed.id, &error).await?;

            Err(error)
        }
    }
}
```

서버 봉투와 같은 결이다 — 트랜잭션을 열고, 정책을 돌리고, 클로저에 `&mut Scope`를 빌려주고, 커밋한다([behavior.md](behavior.md)).

---

## claim은 lease

워커가 배포 도중 죽으면 `claimed_at`만 남고 그 job이 영원히 멈춘다. **lease를 넘긴 claim은 다른 워커가 다시 집는다.**

```sql
update job
set status = 'running', claimed_at = now()
where id = (
    select id from job
    where kind = $1
      and (status = 'pending'
           or (status = 'running' and claimed_at < now() - interval '10 minutes'))
    order by created_at
    for update skip locked
    limit 1
)
returning *
```

두 장치가 각각 다른 사고를 막는다:

- `for update skip locked` — **동시** claim. 워커 둘이 같은 row를 집지 않고, 잠긴 row를 기다리지 않고 건너뛴다
- `claimed_at` lease — **죽은** 워커. 프로세스가 배포 도중 사라지면 `running`만 남고 그 job이 영원히 멈춘다

프로세스를 둘로 나눈 이상 이건 선택이 아니다 — 없으면 분리 자체가 버그가 된다. 백업 job이 자기 DB를 덤프할 때 그 job의 `running` 상태가 스냅샷에 박히는데, 복원 후 그것을 푸는 것도 lease다.

---

## 로그

**프로세스가 갈려 있으므로 in-process 채널로는 못 넘긴다.** 워커의 `broadcast`를 서버는 볼 수 없다. Postgres가 그 사이를 잇는다.

```
worker:  로그 append → pg_notify('deployment_log', deployment_id)
server:  전용 LISTEN 커넥션 하나 → 깨어나면 커서 뒤 row 를 읽어 broadcast 로 팬아웃 → SSE
```

- NOTIFY payload는 **`deployment_id`만** 보낸다. 로그 본문을 실으면 8000바이트 상한과 순서 문제를 떠안는다 — payload는 깨우는 신호고, 내용은 DB가 준다
- 서버는 LISTEN 커넥션을 하나만 유지하고, 프로세스 안에서는 `tokio::sync::broadcast`로 SSE 구독자에게 팬아웃한다
- 늦게 붙은 클라이언트는 DB의 과거분을 먼저 받고 구독으로 이어붙인다([endpoint.md](endpoint.md))

job 큐는 NOTIFY를 쓰지 않는다 — 배포는 분 단위라 1초 폴링으로 충분하고, 폴링은 놓친 알림이 없다.

---

## 안티패턴

- 러너가 `main`에서 자기를 spawn → `bin/worker.rs`의 `runners()` 단일 출처 **[INV-14]**
- `tick`이 `Result`를 `unwrap` → 한 번의 실패로 그 종류의 작업이 전부 멈춘다
- claim에 lease 없음 → 워커가 죽으면 job이 영구 정지
- 실패 기록을 롤백되는 트랜잭션 안에서 → 새 커넥션으로. 안 그러면 무한 재시도
- 서버 프로세스가 워커 태스크를 spawn → self-update가 배포를 죽인다 **[bin.md]**
- `Worker`/`Pool` 래퍼 신설 → `JoinSet` + `repeat` 하나
- 워커가 usecase를 호출 → 워커는 자기 UoW를 연다. usecase는 봉투 안에서만
