# Openship → personal-infrastructure 반영 기능

출처: `.claude/reference/openship` — 별도 git 레포라 이 문서는 한 단계 위에 둔다 (README.md, `apps/api/src/modules`, `apps/cli/src/commands`, `packages/db/src/schema`, MCP 툴 설명 150개).

**기준** — `.claude/rules`에 확정된 것: 단일 사용자(PAT + 토큰 스코프), 홈서버 1대, 모듈 22개 · 워커 5개 · 어댑터 10개([module-layout.md](../rules/api/module-layout.md)), 인터페이스 다섯.
**기본값은 포함.** 관리·진단 도구는 홈서버라도 다 가져온다. 제외는 맨 아래 사유별로 — 클라우드/다중 사용자 전용, 이 구조에 개념이 없는 것, 다른 항목에 흡수된 것, 셋뿐.
`→` 뒤는 대응 모듈/파일. *(나중)* 은 계획엔 있으나 아직 안 지음. *(WUI)* 는 대시보드가 올 때.

## 파이프라인 → `deployment/pipeline`
- [x] 감지(Detect) — 설정 파일 읽어 스택·패키지 매니저·빌드/시작 명령·포트 파악. 배포 전 미리 돌려보기 가능 → `detect.rs`
- [x] 빌드(Build) — Docker 이미지로 굽고, 그때 쓴 설정을 스냅샷으로 박제 → `build.rs`
- [x] 실행(Run) — 컨테이너로 띄우되 루프백에만 열어둠 → `start.rs`
- [x] 라우팅 + TLS — 앱이 뜬 **뒤에** 진행. 인증서 실패가 배포를 안 죽임 → `edge`, `certificate`
- [x] 푸시 투 디플로이 — git push → 자동 재배포, 모노레포는 바뀐 서비스만 → `webhook` *(나중)*
- [x] 롤백 / 재배포 — 박제한 스냅샷 그대로 → `usecase/rollback.rs`
- [x] 배포 취소 → `usecase/cancel` (계획)
- [x] 배포 이력 — 건별 상태·URL·소요시간·에러 요약 → `usecase/{list,detail}`
- [x] 로그 실시간 스트리밍 — SSE. 워커→서버 팬아웃은 `LISTEN/NOTIFY` → `domain/log.rs`

## 배포 소스 → `project/domain/source.rs`, `git`, `migration`
- [x] GitHub 저장소 — 연결, 브랜치 지정, 푸시 웹훅 → `git`
- [x] git URL 임포트 — GitHub 아닌 어느 git 호스트든 URL로
- [x] 로컬 폴더 — 이 서버에 있는 폴더를 가리켜 프로젝트로
- [x] Docker Compose 파일 — 수정 없이 그대로 → `infrastructure/compose`
- [x] **기존 Docker 스택 흡수(adopt)** — 이미 돌고 있는 컨테이너를 스캔해 프로젝트로 편입. 같은 서버라 데이터 이동 없음 → `migration` *(나중)*. 홈서버 첫날 쓰는 기능
- [x] 기존 프록시 사이트 이관 — nginx/caddy가 갖고 있던 vhost를 우리 엣지로 (adopt의 엣지 절반) → `migration` *(나중)*

## 프로젝트 · 서비스 → `project`, `service` *(나중)*, `volume`, `credential`
- [x] 프로젝트 — 생성·목록·상세·삭제. env·리소스·연결의 뿌리 → `project` (지어짐)
- [x] 삭제 미리보기 — 지우면 같이 사라지는 컨테이너·볼륨·도메인을 먼저 보여줌 (`remove --dry-run`)
- [x] 환경(prod / staging / preview) — Openship과 같은 모델: 환경 하나 = 프로젝트 하나, 그룹으로 묶임. `project`에 `group` + `environment` 컬럼, 유니크 `(group, environment)`. 도메인·env·브랜치·배포는 이미 프로젝트 단위라 그대로
- [x] 승격(promote) — staging이 빌드한 아티팩트를 prod에 그대로 올림. 재빌드 없음. rollback과 같은 "아티팩트 올리기" 경로 → `deployment/usecase/promote`
- [x] 환경변수 — 프로젝트·서비스별. 조회 시 시크릿 마스킹, 열람은 `SecretReveal` 스코프만 → `credential/domain/secret.rs`
- [x] 리소스 제한 — 서비스별 CPU / RAM 상한. 한 박스를 여러 앱이 나눠 쓰니 필요 → `service`
- [x] 컨테이너 수명주기 — start / stop / restart → `service`
- [x] 설정 반영 가드 — env 바꾸고 restart만 하면 거부, refresh 배포를 돌리게 함 (restart에 검사 한 줄)
- [x] 볼륨 — 정의, 프로젝트 단위 네임스페이스, 실제 사용량 → `volume` (지어짐)

## 연결 → `database`, `storage` *(나중)*, `catalog` *(나중)*
- [x] 데이터베이스 — Postgres·MySQL·MongoDB·Redis를 명령 하나로 → `database` (지어짐)
- [x] DB 커넥션 주입 — 프로젝트에 물리면 연결 URL이 시크릿 env로 → `database/usecase/reveal.rs`
- [x] 오브젝트 스토리지 — 버킷 띄우고 앱에 붙이면 접근 키가 env로 → `storage`
- [x] 원클릭 앱 카탈로그 — 미리 정의된 앱을 이름만으로 설치, 연결 정보 한 곳에서. 템플릿도 여기 → `catalog`

## 도메인 · 인증서 · 엣지 → `domain_name`, `certificate`, `edge`, `infrastructure/{edge,acme,dns}`
- [x] 엣지가 유일한 공개 창구 — 앱은 루프백, 바깥은 엣지의 :80/:443뿐. 서비스별 포트포워딩 없음
- [x] 도메인 → 앱 라우팅 — 붙이면 vhost 자동 생성 → `edge/domain/reconcile.rs`, `infrastructure/edge/render.rs`
- [x] Let's Encrypt HTTP-01 자동 발급 → `infrastructure/acme`
- [x] 와일드카드 DNS-01 — 등록한 DNS 자격증명으로 `*.example.com` → `infrastructure/dns` *(나중)*
- [x] 자동 갱신 — 도메인별 잠금 걸고 → `worker/ssl_renew`
- [x] 직접 발급 인증서 업로드 — 사내 CA·유료·Cloudflare Origin CA → `domain_name/usecase/upload_certificate.rs`
- [x] ACME 디렉터리 설정 — Let's Encrypt가 기본, ZeroSSL 등 EAB 포함 다른 CA는 설정값으로 (`config.rs` 항목 하나)
- [x] 경로 규칙 — 경로별 차단·rate limit·IP 허용목록. 공개 홈서버의 관리 경로 보호 → `edge` vhost 옵션
- [x] 엣지 기본값 — Brotli 압축·HTTP/3 → `infrastructure/edge/render.rs` 템플릿
- [x] :80/:443 소유권 확인 — 엣지 설치 전에 누가 쥐고 있는지 탐지
- [x] 터널링 — 공인 IP·포트포워딩 없이 공개 URL(Cloudflare 등). NAT 뒤 홈서버엔 실제 쓸모 → `tunnel` *(나중)*
- [x] 방화벽 안내 — NAT 포트포워딩·OS 방화벽이 막혀 있으면 인증서 실패 원인으로 알려줌. UPnP는 없음
- [x] 메일 포트 방화벽 — mail 설정 시 ufw/firewalld 규칙 적용. 동의 플래그 필수, 재부팅에 안 남는 방화벽이면 명령만 출력

## 포트 → `port` *(나중)*, `project/domain/port.rs`, `infrastructure/host`
- [x] 호스트 포트 스캔 — 뭐가 듣고 있는지 + `0.0.0.0`(외부) vs `127.0.0.1`(내부) 구분
- [x] 포트 예약대장 — 호스트 1대의 TCP 포트 점유를 DB에. 컨테이너 꺼져 있어도 유지. [INV-9]의 **의도적 예외**
- [x] 포트 충돌 감지 — 배포 시 누가 물고 있는지(컨테이너/프로세스) 식별하고 멈춤
- [x] 배포 후 포트 감사 — 실제로 듣고 있는지 확인. 경고만, 배포는 안 깨뜨림
- [x] 동적 포트 할당 — 선호 포트가 막혀 있으면 빈 포트로

## 백업 → `backup`, `worker/backup`
- [x] 예약 백업 — DB·볼륨, 보존 기간 → `backup` (지어짐)
- [x] 복원 → `usecase/restore.rs`
- [x] 보관 위치 — 로컬 경로 / 외부 스토리지
- [x] 보존 잠금(protect) — 자동 삭제에서 제외

## 메일 → `mail` *(나중)*, `infrastructure/smtp`
- [x] 자체 SMTP 서버 — 발송·수신, DKIM/SPF/DMARC 레코드 안내
- [x] 헬스 — 데몬 상태, 메일이 실제로 나가는지

## 모니터링 · 진단 → `monitoring`, `worker/monitor`, `system`
- [x] 컨테이너 이벤트·헬스 감시 → 인시던트 기록 → `monitoring` (지어짐)
- [x] 자원 사용량 샘플링 — CPU/메모리/네트워크 이력, 서비스별 → `worker/monitor`
- [x] 요청 통계 — 엣지 로그에서 상태코드 분포·Top Paths·트래픽. 요청당 DB 쓰기 없음
- [x] 문제 요약 — 실패한 배포·인증서·비정상 컨테이너·포트 충돌을 한 화면에 (`status`)
- [x] 커밋 드리프트 — 배포된 커밋이 원격 HEAD보다 몇 개 뒤처졌는지 (`status`)
- [x] 헬스 엔드포인트 → `system/domain/status.rs`
- [x] 고아 자원 GC — 못 지운 컨테이너·이미지·볼륨·네트워크를 기록해 두고 주기 회수 → `worker/gc` (지어짐)
- [x] 감사 로그 — 어느 토큰이 언제 뭘 했는지. 봉투가 자동 기록 → `audit` (지어짐)
- [x] 알림 — 슬랙·메일 등 채널로, 이벤트별 구독 → `notification`, `infrastructure/notify` (지어짐)
- [x] 나가는 웹훅 — 이벤트 발생 시 외부로 → `webhook` *(나중)*

## 워커 · 스케줄 → `job`, `worker/*`
- [x] 시스템 스케줄 — SSL 갱신·백업·GC·모니터의 주기 조정, 켜고 끄기, 지금 실행 → `job` (지어짐)
- [x] 실행 이력 — 잡별 run 기록과 출력

## 인터페이스 · 관리 도구
- [x] CLI → `cli/` (지어짐)
- [x] REST API — 프로세스 밖 소비자는 전부 이걸 탄다 [INV-12]
- [x] MCP — 데몬 안 어댑터. `AgentScope`에 `SecretReveal`이 없어 비밀키 접근이 컴파일 단계에서 막힘 → `module/*/endpoint/mcp.rs` *(나중)*
- [ ] 웹 대시보드 — HTTP 소비자. 계정은 여전히 하나 → *(다시 짓는 중)* Steep 디자인(`.claude/rules/wui/design.md`). 로그인·프로젝트 목록까지. 데몬의 `/ui` 정적 서빙(`PI_WUI_DIR`)·`pi open`·`pi install --wui-dir` 은 남아 있다
- [x] 셸 자동완성 — `clap_complete`
- [x] PAT — 발급·폐기·초기 부트스트랩. 인증의 전부 → `token` (지어짐)
- [x] 전역 설정 → `setting` (지어짐)

## CLI 명령 → `cli/src/command`
- [x] `install` / `uninstall` — systemd 유닛 둘 + DB 마이그레이션 + 토큰 부트스트랩
- [x] `project` / `context` — 프로젝트 관리, 작업 대상 전환 (지어짐)
- [x] `deploy` — 실행·이력·로그·롤백·취소·승격 (지어짐)
- [x] `service` — start/stop/restart/리소스 *(나중)*
- [x] `git` / `database` / `volume` / `credential` — 모듈별 (지어짐)
- [x] `domain` — 연결·인증서 업로드 (지어짐)
- [x] `edge` — 렌더된 vhost 보기, 리로드, 80/443 소유자
- [x] `backup` — 실행·복원·잠금 (지어짐)
- [x] `mail` — 설정·헬스 *(나중)*
- [x] `status` — 앱 상태 + 문제 요약 + 커밋 드리프트 (지어짐)
- [x] `doctor` — docker·DB·80/443·NAT/방화벽·인증서·포트 종합 점검. `status`가 "앱"이면 `doctor`는 "박스"
- [x] `token` — PAT (지어짐)
- [x] `api` — REST 직접 호출. 스크립트·MCP 디버깅용
- [x] `config` / `completion` (지어짐)
- [x] `open` — 대시보드(`/ui`) 열기 — 지어짐 (대시보드 자체는 다시 짓는 중)

---

## 제외 — 사유별

**클라우드 / 다중 사용자 / 다중 서버 전용**
- billing · cloud · notices · images(클라우드 카탈로그 프록시)
- auth(Better Auth·OAuth·조직) → PAT 하나
- permissions(팀·초대·grant) → 토큰 스코프
- `server` CLI · 서버 등록 · 서버↔서버 migration → 서버는 자기 자신 하나
- 스케일링 · 멀티노드
- GitHub Check Runs → 혼자 쓰는 PR
- 방문자 지역(GeoIP) → 요청 통계에서 이것만 뺌

**필요 없어서 뺌 (2026-09-07 결정)**
- 폴더 업로드 → 소스는 git URL 또는 서버 폴더면 충분. 업로드 엔드포인트·zip 처리를 안 만든다
- 서비스 터미널 → ssh 로 붙어 `docker exec -it <name> sh`. PTY 브리지·일회용 티켓·감사 공백을 안 들인다

**이 구조에 개념이 없음**
- 슬립 모드 `auto_sleep` → 항상 켜둠. 자원이 아쉬우면 `stop`
- PR별 프리뷰 자동 생성·정리 → GitHub App + PR 웹훅 필요. Openship에도 없음. 환경 자체는 가져옴
- 부분 실패 accept/reject → compose 프로젝트 단위 전체 롤백
- Compose 드리프트 수용/유지 → 소스가 git이면 재배포가 곧 수용
- 원자적 다중 주입 → 봉투가 트랜잭션을 쥐고 있어 이미 원자적
- 호스트 채널 방화벽 `--open-host-firewall` → 데몬이 호스트 프로세스라 컨테이너→호스트 SSH 채널이 없음
- CDN 캐싱·캐시 비우기 → 엣지가 하나. 압축·HTTP/3만 가져옴
- 호스트 웹 터미널 · 파일 관리자 → ssh
- 자동 업데이트 → 직접 빌드

**다른 항목에 흡수**
- 템플릿 → catalog
- 프로젝트 활성/비활성 → 자동배포 토글 + stop
- `init` → `project create --source .`
- `login` / `logout` / `reset-admin` → `config set token` / `token bootstrap`
- `system` CLI → `doctor` + `status`
- 인스턴스 export/import → backup + restore
- `cache` CLI → CDN 없음
- 위저드 / `up` / `stop` / `update` → `install` + systemd
- 기존 프록시 인증서 흡수 → 직접 업로드 (사이트 이관은 가져옴)
- issues 모듈 → `status` 문제 요약
- 커스텀 셸 잡 → cron

**로드맵 (Openship도 아직 없음)**
- 자체 GitHub Actions 러너 (`docs/actions-local-runner.md`, proposed)
- 로드밸런싱 UI · 프라이빗 네트워킹 · 비주얼 CI/CD

## 구현 결과 (2026-09-07)
Phase 0~3 완료 — API·CLI·MCP. *(나중)* 표시는 전부 지어졌고, 모듈 배치는 아래처럼 정리됐다:
- `service` → `project` 의 start/stop/restart/limits 로 흡수 (프로젝트 = 컨테이너 하나 또는 compose 스택)
- `port` → 추출하지 않음. 예약대장·스캔은 `project`/`system` 에, 배포 후 감사는 `deployment/pipeline/audit.rs`
- `catalog` · `storage` → `database` 의 `Engine` 에 흡수 (`pi database engines`, minio 가 스토리지)
- `webhook` → 아웃바운드만 (`pi webhook`). 인바운드는 `git` 웹훅이 이미 담당
- `migration` → 같은 서버 adopt 만 (`pi adopt`). 기존 프록시 사이트 자동 이관(import-sites)은 안 함 — 80/443 소유자 확인에서 멈춘다
- `mail` → Stalwart 컨테이너 + DNS 레코드 안내 + 방화벽 동의 플래그. DKIM 값은 관리 UI 에서
- 엣지 Brotli/HTTP3 → 안 함. `openresty/openresty:alpine` 에 brotli 모듈이 없다. gzip 만
- 백업 보존 잠금(protect) → 안 함. 보존 기간 GC 자체가 없어 잠글 대상이 없다

## 플랫폼 — 리눅스 · **Mac mini**
데몬은 호스트 프로세스, 앱은 docker. 둘의 차이는 셋뿐이고 `config::Platform` 이 런타임에 가른다:
- 엣지 — 리눅스는 `--network host` 로 :80/:443 직접, Mac(Docker Desktop·OrbStack)은 `-p 80:80 -p 443:443` publish + upstream `host.docker.internal`
- 서비스 등록 — 리눅스 systemd, Mac LaunchAgent(`~/Library/LaunchAgents/io.pi.*.plist`). Mac mini 는 **자동 로그인** 필수(Docker Desktop 이 로그인 세션 안에서만 돔)
- certbot — `--config-dir` 을 work_dir 아래로. root 불필요 (`brew install certbot`)
Mac 검증(2026-09-07): 엣지 경유 :80 → 앱, self-signed :443, http→https 301, deny 규칙 403, 실제 엣지 로그 집계 — 전부 통과.

## e2e (2026-09-07) — `personal-infrastructure/api/test/e2e/run.sh`
문서의 항목마다 ID 를 붙여 실제 바이너리·docker·curl 로 확인한다. **114 PASS · 0 FAIL · 11 SKIP** (Mac 개발기 기준, 브라우저 e2e W0–W9 포함).
ID 접두: P 파이프라인 · S 소스 · PR 프로젝트 · C 연결 · D 도메인/엣지 · PT 포트 · B 백업 · M 메일 · MO 모니터링 · J 잡 · I 인터페이스 · CL CLI.
SKIP 9 = 제외 결정 2(폴더 업로드·서비스 터미널) · 미구현 3(프록시 사이트 이관·보존 잠금·Brotli/HTTP3) · 리눅스 전용 1(install) · 메일 3(Stalwart 이미지 pull 시간초과 — 리눅스 홈서버에서 재실행).
e2e 가 잡아낸 제품 버그(수정됨): Dockerfile 스택 포트가 무조건 3000 → `EXPOSE`·이미지 ExposedPorts 순으로 읽음 / 지운 DB 의 예약 백업이 매 주기 실패 → remove 가 예약을 지우고 워커도 대상이 없으면 정리 / 큐 취소·DB 커넥션 주입·인증서 즉시 발급·포트 충돌 회피·자원 샘플링·잡 즉시 실행·DNS-01 은 문서가 [x] 였지만 코드가 없어 이때 채움.

## 대시보드 — 다시 짓는 중 (다크 분석 대시보드 무드, `.claude/rules/wui/design.md`)
**뼈대(2026-09-08)**: 헤드리스 **Base UI**(`@base-ui/react`, MIT) + TanStack Table, 모양은 전부 `design.md`. 66개 후보를 검수 페이지로 보고 shadcn 조립·Untitled UI 를 물리치고 고른 것.
**지금 있는 것(2026-09-08, 사용자 결정으로 앱 페이지 전부 제거)**: `wui/` 는 **컴포넌트 캔버스뿐** — `/ui/` 가 곧 `pages/Canvas.tsx`. Figma 식 2차원 캔버스(점 격자, 가로·세로 스크롤) — 상자 없이 원자 요소 34개를 **세로 한 줄**로 쌓는다: 섹션 4(토큰·컨트롤·상태/표면·데이터/오버레이, 좌측 120 트랙에 sticky mono 라벨, 섹션 간 120), 콘텐츠 트랙 640. 간격이 관계를 말한다: 라벨→요소 8, 같은 컴포넌트의 변형끼리 24, 다른 컴포넌트 56, 섹션 96(+hairline). 가로 스크롤 없음. 요소 위엔 프레임 이름(mono caption)만, 좌측 레이어 목록으로 점프. 줌: ⌘+휠(커서 기준)·⌘+/−·⌘0·사이드바 −/％/+ 버튼, 25–200%, CSS `zoom` 이라 스크롤 크기가 같이 바뀜, localStorage 저장. 로그인·프로젝트 목록·셸·API 클라이언트는 삭제(라우터·TanStack 도 뺌). **2026-09-08 원자 층 전체를 사용자가 준 다크 분석 대시보드 무드로 재도색** — 토큰(`bg/card/card-2/card-3` 바탕 단계, **쨍한 파랑 accent `#3d7bff`/`#2563eb`** 와 파란 기의 바탕, info/good/warn/bad, 타일 틴트 4, `--gauge` 시안→파랑→보라; 다크 기본 + `[data-theme=light]`; 탐색 패널도 같은 토큰을 `data-theme` 스코프로 씀), 24/14/12/pill radius, 15px 기본·54px 디스플레이. 컴포넌트 키트 `src/ui/`: button(pill) · input(card-2, accent 링) · status(StatusDot/Badge/Tile) · surface(Card/Stat/Gauge/Donut/DotMatrix/Callout/Notice/Code/InlineCode/LogViewer/EmptyState/Skeleton) · menu · dialog · select · switch(boxed) · tabs(pill 세그먼트) · tooltip · **form**(Checkbox/RadioGroup/NumberField/Slider/Progress) · **overlay**(Popover/Accordion/Toast/Combobox) · **nav**(Avatar/Breadcrumb/Pagination/Kbd/Chip/Separator/ToggleGroup/TopBar) · **chart**(Sparkline/ListRow/StatTrend) · **icon**(Heroicons outline 래퍼 + 도메인 이름 매핑, 획 1.5px 고정) · **IconButton** · 모션 토큰(fast/base/slow + fade/pop/slide) — 2026-09-08 조사 목록을 우리 시스템으로 옮김. 이후 사용자 결정으로 표(Table)·육각 레이더·타일 색 변형·사이드바 제거, 둥글기 완화(카드 16·버튼 10). 캔버스는 사이드바 없이 우하단 떠 있는 도구(테마·줌)만. **2026-09-08 층 재편(사용자 결정 "상위는 하위의 집합, 예외 없음")**: 캔버스 섹션이 0 토큰 → 1 원자 → 2 분자 → 3 유기체 → 4 템플릿 순으로 세로 배치되고 보드 라벨에 `A = B + C` 조합식이 적힘. 키트 안의 중복 그리기(손으로 만든 점·✕·−/+·카드 껍데기·세그먼트 트랙·팝업 모양)를 전부 하위 원자(Dot·IconButton·Card·Track·POPUP 레시피)로 바꿨고, 탐색 패널(Analytics)은 로컬 스타일 없이 키트만으로 재조립(TopProjects·EdgeRequests·RecentDeploys 유기체). `@theme inline` 으로 바꿔 `data-theme` 스코프가 상자 단위로 먹는다. 인터랙션은 `pressable`(hover 색 한 단계 + press scale .97 즉시 + focus 링 + disabled) / `interactive`(색만) 두 `@utility` 로 통일, 커서 규칙(pointer·text·grab·not-allowed)도 함께 — 캔버스 토큰 섹션 "인터랙션" 보드. 캔버스 우하단 도구도 IconButton/Button 으로. 이어서 애니메이션 자리를 전수 조사해 모션 원자 `@utility` 로 내림(enter-fade/pop/slide · move · turn · unfold · grow · check-in · focus-in · pulse/spin) — 상위는 이름만 붙임; 캔버스 토큰 섹션 "모션 원자" 보드에서 토글·재생으로 전부 확인 가능. 자연스러움 다듬기: 이징 셋(ease-out 색 / ease-move 움직임 / ease-in 퇴장 120), 드롭다운은 앵커에서 scale .96+4px(enter-drop), 모달 enter-modal, 세그먼트 셋 모두 `SlideTrack` 핀이 미끄러지고 글자색이 같이 바뀜(segment), 체크·라디오 양방향 check-in(keepMounted). "모든 전환 더 부드럽게": base 200 · slow 300 · exit 150 으로 늘리고, 전이 없던 자리에 tint(점·배지·칩 톤) · flip-open(트리거 화살표) · appear(로그 줄·탭 패널·스피너) · 슬라이더 손잡이 1.1 · 콤보박스 지우기 페이드 · 테마 크로스페이드(html[data-theme-fade]) 추가. interactive 재설계(hover card-3 가 100 으로 들어오고 200 으로 빠짐, press 는 color-mix 로 한 단계 더 깊게, ListRow onClick 지원) · focus 는 box-shadow 링 대신 outline 2px 이 offset 0→2px 로 자라며 들어오는 방식으로 통일(accent 버튼 위에서도 보임). 모션 보드에 슬로모션 ×5·포커스 순회. **라이트 검증(2026-09-08)** 에서 토큰 버그 둘 발견·수정: `--color-*: initial` 이 `white` 까지 지워 `text-white` 가 빈 클래스였고(라이트에서 솔리드 위 검은 글자), `text-body` 가 색 토큰으로 풀려 15px 크기가 안 먹었음(색 유틸을 `text-sub` 로 개명). 팝업 바탕 `popup` 토큰(다크 card-2 / 라이트 흰), 라이트 게이지 시안을 눌러 흰 글자 가독성 확보. 간격을 역할별 척도(2·4·6·8·12·16·20·24·32·48)로 정의해 design.md 표 + 캔버스 "간격" 보드로 고정; Select 팝업도 트리거를 덮지 않고 아래 8px(다른 팝업과 동일), 칩 나열 12, StatTrend 간격 Stat 과 통일. **키트 파일 분리·정렬(2026-09-08)**: `src/ui/{0-tokens,1-atoms,2-molecules,3-organisms,4-templates}/` 56 파일, 파일당 컴포넌트 하나, `@/ui/<층>/<이름>` 절대 임포트, `index.ts` 층 순서 재수출; `pages/Explore.tsx` 는 3-organisms/4-templates 로 흡수. 캔버스 ITEMS 배열도 SECTIONS 순서로 정렬. **캔버스 페이지 정리(2026-09-08)**: 섹션 안에 묶음 머리(컨트롤·표시·바탕·차트·팝업·세그먼트/내비·표면·셸·카드 + 개수) 추가, 간격 변형 24 / 컴포넌트 56 / 묶음 80 / 섹션 96, ITEMS 는 묶음 순. 이어서 라벨을 `이름 / 변형` 으로 줄이고, 한 행에는 같은 컴포넌트만(Kbd/Separator·Code/InlineCode·Dialog/ConfirmDialog·Icon 색 분리, 인터랙션 보드는 커서 보드로 축소), 모션 보드 데모는 세로 한 줄에 한 컴포넌트. **2026-09-08 컴포넌트 추가 조사**(shadcn 62·Tremor 40·Base UI 36 목록과 대조): Link · ButtonGroup · AvatarGroup · Meter · Tracker · Steps · Timeline · KeyValue · CopyField · RadioCards · Fieldset · Sheet · Command 13개를 우리 문법으로 추가, e2e W6(명령 팔레트·시트·복사). 뺀 것: Table·Sidebar(사용자 결정), Calendar/DatePicker·OTP·Carousel·Resizable·ScrollArea·Menubar·NavigationMenu·HoverCard·ContextMenu(단일 사용자 PaaS 에 불필요). 이어서 **Tailwind Plus Application UI 전 카테고리 대조**(사용자 요청): Container · Separator(label) · Card(footer) · Avatar(status) · Switch/Checkbox(hint) · ListRow(end) · Timeline(lead) · Notice(action·dismiss) · InputGroup · FormRow/FormActions · ActionPanel · NavList · SectionHeading · List · Calendar · PageHeading · AppShell · SignInCard · DetailScreen · SettingsScreen 추가, e2e W7, 층 검사에 TopBar 를 기초 유기체로 허용. 매핑 표는 design.md. 정밀 검수: 아코디언 열린 항목을 card-2 블록으로(트리거 hover 와 내용이 붙어 보이던 것), SectionHeading mb-6, Timeline avatar 변형 ps-7, LogViewer terminal p-4. card-2 위 card-2 컨트롤이 묻히던 것(열린 아코디언 안 Input·Command 의 SearchInput)은 `surface-2` 유틸(--card-2→c3, --card-3→c4)을 POPUP 레시피와 열린 아코디언 항목에 걸어 해결. 상태 검수 2차(다크·라이트 × 열림·hover·포커스): InputGroup 안쪽 Input 링 이중 → 그룹 링 하나, Calendar 오늘 표시 bg→accent 글자(라이트 bg 위 card-2 가 안 보임), Track·NumberField surface-2(ghost hover 묻힘). Analytics 다크/라이트 두 보드(토글 전 유물)를 테마 따르는 한 장으로 합침. 템플릿 규격 확정: 1280×800 프레임 + AppShell + Container 1168, 캔버스 50% 축소(`frame: true`); Analytics 도 AppShell + PageHeading 을 갖는 홈 화면으로. 대비 검수: Tabs 선택 글자 data-active 로 고침, good/warn 배지 글자 ink, 라이트 mute #566580; 카드 제목 22 로 통일(홈/상세 크기 차이), 캔버스 나열 규칙(폭·기본 크기·샘플 데이터) 문서화. 아코디언 재설계(사용자 요청 "토글 시 요소 간 여백"): 항목 p-1 + 트리거 8px 둥글기 + 열린 블록 안 트리거↔내용 12 · 내용↔바닥 12, 항목 사이 8. 상태 톤 맵은 `0-tokens/tone.ts` 로 내림(원자끼리 임포트 없게). `npm run layers`(`wui/e2e/layers.mjs`)가 위 층 임포트·같은 층 임포트(기초 분자 5개 예외)를 검사, run.sh W 섹션 앞에서 돌림. 프리미티브는 Base UI(MIT), 아이콘은 Heroicons outline(MIT) 만 — 인라인 svg 없음. 캔버스 사이드바에 다크/라이트 토글(localStorage). 브라우저 e2e `wui/e2e/wui.mjs`(W1–W6: 요소 렌더·세로 넘침, 레이어 점프, 메뉴/모달/셀렉트/탭, 줌, 확장 원자(체크·콤보박스·토글·아코디언·팝오버·토스트); 토큰 불필요), 드라이버 `e2e/drive.mjs`(:7877). `api/test/e2e/run.sh` 의 W 섹션이 부른다(W0 = 층 검사).

첫 구현(`wui/`, Vite+React, Openship 마크업·토큰 차용, 프로젝트 중심 섹션 페이지, 입양 섹션, Playwright e2e 11개)은 2026-09-07 통째로 제거했다. 다음 구현은 `.claude/rules/wui/design.md` 를 따른다 — 2026-09-07 레퍼런스를 Steep 에서 **Vercel(Geist)** 로 바꿈(관리 화면 밀도: 회색 사다리·6/8/12px·표 중심·Geist 폰트; Steep 에선 복숭아 액센트만 유지). 로그인·프로젝트 목록은 2026-09-08 이 규칙으로 다시 그렸다. 데몬 쪽 접점은 그대로: `PI_WUI_DIR`(기본 바이너리 옆 `wui/`)을 `/ui` 에서 서빙, `/` → `/ui/`, `pi open`, `pi install --wui-dir`. API 와 경로 모양이 겹쳐 `/ui` 접두는 유지해야 한다.

## 추가할 기능 (직접 채우기)
- [ ]

- 2026-09-09 리소스 띠 오른쪽 막대: 그래프 아래 범례를 없애고 오른쪽 목록이 범례(전체 accent + 상위 3 색 점·색 막대). Lab `#v2`(행·자기 상한) `#v2s`(행·전체 몫) `#v2k`(쌓은 막대) `#v2v`(세로 막대). Progress 에 `color`, AreaChart 에 `legend` 추가. 가짜 데이터: 디스크 호스트 합 = 컨테이너 합 스케일(÷6·÷9).
- 2026-09-09 쌓은 막대 변형: `#v2k1` 두꺼운 띠(안쪽 라벨) · `#v2k2` 두 줄(얼마나/누가) · `#v2k3` 띠 + 정렬된 행 · `#v2k4` 세로 기둥 + 목록.
- 2026-09-09 결정: 오른쪽은 **V2-3-c 띠 + 정렬된 행** — 8px 쌓은 띠 + 전체·상위 3 행(11px/16, 점 6px). 다른 막대 변형은 Lab 에서 제거.
- 2026-09-09 Lab 은 V2 만 남기고(세부 드러내기 V2-a…d 제거) 띠 크기 규격 여섯을 나열: `#v2` S1 기준 · `#v2t` S2 촘촘 · `#v2r` S3 여유 · `#v2c` S4 그래프 우선 · `#v2h` S5 머리 한 줄 · `#v2k` S6 카드 넷. 규격은 `SIZES`(pad·gap·cols·chart·label·value·row·dot) 한 벌.
- 2026-09-09 결정: 디스크는 **I/O 띠 + 용량 카드로 분리**. 띠의 디스크 = "디스크 I/O", 큰 숫자 MB/s, 부연 읽기·쓰기. 용량은 `DiskCapacity` 카드(Meter 이미지·볼륨·백업 + 볼륨 큰 컨테이너 3, Lab `#disk`). 필요한 API: 컨테이너 BlockIO 누적→초당, 호스트 /proc/diskstats, `docker system df -v` 볼륨 크기.
- 2026-09-09 Lab 은 실제 "리소스" 화면: PageHeading(호스트·가동·컨테이너 수·실시간 점, 동작에 S1–S6 세그먼트 + 컨테이너별 + 실시간) → 띠 넷 카드 → 저장 장치 둘(`Storage` 카드: 내장 디스크 / = 시스템·이미지·로그 + 로그 많이 쌓는 컨테이너 3, 외장 SSD /mnt/ssd = 볼륨·백업·기타 + 볼륨 큰 컨테이너 3). SSD 는 같은 틀로 카드 하나 더(사용자 결정). 마운트 목록 API 필요.
- 2026-09-09 결정: 방향 있는 유량(디스크 I/O·네트워크)은 띠 안 토글 **합 · 읽기/받음 · 쓰기/보냄**(FilterTabs sm, 값 아래). 값·그래프·오른쪽 몫이 함께 바뀐다. 점유율 상한은 설정값 — 디스크는 합/cap(50 MB/s 가짜), 네트워크는 max(in,out)/회선(100 Mb/s 가짜, 양방향이 따로라 합이 아님). 호스트 읽기/쓰기 시계열 = 컨테이너 합.
- 2026-09-09 띠 재구성(사용자 요청): **이름·값 → 그래프 → 세로 막대(그래프 높이, 아래부터 상위 3 색 + 나머지 accent 옅게) → 설명(전체·상위 3 행)** 네 열. 크기 S1–S5(카드 넷 S6 제거), 토글 위치 T1 값 아래 · T2 그래프 위 오른쪽 · T3 설명 위 · T4 페이지 머리(두 띠 동시, 라벨 "읽기 · 받음 / 쓰기 · 보냄"). Lab 도구 줄(크기·토글 위치)은 화면 위, 실제 화면에는 없음.
- 2026-09-09 띠 재구성 2: 왼쪽은 **이름만**, 값·부연(49% · 8 코어)도 설명 열로(값 → 부연 → 토글 → 상위 3, 전체 행은 값과 겹쳐 제거). 이름 열 112(S1)로 줄여 그래프에 폭. 컨테이너 쿼리 `@container`/`@3xl`: 768 미만이면 이름이 그래프 위, 막대·설명은 두 줄 걸침 — 창이 좁아도 그래프가 찌그러지지 않는다. 토글 위치 T3 = 이름 아래(띠 높이가 늘지 않아 T1 보다 낫다). Lab 도구 줄은 md 세그먼트. SEG_SM 은 px-2 + min-w-0.
- 2026-09-09 그래프 표시(사용자 제안, 토스 차트 참고): AreaChart `annotate` — 축 눈금·격자 대신 첫 시리즈의 **최고**(점 위 라벨 + 점선) · **최저**(그래프 바닥 아래 라벨, 겹침 방지) · 지금 점 후광. 값 표기 `formatMark`(r.fmt). Lab 도구 줄 "그래프: 최고·최저 / 눈금" 으로 비교, 기본은 최고·최저. 눈금이 빠져 그래프가 ps-8 만큼 넓어진다.
- 2026-09-09 띠 최종 구성(사용자 지정): 제목 줄(작게, 우측에 작은 토글) → 그래프 → 그래프 **우측 끝 선 높이에 현재값**(AreaChart `nowLabel`/`nowNote`/`nowClass`, 보이지 않는 사본으로 자리 확보, 위아래 14 로 클램프) / 오른쪽 열은 **가로** 쌓은 띠 + 상위 3 행. 색은 순위: 전체 accent(파랑), 상위 1·2·3 은 `--rank-1..3` 청록 계열 그라데이션(컨테이너 고유색 없음). 크기 S1–S4(머리 한 줄 제거), 토글은 제목 줄 고정(T1–T4 실험 종료).
- 2026-09-09 전체 페이지 반응형: Container px-4→sm:px-6 · AppShell py-6→sm:py-8 · Card p-5→sm:p-6 · TopBar 이름 truncate · PageHeading 은 좁으면 동작이 제목 아래 · 띠는 창 `lg`(1024) 기준 2열↔1열. 420·640·820·1024·1280 다섯 폭에서 가로 넘침 0.
- 2026-09-09 반응형 기준 통일(사용자 지정): 컨테이너 쿼리 제거, 전부 창 기준 미디어 쿼리. 띠 2열 전환점 = 창 1024(전에는 카드 768 = 창 912 라 예측이 어려웠다).
- 2026-09-09 띠 마무리(사용자 지정): 현재값 아래 부연 제거 · 전체 규모는 **눈금**(최고·최저 표기는 Lab 토글로만 남김) · 현재값 글씨 17(다른 글자와 맞춤) · 색은 **현재값 노랑(`--now`) + 상위 1·2·3 파랑 그라데이션(`--rank-1..3`)** · 면(fill) 없이 선만 · 눈금 열 36 과 현재값 열(규격 `now`)을 고정폭으로 두어 네 그래프의 양 끝점 정렬.
- 2026-09-09 색 재조정(사용자 지정): 현재값 = 파랑(`--now` = accent 값), 상위 1·2·3 = 무채색에 가까운 파랑 그라데이션(`--rank-1..3`). 토글은 제목 바로 오른쪽, 글자 크기는 제목과 같게(규격 `seg` 에 완성된 클래스 — Tailwind 는 조합 문자열을 못 본다).
- 2026-09-09 다듬기(사용자 지정): 제목은 text 색 + medium 으로 강조 · 토글은 28 로 축소(SEG_SM h-5/11px) · 띠 행 여백을 카드와 같은 `p-5 sm:p-6` 로 통일하고 제목 줄 h-7 + 내용 mt-3 을 양쪽 열이 공유(오른쪽 열의 임의 `pt-8` 제거) · 눈금 라벨을 격자선 중심에 맞춤.
- 2026-09-09 **확정**: 리소스 띠는 S1 Base + Ticks 로 결정, 키트 유기체 `ResourceBand`/`ResourceBands`/`StorageCard` 로 승격하고 캔버스 3 유기체 > 리소스 묶음에 등록(wide 640). 순위 색은 `0-tokens/rank.ts`. Lab 은 이제 가짜 데이터를 유기체에 먹이는 화면(크기·그래프 실험 도구 줄 제거).
- 2026-09-09 StorageCard Lab 개설(`/ui/#storage`, `pages/StorageLab.tsx`, 캔버스 도구 줄에 volume 아이콘): A 현재 카드 · B Runway(30일 추이 + GB/일 → 남은 날) · C Reclaimable(회수 가능 용량 + 항목별 Clean) · D Volumes(프로젝트 연결·마지막 백업·고아 배지) · E Devices(마운트당 한 줄, 여유 기준). 새 API: 일 단위 용량 시계열 · `docker system df -v` 종류별 · 볼륨↔프로젝트 연결 · 백업 이력 · 마운트 목록.
- 2026-09-09 E(Devices) 발전 다섯: E1 기본 행 · E2 종류로 쪼갠 막대 + 색 점 범례 · E3 30일 스파크라인 + GB/일 + 남은 날(임박은 warn) · E4 펼치는 행(종류 Meter · 장치 정보 · 상위 항목) · E5 남은 날 순 정렬 + 상태 점. 가짜 값에서 내장 디스크를 80%(388→409 GB)로 두어 상태·추세가 실제로 보이게 함.
- 2026-09-09 E1 발전(사용자 지정): 막대 위 왼쪽에 사용량·%, 오른쪽에 총량 / 행 오른쪽에 30일 용량 변화 스파크라인 + GB/일. 여유 용량은 카드 부제의 합계로만.
- 2026-09-09 StorageLab 을 "장치 한 줄을 어떻게 표현할 것인가" 하나의 질문으로 재구성(사용자 지정): V1 막대 위 라벨 + 오른쪽 스파크라인 · V2 값을 막대 안으로(가장 낮은 행) · V3 그래프 주도(상한 점선 + 끝 현재값, 막대는 보조) · V4 막대 없이 그래프만(상한까지의 거리 = 여유) · V5 예측 점선(상한에 닿는 지점). AreaChart 에 `limit`·시리즈 `dash` 추가. 이전 A~E 안은 git 이력과 이 문서에 남는다.
- 2026-09-09 그래프의 시간 축 명시(사용자 결정): **모든 행의 그래프 아래에 "30d ago → now"** 를 늘 적는다. 열 머리로 한 번만 적는 안은 시도했다가 뺐다 — 행 단위로 읽을 때 축이 그 자리에 없다. 검토 후 안 쓴 방법: 행마다 GB/day 캡션 · 7일 주기 세로 격자.
- 2026-09-09 **확정**: StorageLab V1 을 유기체 `DeviceList` 로 승격(캔버스 3 유기체 > 리소스에 등록, 표본은 정상·주의·경고 세 상태). 카드 부제·마운트 경로·퍼센트·GB/day 캡션은 모두 뺐고, 축은 그래프마다 `30d ago → now` 로만 말한다. Lab V1 은 이제 키트를 그대로 쓴다.
- 2026-09-09 `StorageCard` 제거(사용자 지정): DeviceList 가 장치 용량을 맡는다. 리소스 화면의 저장 장치 두 카드도 DeviceList 한 장으로 합쳤다. 종류별 구성(이미지·볼륨·백업)과 회수 가능 용량은 지금 화면에서 빠졌다 — 필요해지면 되살릴 것.
- 2026-09-09 디자인 시스템 최적화(사용자 지정 — 직접 다듬은 두 컴포넌트 문법을 전체에 적용): design.md 에 "확정 문법" 절 신설(중복 금지 · 행당 숫자 둘 · 제목/부속 위계 · 색은 하나만 · 면은 한 시리즈만 · 토글은 제목 옆 · 그래프 양 끝 정렬). 죽은 `--chart-1..5` 토큰 제거, 사용률 톤(`usageTone`/`usageColor`)과 용량 서식(`formatGB`)을 토큰·lib 층으로 내려 중복 세 곳 제거, TopProjects 부제와 EdgeRequests 군더더기 문장 삭제.
