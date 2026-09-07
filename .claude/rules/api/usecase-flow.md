---
paths:
  - "personal-infrastructure/api/src/module/*/usecase/*.rs"
---

# UseCase 흐름 패턴

비즈니스 흐름 — input → output. `module/{aggregate}/usecase/{action}.rs`에 산다. 폴더가 aggregate를 주므로 파일 하나 = 한 동작.

루트: [module-layout.md](module-layout.md) · 계약: [../shared/contract.md](../shared/contract.md) · 저장소: [repository.md](repository.md) · 응답: [endpoint.md](endpoint.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **파일 구조** | `Input`/`Output`은 contract 재노출 + `pub async fn {action}(connection, input)` |
| **시그니처** | 첫 인자는 `&mut PgConnection`. 트랜잭션을 열지 않는다 — **[INV-5]** |
| **본문 라벨** | `// find → // build → // persist → // return` 흐름 단계 마커 |
| **장기 작업** | enqueue만. 요청 안에서 빌드하지 않는다 — **[INV-13]** |
| **모듈 간** | 남의 `domain::repository`만 — **[INV-11]** |

---

## 파일 구조

```rust
pub use contract::project::CreateInput as Input;
pub use contract::project::Output;

use sqlx::PgConnection;

use crate::module::project::domain::Project;
use crate::module::project::domain::name::Name;
use crate::module::project::domain::repository;
use crate::shared::exception::AppError;


// #
// usecase

pub async fn create(
    connection: &mut PgConnection,
    input: Input,
) -> Result<Output, AppError> {
    // build
    let project = Project::new(
        Name::from_str(&input.name)?,
        Repository::from_str(&input.git_repository)?,
    );

    // persist
    repository::add(connection, &project).await?;

    // return
    let created = Output::from(project);

    Ok(created)
}
```

- 최상위 흐름 함수가 파일에서 유일한 public 함수. 이름은 `{action}`만 — 폴더가 aggregate를 준다
- `Input`/`Output`은 `contract`에 살고 여기서 `pub use`로 되받는다 — API와 CLI가 같은 정의를 본다([../shared/contract.md](../shared/contract.md))
- 검증은 VO 팩토리가(`Name::from_str`), usecase는 조립·순서만
- 흐름 단계는 인라인 라벨(`// build` `// find` `// persist` `// return`)로 구획. 부연은 달지 않는다

---

## 트랜잭션 — [INV-5]

usecase는 **트랜잭션을 열지 않는다.** 봉투가 열어 `&mut Transaction`을 주고, usecase는 `&mut PgConnection`으로 받는다(`Transaction`이 `DerefMut<Target = PgConnection>`).

```rust
// good: 봉투가 준 커넥션을 그대로 넘긴다
pub async fn create(connection: &mut PgConnection, input: Input) -> Result<Output, AppError>

// bad: usecase 가 트랜잭션을 연다 (begin 은 behavior 비공개 — 여기서 보이지 않는다)
let mut transaction = database::begin().await?;
```

같은 봉투 안 = 원자적. 두 usecase를 한 요청에서 부르면 하나의 트랜잭션을 공유한다.

---

## 장기 작업은 enqueue만 — [INV-13]

빌드·배포·백업은 요청-응답 안에 못 들어간다. usecase는 job을 넣고 즉시 반환한다.

```rust
// #
// usecase

pub async fn start(
    connection: &mut PgConnection,
    input: Input,
) -> Result<Output, AppError> {
    // find
    let project = project::domain::repository::get_by_id(connection, input.project_id).await?;

    // enqueue
    let deployment = Deployment::new(project.id, Trigger::Manual);
    repository::add(connection, &deployment).await?;
    job::repository::enqueue(connection, JobKind::Deploy, deployment.id).await?;

    // return
    let started = Output::from(deployment);

    Ok(started)
}
```

응답은 `202`와 `deployment_id`. 진행 상황은 `GET /deployments/{id}/logs` SSE로 따라간다([worker.md](worker.md)).

---

## 모듈 간 호출 — [INV-11]

남의 `domain::repository`만 부른다. 남의 usecase를 부르면 트랜잭션과 이벤트가 이중으로 열린다([module-layout.md](module-layout.md)).

---

## 안티패턴

- usecase에서 트랜잭션 open/commit → 봉투가 소유 **[INV-5]**
- usecase에서 도커·파일 IO 직접 → `infrastructure/` 어댑터 경유 **[INV-1]**
- 입력 검증을 usecase 본문에서 → VO 팩토리가 진다([value-object.md](value-object.md))
- `Output`을 재가공해 반환 → endpoint가 `Json()` 그대로 **[INV-7]**
- `Input`/`Output`을 usecase 파일에 직접 정의 → contract에. CLI가 같은 정의를 봐야 한다
- 요청 안에서 빌드·배포 실행 → job enqueue **[INV-13]**
- 남의 usecase 호출 → `domain::repository` **[INV-11]**
