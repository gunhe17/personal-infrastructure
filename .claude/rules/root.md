---
paths:
  - "Cargo.toml"
  - "rustfmt.toml"
  - "personal-infrastructure/*/Cargo.toml"
  - "personal-infrastructure/*/*/Cargo.toml"
  - ".vscode/**"
---

# repo 루트 배치

크레이트 경계와 최상위 폴더. **무엇이 무엇을 볼 수 있는지**가 여기서 정해진다 — 레이어 방향을 문서가 아니라 `Cargo.toml`이 진다.

레이어: [api/module-layout.md](api/module-layout.md) · 계약: [shared/contract.md](shared/contract.md) · 스타일: [shared/conventions.md](shared/conventions.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **최상위 폴더** | `personal-infrastructure/` 아래 `api/` · `cli/` · `wui/`. contract는 `api/contract/` 중첩 크레이트 |
| **의존 방향** | `cli → contract ← api`. cli는 api를 볼 수 없다 — **[INV-12]** |
| **어댑터 두 종** | 인터페이스는 다섯이지만 어댑터는 둘 — 프로세스 안(endpoint) / 프로세스 밖(HTTP 소비자) |
| **불변식** | INV-1 ~ INV-14. 여섯 개는 컴파일러가 진다 |

---

## 최상위 폴더

```
personal-infrastructure/           저장소 루트
  Cargo.toml                       워크스페이스
  rustfmt.toml
  personal-infrastructure/         패키지 폴더 (device_manager/ 자리)
    api/
      Cargo.toml                   api 크레이트 — 데몬(server + worker 두 bin)
      src/
      migrations/                  스키마 단일 출처 — sqlx::migrate!() 가 부팅 때 적용
      test/e2e/run.sh              종단 테스트(API·CLI·docker·엣지·WUI 가로지름)
      contract/
        Cargo.toml                 contract 크레이트 — DTO 단일 출처
        src/
    cli/
      Cargo.toml
      src/
    wui/                           대시보드. TS. Cargo와 무관
```

```toml
[workspace]
members = [
    "personal-infrastructure/api",
    "personal-infrastructure/api/contract",
    "personal-infrastructure/cli",
]
resolver = "3"
```

패키지 폴더를 한 겹 두는 것은 기존 저장소(`device-manager/device_manager/api`)와 같은 결이다 — 저장소 루트에는 워크스페이스 메타만 남고, 앱과 스키마는 전부 그 아래로 내려간다.

Cargo는 자체 `Cargo.toml`을 가진 하위 디렉토리를 부모 패키지에서 자동 제외하므로 중첩이 문제되지 않는다. `contract/`를 형제로 올리고 싶으면 `members` 한 줄만 바꾼다.

---

## 의존 방향 — [INV-12]

```
cli ──▶ contract ◀── api
```

`cli/Cargo.toml`에 `api`가 없다. `use api::module::project::usecase::create` 가 **컴파일되지 않는다.**

이것이 규칙이 아니라 크레이트 경계인 이유: CLI가 왕복이 귀찮아 usecase를 직접 부르면, 데몬이 배포 중인 컨테이너를 CLI가 동시에 건드린다. 덤으로 cli 바이너리에 sqlx·bollard가 링크되지 않는다.

`api`에 contract를 합치는 것도, cli가 응답 struct를 따로 적는 것도 금지 — 전자는 경계를 열고 후자는 계약 드리프트를 런타임까지 보낸다([shared/contract.md](shared/contract.md)).

---

## 인터페이스 다섯, 어댑터 둘

| 인터페이스 | 어디 | 시점 |
|---|---|---|
| REST API | `api/src/module/*/endpoint.rs` — 프로세스 안 | 지금 |
| CLI | `cli/` — HTTP 소비자 | 지금 |
| MCP | `api/src/module/*/endpoint/mcp.rs` — **프로세스 안** | 나중 |
| 웹 대시보드 | `wui/` — HTTP 소비자. 디자인 시스템은 `wui/design.md`(Vercel 문법 + 복숭아) | 다시 짓는 중 |
| 셸 자동완성 | `clap_complete`. 인터페이스가 아니라 CLI의 부산물 | 지금 |

MCP는 데몬 안에 있어야 한다 — 도커·엣지 상태를 데몬이 쥐고 있어서 별도 프로세스면 그 상태에 닿지 못하고 결국 자기도 HTTP를 탄다. **인터페이스가 늘어도 레이어는 안 늘어난다. 늘어나는 건 봉투와 `endpoint/` 하위뿐이다**([api/behavior.md](api/behavior.md)).

---

## 확정된 결정

| 결정 | 내용 | 따라오는 것 |
|---|---|---|
| **단일 사용자** | 팀·조직·다중 계정이 없다. 인증은 PAT, 인가는 토큰 스코프 | 모든 테이블에 소유자 컬럼을 두지 않는다. 인가는 "누가"가 아니라 "이 토큰이 무엇을"([api/behavior.md](api/behavior.md)) |
| **Postgres** | 저장소는 Postgres. `sqlx` + `api/migrations/` | job claim은 `for update skip locked`, 로그 팬아웃은 `LISTEN/NOTIFY`([api/worker.md](api/worker.md)) |

대시보드가 와도 계정은 하나다 — 세션 봉투(`request_session`)가 생길 뿐 소유자 스코프가 생기지 않는다.

`sqlx::query!`는 컴파일 타임에 스키마를 검증하므로 빌드에 `DATABASE_URL` 의 실제 DB가 필요하다. `.sqlx/` 오프라인 캐시는 쓰지 않는다(2026-09-08 제거, `.gitignore`) — 빌드 전에 `pi-postgres` 를 띄운다.

---

## 불변식

| 번호 | 불변식 | 강제 |
|---|---|---|
| **[INV-1]** | 의존은 아래로만. 어댑터(`infrastructure/`)는 도메인을 모른다 | 리뷰 |
| **[INV-2]** | Entity·VO는 팩토리로만 만든다 | 컴파일 · private 필드 |
| **[INV-3]** | `get_*`는 must-exist. 없으면 `NotFound` | 리뷰 |
| **[INV-4]** | 모든 예외는 `ClientError`(4xx)/`DevelopError`(5xx)로 귀결 | 컴파일 · enum + `From` |
| **[INV-5]** | 트랜잭션은 봉투가 소유한다. usecase는 열지 않는다 | 부분 컴파일 · `behavior` 비공개 `begin()` |
| **[INV-6]** | repository는 상태가 없다 — 자유 함수, 인스턴스 없음 | 컴파일 · 타입이 없음 |
| **[INV-7]** | usecase의 `Output`을 endpoint가 재가공하지 않는다 | 리뷰 |
| **[INV-8]** | 도메인 값은 전부 VO. raw primitive 금지 — `Uuid` id와 audit 시각만 예외 | 리뷰 |
| **[INV-9]** | 시스템이 단일 출처. 사본·인덱스·캐시를 두지 않는다 — 포트 예약대장만 예외 | 리뷰 |
| **[INV-10]** | 우리가 쓴 줄만 만진다. 남의 설정은 순서까지 원문 보존 | 리뷰 |
| **[INV-11]** | 모듈 간에는 `domain::repository`만. 남의 usecase를 부르지 않는다 | 리뷰 |
| **[INV-12]** | 프로세스 밖 소비자는 REST만 통과한다 | 컴파일 · 크레이트 경계 |
| **[INV-13]** | 장기 작업은 usecase가 enqueue만 한다. 요청 안에서 빌드하지 않는다 | 리뷰 |
| **[INV-14]** | 등록은 합성 루트에서만 — `bin/server.rs` · `bin/worker.rs` | 리뷰 |

INV-5의 `begin()`은 `behavior` 모듈의 비공개 함수라 그 밖에서는 호출되지 않는다. 다만 `database::pool()`이 공개라 `pool().begin()`으로 우회하는 것까지는 막지 못한다 — 그 한 줄은 리뷰가 잡는다(`pub(in path)`는 조상 모듈로만 제한할 수 있어 크로스-모듈 봉인이 불가능하다).

INV-1~10은 device-manager · personal-secret에서 계승, INV-11~14는 이 프로젝트에서 생긴다(모듈 22개 · 인터페이스 다섯 · 프로세스 둘).

---

## 안티패턴

- `cli`가 `api`를 의존 → contract만. 경계가 열리면 CLI가 데몬을 우회한다 **[INV-12]**
- cli가 응답 struct를 따로 적음 → `contract` 재사용. 필드명 변경이 런타임까지 간다
- MCP를 별도 크레이트/프로세스로 → 데몬 안 어댑터. 상태에 닿아야 한다
- 모듈 수준 상수 블록 → `api/src/config.rs` 단일 출처 ([api/infrastructure.md](api/infrastructure.md))
