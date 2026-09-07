---
paths:
  - "personal-infrastructure/api/src/shared/exception.rs"
  - "personal-infrastructure/api/src/module/*/domain/exception.rs"
  - "personal-infrastructure/api/src/infrastructure/*/exception.rs"
---

# 예외 패턴

전 레이어 예외의 단일 권위. 모든 예외는 `AppError`의 두 갈래 — 클라이언트 책임(4xx) / 서버 책임(5xx) — 로 귀결한다. **[INV-4]**

루트: [module-layout.md](module-layout.md) · 봉투: [behavior.md](behavior.md) · 핸들러 없음: [bin.md](bin.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **구조** | `shared/exception.rs` 루트 enum → 레이어별 enum, `#[from]`으로 승격 |
| **메시지** | `#[error("...")]`가 곧 카탈로그. variant 옆이 단일 출처 |
| **4xx vs 5xx** | 4xx 원문 노출·정중체 / 5xx `error_id`만 노출·terse |
| **핸들러** | `impl IntoResponse for AppError` 하나. 등록이 없다 |

---

## 구조 — [INV-4]

```
shared/exception.rs
  AppError
  ├─ Domain(DomainError)        4xx · 클라이언트 책임
  └─ Infra(InfraError)          5xx(일부 4xx) · 서버 책임

module/*/domain/exception.rs
  DomainError                   그 모듈의 4xx
  ├─ Invalid / InvalidFormat / InvalidTransition   400
  ├─ NotFound                                      404
  └─ AlreadyExists                                 409

infrastructure/*/exception.rs
  ProcessError / EdgeError / AcmeError / CipherError  500 — 어댑터 고유 typed 예외
```

- 외부 오류는 **경계에서 typed로 바꾼다.** 자식 프로세스 exit≠0 → `ProcessError{program, reason=stderr}`, `std::io::Error → EdgeError::Io(#[from])`. `map_err` 사슬 대신 `#[from]` 변환 하나. raw 전파 0
- 구체 예외만 메시지를 갖는다. 루트 `AppError`는 분류용 마디

---

## 메시지 = `#[error]`

```rust
// #
// exception

#[derive(thiserror::Error, Debug)]
pub enum DomainError {
    #[error("{target} 형식이 올바르지 않습니다")]
    InvalidFormat { target: &'static str },

    #[error("{target} 찾을 수 없습니다 (식별자: {identifier})")]
    NotFound { target: &'static str, identifier: String },

    #[error("{target} 이미 존재합니다 (식별자: {identifier})")]
    AlreadyExists { target: &'static str, identifier: String },

    #[error("{target} 지금 상태에서 할 수 없는 전이입니다")]
    InvalidTransition { target: &'static str },
}

impl DomainError {
    pub fn status(&self) -> StatusCode {
        match self {
            Self::InvalidFormat { .. } | Self::InvalidTransition { .. } => StatusCode::BAD_REQUEST,
            Self::NotFound { .. } => StatusCode::NOT_FOUND,
            Self::AlreadyExists { .. } => StatusCode::CONFLICT,
        }
    }
}
```

Python의 `core/i18n.py` 카탈로그가 `#[error]` 속성에 흡수된다 — 템플릿과 치환 인자가 한 자리라 "키는 있는데 카탈로그에 없음"이 컴파일 타임에 불가능하다. 어휘 통일은 variant 수가 적어 자동으로 지켜진다.

문체: **4xx는 정중 평서체**(사용자에게 그대로 나간다), **5xx는 terse 진단**(로그에만 나간다).

---

## 핸들러 — 등록이 없다

```rust
// #
// handler

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self {
            AppError::Domain(error) => error.status(),
            AppError::Infra(error) => error.status(),
        };

        // 5xx 는 원문 노출 금지 — error_id 로만 로그와 연결한다
        if status.is_server_error() {
            let error_id = Uuid::new_v4();
            tracing::error!(%error_id, error = ?self);

            return (status, Json(json!({ "error_id": error_id }))).into_response();
        }

        (status, Json(json!({ "error": self.to_string() }))).into_response()
    }
}
```

Python의 `client()` + `internal()` 두 핸들러가 이 impl 하나로 완결된다. **등록이 없다** — `Result<_, AppError>`를 반환하는 순간 axum이 쓴다([bin.md](bin.md)).

에러 발생 위치(`path: file:line`)는 재현하지 않는다. 스택 프레임 탐색이 없어 `#[track_caller]`를 생성자마다 붙여야 하고, 실제로 필요한 건 "어느 줄"이 아니라 "어느 요청"이다 — `tracing` span의 `error_id`가 그걸 준다.

---

## CLI 쪽 대응

`contract`가 에러 바디 형태를 갖는다. CLI는 그걸 역직렬화해 4xx는 메시지를, 5xx는 `error_id`를 보여준다([../cli/command.md](../cli/command.md)).

---

## 안티패턴

- 외부 lib 오류를 그대로 전파 → 경계에서 typed 변환(`ProcessError` 등)
- `anyhow::Error`를 usecase·domain 시그니처에 → `AppError`. `anyhow`는 `main`에서만
- 구체 예외가 메시지 문자열을 호출부에서 조립 → `#[error]` 템플릿 + 필드
- 5xx 원문을 응답에 → `error_id`만. 내부 경로·쿼리가 샌다
- 카테고리별 핸들러를 여러 개 → `IntoResponse` 하나
- endpoint에서 `match error` → `?`로 올린다
