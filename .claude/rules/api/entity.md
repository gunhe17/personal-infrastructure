---
paths:
  - "personal-infrastructure/api/src/module/*/domain/*.rs"
---

# Entity 패턴

aggregate 루트 — struct + `new` 팩토리 + `with_*` evolve. `module/{aggregate}/domain/{aggregate}.rs`에 산다.

루트: [module-layout.md](module-layout.md) · VO: [value-object.md](value-object.md) · 영속화: [repository.md](repository.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **팩토리** | `pub fn new(...)`. 필드는 `pub`이되 생성은 팩토리로 |
| **evolve** | `with_*`가 `self`를 소비하고 struct update syntax로 교체 |
| **직렬화** | `#[derive(Serialize)]`. `to_dict()`는 없다 |
| **영속화** | `to_model()` 없음 — repository가 바인딩 지점에서 직접 |
| **필드** | 도메인 값은 전부 VO — **[INV-8]** |

---

## 형태

```rust
use chrono::DateTime;
use chrono::Utc;
use uuid::Uuid;

use crate::module::project::domain::name::Name;
use crate::module::project::domain::status::Status;


// #
// entity

#[derive(Debug, Clone, serde::Serialize)]
pub struct Project {
    pub id: Uuid,
    pub name: Name,
    pub status: Status,
    pub created_at: DateTime<Utc>,
}

impl Project {
    // #
    // factory

    pub fn new(name: Name) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            status: Status::Pending,
            created_at: None,
        }
    }

    // #
    // evolve

    pub fn with_name(self, name: Name) -> Self {
        Self { name, ..self }
    }

    // #
    // transition

    pub fn mark_ready(self) -> Result<Self, DomainError> {
        if !self.status.can_transition_to(Status::Ready) {
            return Err(DomainError::InvalidTransition { target: "Project" });
        }

        Ok(Self { status: Status::Ready, ..self })
    }
}
```

- `new(name)`은 positional이다. **키워드 전용(`*`) 규칙은 옮기지 않는다** — VO 타입이 위치 혼동을 컴파일 에러로 만든다. 같은 타입이 둘 이상 나란히 올 때만 파라미터 struct나 newtype으로 막는다
- `with_*`는 `self`를 소비한다. `frozen=True` 흉내가 필요 없다 — 원본은 move되어 재사용 불가
- 상태 전이는 동사 메서드(`mark_ready`)로, 부분 업데이트 유실을 막는다
- `created_at`은 팩토리가 `Utc::now()`로 찍고 insert에 실어 보낸다 — `Option`으로 두면 엔티티·출력·저장소 셋이 전부 `Some()`/`.map()`을 두르게 된다

---

## 직렬화 — `to_dict`/`to_model`이 없다

| 방향 | Python | Rust |
|---|---|---|
| API 응답 | `to_dict()` | `#[derive(Serialize)]` + VO의 `#[serde(transparent)]` |
| DB 저장 | `to_model()` | repository의 `sqlx::query!` 바인딩 |
| DB 로드 | 매퍼 | `#[derive(FromRow)]` row struct → `TryFrom<Row> for Project` |

dict 중간 표현이 없으니 "`to_model`에서 `id` 누락 → INSERT 실패" 같은 안티패턴 자체가 사라진다.

API 응답 모양이 도메인과 갈라지면 그때 `contract`의 `Output`으로 분리한다([../shared/contract.md](../shared/contract.md)) — 처음부터 나누지 않는다.

---

## 안티패턴

- `Project { id, name, .. }` 직접 조립 → `Project::new(...)` 팩토리
- `&mut self`로 필드 교체 → `with_*`가 `self` 소비
- 도메인 값을 raw primitive로 → VO **[INV-8]**
- id/FK를 별도 VO로 감쌈 → raw `Uuid` 유지
- 상태 전이를 `with_status(Status::Ready)`로 → 동사 메서드에 규칙을 담는다
- 다른 모듈이 Entity 필드를 조립 → 그 모듈의 `domain/`에 메서드를 만든다 **[INV-11]**
