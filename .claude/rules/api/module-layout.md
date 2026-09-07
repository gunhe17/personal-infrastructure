---
paths:
  - "personal-infrastructure/api/src/**"
---

# 모듈 배치 (수직 슬라이스)

레이어는 여섯인데 폴더는 모듈별로 선다. `module/{aggregate}/{endpoint.rs, usecase/, domain/}` — 기능 하나가 폴더 하나다.

루트: [../root.md](../root.md) · 봉투: [behavior.md](behavior.md) · 합성 루트: [bin.md](bin.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **수직 배치** | 모듈이 22개라 수평 폴더가 안 버틴다. 레이어 규칙은 그대로, 폴더만 모듈별 |
| **레이어** | `bin → endpoint → behavior → usecase → domain ← infrastructure`. 의존은 아래로만 — **[INV-1]** |
| **모듈 간 호출** | 남의 `domain::repository`만 부른다. 남의 usecase 금지 — **[INV-11]** |
| **네이밍** | 폴더가 aggregate를 준다. `usecase/create.rs` → `project::usecase::create` |

---

## 왜 수직인가

device-manager는 aggregate가 여섯이라 `endpoint/` `usecase/` `domain/` 최상위 수평이 맞았다. 이 프로젝트는 모듈이 22개고, "파일 하나 = 한 동작"([usecase-flow.md](usecase-flow.md))에서 usecase 파일이 200개를 넘는다. 한 폴더에 200개를 쌓거나, 기능 하나 고치려고 폴더 넷을 연다.

**배치만 수직으로 돌린다. 레이어 규칙·의존 방향·봉투·VO·예외는 전부 그대로다.**

```
api/src/
  bin/{server.rs, worker.rs}    합성 루트 둘 — bin.md
  bootstrap.rs                  두 bin 공유 기동/종료
  config.rs
  shared/exception.rs           AppError — exception.md

  behavior.rs                   봉투 — behavior.md
  behavior/{scope,access,audit,worker}.rs

  module/
    project/
      endpoint/{mod.rs, mcp.rs}          HTTP 핸들러 + MCP 툴
      usecase/{create,detail,list,remove,removal,start,stop,restart,limits,env_list,env_set,env_unset,env_reveal}.rs
      domain/{project,name,port,source,env,repository}.rs
    deployment/
      endpoint/{mod.rs, mcp.rs}
      usecase/{start,rollback,promote,list,detail}.rs
      domain/{deployment,log,repository}.rs
      pipeline/{detect,build,start,audit}.rs   이 모듈 고유 흐름
    domain_name/  certificate/  edge/(route-rules·vhost·reload)  git/  job/
    database/(카탈로그·스토리지를 Engine 으로 흡수: postgres·mysql·redis·mongo·minio)
    backup/  volume/  credential/  setting/  system/(doctor·status·ports)
    audit/  token/  webhook/(outbound)  notification/  monitoring/  analytics/
    mail/  tunnel/  migration/(adopt)
    common/{exception,text,secret}.rs   모듈이 공유하는 것

  mcp.rs                        Agent — 모듈별 endpoint/mcp.rs 의 툴 라우터를 bin 이 + 로 합친다

  infrastructure/               infrastructure.md
    process/  docker/  compose/  edge/  acme/  git/  host/  notify/  cipher/  database/

  worker.rs                     worker.md
  worker/{deploy,database,ssl_renew,backup,monitor,gc}.rs
```

`module/` 밖에 있는 것은 전부 모듈이 공유하는 것 — 봉투·예외·설정·어댑터·워커 런타임. 모듈 하나에만 필요한 흐름은 그 모듈 안에 둔다(`deployment/pipeline/`).

---

## 레이어 — [INV-1]

| 레이어 | 무엇 | 도메인을 아나 |
|---|---|---|
| `bin/` | 합성 루트. 라우터·워커 등록과 조립만 | 조립만 |
| `module/*/endpoint.rs` | HTTP 핸들러. extractor 파싱 → 봉투 → usecase → 직렬화 | O |
| `behavior/` | 봉투. 트랜잭션 경계·인증·스코프·감사 | 정책만 |
| `module/*/usecase/` | 비즈니스 흐름. input → output | O |
| `module/*/domain/` | aggregate — entity · VO · repository | 자기 자신 |
| `worker/` | 장기 작업. 자기 UoW를 연다 | O |
| `infrastructure/` | 외부 시스템 어댑터 | X |
| `contract` | DTO. serde 말고 아무것도 의존 안 함 | X |

위 레이어를 import하면 방향 위반이다. `infrastructure/`가 `module/`을 import하면 어댑터가 아니다.

---

## 모듈 간 호출 — [INV-11]

모듈 A의 usecase는 모듈 B의 **`domain::repository`만** 부른다.

```rust
// good: deployment usecase 가 project 를 읽는다
let project = project::domain::repository::get_by_id(connection, id).await?;

// bad: 남의 usecase 호출 — 트랜잭션·이벤트가 이중으로 열린다
let project = project::usecase::detail(input).await?;
```

openship의 `project.controller.ts`는 2519줄이고 다른 모듈 서비스 일곱 개를 직접 import한다. 그 결과가 저 크기다.

B의 도메인 규칙이 필요하면 B의 `domain/`에 메서드를 만든다 — A가 B의 필드를 조립하지 않는다.

---

## 네이밍

폴더가 aggregate를 주므로 파일명에 다시 담지 않는다([../shared/conventions.md](../shared/conventions.md) "네이밍").

```
module/project/usecase/create.rs        →  project::usecase::create
module/project/domain/repository.rs     →  project::domain::repository::add
module/project/domain/name.rs           →  Name::from_str
```

호출부는 모듈 namespace로 받는다 — `use crate::module::project;` 후 `project::usecase::create(...)`.

---

## 안티패턴

- `usecase/` `domain/`을 최상위 수평으로 → 모듈 22개에선 폴더당 파일이 넘친다
- 남의 usecase 호출 → `domain::repository`만 **[INV-11]**
- 모듈 하나만 쓰는 흐름을 `infrastructure/`나 최상위로 → 그 모듈 안에(`deployment/pipeline/`)
- `infrastructure/`가 `module/`을 import → 어댑터는 도메인 무지 **[INV-1]**
- 파일명에 폴더 컨텍스트 반복(`project/usecase/project_create.rs`) → `create.rs`
