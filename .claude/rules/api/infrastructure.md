---
paths:
  - "personal-infrastructure/api/src/infrastructure/**"
  - "personal-infrastructure/api/src/config.rs"
---

# 인프라 어댑터 패턴

외부 시스템 어댑터(docker · edge · acme · dns · git · host · smtp)와 환경 설정. 도메인을 모른다 — **[INV-1]**

루트: [module-layout.md](module-layout.md) · 저장소: [repository.md](repository.md) · 예외: [exception.md](exception.md)

---

## 이 문서

| 섹션 | 핵심 규칙 |
|------|----------|
| **어댑터 구조** | `{adapter}/client.rs` + `{adapter}/exception.rs`. seam은 갈아끼울 게 생길 때 |
| **싱글톤** | `LazyLock` 모듈 정적. factory wrapper 금지 |
| **시스템 저장소** | 기계용 출력 · read-modify-replace · 소유 마커 · 교체 전 백업 — **[INV-9] [INV-10]** |
| **예약대장 예외** | 포트 점유는 사본이 아니라 별개 사실. **[INV-9]**의 유일한 의도적 예외 |
| **Config** | `api/src/config.rs` 단일 출처. 모듈 수준 상수 블록 금지 |

---

## 어댑터 구조

```
infrastructure/
  docker/{client.rs, exception.rs}     bollard — 빌드·실행·inspect·이벤트
  compose/{client.rs, exception.rs}    compose 파일 파싱·기동
  edge/{client.rs, exception.rs}       OpenResty vhost 생성 + reload
  acme/{client.rs, exception.rs}       instant-acme — HTTP-01 / DNS-01
  dns/{client.rs, exception.rs}        DNS 프로바이더 API
  git/{client.rs, exception.rs}        clone · fetch · 웹훅 서명 검증
  host/{client.rs, exception.rs}       포트 스캔 · :80/:443 소유권 · 방화벽 탐지
  smtp/{client.rs, exception.rs}       메일 발송
  database/client.rs                   커넥션 풀 + begin(봉투 전용) + LISTEN 커넥션
```

대체 구현이 상상되지 않는 어댑터에 trait을 두지 않는다 — 구현이 하나인 인터페이스가 된다. seam은 실제로 갈아끼울 것이 생길 때 만든다(`dns`는 프로바이더가 여럿이라 처음부터 trait).

---

## 싱글톤

```rust
// infrastructure/docker/client.rs

// #
// client

pub static DOCKER: LazyLock<Docker> =
    LazyLock::new(|| Docker::connect_with_local_defaults().expect("docker"));
```

`DOCKER.inspect(...)` — `()`를 빠뜨리면 컴파일 에러라 factory wrapper의 근거가 사라진다. `LazyLock`은 stdlib(1.80+).

트랜잭션 진입점(`begin`)은 여기 두지 않는다 — `behavior` 모듈의 비공개 함수다 **[INV-5]**. 여기서는 `pool()` 만 노출한다.

`LISTEN`은 풀에서 빌린 커넥션으로 하지 않는다. 반납되는 순간 구독이 끊긴다 — 전용 커넥션을 하나 붙잡고 유지한다([worker.md](worker.md) "로그").

---

## 시스템 저장소 규칙 — [INV-9] [INV-10]

device-manager의 crontab 규칙이 그대로 적용된다. **OpenResty vhost 파일이 crontab과 같은 문제다.**

**기계용 출력을 쓴다.** 사람이 보라고 만든 표를 파싱하지 않는다 — 열 너비에서 값이 잘리고 포맷이 조용히 바뀐다.

```
# bad: 사람용 표
docker ps

# good: 기계용
docker inspect --format '{{.Id}}|{{.Name}}|{{.State.Status}}' <id...>
lsof -iTCP -sTCP:LISTEN -F pcnL
```

`docker inspect`는 id를 여러 개 한 번에 받는다. 컨테이너마다 부르지 않는다.

**read-modify-replace.** vhost 설정은 전문을 읽고, 고치고, 전문을 쓴다. 그 사이에 다른 IO를 넣지 않는다. 한 usecase가 어댑터를 두 번 호출하면 그 틈에 들어온 외부 편집이 사라진다.

**소유 마커 — [INV-10].** 마커 없는 vhost는 사람이 손으로 넣은 것이다. 목록에 보여줄 수는 있어도 **재작성하지 않는다.** 정규화·재정렬·주석 정리 전부 금지.

**교체 전 백업.** 잘못된 전체 교체 한 번이 모든 라우팅을 지운다. 백업 실패는 쓰기 실패다 — 백업 없이 진행하지 않는다.

**비밀값을 argv에 두지 않는다.** ACME 계정 키·레지스트리 자격증명은 stdin으로. `ps`에 보인다.

---

## 포트 예약대장 — [INV-9]의 의도적 예외

호스트 스캔이 진실이지만, **컨테이너가 꺼져 있어도 점유는 유지돼야 한다.** 그건 캐시가 아니라 예약이라 별개 사실이다.

| | 무엇에 답하나 | 어디 |
|---|---|---|
| 스캔 | 지금 무엇이 듣고 있나 | 호스트 (매번 새로) |
| 예약대장 | 이 포트는 누구 몫인가 | DB |

둘을 대조해 생긴 불일치는 `monitoring` 모듈이 이슈로 올린다. **예약대장을 스캔 결과로 덮어쓰지 않는다** — 그 순간 꺼진 앱의 포트를 남이 가져간다.

읽기 전용 투영(현재 리스너 목록 등)은 매번 새로 읽는다. 캐시·폴링·증분 갱신을 만들지 않는다.

---

## Config

```rust
// api/src/config.rs

// #
// config

pub struct AppConfig {
    pub port: u16,
    pub database_url: String,
    pub edge_config_dir: PathBuf,
    pub backup_dir: PathBuf,
}

static CONFIG: LazyLock<AppConfig> = LazyLock::new(AppConfig::from_env);

pub fn get() -> &'static AppConfig {
    &CONFIG
}
```

- 위치는 `api/src/config.rs` — 여러 어댑터가 공유하므로 `infrastructure/` 하위가 아니다
- ABC + 환경별 서브클래스는 옮기지 않는다. 값만 다른 두 구현은 trait 낭비 — 기본값을 `from_env`에서 분기한다
- 모듈 수준 상수 블록(`const MAX_X`)을 두지 않는다. 단, 그 모듈 안에서만 의미 있는 상수(`RENEW_WINDOW`)는 그 파일에

---

## 안티패턴

- 어댑터가 `module/`을 import → 도메인 무지 **[INV-1]**
- 사람용 CLI 출력 파싱 → `--format`/`-F` 기계용 출력
- 컨테이너마다 `docker inspect` 호출 → id 일괄 전달
- vhost 부분 수정 → 전체 교체 + 교체 전 백업
- 마커 없는 vhost를 재작성·정규화 → 원문 보존 **[INV-10]**
- 스캔 결과로 예약대장 덮어쓰기 → 둘은 다른 사실
- 비밀값을 명령 인자로 → stdin
- factory 함수로 싱글톤 노출 → `LazyLock` 모듈 정적
- 모듈 수준 상수 블록 → `config.rs`
