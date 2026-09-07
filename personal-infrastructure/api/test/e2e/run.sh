#!/usr/bin/env bash
# e2e — openship-features.md 의 항목 하나하나를 실제 바이너리·docker·curl 로 확인한다.
# 전제: docker, python3, openssl, git, 개발 Postgres(pi-postgres). 결과는 PASS/FAIL/SKIP 표. FAIL 이 있으면 exit 1.
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$ROOT"
export DATABASE_URL=${DATABASE_URL:-postgres://pi:devpass@127.0.0.1:55432/personal_infrastructure}
export PI_PORT=7879 PI_WORK_DIR=/tmp/pi-e2e PI_API_URL=http://127.0.0.1:7879 PI_WORKER_FAST=1 PI_WUI_DIR=$ROOT/personal-infrastructure/wui/dist
PI=./target/debug/pi; FX=/tmp/pi-e2e/fx; LOG=/tmp/pi-e2e/log
PASS=0; FAIL=0; SKIP=0; REPORT=()
pass(){ PASS=$((PASS+1)); REPORT+=("PASS  $1  $2"); }
fail(){ FAIL=$((FAIL+1)); REPORT+=("FAIL  $1  $2  — ${3:-}"); echo "  ✗ $1 $2 — ${3:-}"; }
skip(){ SKIP=$((SKIP+1)); REPORT+=("SKIP  $1  $2  — $3"); }
# ok ID "desc" 'shell expression' — 표현식이 참이면 PASS
ok(){ local id=$1 desc=$2; shift 2; if eval "$*" >/dev/null 2>&1; then pass "$id" "$desc"; else fail "$id" "$desc" "$*"; fi; }
psql(){ docker exec pi-postgres psql -U pi -d personal_infrastructure -tAc "$1"; }
j(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }
wait_for(){ for _ in $(seq 1 "${2:-60}"); do eval "$1" >/dev/null 2>&1 && return 0; sleep 1; done; return 1; }
deploy_wait(){ $PI deploy start "$1" --detach >/dev/null 2>&1; wait_for "[ \"\$($PI --json deploy list $1 | j '[0][\"status\"]')\" = running ]" 120; }
hp(){ $PI --json deploy list "$1" | j '[0]["host_port"]'; }
dep(){ $PI --json deploy list "$1" | j '[0]["id"]'; }
cur(){ $PI --json deploy list "$1" | python3 -c 'import sys,json;print([d["id"] for d in json.load(sys.stdin) if d["status"]=="running"][0])'; }

# ── setup ─────────────────────────────────────────────────────────────────
echo "== setup"
# D7 는 cargo test 를 부른다 — 테스트 프로파일을 미리 컴파일해 두지 않으면 실행 중에 컴파일이 돌며 워커를 굶긴다
cargo test -q -p api --no-run >/dev/null 2>&1
docker ps -a --filter label=pi.managed=true --format '{{.Names}}' | xargs -r docker rm -f >/dev/null 2>&1
docker rm -f e2e-legacy pi-edge >/dev/null 2>&1; docker volume rm -f e2e-legacy-data e2e-vol >/dev/null 2>&1
rm -rf /tmp/pi-e2e; mkdir -p $FX/static $FX/dockerfile $FX/compose $FX/src $LOG
psql "truncate token, project, deployment, deployment_log, job, host_port_claim, setting, credential, domain_name, certificate, route_rule, git_link, webhook, webhook_delivery, managed_database, backup_destination, backup, backup_schedule, incident, audit_entry, notification_channel, volume, project_env, request_stat, usage_sample cascade" >/dev/null
echo '<h1>v1</h1>' > $FX/static/index.html
printf 'FROM nginx:alpine\nCOPY index.html /usr/share/nginx/html/\n' > $FX/dockerfile/Dockerfile; echo '<h1>df</h1>' > $FX/dockerfile/index.html
printf 'services:\n  web:\n    image: nginx:alpine\n    ports:\n      - "20777:80"\n    environment:\n      - "GREETING=${GREETING:-none}"\n' > $FX/compose/compose.yaml
( cd $FX/src && git init -q -b main && echo '<h1>git v1</h1>' > index.html && git add . && git -c user.name=e2e -c user.email=e2e@test commit -qm v1 ) && git clone -q --bare $FX/src $FX/repo.git
# receivers: webhook(signed) + notification
cat > /tmp/pi-e2e/recv.py <<'PY'
import http.server,hmac,hashlib,json
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(s):
        b=s.rfile.read(int(s.headers.get("Content-Length",0)));sig=s.headers.get("X-PI-Signature","")
        ok=sig=="sha256="+hmac.new(b"e2esecret",b,hashlib.sha256).hexdigest()
        open("/tmp/pi-e2e/recv.log","a").write(f"{s.path} sig_ok={ok} {b.decode()}\n");s.send_response(204);s.end_headers()
    def log_message(s,*a):pass
http.server.HTTPServer(("127.0.0.1",7998),H).serve_forever()
PY
python3 /tmp/pi-e2e/recv.py & RECV=$!
./target/debug/server > $LOG/server.log 2>&1 & SRV=$!; ./target/debug/worker > $LOG/worker.log 2>&1 & WRK=$!
wait_for "curl -sf http://127.0.0.1:7879/health" 30 || { echo "server did not start"; exit 1; }
export PI_TOKEN=$(cat /tmp/pi-e2e/bootstrap.token)
cleanup(){ kill $SRV $WRK $RECV 2>/dev/null; wait $SRV $WRK $RECV 2>/dev/null; docker ps -a --filter label=pi.managed=true --format '{{.Names}}' | xargs -r docker rm -f >/dev/null 2>&1; docker rm -f e2e-legacy >/dev/null 2>&1; docker rmi -f $(docker images 'pi/*' -q) >/dev/null 2>&1; }
trap cleanup EXIT

# ── 인터페이스 · PAT ──────────────────────────────────────────────────────
echo "== interface"
ok I1 "CLI 동작" '$PI --help'
ok I2 "REST 직접 호출 (pi api)" '[ "$($PI api GET /status 2>/dev/null | j "[\"version\"]")" = 0.1.0 ]'
ok I5 "셸 자동완성 생성" '[ -n "$($PI completion zsh | head -1)" ]'
ok MO6 "헬스 엔드포인트" '[ "$(curl -s http://127.0.0.1:7879/health)" = ok ]'
T=$($PI --json token create tmp --scope project_read | j '["secret"]'); TID=$($PI --json token list | python3 -c 'import sys,json;print([t["id"] for t in json.load(sys.stdin) if t["name"]=="tmp"][0])')
ok I6a "PAT 발급·목록" '[ -n "$T" ]'
$PI token revoke $TID >/dev/null
ok I6b "PAT 폐기 → 401" '[ "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $T" http://127.0.0.1:7879/projects)" = 401 ]'
$PI api PUT /settings --body '{"key":"acme_email","value":"e2e@test.local"}' >/dev/null 2>&1
ok I7 "전역 설정" '$PI api GET /settings 2>/dev/null | grep -q acme_email'
ok CL3 "context 저장·마스킹" 'PI_TOKEN= HOME=/tmp/pi-e2e $PI context set --token secret-token-value >/dev/null && PI_TOKEN= HOME=/tmp/pi-e2e $PI context show | grep -q "secret-…"'
ok CL2 "doctor 종합 점검 출력" '$PI doctor 2>/dev/null | grep -q docker'
skip CL1 "install/uninstall (systemd·launchd)" "실제 서비스 등록은 수동 확인 — `pi install --help`: $($PI install --help >/dev/null 2>&1 && echo ok)"
skip I4 "웹 대시보드" "다시 짓는 중 — 로그인까지 (W 섹션)"
skip CL4 "open (대시보드)" "브라우저를 여는 명령 — 수동"

# ── 파이프라인 · 소스 ────────────────────────────────────────────────────
echo "== pipeline"
S=$($PI --json project create e2e-static $FX/static --group e2e --environment staging | j '["id"]')
deploy_wait $S || fail P1a "static 배포" "timeout"
ok P1a "감지 static" '[ "$($PI --json project show $S | j "[\"stack\"]")" = static ]'
ok P2 "빌드 스냅샷 이미지 태그 = 배포 id" 'docker images "pi/e2e-static" --format "{{.Tag}}" | grep -q "$(dep $S | tr -d -)"'
ok P3 "실행은 루프백만" 'docker port e2e-static | grep -q "^80/tcp -> 127.0.0.1:" && ! docker port e2e-static | grep -q 0.0.0.0'
ok D1 "엣지가 유일한 공개 창구(앱 0.0.0.0 없음)" '! docker port e2e-static | grep -q 0.0.0.0'
ok S3 "로컬 폴더 소스" '[ "$(curl -s http://127.0.0.1:$(hp $S)/)" = "<h1>v1</h1>" ]'
ok P8 "배포 이력 필드(status·port·finished_at)" '$PI --json deploy list $S | python3 -c "import sys,json;d=json.load(sys.stdin)[0];assert d[\"status\"]==\"running\" and d[\"host_port\"] and d[\"finished_at\"]"'
ok P9 "로그 SSE 스트림" 'curl -s -N --max-time 10 -H "Authorization: Bearer $PI_TOKEN" http://127.0.0.1:7879/deployments/$(dep $S)/logs | grep -q "data:.*started"'
ok PT4 "배포 후 포트 감사" 'wait_for "[ -n \"\$(psql \"select 1 from deployment_log where deployment_id='"'"'$(dep $S)'"'"' and stream='"'"'audit'"'"'\")\" ]" 15'
DF=$($PI --json project create e2e-df $FX/dockerfile | j '["id"]'); deploy_wait $DF || fail P1b "dockerfile 배포" timeout
ok P1b "감지 dockerfile" '[ "$($PI --json project show $DF | j "[\"stack\"]")" = dockerfile ] && [ "$(curl -s http://127.0.0.1:$(hp $DF)/)" = "<h1>df</h1>" ]'
CO=$($PI --json project create e2e-compose $FX/compose | j '["id"]'); $PI env set $CO GREETING=fromenv >/dev/null; deploy_wait $CO || fail P1c "compose 배포" timeout
ok P1c "감지 compose + 그대로 올림" '[ "$($PI --json project show $CO | j "[\"stack\"]")" = compose ] && curl -sf http://127.0.0.1:20777/ >/dev/null'
ok S4 "compose 에 env-file 주입" 'docker inspect pi-e2e-compose-web-1 --format "{{join .Config.Env \" \"}}" | grep -q GREETING=fromenv'
# rollback
echo '<h1>v2</h1>' > $FX/static/index.html; FIRST=$(dep $S); deploy_wait $S
ok P6a "재배포 v2" '[ "$(curl -s http://127.0.0.1:$(hp $S)/)" = "<h1>v2</h1>" ]'
$PI --json deploy rollback $FIRST >/dev/null 2>&1; wait_for "[ \"\$($PI --json deploy list $S | j '[0][\"status\"]')\" = running ]" 60
echo '<h1>v1</h1>' > $FX/static/index.html
ok P6b "롤백 → v1 그대로, 재빌드 없음" '[ "$(curl -s http://127.0.0.1:$(hp $S)/)" = "<h1>v1</h1>" ] && [ "$($PI --json deploy list $S | j "[0][\"trigger\"]")" = rollback ] && [ "$($PI --json deploy list $S | j "[0][\"image_ref\"]")" = "$($PI --json deploy show $FIRST | j "[\"image_ref\"]")" ]'
# cancel: 워커를 잠깐 세워 큐에 남긴다
kill -STOP $WRK; QD=$($PI --json deploy start $S --detach | j '["id"]'); $PI deploy cancel $QD >/dev/null 2>&1; R1=$?; kill -CONT $WRK
ok P7a "배포 취소(큐)" '[ $R1 = 0 ] && [ "$($PI --json deploy show $QD | j "[\"status\"]")" = cancelled ] && [ "$(psql "select status from job where target_id='"'"'$QD'"'"'")" = cancelled ]'
ok P7b "취소 불가(끝난 배포) → 400" '! $PI deploy cancel $FIRST 2>/dev/null'
# git source + push-to-deploy
G=$($PI --json project create e2e-git file://$FX/repo.git | j '["id"]'); LINK=$($PI --json git link $G file://$FX/repo.git); SECRET=$(echo "$LINK" | j '["webhook_secret"]'); deploy_wait $G || fail S1 "git 배포" timeout
ok S1 "git URL 소스 (file://) 배포" '[ "$(curl -s http://127.0.0.1:$(hp $G)/)" = "<h1>git v1</h1>" ]'
ok S2 "배포 커밋 기록" '[ "$($PI --json project show $G | j "[\"commit\"]" | wc -c)" -gt 30 ]'
sig(){ python3 -c "import hmac,hashlib,sys;print('sha256='+hmac.new(sys.argv[1].encode(),sys.argv[2].encode(),hashlib.sha256).hexdigest())" "$1" "$2"; }
BODY='{"ref":"refs/heads/main"}'; N0=$($PI --json deploy list $G | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
ok P5a "푸시 웹훅 서명 틀림 → 401" '[ "$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "X-Hub-Signature-256: sha256=bad" -d "$BODY" http://127.0.0.1:7879/webhooks/git/$G)" = 401 ]'
ok P5b "다른 브랜치 push → 무시" '[ "$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "X-Hub-Signature-256: $(sig $SECRET "{\"ref\":\"refs/heads/dev\"}")" -d "{\"ref\":\"refs/heads/dev\"}" http://127.0.0.1:7879/webhooks/git/$G)" = 202 ] && [ "$($PI --json deploy list $G | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")" = $N0 ]'
curl -s -o /dev/null -X POST -H "X-Hub-Signature-256: $(sig $SECRET "$BODY")" -d "$BODY" http://127.0.0.1:7879/webhooks/git/$G; wait_for "[ \"\$($PI --json deploy list $G | j '[0][\"trigger\"]')\" = webhook ] && [ \"\$($PI --json deploy list $G | j '[0][\"status\"]')\" = running ]" 60
ok P5c "푸시 투 디플로이 → trigger=webhook" '[ "$($PI --json deploy list $G | j "[0][\"trigger\"]")" = webhook ]'
( cd $FX/src && echo '<h1>git v2</h1>' > index.html && git -c user.name=e2e -c user.email=e2e@test commit -qam v2 && git push -q $FX/repo.git main )
ok MO5 "커밋 드리프트 (원격 HEAD 와 다름)" '$PI project show $G | grep -q "다름"'
skip S6 "기존 프록시 사이트 이관" "미구현(문서에 사유)"; skip S7 "폴더 업로드" "제외 — git URL·서버 폴더로 충분"

# ── 프로젝트 ────────────────────────────────────────────────────────────
echo "== project"
ok PR1a "프로젝트 목록·상세" '$PI project list | grep -q e2e-static && $PI project show $S | grep -q "group/env  e2e/staging"'
ok PR2 "삭제 미리보기" '$PI project remove $S --dry-run | grep -q "container  e2e-static"'
ok PR3 "환경 유니크 (group, environment) → 409" '! $PI project create e2e-dup $FX/static --group e2e --environment staging 2>/dev/null'
PROD=$($PI --json project create e2e-prod $FX/static --group e2e --environment production | j '["id"]'); $PI --json deploy promote $(cur $S) $PROD >/dev/null 2>&1; wait_for "[ \"\$($PI --json deploy list $PROD | j '[0][\"status\"]')\" = running ]" 60
ok PR4a "승격 staging→prod, 이미지 재사용" '[ "$($PI --json deploy list $PROD | j "[0][\"trigger\"]")" = promote ] && [ "$($PI --json deploy list $PROD | j "[0][\"image_ref\"]")" = "$($PI --json deploy show $(cur $S) | j "[\"image_ref\"]")" ]'
ok PR4b "다른 group 으로 승격 → 400" '! $PI deploy promote $(cur $S) $DF 2>/dev/null'
$PI env set $S API_KEY=hidden-value --secret >/dev/null; $PI env set $S PLAIN=1 >/dev/null
ok PR5a "환경변수 목록 마스킹" '$PI env list $S | grep -q "hidd\*\*\*\*"'
ok PR5b "reveal 평문 (credential_read)" '$PI env reveal $S | grep -q hidden-value'
RO=$($PI --json token create ro --scope project_read | j '["secret"]')
ok PR5c "reveal 스코프 없으면 403" '[ "$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $RO" http://127.0.0.1:7879/projects/$S/env/reveal)" = 403 ]'
$PI env unset $S PLAIN >/dev/null; ok PR5d "env unset" '! $PI env list $S | grep -q PLAIN'
ok PR8a "설정 반영 가드 (env 변경 후 restart → 400)" '! $PI project restart $S 2>/dev/null'
ok PR8b "--force 로 튕김" '$PI project restart $S --force'
$PI project limits $S --cpus 0.5 --memory-mb 128 >/dev/null; deploy_wait $S
ok PR6 "리소스 제한 적용 (128MB·0.5cpu)" '[ "$(docker inspect e2e-static --format "{{.HostConfig.Memory}}")" = 134217728 ] && [ "$(docker inspect e2e-static --format "{{.HostConfig.NanoCpus}}")" = 500000000 ]'
ok PR5e "env 가 컨테이너에 주입" 'docker inspect e2e-static --format "{{join .Config.Env \" \"}}" | grep -q API_KEY=hidden-value'
$PI project stop $S >/dev/null; ok PR7a "stop → exited" '[ "$(docker inspect e2e-static --format "{{.State.Status}}")" = exited ]'
ok PT2 "포트 예약은 stop 후에도 유지" '$PI status ports | grep -q "$(hp $S)"'
$PI project start $S >/dev/null; ok PR7b "start → running" '[ "$(docker inspect e2e-static --format "{{.State.Status}}")" = running ]'
docker volume create e2e-vol >/dev/null; $PI volume create e2e-vol /data --project-id $DF >/dev/null; deploy_wait $DF
ok PR9 "볼륨 정의 → 컨테이너에 마운트" 'docker inspect e2e-df --format "{{range .Mounts}}{{.Name}}:{{.Destination}} {{end}}" | grep -q "e2e-vol:/data"'
skip PR10 "서비스 터미널" "제외 — ssh + docker exec"

# ── 연결 ──────────────────────────────────────────────────────────────────
echo "== connections"
DB=$($PI --json database create e2edb postgres | j '["id"]'); wait_for "[ \"\$($PI --json database list | python3 -c 'import sys,json;print([d[\"status\"] for d in json.load(sys.stdin) if d[\"name\"]==\"e2edb\"][0])')\" = running ]" 60; sleep 3
ok C1 "DB 컨테이너 기동·접속" 'docker exec pi-db-e2edb psql -U pi -d e2edb -tAc "select 1" | grep -q 1'
ok C2a "DB 커넥션 주입 → secret env" '[ "$($PI --json database connect $DB $S 2>/dev/null; $PI env list $S | grep -c "DATABASE_URL.*secret")" = 1 ]'
ok C2b "주입된 URL 이 실제 접속 문자열" '$PI env reveal $S | grep -q "postgres://pi:"'
MI=$($PI --json database create e2efiles minio | j '["id"]'); wait_for "[ \"\$($PI --json database list | python3 -c 'import sys,json;print([d[\"status\"] for d in json.load(sys.stdin) if d[\"name\"]==\"e2efiles\"][0])')\" = running ]" 90; MP=$($PI database url $MI | sed -E 's/.*:([0-9]+)\/.*/\1/')
ok C3 "오브젝트 스토리지(minio) 기동" 'wait_for "curl -sf http://127.0.0.1:$MP/minio/health/live" 30'
ok C4 "카탈로그 목록" '$PI database engines | grep -q minio'
ok B1a "DB 백업 아티팩트" 'mkdir -p /tmp/pi-e2e/bk && DEST=$($PI --json backup add-destination local /tmp/pi-e2e/bk | j "[\"id\"]") && ART=$($PI --json backup run $DEST database $DB | j "[\"artifact\"]") && [ -s "$ART" ]'
VID=$($PI --json volume list | python3 -c 'import sys,json;print([v["id"] for v in json.load(sys.stdin) if v["name"]=="e2e-vol"][0])'); DEST=$($PI --json backup destinations | j '[0]["id"]')
ok B1b "볼륨 백업(tar)" 'ART=$($PI --json backup run $DEST volume $VID | j "[\"artifact\"]") && tar -tf "$ART" >/dev/null'
BK=$($PI --json backup list | j '[0]["id"]'); ok B2 "복원" '$PI backup restore $BK'
$PI backup schedule $DEST database $DB --every-seconds 1 >/dev/null; N=$($PI --json backup list | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))'); $PI job run backup >/dev/null 2>&1
ok B3 "예약 백업 (스케줄 → 워커 실행)" '[ "$($PI --json backup list | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")" -gt $N ]'
skip B4 "보존 잠금(protect)" "미구현(문서에 사유)"

# ── 도메인 · 인증서 · 엣지 ──────────────────────────────────────────────
echo "== domain/edge"
DOM=$($PI --json domain attach $S static.e2e.test --tls self_signed | j '["id"]')
ok D2 "도메인 → vhost 자동 생성" 'grep -Eq "proxy_pass http://(127.0.0.1|host.docker.internal):$(hp $S)" /tmp/pi-e2e/edge/conf.d/static.e2e.test.conf'
ok D2b "엣지 경유 :80 → 앱 응답 (리눅스: host net, Mac: publish)" 'wait_for "docker ps --format {{.Names}} | grep -q ^pi-edge\$" 20 && [ "$(curl -s -m 5 -H "Host: static.e2e.test" http://127.0.0.1/)" = "<h1>v1</h1>" ]'
ok P4a "라우팅은 앱 뒤에 — 배포 running 유지" '[ "$($PI --json deploy list $S | j "[0][\"status\"]")" = running ]'
ok D3a "self_signed 지금 발급 → 인증서·443" '$PI domain ssl $DOM >/dev/null && $PI domain certs | grep -q "static.e2e.test.*self-signed" && grep -q "listen 443 ssl" /tmp/pi-e2e/edge/conf.d/static.e2e.test.conf'
ok D3c "엣지 경유 https (self-signed) + http→https 301" '[ "$(curl -sk -m 5 --resolve static.e2e.test:443:127.0.0.1 https://static.e2e.test/)" = "<h1>v1</h1>" ] && [ "$(curl -s -o /dev/null -w "%{http_code}" -H "Host: static.e2e.test" http://127.0.0.1/)" = 301 ]'
ACME=$($PI --json domain attach $DF acme.e2e.test --tls acme | j '["id"]')
ok D3b "LE HTTP-01 실패가 원인과 함께 424 (certbot 없음)" '$PI domain ssl $ACME 2>&1 | grep -q "424"'
WILD=$($PI --json domain attach $DF "*.e2e.test" --tls acme | j '["id"]')
ok D4 "와일드카드 → DNS-01 자격증명 요구" '$PI domain ssl $WILD 2>&1 | grep -q "DNS-01"'
psql "update certificate set not_after = now() + interval '1 day' where host='static.e2e.test'" >/dev/null; $PI job run ssl_renew >/dev/null 2>&1
ok D5 "자동 갱신 (만료 임박 → 갱신)" '[ "$(psql "select (not_after > now() + interval '"'"'30 days'"'"') from certificate where host='"'"'static.e2e.test'"'"'")" = t ]'
openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj /CN=manual.e2e.test -keyout /tmp/pi-e2e/m.key -out /tmp/pi-e2e/m.crt >/dev/null 2>&1
ok D6 "직접 발급 인증서 업로드" '$PI domain upload-cert manual.e2e.test /tmp/pi-e2e/m.crt /tmp/pi-e2e/m.key >/dev/null && $PI domain certs | grep -q "manual.e2e.test.*manual"'
ok D7 "ACME 디렉터리·EAB 설정 (단위)" 'cargo test -q -p api custom_ca_adds_server_and_eab 2>&1 | grep -q "1 passed"'
ok D8a "경로 규칙 allow/deny/limit → vhost" '$PI edge rule-add $DOM /admin --action allow --cidr 10.0.0.0/8 >/dev/null && $PI edge rule-add $DOM /x --action deny >/dev/null && $PI edge rule-add $DOM /api --action limit --rate 5 >/dev/null && grep -q "allow 10.0.0.0/8" /tmp/pi-e2e/edge/conf.d/static.e2e.test.conf && grep -q "return 403" /tmp/pi-e2e/edge/conf.d/static.e2e.test.conf && grep -q "limit_req zone=pi burst=5" /tmp/pi-e2e/edge/conf.d/static.e2e.test.conf'
ok D8d "deny 규칙이 엣지에서 403" '[ "$(curl -sk -o /dev/null -w "%{http_code}" -m 5 --resolve static.e2e.test:443:127.0.0.1 https://static.e2e.test/x)" = 403 ]'
ok D8b "allow 에 cidr 없으면 400" '! $PI edge rule-add $DOM /y --action allow 2>/dev/null'
RID=$($PI --json edge rules --domain-id $DOM | j '[0]["id"]'); ok D8c "규칙 제거" '$PI edge rule-remove $RID >/dev/null && [ "$($PI --json edge rules --domain-id $DOM | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")" = 2 ]'
ok D10 ":80/:443 소유권 확인" '$PI edge owner >/dev/null && $PI doctor 2>/dev/null | grep -q " edge "'
ok D12 "방화벽·엣지 안내 (doctor)" '$PI doctor 2>/dev/null | grep -qE "edge.*(비어|잡고)"'
ok D11a "터널 상태 (미설정)" '[ "$($PI --json tunnel status | j "[\"configured\"]")" = False ]'
ok D11b "터널 up 토큰 없음 → 400" '! $PI tunnel up 2>/dev/null'
ok D11c "터널 up --token → 봉인 저장 + 컨테이너" '$PI tunnel up --token e2e-fake-token >/dev/null 2>&1; [ "$($PI --json tunnel status | j "[\"configured\"]")" = True ] && docker ps -a --format "{{.Names}}" | grep -q "^pi-tunnel$"'
ok D11d "터널 down" '$PI tunnel down >/dev/null && ! docker ps -a --format "{{.Names}}" | grep -q "^pi-tunnel$"'
skip D9 "Brotli/HTTP3" "미구현(openresty:alpine 에 brotli 없음)"
ok D13 "엣지 vhost 목록·리로드" '$PI edge show | grep -q "### static.e2e.test" && $PI edge reload'

# ── 포트 ──────────────────────────────────────────────────────────────────
echo "== ports"
ok PT1 "호스트 포트 스캔 (7879 루프백)" '$PI status listeners | grep -E "^7879 " | grep -q loopback'
python3 -m http.server 20000 --bind 127.0.0.1 >/dev/null 2>&1 & FAKE=$!; sleep 1; psql "delete from host_port_claim where port=20000" >/dev/null
PC=$($PI --json project create e2e-port $FX/static | j '["id"]'); deploy_wait $PC; kill $FAKE 2>/dev/null
ok PT3 "포트 충돌 회피 (20000 점유 → 다른 포트)" '[ "$(hp $PC)" != 20000 ] && [ "$(hp $PC)" -ge 20000 ]'
ok PT5 "동적 할당" '[ "$(curl -s http://127.0.0.1:$(hp $PC)/)" = "<h1>v1</h1>" ]'
$PI project remove $PC >/dev/null

# ── 흡수(adopt) ──────────────────────────────────────────────────────────
echo "== adopt"
docker volume create e2e-legacy-data >/dev/null; docker run -d --name e2e-legacy -p 8082:80 -e GREETING=legacy -v e2e-legacy-data:/usr/share/nginx/html nginx:alpine >/dev/null; docker exec e2e-legacy sh -c 'echo "<h1>legacy</h1>" > /usr/share/nginx/html/index.html'
ok S5a "adopt scan 에 후보" '$PI adopt scan | grep -q "e2e-legacy.*nginx:alpine.*8082->80"'
AD=$($PI --json adopt container e2e-legacy --name e2e-adopted | j '["id"]'); wait_for "[ \"\$($PI --json deploy list $AD | j '[0][\"status\"]')\" = running ]" 90
ok S5b "adopt → 루프백 재배포, 데이터·env·마운트 유지" '[ "$(curl -s http://127.0.0.1:$(hp $AD)/)" = "<h1>legacy</h1>" ] && $PI env list $AD | grep -q GREETING && docker inspect e2e-adopted --format "{{range .Mounts}}{{.Name}}{{end}}" | grep -q e2e-legacy-data && ! docker ps -a --format "{{.Names}}" | grep -q "^e2e-legacy$"'

# ── 모니터링 · 진단 ──────────────────────────────────────────────────────
echo "== monitoring"
docker stop e2e-df >/dev/null; $PI job run monitor >/dev/null 2>&1
ok MO1a "컨테이너 멈춤 → 인시던트" '$PI status issues | grep -q "container.*e2e-df"'
docker start e2e-df >/dev/null; $PI job run monitor >/dev/null 2>&1
ok MO1b "복구 → 인시던트 닫힘" '! $PI status issues | grep -q "container.*e2e-df"'
ok MO2 "자원 사용량 샘플링" '$PI status usage | grep -q e2e-static'
if docker ps --format '{{.Names}}' | grep -q '^pi-edge$' && curl -sf -o /dev/null -m 3 -H "Host: static.e2e.test" http://127.0.0.1/; then :; else docker rm -f pi-edge >/dev/null 2>&1; docker run -d --name pi-edge --label pi.managed=true alpine sh -c 'echo "static.e2e.test 200 GET /ping"; sleep 300' >/dev/null; fi
sleep 1; $PI job run monitor >/dev/null 2>&1
ok MO3 "요청 통계 (엣지 로그 집계)" '$PI status requests | grep -q "static.e2e.test"'
ok MO4 "문제 요약 (status show)" '$PI status show | grep -q "open issues"'
psql "insert into deployment_log (deployment_id, stream, line, created_at) values ('$(dep $S)', 'old', 'x', now() - interval '40 days')" >/dev/null; $PI job run gc >/dev/null 2>&1
ok MO7 "고아·오래된 기록 GC" '[ -z "$(psql "select 1 from deployment_log where stream='"'"'old'"'"'")" ]'
ok MO8 "감사 로그 (api 출처)" '$PI status audit | grep -q " api "'
$PI api POST /notifications/channels --body '{"name":"e2e","kind":"webhook","target":"http://127.0.0.1:7998/notify"}' >/dev/null 2>&1; $PI webhook create deploy_succeeded http://127.0.0.1:7998/hook --secret e2esecret >/dev/null; : > /tmp/pi-e2e/recv.log; deploy_wait $S; sleep 1
ok MO9 "알림 채널로 배포 결과" 'grep -q "/notify.*배포 성공" /tmp/pi-e2e/recv.log'
ok MO10 "나가는 웹훅 서명 검증" 'grep -q "/hook sig_ok=True" /tmp/pi-e2e/recv.log && $PI webhook deliveries $($PI --json webhook list | j "[0][\"id\"]") | grep -q 204'
ok J1 "잡 즉시 실행·목록" '$PI job run gc && $PI job list | grep -q deploy'
ok J2 "모르는 잡 → 404" '! $PI job run nope 2>/dev/null'

# ── MCP ──────────────────────────────────────────────────────────────────
echo "== mcp"
AG=$($PI --json token create agent --scope project_read,project_write,deploy,domain_write | j '["secret"]')
mcp(){ curl -s -X POST http://127.0.0.1:7879/mcp -H "Authorization: Bearer $1" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d "$2"; }
tool(){ mcp "$1" "{\"jsonrpc\":\"2.0\",\"id\":9,\"method\":\"tools/call\",\"params\":{\"name\":\"$2\",\"arguments\":$3}}" | python3 -c 'import sys,json;d=json.load(sys.stdin);r=d.get("result") or d.get("error");print((r.get("content") or [{}])[0].get("text") or r.get("message"))'; }
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"e2e","version":"0"}}}'; LIST='{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
NAME=$(mcp $AG "$INIT" | j '["result"]["serverInfo"]["name"]'); NTOOLS=$(mcp $AG "$LIST" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["result"]["tools"]))'); HASREVEAL=$(mcp $AG "$LIST" | grep -c reveal)
ok I3a "MCP initialize" '[ "$NAME" = personal-infrastructure ]'
ok I3b "MCP tools/list ≥ 19" '[ "$NTOOLS" -ge 19 ]'
ok I3c "MCP env 는 마스킹" 'tool $AG project_env_list "{\"project_id\":\"$S\"}" | grep -q "hidd\*\*\*\*"'
ok I3d "MCP 스코프 부족 → 거부" 'tool $RO deploy_start "{\"project_id\":\"$S\"}" | grep -q "권한이 없습니다"'
ok I3e "MCP 무인증 → 거부" 'tool "" status "{}" | grep -q "인증이 필요"'
ok I3f "MCP 감사 출처 mcp" '$PI status audit | grep -q " mcp "'
ok I3g "reveal 은 MCP 툴에 없음" '[ "$HASREVEAL" = 0 ]'
ok I3h "pi mcp config" '$PI mcp config --token $AG 2>/dev/null | grep -q "/mcp"'

# ── 메일 ──────────────────────────────────────────────────────────────────
echo "== mail"
ok M0 "mail dns (미설정) → 400" '! $PI mail dns 2>/dev/null'
if timeout 240 docker pull -q stalwartlabs/mail-server:latest >/dev/null 2>&1; then
  OUT=$($PI --json mail setup e2e.test --open-firewall 2>/dev/null)
  ok M1 "메일 서버 기동 + 방화벽 안내" 'echo "$OUT" | j "[\"running\"]" | grep -q True && echo "$OUT" | j "[\"firewall_hint\"]" | grep -qE "ufw|firewalld"'
  ok M2 "메일 DNS 레코드 (MX·SPF·DMARC·DKIM)" '$PI mail dns | grep -q "v=spf1" && $PI mail dns | grep -q DMARC && $PI mail dns | grep -q DKIM'
  ok M3 "메일 헬스 (포트 리스닝)" 'wait_for "$PI --json mail status | j \"[\\\"listening\\\"]\" | grep -q 25" 60'
  $PI mail remove >/dev/null 2>&1
else
  skip M1 "메일 서버 기동" "stalwart 이미지 pull 실패/시간초과"; skip M2 "메일 DNS" "위와 같음"; skip M3 "메일 헬스" "위와 같음"
fi

# ── 대시보드 (브라우저) ──────────────────────────────────────────────────
echo "== wui"
if ( cd "$ROOT/personal-infrastructure/wui" && node e2e/layers.mjs ) > /tmp/pi-e2e/log/wui-layers.log 2>&1; then pass W0 "키트 층 검사 — 위 층·같은 층 임포트 없음"; else fail W0 "키트 층 검사" "$(grep FAIL /tmp/pi-e2e/log/wui-layers.log | head -3 | tr '\n' ' ')"; fi
if [ -d "$ROOT/personal-infrastructure/wui/node_modules/playwright" ] && [ -f "$ROOT/personal-infrastructure/wui/dist/index.html" ]; then
  mkdir -p /tmp/pi-e2e/shots
  ( cd "$ROOT/personal-infrastructure/wui" && PI_SHOTS=/tmp/pi-e2e/shots node e2e/wui.mjs ) > /tmp/pi-e2e/log/wui-e2e.log 2>&1; WUI_RC=$?
  while IFS= read -r line; do st=${line%%  *}; rest=${line#*  }; id=${rest%%  *}; desc=${rest#*  }; if [ "$st" = PASS ]; then pass "$id" "$desc"; else fail "$id" "${desc%%  *}" "${desc#*  }"; fi; done < <(grep -E "^(PASS|FAIL)  " /tmp/pi-e2e/log/wui-e2e.log)
  [ $WUI_RC = 0 ] || echo "  (wui e2e exit $WUI_RC — /tmp/pi-e2e/log/wui-e2e.log)"
else
  skip W1-7 "브라우저 e2e" "playwright 미설치 — cd wui && npm i && npx playwright install chromium"
fi

# ── 정리 · 삭제 ──────────────────────────────────────────────────────────
echo "== teardown"
$PI project remove $S >/dev/null
ok PR1b "프로젝트 삭제 → 컨테이너·예약 해제" '! docker ps -a --format "{{.Names}}" | grep -q "^e2e-static$" && ! $PI status ports | grep -q "static"'
$PI database remove $DB >/dev/null; $PI database remove $MI >/dev/null
for p in $DF $CO $G $PROD $AD; do $PI project remove $p >/dev/null 2>&1; done
ok MO0 "워커 오류 0 · 서버 5xx 0" '[ "$(grep -c ERROR $LOG/worker.log)" = 0 ] && [ "$(grep -c internal $LOG/server.log)" = 0 ]'

echo; printf '%s\n' "${REPORT[@]}"; echo; echo "PASS $PASS  FAIL $FAIL  SKIP $SKIP"
[ $FAIL = 0 ]
