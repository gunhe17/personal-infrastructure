# 기능 단위 목록 — API · CLI · UI 자리 (2026-09-09, 대시보드 구성용)

출처: `api/src/bin/server.rs` 라우터 · `cli/src/command/*` 서브커맨드. UI 열은 아직 안 지은 화면의 제안 — `4-templates/` 규격(1280×800 · AppShell) 위에.

| 영역 | 기능 단위 | API | CLI | UI 자리(제안) |
|---|---|---|---|---|
| 프로젝트 | 목록 | GET /projects | project list | 홈 TopProjects · 프로젝트 목록(List+ListRow) |
| | 등록(폴더·git URL, 포트, 그룹, 환경) | POST /projects | project create | 새 프로젝트 Dialog/Sheet(RadioCards 스택 · InputGroup) |
| | 상세(원격 HEAD 드리프트 포함) | GET /projects/{id} | project show | DetailScreen 정보 카드(KeyValue) |
| | 제거 · 지워질 것 미리보기 | DELETE /projects/{id} · GET /projects/{id}/removal | project remove [--dry] | 설정 위험 구역 ActionPanel → ConfirmDialog(미리보기 목록) |
| | 켜기 · 끄기 · 튕기기(stale 거부) | POST start/stop/restart | project start/stop/restart | DetailScreen 머리 동작 버튼 · Menu |
| | CPU·메모리 상한 | PUT /projects/{id}/limits | project limits | 설정 FormRow(NumberField·Slider) |
| 환경변수 | 목록(마스킹) · 넣기/바꾸기 · 지우기 · 평문 보기 | GET/PUT /projects/{id}/env · DELETE …/env/{key} · GET …/env/reveal | env list/set/unset/reveal | 상세 탭 "환경변수": List(KeyValue+Mono, secret 마스킹) + CopyField(reveal) |
| 배포 | 실행(감지→빌드→실행) · 목록 · 상세 · 취소 · 롤백 · 승격 · 로그 스트림 | POST/GET /deployments · GET /deployments/{id} · POST …/cancel · POST /deployments/rollback · POST /deployments/promote · GET …/logs | deploy start/list/show/cancel/rollback/promote/logs | 상세 탭 "배포": Steps(파이프라인) · Timeline(이력) · LogViewer(스트림) · Menu(롤백·승격) |
| 소스 | git 연결(웹훅 정보) · 해제 · 푸시 수신 | POST /git/links · DELETE /git/links/{project_id} · POST /webhooks/git/{project_id} | git link/unlink | 설정 "푸시 투 디플로이": Switch(자동 배포) + CopyField(웹훅 URL) |
| | 기존 컨테이너 스캔 · 흡수 | GET /migration/scan · POST /migration/adopt | adopt scan/container | "흡수" Sheet: List(후보) + RadioCards |
| 도메인·인증서 | 목록 · 붙이기(none/acme/manual/self_signed) · 떼기 · 지금 발급 · 인증서 목록 · 직접 업로드 | GET/POST /domains · DELETE /domains/{id} · POST …/ssl · GET/POST /certificates | domain list/attach/detach/ssl/certs/upload-cert | 상세 탭 "도메인": List(StatusDot 인증서 상태) + Sheet(붙이기: InputGroup + RadioCards TLS) |
| 엣지 | 경로 규칙 목록·추가(deny/limit/allow)·삭제 · vhost 보기 · 리로드 · 80/443 소유자 | GET/POST /edge/rules · DELETE …/{id} · GET /edge/vhosts · POST /edge/reload · (owner 는 doctor) | edge rules/rule-add/rule-remove/show/reload/owner | 전역 "엣지" 화면: List(규칙, Badge) + Code(vhost) + ActionPanel(리로드) |
| 데이터베이스 | 목록 · 엔진 카탈로그 · 생성 · 접속 문자열 · 제거 · 프로젝트에 연결 | GET/POST /databases · GET /databases/engines · GET …/connection · DELETE …/{id} · POST …/connect | database list/engines/create/url/remove/connect | 전역 "데이터베이스": List(Tile 엔진) + Sheet(생성: RadioCards 엔진) + CopyField(URL) |
| 볼륨 | 목록 · 생성 · 삭제 | GET/POST /volumes · DELETE /volumes/{id} | volume list/create/remove | 전역 "볼륨": List + Meter(사용량) |
| 자격증명 | 목록(마스킹) · 저장 · 평문 · 삭제 | GET/POST /credentials · GET …/reveal · DELETE …/{id} | credential list/create/reveal/remove | 설정 "자격증명": List + CopyField(reveal) |
| 백업 | 이력 · 즉시 백업 · 보관 위치 목록·추가 · 예약 · 복원 | GET/POST /backups · GET/POST /backups/destinations · POST /backups/schedules · POST /backups/restore | backup list/run/destinations/add-destination/schedule/restore | 전역 "백업": Calendar(예약·이력 점) + List + ActionPanel(지금 백업) + ConfirmDialog(복원) |
| 상태·진단 | 한눈 상태 · 열린 문제 · 포트 예약 vs 관측 · 리스너 스캔 · 감사 로그 · 요청 통계(24h) · 자원 사용량(24h) · 박스 점검 | GET /status · /issues · /system/ports · /system/listeners · /audit · /analytics · /analytics/usage · /doctor · /health | status show/issues/ports/listeners/audit/requests/usage · doctor | 홈(Analytics: EdgeRequests·Stat·DotMatrix·Tracker) · "문제" Notice 스택 · "감사" Timeline · "포트" KeyValue/List · "박스 점검" Steps/StatusDot |
| 워커·잡 | 최근 job 50 · 주기 워커 즉시 실행(ssl_renew·backup·monitor·gc) | GET /jobs · POST /jobs/run/{name} | job list/run | 전역 "잡": List(StatusDot) + ButtonGroup(즉시 실행) |
| 알림 | 나가는 웹훅 목록·구독(deploy_succeeded/failed, HMAC)·삭제·전달 이력 · 알림 채널 목록·추가·삭제 | GET/POST /hooks · DELETE …/{id} · GET …/deliveries · GET/POST /notifications/channels · DELETE …/{id} | webhook list/create/remove/deliveries | 설정 "알림": List + Sheet(구독) + Timeline(전달 이력) |
| 터널 | 상태 · 올리기(토큰 봉인) · 내리기 | GET/POST /tunnel · POST /tunnel/down | tunnel status/up/down | 설정 "공개": ActionPanel(Switch 느낌) + StatusDot |
| 메일 | 상태 · 띄우기 · DNS 레코드 · 내리기 | GET/POST/DELETE /mail · GET /mail/dns | mail status/setup/dns/remove | 전역 "메일": ActionPanel + KeyValue(DNS, Mono, CopyField) |
| 토큰·설정 | 토큰 목록·발급(평문 1회)·폐기 · 전역 설정 보기·바꾸기 · 서버 주소/토큰 컨텍스트 · MCP 설정 조각 | GET/POST /tokens · DELETE /tokens/{id} · GET/PUT /settings | token list/create/revoke · context set/show · mcp config · api · completion | 설정 "토큰": List + Callout(평문 1회) + CopyField · "일반": FormRow · 로그인: SignInCard |
| 설치·열기 | systemd 설치/제거 · 대시보드 열기 | — | install/uninstall/open | (CLI 전용) |
| MCP | 툴 라우터 — project·deployment·domain·system 툴 | /mcp (streamable HTTP) | mcp config | 설정 "에이전트": Code(설정 조각) + CopyField |

화면으로 묶으면: **홈**(status·analytics·issues·top projects) · **프로젝트 상세**(개요 · 배포 · 환경변수 · 도메인 · 볼륨/DB 연결 · 설정) · **전역**(데이터베이스 · 볼륨 · 백업 · 엣지 · 잡 · 메일 · 감사) · **설정**(토큰 · 자격증명 · 알림 · 터널 · 에이전트 · 일반) · **로그인**. 기존 템플릿 3개(홈·상세·설정)가 이 뼈대다.
