---
paths:
  - "**/*.rs"
  - "rustfmt.toml"
---

# 공통 코드 컨벤션

`api/` · `cli/` · `contract/` 공통 Rust 코드 스타일. 레이어 패턴은 각 규칙 문서를 참고 — 이 문서는 그와 무관한 시각/포맷 규칙만 담는다.

레이어: [../api/module-layout.md](../api/module-layout.md) · 루트: [../root.md](../root.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **rustfmt** | stable만. nightly 옵션은 쓰지 않고 import 정렬은 손으로 |
| **파일 구조** | `//!` docstring 없음. 절차 순서 = 읽기 순서 |
| **섹션 마커** | `// #` 시그니처로 논리 영역, 인라인 `// label`로 함수 단계 |
| **네이밍** | 모듈 경로가 컨텍스트. 준말 금지(`id`만 예외) |
| **반환값** | happy path는 named variable, 자명한 표현식은 inline |
| **폐기된 규칙** | 키워드 전용 · repository 호출 펼침 · `@typecheck` — 타입이 대신한다 |
| **주석 언어** | 라벨 영어, 부연은 한국어 plain 한 줄. what 재서술 금지 |

---

## rustfmt

```toml
# rustfmt.toml
edition = "2024"
max_width = 100
```

**stable rustfmt만 쓴다.** `group_imports`·`imports_granularity`·`blank_lines_upper_bound` 는 nightly 전용이라 넣지 않는다 — 포맷 하나 때문에 툴체인을 하나 더 요구할 이유가 없다.

그래서 이렇게 갈린다:

| 규칙 | 누가 지키나 |
|---|---|
| 4칸 · trailing comma · 체인 세로 펼침 · nested call 펼침 | stable rustfmt |
| import 3그룹 · 도메인 타입 한 줄에 하나 | **손으로**. rustfmt가 되돌리지 않으므로 한 번 맞춰 두면 유지된다 |
| 항목 사이 빈 줄 | **한 줄**. stable rustfmt가 두 줄을 한 줄로 접는다 — 구획은 `// #` 마커가 진다 |

---

## 파일 구조

**모듈 docstring(`//!`)을 작성하지 않는다.** 파일명, `// #` 섹션, 최상위 함수가 의도를 드러낸다.

**절차 순서 = 읽기 순서.** 호출자가 위, 피호출자가 아래. 최상위 함수가 파일 맨 위. 타입(`struct`/`enum`)은 그 단계 섹션 안에 동거. Rust는 전방 참조가 자유라 순서에 제약이 없다.

`mod` 선언은 파일 맨 위, `use`보다 앞.

```rust
pub mod name;
pub mod repository;
pub mod status;

use uuid::Uuid;

use crate::module::project::domain::name::Name;


// #
// entity

pub struct Project { ... }
```

---

## 섹션 마커

`// #` 시그니처로 파일/`impl` 내부 논리 영역 구분. 라벨은 다음 줄에 단독으로.

```rust
// #
// factory

pub fn new(...) -> Self { ... }
```

라벨 예 — 모듈: `router` `run` `runner` `client` `entity` `value` `usecase` `input` `output` `exception` `handler` `config` `command` · `impl` 내부: `factory` `evolve` `transition` `query` `command`.

인라인 라벨(`// label`, 단일 `//`)로 함수 내부 단계 표기.

```rust
// format
if value.trim().is_empty() {
    return Err(DomainError::InvalidFormat { target: "Name" });
}

// length
if value.chars().count() > 64 { ... }
```

라벨 예: `type` `format` `value` `length` `hint` `build` `find` `persist` `return` `authenticate` `authorize` `claim` `detect` `read` `modify` `replace` `yield` `audit`.

`type` 라벨은 Rust에서 거의 쓰이지 않는다 — 시그니처가 이미 그 단계를 했다.

---

## 네이밍

식별자에 폴더/파일 컨텍스트를 중복하지 않는다. 호출부 `project::usecase::create`에서 경로가 이미 컨텍스트를 준다.

```
module/project/usecase/project_create.rs   →  create.rs
module/project/domain/project_repository.rs →  repository.rs
infrastructure/docker/DockerClient          →  Docker
```

준말(축약) 금지 — `id`만 예외(`identifier`의 관용 축약). 조회 키 파라미터는 `id`.

| 대상 | 형태 | 예 |
|---|---|---|
| 타입 | PascalCase | `Project`, `DomainError` |
| 함수·변수·모듈 | snake_case | `from_str`, `find_by_name`, `domain_name` |
| 비공개 | `pub` 생략 | `async fn tick()` |
| 정적 싱글톤 | SCREAMING_SNAKE | `DOCKER`, `CONFIG` |
| 상수 | SCREAMING_SNAKE | `RENEW_WINDOW` |

---

## 반환값

**Happy path는 named variable에 담은 뒤 반환.** 이름은 enclosing 함수의 출력 의미를 준다.

```rust
let created = Output::from(project);

Ok(created)
```

예외 — inline:
- 가드·에러 early return: `return Err(...)` inline
- 순수 위임: `client::get("/projects").await` inline
- 자명한 출력 표현식: `Ok(Self(value.to_owned()))` — 변수명이 표현식을 재진술할 뿐이면 noise

| 함수 | 변수명 |
|---|---|
| `create` | `created` |
| `list_all` | `listed` |
| `find_by_id` | `found` |
| `detail` | `detailed` |

`return` 키워드는 early return에만. 마지막 값은 tail expression으로 둔다.

---

## 폐기된 규칙 — 타입이 대신한다

| Python 규칙 | Rust |
|---|---|
| 인자 all-or-nothing · `*` 키워드 전용 | **폐기.** VO 타입이 위치 혼동을 컴파일 에러로. 같은 타입이 둘 이상 나란히 올 때만 파라미터 struct |
| repository 호출은 항상 펼침 | **폐기.** `.await?`가 영속성 경계를 줄바꿈보다 정확히 표시하고, rustfmt가 되돌린다 |
| `@typecheck` 런타임 타입 검사 | **폐기.** 타입 시스템 |
| `frozen=True` | **폐기.** 기본 불변, `with_*`가 `self` 소비 |
| `by_factory` 가드 | **폐기.** private 필드 |
| `_allowed_list` hint | **폐기.** `enum` + `match` |
| `to_dict()` | **폐기.** `#[derive(Serialize)]` |
| 삼항식 괄호 펼침 | `.map(..).transpose()?` |

---

## 호출 스타일

nested call 인자는 펼친다 + trailing comma (rustfmt 기본).

```rust
// good
let project = Project::new(
    Name::from_str(&input.name)?,
    Repository::from_str(&input.git_repository)?,
);

// bad: 한 줄에 욱여넣기 — nested 변환이 묻힌다
let project = Project::new(Name::from_str(&input.name)?, Repository::from_str(&input.git_repository)?);
```

메서드 체인은 리딩 닷 세그먼트마다 줄바꿈. single-use 중간 변수를 두지 않는다.

```rust
let found = list_all(connection)
    .await?
    .into_iter()
    .find(|project| project.id == id);
```

---

## Import

순서: 표준 → 서드파티 → 로컬(`group_imports`). 도메인 타입은 한 줄에 하나(`imports_granularity`).

```rust
use std::time::Duration;

use axum::Json;
use serde::Deserialize;

use crate::module::project::domain::Project;
use crate::module::project::domain::name::Name;
use crate::shared::exception::AppError;
```

**registry는 모듈 namespace import.** 한 모듈에서 2개 이상 쓰면 모듈째 받는다.

```rust
// good: bin/server.rs — 한 모듈에서 여러 핸들러 등록
use crate::module::project;

.route("/projects", get(project::endpoint::get_list).post(project::endpoint::post_create))

// bad: 핸들러마다 import
use crate::module::project::endpoint::post_create as project_post_create;
```

적용 위치: `bin/server.rs` 라우터, `bin/worker.rs` 러너, `cli/src/main.rs` 서브커맨드. 도메인 타입은 한 줄당 import 규칙 그대로.

---

## 비동기

- DB·도커·파일 접근은 `async`
- 트랜잭션은 봉투가 소유한다([../api/behavior.md](../api/behavior.md)) — `async` 블록에서 직접 열지 않는다
- 봉투·UoW는 `impl AsyncFnOnce(&mut Scope) -> Result<T, AppError>`를 받는다. 클로저는 `async |scope| { ... }`
- 워커 루프는 `worker::repeat`을 탄다([../api/worker.md](../api/worker.md))
- `tokio::spawn`은 합성 루트에서만 — 그 외에서 detach하면 종료 시 잘린다

---

## 주석 언어

- 코드 라벨·섹션 마커: 영어 (`// factory`, `// query`)
- 부연: 한국어, **plain 한 줄**. `// label (…)` / `// label — …` 형태 금지

**기본은 라벨만.** 부연은 코드가 드러내지 못하는 것 — 비자명한 의도(why)·입력 계약·함정 — 일 때만.

```rust
// good: 라벨만
// find
// persist
// return

// bad: 괄호 부연(what 재서술)
// authenticate (토큰을 읽어 계정을 찾는다)   →  // authenticate

// good: 살아남는 why — 코드에 안 보이는 것
// 인가를 tenant scope 보다 먼저 — 비멤버 team_id 로 RLS 를 걸기 전에 차단한다
// 롤백된 트랜잭션 밖에서 새 커넥션으로 — 같이 롤백되면 job 이 영원히 재시도된다

// bad: 선언 위 산문 — 타입이 말한다
// 배포가 아직 안 끝났으면 None
finished_at: Option<DateTime<Utc>>          →  finished_at: Option<DateTime<Utc>>
```

- 필드·변수 선언 주석은 기본 금지. 진짜 함정만 트레일링 인라인
- 설계 근거는 `.claude/rules/`에. 코드 주석에 복제하지 않는다
- device-manager의 `check_label_comments.py` 훅은 정규식만 `//`로 바꿔 재사용한다

---

## 안티패턴

- `//!` 모듈 docstring → 파일명 + `// #` 섹션
- `// label (부연)` / `// label — 부연` → 라벨만, 부연은 plain 한 줄
- 파일명·타입명에 폴더 컨텍스트 반복 → 모듈 경로가 준다
- `let listed = ...; return listed;` 로 표현식 재진술 → inline
- `unwrap()`/`expect()` 를 요청 경로에 → `?` + `AppError`. `expect`는 기동(`bootstrap`·`LazyLock`)에서만
- `tokio::spawn` 을 usecase·repository에서 → 합성 루트에서만
