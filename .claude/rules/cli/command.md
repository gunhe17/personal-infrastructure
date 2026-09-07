---
paths:
  - "personal-infrastructure/cli/src/**"
---

# cli 패턴

clap 서브커맨드 + REST 클라이언트. `command/`는 **인자 파싱 → client 호출 → 렌더**뿐이다 — `endpoint/`와 대칭이고 같은 규칙을 따른다.

루트: [../root.md](../root.md) · 계약: [../shared/contract.md](../shared/contract.md) · 서버: [../api/endpoint.md](../api/endpoint.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **두 종류** | API 프록시형(대부분) · 부트스트랩형(API가 없을 때 도는 것) |
| **command는 얇게** | 파싱 · 호출 · 렌더. 비즈니스 로직 0 |
| **등록** | `main.rs` 합성 루트 단일 출처 — **[INV-14]** |
| **출력** | 사람용 표가 기본, `--json`이면 contract 그대로 |
| **자동완성** | `clap_complete`. 손으로 짜지 않는다 |

---

## 배치

```
cli/src/
  main.rs          clap 합성 루트 — 서브커맨드 등록만
  command/
    project.rs  deploy.rs  deployment.rs  domain.rs
    logs.rs     status.rs  backup.rs      token.rs  api.rs
  client.rs        reqwest + SSE + contract 역직렬화
  output.rs        표 vs --json
  config.rs        컨텍스트(서버 URL) + 토큰 저장
  bootstrap/
    up.rs  install.rs  stop.rs  uninstall.rs  update.rs
```

---

## 두 종류

| 종류 | 무엇 | 예 |
|---|---|---|
| **API 프록시형** | 데몬에 HTTP. 커맨드 하나가 라우트 하나 | `project` `deploy` `domain` `logs` `backup` `token` |
| **부트스트랩형** | API가 아직 없을 때 도는 것. 실제 로직을 갖는다 | `up` `install` `stop` `uninstall` `update` |

openship도 30개 중 16개가 프록시형, 14개가 부트스트랩형이다. **프록시형에 로직을 넣지 않는다** — 넣는 순간 같은 규칙이 서버와 CLI 두 곳에 살고, 대시보드는 그중 하나만 얻는다.

---

## 형태

```rust
// cli/src/command/project.rs

use clap::Subcommand;

use crate::client;
use crate::output;


// #
// command

#[derive(Subcommand)]
pub enum Command {
    List,
    Create { name: String },
    Show { id: Uuid },
}


// #
// run

pub async fn run(command: Command) -> anyhow::Result<()> {
    match command {
        Command::List => {
            let listed: Vec<contract::project::Output> = client::get("/projects").await?;

            output::table(&listed)
        }
        Command::Create { name } => {
            let input = contract::project::CreateInput { name, git_repository: None };
            let created: contract::project::Output = client::post("/projects", &input).await?;

            output::record(&created)
        }
        Command::Show { id } => { ... }
    }
}
```

- 응답 타입은 언제나 `contract::` — 사본을 만들지 않는다([../shared/contract.md](../shared/contract.md))
- 커맨드는 자기를 등록하지 않는다. `main.rs`가 유일한 등록처 — **[INV-14]**
- 에러는 `client`가 `contract::error`로 파싱해 올린다. 4xx는 메시지, 5xx는 `error_id`를 보여준다([../api/exception.md](../api/exception.md))

---

## 출력

사람용 표가 기본, `--json`이면 contract를 그대로 `serde_json`으로 흘린다. 스크립트가 파싱할 대상은 표가 아니라 그 JSON이다 — 표 형식을 파싱 대상으로 삼지 않는다.

로그·배포 진행은 SSE를 받아 줄 단위로 흘린다. `data:` 접두 + 빈 줄 구분이라 파싱은 20줄이면 된다.

---

## 부트스트랩형

`up`/`install`은 데몬이 없을 때 도커 컴포즈를 직접 조작한다. 여기가 CLI에서 유일하게 로직이 있는 곳이고, [../api/infrastructure.md](../api/infrastructure.md)의 시스템 저장소 규칙을 그대로 탄다 — 기계용 출력, 교체 전 백업, 남의 설정 보존.

---

## 안티패턴

- 커맨드에 비즈니스 로직 → 서버 usecase로. 대시보드가 못 얻는다
- 응답을 `serde_json::Value`로 파싱 → `contract` 타입
- 커맨드가 자기를 등록 → `main.rs` 단일 출처 **[INV-14]**
- `--json` 출력에 장식·헤더 → 순수 JSON만. stdout은 데이터, 진단은 stderr
- 자동완성 스크립트를 손으로 작성 → `clap_complete`
- 부트스트랩형이 API를 호출 → 그건 프록시형이다. 분류를 바꾼다
