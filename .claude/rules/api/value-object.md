---
paths:
  - "personal-infrastructure/api/src/module/*/domain/*.rs"
---

# ValueObject 패턴

도메인 값을 감싸는 newtype + 검증 팩토리. `module/{aggregate}/domain/{value}.rs`에 산다.

루트: [module-layout.md](module-layout.md) · 엔티티: [entity.md](entity.md) · 예외: [exception.md](exception.md) · 스타일: [../shared/conventions.md](../shared/conventions.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **newtype + private 필드** | 모듈 밖 생성이 컴파일 에러 — **[INV-2]**가 코드 0줄 |
| **팩토리** | `from_str`/`from_datetime`/`from_int`/`from_bool`, 단일 `value` 인자 |
| **검증 순서** | `format → range`. `type` 단계는 시그니처가 이미 했다 |
| **enum 성격** | `_allowed_list` hint 대신 `enum` + `match` |
| **raw primitive 금지** | `Uuid` id와 audit 시각만 예외 — **[INV-8]** |

---

## newtype + private 필드 — [INV-2]

```rust
use crate::module::project::domain::exception::DomainError;


// #
// value

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(transparent)]
pub struct Name(String);

impl Name {
    // #
    // factory

    pub fn from_str(value: &str) -> Result<Self, DomainError> {
        // format
        if value.trim().is_empty() {
            return Err(DomainError::InvalidFormat { target: "Name" });
        }

        // length
        if value.chars().count() > 64 {
            return Err(DomainError::InvalidFormat { target: "Name" });
        }

        Ok(Self(value.to_owned()))
    }

    pub fn to_str(&self) -> &str {
        &self.0
    }
}
```

- 필드가 private이라 `Name("".into())`이 모듈 밖에서 **컴파일 에러**다. Python의 `by_factory` 가드와 `ValueObject` 베이스가 통째로 사라진다
- `#[serde(transparent)]`로 bare string 직렬화 — `to_dict()` 없이 Entity를 그대로 `Serialize`할 수 있다
- 검증 순서 `type → format → range`에서 **`type` 단계가 없다.** `from_str(&str)` 시그니처가 이미 했다
- `Self(value.to_owned())`는 자명한 출력 표현식이라 named variable 없이 inline

---

## enum 성격 VO

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Pending,
    Building,
    Ready,
    Failed,
}

impl Status {
    pub fn from_str(value: &str) -> Result<Self, DomainError> {
        match value {
            "pending"  => Ok(Self::Pending),
            "building" => Ok(Self::Building),
            "ready"    => Ok(Self::Ready),
            "failed"   => Ok(Self::Failed),
            _ => Err(DomainError::InvalidFormat { target: "Status" }),
        }
    }
}
```

`_allowed_list` hint가 필요 없다 — variant가 곧 목록이고, `match`가 누락을 컴파일 에러로 만든다. 상태 전이 규칙이 있으면 `impl Status { pub fn can_transition_to(...) }`로 여기 둔다.

---

## raw primitive 금지 — [INV-8]

도메인 값(`String`/`i64`/`bool`/`DateTime`)은 전부 VO로 승격. 예외는 둘뿐:

- `Uuid` (id / FK) — 생성자가 형식을 보장하는 강타입이라 감싸도 종류가 늘지 않는다
- `created_at`/`updated_at`/`deleted_at` — DB 소유 audit 필드

세부:
- 시간 값은 aggregate별 VO(`expires_at.rs` → `ExpiresAt`). API 직렬화는 `to_str()`, DB 바인딩은 `to_datetime()`
- 포트·바이트·초 같은 수량도 VO — `Port(u16)`가 `u16`보다 낫다. 배포 도구에서 포트를 잘못 넘기는 건 실제 사고다
- 비밀값은 전용 VO — `Debug`를 손으로 구현해 값을 마스킹한다. `#[derive(Debug)]`가 로그에 키를 흘린다

```rust
// #
// value

#[derive(Clone)]
pub struct Secret(String);

impl std::fmt::Debug for Secret {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Secret(***)")
    }
}
```

---

## 안티패턴

- `pub struct Name(pub String)` → 필드 private. public이면 **[INV-2]**가 무너진다
- 도메인 값을 raw `String`/`i64`로 Entity 필드에 → VO **[INV-8]**
- enum 허용값을 문자열 상수 배열로 → `enum` + `match`
- `isinstance` 대응 타입 가드 작성 → 시그니처가 이미 했다
- 비밀값 VO에 `#[derive(Debug)]` → 손으로 마스킹. `tracing::error!(?error)` 하나에 키가 샌다
- VO에 다인자 팩토리(`from_x(a, b)`) → 단일 `value` 인자. 복합값은 struct 필드로
