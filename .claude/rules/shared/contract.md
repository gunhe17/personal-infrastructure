---
paths:
  - "personal-infrastructure/api/contract/**"
---

# contract 크레이트

API가 내보내는 JSON의 모양을 적어둔 struct 모음. 그것뿐이다. api가 `Serialize`하고 cli가 `Deserialize`한다 — **양쪽이 같은 파일을 본다.**

루트: [../root.md](../root.md) · usecase: [../api/usecase-flow.md](../api/usecase-flow.md) · cli: [../cli/command.md](../cli/command.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **의존 없음** | `serde`·`uuid`·`chrono`만. axum·sqlx·도메인 타입 금지 |
| **소유** | usecase의 `Input`/`Output`이 여기 산다. usecase는 `pub use`로 되받는다 |
| **왜** | 계약 드리프트를 런타임이 아니라 컴파일 타임에 잡는다 |
| **대시보드** | 올 때 `#[derive(TS)]`를 얹는다. 지금은 안 붙인다 |

---

## 배치

```
api/contract/
  Cargo.toml
  src/
    lib.rs
    project.rs        CreateInput · UpdateInput · Output · Status
    deployment.rs
    domain_name.rs
    stream.rs         SSE 이벤트 프레임
    error.rs          에러 응답 바디
```

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
uuid = { version = "1", features = ["serde"] }
chrono = { version = "0.4", features = ["serde"] }
```

이 목록이 늘어나면 잘못 가고 있는 것이다. contract는 **도메인 타입을 모른다** — `Name`이 아니라 `String`을 담는다.

---

## 형태

```rust
// api/contract/src/project.rs

// #
// input

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInput {
    pub name: String,
    pub git_repository: Option<String>,
}


// #
// output

#[derive(Debug, Serialize, Deserialize)]
pub struct Output {
    pub id: Uuid,
    pub name: String,
    pub status: Status,
    pub created_at: DateTime<Utc>,
}


#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Pending,
    Building,
    Ready,
    Failed,
}
```

usecase가 되받는다:

```rust
// api/src/module/project/usecase/create.rs
pub use contract::project::CreateInput as Input;
pub use contract::project::Output;
```

---

## 왜 사본을 두지 않는가

cli가 응답 struct를 따로 적으면 잘 돌아간다 — **필드명을 바꾸기 전까지는.**

```rust
// api 쪽에서 name → title
pub struct Output { pub id: Uuid, pub title: String }
```

api도 컴파일되고 cli도 컴파일된다. 둘이 다른 파일이라 컴파일러가 비교할 대상이 없다. 런타임에 `missing field 'name'`이 뜨거나, `Option`이었으면 조용히 빈 칸이 찍힌다. openship CLI가 응답을 `Record<string, unknown>`으로 받아 정확히 이 상태다.

contract가 있으면 **API를 고친 그 커밋에서 cli가 컴파일에 실패한다.**

---

## 나중

대시보드가 오면 `#[derive(TS)]`(ts-rs)를 얹어 TS 타입을 생성한다. 지금은 붙이지 않는다 — 소비자가 없는데 빌드 비용만 든다. 나중에 derive 한 줄이다.

MCP 도구의 입출력 스키마도 여기서 나온다. 인터페이스가 넷이어도 계약은 하나다.

---

## 안티패턴

- contract가 `sqlx`/`axum`/도메인 타입 의존 → serde만. 의존이 늘면 cli가 그걸 링크한다
- VO를 contract에 정의 → contract는 `String`, 검증은 도메인 **[INV-8]**
- usecase가 `Input`/`Output`을 직접 정의 → contract에. CLI가 같은 정의를 봐야 한다
- cli가 응답 struct를 따로 적음 → contract 재사용
- 에러 바디를 CLI가 문자열 파싱 → `contract::error` 타입
