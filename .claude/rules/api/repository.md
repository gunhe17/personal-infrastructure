---
paths:
  - "personal-infrastructure/api/src/module/*/domain/repository.rs"
---

# repository 패턴

aggregate의 영속화 경계. 자유 함수 모듈 — 인스턴스가 없다. `module/{aggregate}/domain/repository.rs`에 산다.

루트: [module-layout.md](module-layout.md) · 엔티티: [entity.md](entity.md) · 흐름: [usecase-flow.md](usecase-flow.md) · 시스템 저장소: [infrastructure.md](infrastructure.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **자유 함수** | `class` 없음. 인스턴스화가 문법적으로 불가능 — **[INV-6]** |
| **첫 인자** | `&mut PgConnection`. 봉투가 준 것을 그대로 받는다 — **[INV-5]** |
| **must-exist** | `get_*`는 없으면 `NotFound`, `find_*`는 `Option` — **[INV-3]** |
| **섹션 마커** | `// # query` / `// # command` |
| **두 종류 저장소** | DB와 호스트. 호스트 쪽은 [infrastructure.md](infrastructure.md) 규칙을 탄다 |

---

## 형태

```rust
use sqlx::PgConnection;
use uuid::Uuid;

use crate::module::project::domain::Project;
use crate::module::project::domain::exception::DomainError;
use crate::shared::exception::AppError;


// #
// query

pub async fn list_all(connection: &mut PgConnection) -> Result<Vec<Project>, AppError> {
    let listed = sqlx::query_as!(Row, "select * from project where deleted_at is null")
        .fetch_all(connection)
        .await?;

    Ok(listed.into_iter().map(Project::try_from).collect::<Result<_, _>>()?)
}


pub async fn find_by_id(
    connection: &mut PgConnection,
    id: Uuid,
) -> Result<Option<Project>, AppError> { ... }


pub async fn get_by_id(connection: &mut PgConnection, id: Uuid) -> Result<Project, AppError> {
    // find
    let found = find_by_id(connection, id).await?;

    Ok(found.ok_or(DomainError::NotFound {
        target: "Project",
        identifier: id.to_string(),
    })?)
}


// #
// command

pub async fn add(connection: &mut PgConnection, project: &Project) -> Result<(), AppError> {
    sqlx::query!(
        "insert into project (id, name, status) values ($1, $2, $3)",
        project.id,
        project.name.to_str(),
        project.status.to_str(),
    )
    .execute(connection)
    .await?;

    Ok(())
}
```

- `class` 없이 자유 함수. 호출은 `project::domain::repository::add(...)` — 모듈 경로가 네임스페이스라 **[INV-6]** 위반이 문법적으로 불가능하다
- 첫 인자는 언제나 `&mut PgConnection`. repository가 커넥션을 얻지 않는다 — 봉투가 준다 **[INV-5]**
- `get_*`는 must-exist, `find_*`는 `Option`. `get_*`는 `find_*`에 `ok_or`만 얹는다 — **[INV-3]**
- `// # query` / `// # command`로 구획

---

## `to_model`이 없다

Entity → dict → INSERT 대신 **바인딩 지점에서 직접 편다**([entity.md](entity.md)). 로드는 `Row` struct + `TryFrom<Row> for Project` — VO 팩토리를 태워야 DB에서 온 값도 검증을 통과한다.

```rust
impl TryFrom<Row> for Project {
    type Error = DomainError;

    fn try_from(row: Row) -> Result<Self, Self::Error> {
        Ok(Self {
            id: row.id,
            name: Name::from_str(&row.name)?,
            status: Status::from_str(&row.status)?,
            created_at: Some(row.created_at),
        })
    }
}
```

---

## Postgres

`sqlx::query!` / `query_as!` 를 쓴다 — 컴파일 타임에 스키마와 대조하므로 컬럼 오타·타입 불일치가 빌드에서 걸린다. 대가는 빌드에 `DATABASE_URL` 의 실제 DB가 필요하다는 것 — 오프라인 캐시(`.sqlx/`)는 쓰지 않는다.

- 마이그레이션은 `api/migrations/`(`sqlx::migrate!()` 가 부팅 때 적용). 스키마 변경은 항상 파일로 — 손으로 친 DDL은 다음 배포에서 사라진다
- **소유자·테넌트 컬럼을 두지 않는다.** 단일 사용자다([../root.md](../root.md) "확정된 결정"). 인가는 토큰 스코프가 봉투에서 끝내므로 쿼리에 필터가 붙지 않는다
- soft delete는 `deleted_at`. `find_*`/`list_*`는 `where deleted_at is null`을 기본으로 건다
- 목록은 언제나 페이지네이션. 배포 이력·감사 로그·로그 줄은 무한히 자란다

---

## 저장소가 둘이다

이 프로젝트의 repository는 DB만 보지 않는다.

| aggregate | 읽기 | 쓰기 |
|---|---|---|
| `project` · `deployment` · `token` | DB | DB |
| `port` | 호스트 스캔 **+** DB 예약대장 | DB 예약대장 |
| `service` | `docker inspect` | `docker update` · 재기동 |
| `edge` | vhost 파일 | vhost 파일 전체 교체 |
| `certificate` | DB + 인증서 파일 | ACME + 파일 |

호스트를 만지는 쪽은 [infrastructure.md](infrastructure.md)의 규칙을 그대로 탄다 — 기계용 출력, read-modify-replace, 소유 마커, 교체 전 백업.

---

## 안티패턴

- `struct ProjectRepository` 신설 → 자유 함수 **[INV-6]**
- repository가 커넥션·트랜잭션을 스스로 얻음 → 인자로 받는다 **[INV-5]**
- `get_*`가 `Option` 반환 → `find_*`로 이름을 바꾸거나 `NotFound` **[INV-3]**
- DB row를 VO 검증 없이 Entity로 → `TryFrom`에서 팩토리를 태운다
- 다른 모듈의 테이블을 직접 쿼리 → 그 모듈의 repository 호출 **[INV-11]**
- 도커·파일 조작을 repository에 인라인 → `infrastructure/` 어댑터 경유 **[INV-1]**
