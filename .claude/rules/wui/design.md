# WUI 디자인 시스템 — 다크 분석 대시보드, 쨍한 파랑

결정(2026-09-08): 사용자가 준 다크 분석 대시보드 무드를 원자 층 전체에 반영했다. 이 문서가 `wui/` 의 **단일 진실** — 구현은 여기 적힌 토큰·컴포넌트만 쓰고, 새 값이 필요하면 코드가 아니라 이 문서에 먼저 추가한다. 뼈대는 헤드리스 **Base UI**(MIT) + 우리 스타일(`wui/src/ui/`), 살아 있는 캔버스는 `/ui`(`pages/Canvas.tsx`, 다크/라이트 토글·줌·레이어 목록).

이전 방향(Vercel 문법·Steep 액센트)은 `.claude/reference/design/{vercel,steep}.md` 에 원본만 남는다.

## 층 — 상위는 하위의 집합이다 (사용자 결정 2026-09-08, 예외 없음)

`wui/src/ui/` 의 모든 컴포넌트는 아래 층 중 하나에 속하고, **자기보다 아래 층의 것만 조합**한다. 새 스타일을 상위 층에서 그리지 않는다 — 점이 필요하면 `Dot`, 아이콘이 필요하면 `Icon`, 정사각 버튼이 필요하면 `IconButton`, 표면이 필요하면 `Card`. 각 파일의 `[원자]`/`[분자]`/`[유기체]` 주석과 캔버스 보드 라벨의 `A = B + C` 가 진실이다. 기존 것을 못 쓰는 모양이 나오면 상위에서 우회하지 말고 하위 층에 원자를 추가한다.

| 층 | 뜻 | 구성원 |
|---|---|---|
| 0 토큰 | 값 | 색·타이포·radius·간격·모션(`index.css`), 아이콘 세트(`0-tokens/icon.tsx`), 클래스 레시피 `POPUP`/`ITEM`/`SEG`/`SEG_SM`(`0-tokens/recipes.ts`), 순위 색 `NOW`/`RANK`(`0-tokens/rank.ts`), 상태 톤 맵 `TONE`/`Tone`/`toneOf`(`0-tokens/tone.ts` — Dot·Badge·StatusDot·Notice·Toast 가 공유하므로 원자보다 아래) |
| 1 원자 | 토큰만으로 그린다 | Button(square 포함)·Spinner(CSS 원)·Link·Container·Input·Textarea·Switch·RadioGroup·Slider·Progress·Dot·Badge·Tile·Avatar·Kbd·Code·InlineCode·Mono·Skeleton·Separator·Track·SlideTrack·Card·Callout·Sparkline·Donut·Gauge·Tooltip |
| 2 분자 | 원자의 조합 | IconButton = Button + Icon · IconText = Icon + 텍스트 · SearchInput = Input + Icon · Field = 라벨 + 컨트롤 · Checkbox = 상자 + Icon · StatusDot = Dot + 텍스트 · Select = Input 트리거 + Icon + POPUP · Combobox = Input + IconButton×2 + POPUP · NumberField = IconButton + Input + IconButton · Tabs/FilterTabs/ToggleGroup = SlideTrack + SEG · Chip = 텍스트 + IconButton · Pagination = Track + IconButton + Button · Breadcrumb · Notice = card-2 + Dot · DotMatrix = Dot 격자 · ListRow = Tile + 텍스트 + 값 · Stat = Card + 숫자 · StatTrend = Card + Badge(Icon) + Sparkline · Menu = POPUP + MenuItem · Popover = POPUP + 텍스트 · Dialog = Card + Button · ConfirmDialog = Dialog + Button · Accordion = Card + Icon · Toast = POPUP + Dot + IconButton · Toolbar · EmptyState · LogViewer = Card + StatusDot + terminal · **2026-09-08 추가(조사: shadcn·Tremor·Base UI 목록과 대조)** ButtonGroup = Button 이어붙임 · AvatarGroup = Avatar 겹침 + N · Meter = Base Meter 칸 + StatusDot 범례 · Tracker = 톤 막대 + Tooltip · Steps = 단계 원(Icon) + 선 · Timeline = Dot + Mono + 글 · KeyValue = 라벨 + Mono 값 · CopyField = Input + IconButton(copy→check) · RadioCards = 카드 라디오 + Icon · Fieldset = Base Fieldset · Sheet = Card(Dialog, 오른쪽 enter-side) + IconButton · Command = Dialog + SearchInput + ITEM(Icon·Kbd) · **Tailwind Plus Application UI 대조(2026-09-08)** InputGroup = 접두/접미 + Input + 끝 슬롯 · FormRow/FormActions = 두 열 폼 · ActionPanel = Card + 제목/설명 + 동작 · NavList = 세로 내비(Icon·개수) · SectionHeading = 제목 + 설명 + 동작 + line · List = Card + line 으로 나눈 ListRow · Calendar = 월 격자 + IconButton + Dot(오늘은 accent 글자, 선택은 accent 채움) |
| 3 유기체 | 분자·원자를 한 목적으로 묶은 카드/바 | TopBar = Card + Avatar + SearchInput + StatusDot(기초 유기체 — AppShell 이 쓴다) · PageHeading = Breadcrumb + 제목 26 + IconText 메타 + 동작 · **SideNav = Avatar + Tile + NavList + Dot + Separator**(한 열에 프로젝트와 고른 것의 항목) · **AppShell = SideNav + 본문**(2026-09-09 확정: 왼쪽 240 한 열 + 본문, 상단 바 없음) · SignInCard = Card + Field + Button · **ResourceBand = 제목·FilterTabs(sm) + AreaChart + 가로 쌓은 띠 + 상위 3 행**(2026-09-09 확정) · ResourceBands = 카드에 띠를 line 으로 쌓음 · **DeviceList = Card + 장치 행(이름 · 사용량/총량 + Progress · Sparkline + 축 라벨)** · TopProjects = Card + IconButton + ListRow×3 · EdgeRequests = Card + display + Gauge + Separator + StatusDot + DotMatrix · RecentDeploys = Card + FilterTabs + ListRow + Badge + IconText + Donut |
| 4 템플릿 | 유기체의 배치 — 전부 1280×800 프레임 + AppShell("템플릿 규격" 절) | Analytics(홈: AppShell + PageHeading + TopProjects | EdgeRequests + RecentDeploys) · DetailScreen(AppShell + PageHeading + Tabs + KeyValue·Steps·Meter·Timeline 카드) · SettingsScreen(AppShell + PageHeading + NavList + FormRow 폼 + ActionPanel + FormActions) — `4-templates/` |

**파일 구조가 곧 층이다(2026-09-08 분리·정렬)**: `wui/src/ui/{0-tokens,1-atoms,2-molecules,3-organisms,4-templates}/` — 디렉터리 번호가 층, 파일 하나에 컴포넌트 하나(Button+Spinner, Code+InlineCode+Mono, Track+SlideTrack, Menu+MenuItem…, Dialog+ConfirmDialog 처럼 짝만 같은 파일). 임포트는 항상 `@/ui/<층>/<이름>` 절대 경로라 파일만 봐도 무엇이 무엇 위에 놓이는지 보인다. 위 층을 임포트하면 규칙 위반. 같은 층은 **기초 분자** 다섯(IconButton·StatusDot·IconText·SearchInput·Field)만 다른 분자가 쓸 수 있고, 기초 분자끼리는 서로 안 쓴다(순환 없음). `npm run layers`(`wui/e2e/layers.mjs`)가 이걸 검사한다. `index.ts` 도 같은 순서로 재수출한다. 캔버스 `/ui` 는 이 순서(0 → 4)로 세로 배치되어 있고, 섹션 안은 **묶음**(컨트롤 · 표시 · 바탕 · 차트 · 팝업 · 세그먼트/내비 · 표면 · 셸 · 카드)으로 다시 나뉜다 — 묶음 머리(이름 + 개수) 아래 컴포넌트, 변형은 24 로 붙고 컴포넌트 56, 묶음 80, 섹션 96. 보드 라벨은 `이름 / 변형` 만(긴 설명·조합식 없음 — 조합은 이 문서와 파일 머리 주석에), **한 행에는 같은 컴포넌트의 변형만** 놓고 다른 컴포넌트는 세로로 내린다(사용자 요청 2026-09-08). 모션 보드의 데모도 한 줄에 한 컴포넌트. `Canvas.tsx` 의 ITEMS 배열도 같은 순서로 정렬해 두었다(사용자 요청 2026-09-08 "ui page 에서 정리"). 캔버스 `/ui` 는, 위에서 아래로 읽으면 쌓이는 순서가 보인다. 테마 토큰은 `@theme inline` 이라 `data-theme` 를 어느 상자에 걸어도 그 안에서 다시 풀린다(템플릿의 라이트 미리보기가 이걸 쓴다).

## 원칙

1. **깊이는 바탕 단계로.** `bg → card → card-2 → card-3` 네 단계가 위계의 전부. 테두리·그림자 없음(팝업만 `line` 링 1px). card-2 바탕 위에 또 card-2 컨트롤이 놓이면 묻히므로, 그런 영역(팝업·열린 아코디언 항목)은 `surface-2` 로 안쪽 토큰을 한 단계씩 올린다(`--card-2 → c3`, `--card-3 → c4`) — 입력은 card-3, hover 는 card-4 로 보인다. 원시 값은 `--c2/--c3/--c4`(2026-09-08 정밀 검수). Track(세그먼트 트랙)과 NumberField 트랙도 surface-2 — 안의 ghost 버튼 hover(card-2)가 트랙과 같은 색이라 보이지 않던 것. 규칙: **card-2 컨테이너 안에 hover/입력을 두면 컨테이너에 surface-2**.
2. **적당히 둥글다.** 카드 16 · 타일 10 · 컨트롤·버튼 10 · 팝업 12 (사용자 결정 2026-09-08: pill 은 동글동글해서 싫고, 6 이하는 딱딱해서 싫다). 원형은 아바타·스위치·점·도넛·페이지 번호처럼 본래 원인 것만.
3. **큰 숫자가 주인공.** 지표는 54px 디스플레이, 부연은 15px mute. 표는 행 64px 로 여유 있게, 이름은 17px.
4. **액센트는 쨍한 파랑 하나.** `accent #3d7bff`(라이트 `#2563eb`)가 primary 버튼·활성 세그먼트·스위치·도넛·포커스 링·콜아웃 틴트를 전부 진다. 바탕도 살짝 파란 기(다크 `#0b0d12`, 라이트 `#eef2f9`). 상태 넷(info·good·warn·bad)과 타일은 **솔리드 원색 + 흰 글자(good·warn 위는 ink)** — 파스텔 틴트(`색/15`)는 쓰지 않는다(사용자 결정 2026-09-08). 배지·타일·콜아웃·danger 버튼 전부 솔리드 채움. 그라데이션은 게이지 하나(`--gauge`, 시안→파랑→보라)에만. 700 굵기 없음.
5. **다크가 기본, 라이트는 같은 구조의 반전.** 값은 전부 CSS 변수(`:root` 다크, `[data-theme="light"]`)라 컴포넌트는 테마를 모른다.
6. **상태는 점 + 텍스트.** 배지는 아이콘이 들어갈 자리가 있을 때(스택·레벨)만. 파괴적 동작은 항상 확인 모달.
7. **모노는 기술 값에만.** 포트·커밋·경로·명령·로그·캔버스 라벨.

## 확정 문법 — 데이터를 보여 주는 모든 것 (사용자가 직접 다듬은 `ResourceBand`·`DeviceList` 에서, 2026-09-09)

이 둘은 사용자가 한 줄씩 직접 깎아 확정한 컴포넌트다. 여기서 나온 규칙이 **데이터 표시 전반의 기준**이다. 새 컴포넌트는 이 여덟을 먼저 통과해야 한다.

1. **같은 말을 두 번 하지 않는다.** 막대가 비율을 말하면 `%` 를 쓰지 않고, 그래프가 기울기를 말하면 `+0.7 GB/day` 를 쓰지 않는다. 카드 부제가 행을 세는 정도면(`3 mounts …`) 지운다. 지운 순서가 곧 우선순위였다 — 부제 → 부속 줄(`/ · nvme0n1p2`) → 퍼센트 → 증가량 캡션.
2. **한 행의 숫자는 둘까지.** `DeviceList` 는 사용량과 총량만 남겼다. 셋째 숫자가 필요하면 그건 다른 화면의 일이다.
3. **한 행의 크기는 15 / 13 둘뿐.** 이름·소제목·값은 15(제목은 500), 부속 줄과 라벨은 13. 17(`body-lg`)은 행에서 쓰지 않는다 — ListRow·Accordion·ActionPanel·Fieldset·Popover·Callout·Tile 이 2026-09-09 에 이 크기로 내려왔다. 행 안의 배지·타일도 행을 따라 sm(32·36)으로.
4. **제목은 세우고 부속은 눕힌다.** 제목 15/500 `text-text`, 부속·축 라벨 11/16 또는 caption `text-mute`. 값은 제목과 같은 크기(15/500)로 두고 **색으로만** 구분한다 — 크기를 키우면 행이 요란해진다.
5. **색은 하나만 도드라진다.** 주인공(현재값·전체)은 `NOW`(accent 파랑), 나머지 순위는 `RANK` 무채색에 가까운 파랑 그라데이션. 상태 색은 임계로만 붙인다 — `usageTone(pct)`(60% 주의 · 80% 경고)를 숫자·막대·그래프가 **같이** 쓴다.
6. **면은 한 시리즈일 때만.** 선이 겹치면 면을 끄고 선만 그린다(`fill: false`). 겹치지 않는 작은 시계열(Sparkline)은 면을 유지한다.
7. **로컬 토글은 제목 바로 오른쪽, 제목보다 작게.** `FilterTabs size="sm"`(SEG_SM 24). 페이지 머리로 올리지 않는다 — 그 값이 바꾸는 것 옆에 둔다.
8. **여러 그래프는 양 끝을 맞춘다.** 눈금 열 36, 값 열은 규격 고정폭. 라벨 길이에 따라 그래프 시작·끝이 흔들리면 목록이 어긋나 보인다. 축 설명은 그래프마다 양 끝에(`30d ago` → `now`) — 열 머리로 한 번만 적으면 행 단위로 읽을 때 그 자리에 없다.

세로 리듬도 둘이 같다: 제목 줄 `h-7` → 내용 `mt-4`, 행 안쪽 `p-5 sm:p-6`(카드와 같음), 열 사이 24, 2열 전환은 창 `lg`.

## 토큰 (`wui/src/index.css`)

### 색

| 토큰 | 다크 | 라이트 | 쓰임 |
|---|---|---|---|
| `bg` | `#0b0d12` | `#eef2f9` | 페이지 |
| `card` | `#141821` | `#ffffff` | 카드·모달·사이드바 |
| `card-2` | `#1b2130` | `#e6ebf4` | 입력·배지·pill 트랙·메뉴·코드 블록·알림 |
| `card-3` | `#262e40` | `#d8dfec` | hover·선택·스위치 트랙·도넛 트랙·꺼진 점 |
| `c4` | `#313a50` | `#c9d2e2` | surface-2 안의 hover(card-3 가 여기로 올라간다). 유틸 없음 — `surface-2` 가 쓴다 |
| `text` / `body` / `mute` | `#f1f4fa` / `#c3cad8` / `#8a93a8` | `#0f172a` / `#334155` / `#566580` | 제목·본문·보조. **유틸은 `text-text` / `text-sub` / `text-mute`** — `body` 색의 유틸을 `text-body` 로 두면 글자 크기 `text-body`(15px) 와 이름이 겹쳐 색이 이기고 크기가 안 먹는다(2026-09-08 라이트 검증에서 발견) |
| `ink` | `#0b0d12` | 같음 | **밝은 솔리드(good·warn) 위 글자** — 흰 글자는 초록 2.6 · 주황 2.1 로 안 읽혀서 배지 running/progress 는 ink(대비 검수 2026-09-08). failed·info·accent 위는 white |
| `white` | `#ffffff` | 같음 | 솔리드 채움(accent·bad·info 배지·타일·콜아웃·danger·체크 표시) 위 글자. `--color-*: initial` 로 Tailwind 기본 팔레트를 지우면 `white` 도 사라지므로 **반드시 다시 선언** — 빠지면 `text-white` 가 없는 클래스가 되어 라이트에서 파란 타일 위에 검은 글자가 뜬다 |
| `popup` | `#1b2130`(= card-2) | `#ffffff`(= card) | 메뉴·셀렉트·콤보박스·팝오버·토스트 바탕. 다크는 한 단계 위, 라이트는 회색 바탕 위에 흰 카드로 떠 보이게 |
| `line` | `#262e40` | `#dbe2ee` | 팝업 링, 섹션 구분 |
| `pill-on` / `on-pill` | `#3d7bff` / `#ffffff` | `#2563eb` / `#ffffff` | primary 버튼·활성 세그먼트·툴팁 (이름은 그대로, 모양은 10px) |
| `accent` | `#3d7bff` | `#2563eb` | 스위치 손잡이·도넛·포커스 링·콜아웃 틴트 |
| `info` / `good` / `warn` / `bad` | `#3d7bff` / `#12b76a` / `#f59e0b` / `#ef4444` | `#2563eb` / `#0f9d58` / `#d97706` / `#dc2626` | 점·배지(솔리드, 흰 글자)·delta / running / 진행 / 실패·파괴·danger 버튼 |
| `now` | `#3d7bff` | `#2563eb` | **현재값 = 전체**(2026-09-09) — 시계열의 합계 선, 오른쪽 현재값 숫자, 쌓은 띠의 나머지 칸. accent 와 같은 파랑이지만 이름이 뜻을 말한다 |
| `rank-1…3` | `#6b7c99` / `#8d9cb5` / `#b0bcd0` | `#64748b` / `#8593a8` / `#a7b2c2` | **순위 색**(2026-09-09) — 상위 1·2·3 을 무채색에 가까운 파랑에서 점점 옅게. 현재값(파랑)만 도드라진다. 색이 종류가 아니라 순위를 말할 때(리소스 띠·저장 장치 카드) |
| `usageTone` | — | — | 사용률 → 상태(60% warn · 80% bad). 색은 `usageColor()`, 서식은 `formatGB()`(`lib/format.ts`) |
| `tile-a…d` | `#2f6bff` / `#0ea5e9` / `#7c3aed` / `#14b8a6` (솔리드) | `#2563eb` / `#0284c7` / `#6d28d9` / `#0d9488` | 아이콘 타일·아바타, 흰 글자 |
| `terminal` | `#080a0f` | `#0f172a` | 로그 뷰어 |
| `--gauge` | `linear-gradient(90deg,#22d3ee,#3d7bff 55%,#8b5cf6)` | `#0891b2 → #2563eb → #6d28d9` | 게이지 채움(글자는 흰색). 라이트는 시안을 한 단계 눌러 흰 글자가 읽힌다 |

### 타이포

Geist(본문·숫자) · Geist Mono(기술 값) · Pretendard 한글 폴백. 굵기 400·500 만(600 은 안 쓴다).

| 역할 | 크기/행간 | 굵기 | 쓰임 |
|---|---|---|---|
| `display` | 54/1 · -1px | 500 | 지표 값 |
| `title-lg` | 26/32 | 500 | 페이지 제목(PageHeading)만. 카드 제목은 아이콘이 있어도 22 — 화면마다 카드 크기가 달라 보이던 원인(2026-09-08) |
| `title` | 22/28 | 500 | 카드·모달 제목 |
| `body-lg` | 17/24 | 400·500 | 상단 바 이름 정도. **행 이름·카드 안 소제목은 `body` 15** — 2026-09-09 확정 컴포넌트(`DeviceList`) 크기로 통일 |
| `body` | 15/22 | 400·500 | **기본** — 버튼·입력·표·메뉴 |
| `caption` | 13/18 | 400 | 라벨·컬럼 머리·힌트 |
| `code` | 13/20 mono | 400 | 기술 값 |

### 모양 · 간격

- radius: `card 16` · `tile 10` · `control 10`(입력·메뉴 항목) · `button 10`(버튼·세그먼트·검색·칩·툴팁) · `popup 12`(메뉴·팝오버·토스트) · 배지 8 · kbd 6. 원형(`full`)은 아바타·스위치·점·도넛·페이지 번호만.
- 높이: 버튼 40(sm 32, icon 48 원형) · 입력 44(dense 36) · 검색 40 · 배지 36 · 표 행 72(dense 56) · 세그먼트 트랙 40(칸 32 + p-1) — 버튼과 같은 높이. 카드 안 로컬 토글은 SEG_SM 트랙 24(칸 16).
- **데이터 행의 치수(2026-09-09 확정, `ResourceBand`·`DeviceList` 기준)**: 카드 안 소제목 줄 **28**(`h-7`) · 그 줄 옆 작은 세그먼트 **24**(SEG_SM) · 띠 그래프 **64** · 목록 스파크라인 **32** · 막대(Progress·쌓은 띠) **8** · 순위 점 **6** · 눈금 열 **36** · 현재값 열 **88** · 이름 열 **112–180** · 오른쪽 목록 열 **160–280**. 그래프·값 열은 **고정폭**이라 여러 행의 그래프 양 끝이 같은 x 에 선다.
- 간격은 아래 "간격 — 역할별 척도" 를 따른다. 페이지 여백 20–24.
- 그림자 없음. 팝업·모달만 `ring-1 ring-line`. 모달 배경은 `bg/70` + blur.

## 간격 — 역할별 척도 (사용자 요청 2026-09-08: 나열·열림/닫힘 전부 정의)

숫자는 관계를 말한다. **같은 관계면 어디서나 같은 숫자**, 다른 관계면 다른 숫자. 캔버스 토큰 섹션 "간격" 보드가 이 표를 그대로 그린다.

| px | 관계 | 쓰는 곳 |
|---|---|---|
| 2 | 한 몸 안의 틈 | NumberField 트랙 `p-0.5`(44 안에 40 버튼) · Combobox 버튼 둘 사이 |
| 4 | 같은 컨트롤 안 부품 | Track `p-1` · 아코디언 항목 `p-1` · 페이지 번호 사이 · Kbd 짝 · 제목↔부제 `mt-1` · 토스트 제목↔설명 |
| 6 | 팝업 안쪽 | Menu·Select·Combobox 팝업 `p-1.5`. 항목(40)은 간격 없이 붙여 쌓는다, 구분선은 `my-1.5` |
| 8 | 아이콘↔글자 · 라벨↔컨트롤 · 팝업↔트리거 | IconText · StatusDot · Button 안 아이콘 · Field 라벨/힌트 · Breadcrumb `/` 양옆 · 모든 팝업 `sideOffset 8` · 아코디언 Card `p-2` · 아코디언 항목 사이 |
| 12 | **같은 요소 나열** | 버튼 줄 · 배지 · 칩 · 라디오 항목 · Notice 쌓기 · 툴바 안 · 모달 바닥 버튼 · 토스트 사이 · 체크 상자↔라벨 · 카드 헤더 icon↔title |
| 16 | **다른 요소 나열 · 행 안** | ListRow 의 타일↔글↔값 · 폼 필드 사이 · 카드 헤더 제목↔액션 · Stat/StatTrend 라벨↔값 `mt-4`, 값↔보조 `mt-3` · Toast `p-4` |
| 20 | 카드 안 행 사이 · 카드 사이 | ListRow 쌓기 `space-y-5` · Progress 쌓기 · 카드 격자 `gap-5` · 툴바↔목록 `mb-5` · Popover `p-5` |
| 24 | 카드 안쪽 · 헤더↔본문 · 라벨 있는 인라인 컨트롤 나열 | Card `p-6` · 헤더 `mb-6` · Tabs↔패널 `pt-6` · Dialog 본문 위 · 스위치·체크 줄 `gap-6` · 토스트 화면 가장자리 |
| 32 | 카드 안 큰 묶음 사이 | 지표↔게이지 · 게이지↔점 행렬 · Dialog 본문↔바닥 `mt-8` |
| 48 | 섹션 사이(앱 페이지) | 페이지 머리↔첫 카드 · 큰 묶음 사이. 캔버스는 56(다른 컴포넌트)/96(섹션) |

**카드 안 목록은 리듬 둘 중 하나**(2026-09-09 정리) — (a) **20 간격으로 쌓기**: 행이 스스로 여백을 갖지 않는 큰 행(타일이 있는 `ListRow`, TopProjects·RecentDeploys). (b) **line 으로 나누고 행마다 위아래 16**: 데이터 행(`DeviceList`·`List`). (b) 에서는 **첫 행의 위와 끝 행의 아래 여백을 지운다**(`[&>*:first-child]:pt-0 [&>*:last-child]:pb-0`) — 카드 안쪽 24 와 겹치면 머리 아래가 40 이 되어 다른 카드와 어긋난다. 행 자체가 카드 여백을 대신하는 경우(`ResourceBands`)는 카드를 `pad="p-0"` 으로 두고 행이 20/24 를 가진다.

**나열 규칙** — 가로 나열은 `flex gap-*`, 세로 나열은 `space-y-*`. 같은 요소는 12, 다른 요소는 16, 카드 안 행은 20, 라벨 달린 인라인 컨트롤은 24. 나열의 첫/끝에 바깥 여백을 따로 주지 않는다(컨테이너 여백이 담당).

**열림·닫힘 상태** — 팝업(Menu·Select·Combobox·Popover·Tooltip)은 **항상 트리거 아래 8px**, 트리거를 덮지 않는다(Select 도 `alignItemWithTrigger={false}`). 팝업 폭은 트리거 폭 이상(`min-w anchor`), Combobox 는 트리거 폭과 같다. 아코디언 패널은 열리면 트리거 글자와 같은 x(`px-3`)에서 위 12 · 아래 12(`pt-3 pb-3`) — 트리거 hover 상자와 내용이 떨어져 보인다. 열린 항목 전체가 card-2 블록(p-1)이 된다. 닫히면 높이 0 이라 항목 간격 8 만 남는다. SectionHeading 은 아래 24(`mb-6`)를 스스로 가진다(Card 헤더와 같음). LogViewer 의 terminal 은 Code 와 같은 안쪽 16. Tabs 패널은 세그먼트 아래 24. 토스트는 우하단 24 에서 시작해 12 간격으로 쌓인다. 모달은 화면 가운데, 폭 480/640, 안쪽 24.

**안쪽 여백 요약** — 팝업 목록 6 · 칩/배지 좌우 16(sm 12) · 버튼 좌우 20(sm 16) · 입력 좌우 16 · Notice 20/16 · Code 16 · Popover 20 · Toast 16 · Card 24 · Callout 24 · 아코디언 행 16.

## 컴포넌트 (`wui/src/ui/`)

- **Button** `primary`(accent) · `secondary`(card-2) · `ghost` · `danger`(bad 솔리드, 흰 글자) · `busy` 스피너 · `size` md 40 / sm 32. 아이콘은 `<Icon size="sm" />` 을 앞에.
- **IconButton** — 아이콘 하나만 담는 정사각. sm 32(아이콘 16) · md 40(20) · lg 48(24), 같은 10px, 같은 variant 넷, `label` 필수(aria-label + title). 원형 아이콘 버튼은 없다.
- **Input / Textarea / Field / SearchInput** — card-2, 12px, 테두리 없음, focus accent 링, 오류는 bad 링 + caption. 검색은 pill.
- **Select** — 입력과 같은 모양, 팝업은 메뉴와 같은 16px card-2 + line 링, 체크는 accent.
- **Switch** — 44×24, 손잡이 accent. `boxed` 면 card-2 pill 안에 라벨과 함께(원본 "Insights").
- **Tabs / FilterTabs / ToggleGroup** — 트랙 40(칸 32, 2026-09-09 리소스 기준으로 48 → 40) 의 `SlideTrack`(card-2 트랙 + 활성 칸을 따라 미끄러지는 accent 핀) 위의 SEG. 활성은 `aria-pressed`/`aria-selected`/`data-pressed`/`data-active`(Base Tabs)/`data-selected` 로 찾는다. Tabs 의 선택 글자색도 `data-[active]` — `data-selected` 로 두면 mute 글자가 accent 위에 남는다(2026-09-08 사용자 지적). 밑줄 탭은 없다. **FilterTabs `size="sm"`**(2026-09-09) 은 `SEG_SM` — 트랙 안 16, 바깥 24, 11/16, 칸은 `flex-1` 같은 폭. 제목 옆에 붙는 로컬 토글용이라 제목보다 작다. 카드 안 값 옆의 합·읽기·쓰기 같은 로컬 토글에.
- **Dot / StatusDot / Badge / Tile** — 점 8px(progress 맥동), StatusDot = Dot + body; 배지 md 36 · sm 32(caption) 8px 솔리드(idle 만 card-3); 타일은 **단색(accent)** md 48/10px · sm 36/8px, 흰 이니셜 또는 아이콘.
- **Card** — 16px card, 안쪽 24(좁으면 20). **여백은 `pad` prop 으로 바꾼다** — `className="p-0"` 은 안 먹는다(2026-09-09): `cn` 은 단순 이어붙이기라 기본값의 `sm:p-6` 이 미디어 쿼리 안에 있어 뒤에 온 `p-0` 을 이긴다. 목록 컨테이너는 `pad="p-0"`, TopBar 는 `pad="px-4 py-0 sm:px-6"`, 제목 22(아이콘 있으면 26) + 부제 mute, 우측 액션. 모든 표면(Stat·StatTrend·Accordion·LogViewer·Dialog·TopBar)이 이걸 쓴다. `flush` 없음.
- **Stat** — card 안 caption → 54px display → note + delta(info).
- **Gauge / Donut / DotMatrix** — 게이지 64px 그라데이션 + 남은 구간 card-2; 도넛 36 accent; 점 행렬 7열 info/card-3.
- **Callout** — accent 솔리드 16px 흰 글자, 페이지당 하나. **Notice** — card-2 10px + Dot(progress·failed·info).
- **표는 없다** — 목록은 `Card` 안에 `ListRow`(타일 + 제목/부제 + 값)를 쌓는다(사용자 결정 2026-09-08). 기술 값은 `Mono`, 목록 위 도구 줄은 `Toolbar`.
- **Menu / Dialog / ConfirmDialog / Tooltip** — popup 바탕 12px 링 / card 16px 링 / 반전.
- **Code / InlineCode / LogViewer** — card-2 14px; 로그는 카드 안 terminal, 스트림 라벨 고정폭, 오류 `#ff8a95`, 감사 good.
- **EmptyState / Skeleton** — 카드 안 22px 제목 + mute; 스켈레톤 card-2.
- **Checkbox / RadioGroup** — 24px, card-3 바탕, 체크되면 accent 채움 + 흰 표시. 라디오는 힌트 줄을 가질 수 있다.
- **NumberField** — card-2 트랙 안에 IconButton(−) / Input(mono, 천 단위 구분 없음) / IconButton(+). 포트·CPU·메모리.
- **Slider** — 트랙 card-3 8px, 채움 accent, 손잡이 흰 20px + accent 링, 우측에 mono 값.
- **Progress** — 8px 트랙, 톤(accent/good/warn/bad) 채움, 위 줄에 라벨·값.
- **Combobox** — 입력과 같은 모양 + 지우기/열기 버튼, 팝업은 메뉴와 같다. 프로젝트·도메인 고르기.
- **Track / ToggleGroup / Chip / Kbd / Separator** — Track(card-2, p-1) + SEG 칸이 모든 세그먼트의 바탕; 칩 36(active 는 accent, IconButton(close) 로 제거); kbd 는 card-3 8px mono; 구분선은 line.
- **SideNav / AppShell**(2026-09-09 확정 — Layout Lab X4) — 셸은 **왼쪽 한 열 240 + 본문**. 열 안에서 브랜드 → 프로젝트 목록 → (고른 프로젝트 아래에서만) 항목 → System 묶음 → **프로필 줄** 순. 프로필 줄은 다른 행과 같은 문법(아바타 32 + 이름 15/500 + 부연 13 + 끝 슬롯)이고 끝 슬롯에 Menu(설정·비밀번호 변경·로그아웃)를 건다. 호스트 상태는 사이드바에 두지 않는다 — Edge 구역이 이미 말한다(2026-09-09). 고른 프로젝트의 항목은 세로선(`border-s`)으로 소속을 보이고 `unfold` 로 열린다. 상단 바는 셸에서 빠졌다(TopBar 는 로그인·외부 화면용으로 키트에 남는다). 좁은 화면(< lg)에서는 사이드바가 위로 올라간다.
- **Avatar / Breadcrumb / Pagination / TopBar** — 아바타 accent 원 + 흰 이니셜; 브레드크럼 `/` mute; 페이지네이션 = Track + IconButton(‹ ›) + Button(square, 현재만 primary); 상단 바 = Card 64px(로고 Avatar 24 · 가운데 SearchInput · 우측 StatusDot·Avatar).
- **Meter** 는 칸에 `tone` 또는 `color`(Progress 와 같은 문법)를 받고 `format` 으로 합계 표기를 바꾼다.
- **ButtonGroup / AvatarGroup / Meter / Tracker / Steps / Timeline / KeyValue / CopyField / RadioCards / Fieldset / Sheet / Command** (2026-09-08 조사 후 추가 — shadcn: Button Group·Command·Sheet·Item, Tremor: Category Bar·Tracker, Base UI: Meter·Fieldset 에서 가져와 우리 문법으로) — 버튼 묶음은 card-2 한 덩어리에 사이 line; 아바타 겹침 `-ms-2` + `ring-card`, 넘치면 `+N` card-3; Meter 는 card-3 트랙에 톤 칸 + StatusDot 범례 + mono 합계; Tracker 는 h-8 막대(good·warn·bad·card-3) + Tooltip; Steps 는 24px 원(done accent+check, current card-3+accent outline, failed bad+close, upcoming card-3) + 선(line, done 은 accent); Timeline 은 line 위에 Dot(ring-bg) + Mono 시각 + 제목/설명; KeyValue 는 `[160px_1fr]` 정의 목록, 기술 값 Mono; CopyField 는 readOnly mono Input + copy→check IconButton(1.5s); RadioCards 는 card-2 카드가 선택되면 card-3 + 우상단 accent 원 check, pressable; Fieldset 은 title 17/500 + 힌트 + `space-y-4`; Sheet 는 화면 오른쪽 inset 12 의 Card(420/640) enter-side + 닫기 IconButton; Command 는 위쪽 96 의 popup 레시피 + SearchInput + ITEM(Icon·라벨·힌트·Kbd), ↑↓ Enter Esc.
- **Popover / Accordion / Toast** — 팝오버 popup 바탕 12px 링 288px; 아코디언은 Card(p-2) 안에 항목(p-1, 10px)을 8px 간격으로 쌓고 line 없음, 화살표 flip-open. 항목 안의 트리거 행은 px-3 py-3, 8px 둥글기, hover card-3. **열린 항목은 card-2 블록**(`data-open`, 안쪽 토큰은 surface-2)이 되고 그 안에서 트리거 hover 상자와 내용 사이 12, 내용과 블록 바닥 12, 내용은 트리거 글자와 같은 x 에 놓인다 — 사용자 요청(2026-09-08): 토글됐을 때 요소 사이에 여백이 있어야 한다; 토스트는 우하단 card-2 링 + 유형 점(success good · error bad · warning warn · 기본 accent), `useToast().add({ title, description, type })`.
- **AreaChart** — 시계열 면 그래프. `annotate` 면 축 눈금·격자 대신 최고(점선 + 점 위 라벨)·최저(그래프 아래 라벨)·지금 점 후광을 그린다. 눈금 라벨은 격자선 높이에 **중심을 맞춰** 절대 배치한다(flex justify-between 은 첫·끝 라벨이 선에서 벗어난다 — 2026-09-09 수정). `nowLabel`(+`nowColor`/`nowClass`)은 그래프 오른쪽에 마지막 점 높이로 현재값을 세운다 — 부연 줄은 없다(2026-09-09). 눈금 열(`axisWidth` 36)과 현재값 열(`nowWidth`)은 **고정폭**이라 여러 그래프의 양 끝점이 같은 x 에 선다. 절대 배치로 두면 라벨 길이(100% vs 2000G)만큼 시작점이 어긋난다. `legend={false}` 면 아래 범례를 끈다 — 오른쪽 목록이 범례일 때. `limit={{ value, label }}` 은 상한(용량)을 점선 + 오른쪽 라벨로 긋고 눈금 top 을 그 값까지 올린다. 시리즈에 `dash` 를 주면 점선 — 예측 구간을 실제 선 뒤에 깔 때(2026-09-09).
- **DeviceList**(2026-09-09 확정 — StorageLab V1 승격) — 마운트된 저장 장치 한 줄씩: 이름 180 · 막대 위 왼쪽에 사용량 오른쪽에 총량 · 오른쪽 160 에 변화 스파크라인과 축 양 끝(`30d ago` → `now`). 색은 사용률이 정한다 — 60% 넘으면 warn, 80% 넘으면 bad, 숫자·막대·그래프가 같은 색. 장치가 늘어도 줄만 늘고, 종류별 구성은 StorageCard, 지금 흐르는 양은 ResourceBand 가 맡는다.
- **ResourceBand / ResourceBands**(2026-09-09 확정 — Lab 의 S1 Base · Ticks 규격을 승격) — 띠는 **제목 15/500 + 바로 오른쪽 SEG_SM 토글 → 그래프 64(눈금 열 36, 오른쪽 끝 현재값 열 88) → 가로 쌓은 띠 8 + 상위 3 행 11/16**. 2열은 창 `lg`(1024) 이상, 카드 안쪽은 20/24. 색은 순위 — 현재값 `NOW`, 상위 1·2·3 `RANK`. 면(fill) 없이 선만. `bandParts()` 가 상위 n 과 몫을 만든다. 저량(장치 용량)은 DeviceList 가 맡는다 — StorageCard 는 2026-09-09 제거.
- **Sparkline / ListRow / StatTrend / IconText** — 스파크라인 160×40(`fluid` 면 폭 100%, `non-scaling-stroke`) 톤 색 + 15% 면; 아이콘 행 = Tile + 17px 제목 + mute 부제 + 우측 값(`onClick` 이 있으면 행 전체가 interactive 버튼); 추세 지표 = Card + display 값 + Badge(sm, Icon up/down) + 남는 폭을 채우는 스파크라인; IconText = Icon(sm) + mute 텍스트(날짜·스택). (육각 레이더는 제거)

## 아이콘 (`wui/src/ui/0-tokens/icon.tsx`)

**Heroicons outline(MIT) 만** 쓴다 — `<Icon name="deploy" />` 하나로, 키트·페이지 어디에도 인라인 svg 나 다른 아이콘 세트를 두지 않는다(체크·셰브론·검색·✕ 같은 작은 것도 전부 Icon). 크기 sm 16 · md 20 · lg 24, 색은 `currentColor`. **획 굵기는 크기와 무관하게 화면 1.5px** — Geist 400/500 본문 획과 같은 무게라 아이콘이 글자보다 굵거나 가늘어 보이지 않는다(24 기준 stroke 1.5 를 크기에 맞춰 역보정: 16→2.25, 20→1.8). IconButton 은 `icon="more"` 처럼 이름을 받고 버튼 크기(32/40/48)에 맞는 sm/md/lg 를 스스로 고른다. 도메인 이름 → 그림 매핑은 `ICONS` 한 곳: 도메인(project·deploy·domain·database·backup·volume·monitor·job·audit·settings·edge·route·log·secret·credential·tunnel·mail·notify·user·server·health·insight…) · 동작(play·stop·pause·restart·trash·copy·upload·logout·add·remove·more·search·filter·external) · 상태·방향(check·close·info·warning·up·down·star·clock·calendar·arrowRight·chevron*) · 캔버스(sun·moon). 새 아이콘은 여기 추가하고 캔버스 "Icon / 세트" 보드에서 확인.

## 모션 (`wui/src/index.css`)

빠르고 조용하게. 자연스러움의 규칙 셋(사용자 요청 2026-09-08 "탭 토글·체크·드롭다운 등장 더 자연스럽게"):
1. **이징은 역할별 셋.** `ease-out (.2,.8,.2,1)` 은 색·투명도. `ease-move (.32,.72,0,1)` 은 움직이는 것 전부(핀·손잡이·화살표·패널·드롭다운 scale) — 빨리 출발해 길게 안착, 바운스 없음. `ease-in (.4,0,1,1)` 은 퇴장.
2. **퇴장은 등장보다 짧다.** 등장 `base 200`, 퇴장 `exit 150` ease-in. 사라지는 것을 기다리게 하지 않는다.
3. **움직임은 출발점이 있다.** 드롭다운은 앵커 쪽(`--transform-origin`)에서 scale .96 + 4px, 토스트는 아래에서 8px, 세그먼트 핀은 이전 칸에서 미끄러져 오고 글자색은 핀이 도착하는 동안 같이 바뀐다(slow·ease-move). 체크·라디오 표시는 켜질 때도 꺼질 때도 .5 ↔ 1.

길이(사용자 요청 2026-09-08 "모든 전환 더 부드럽게" 로 한 단계 늘림): `fast 100`(hover·press 복귀·포커스 링 — 반응성은 그대로) · `base 200`(등장·손잡이·화살표·패널·줌·색 톤) · `slow 300`(값이 자라는 것·핀·테마) · `exit 150`(퇴장). 4. **상태가 바뀌는 것은 전부 전이한다.** 정적으로 보이는 점·배지·칩·텍스트 톤도 값이 바뀌면 `tint` 로 건너간다. 새로 생기는 줄·패널·스피너는 `appear`. 트리거 화살표는 `flip-open`. 테마도 크로스페이드. `prefers-reduced-motion: reduce` 면 전부 0 에 가깝게(전역 규칙, press 의 scale 도 끔). 반복 애니메이션은 pulse·spin 둘뿐이고 시차(stagger) 없음.

### 모션 원자 — 애니메이션은 이 이름으로만 (`@utility`)

상위 컴포넌트는 `transition-*`·`animate-*`·`duration-*` 를 직접 조합하지 않는다. 아래 이름 하나를 붙인다. 캔버스 "모션 원자" 보드에는 **슬로모션 ×5** 스위치(길이 토큰만 5배 — 모든 원자가 `var(--duration-*)` 를 읽으므로 100ms hover 도 눈에 보인다)와 **포커스 순회**(`focus({ focusVisible: true })` 로 키보드처럼 링을 띄운다)가 있다. hover 는 포인터로만 낸다. 캔버스 보드처럼 데모를 만들 때 **컴포넌트를 렌더 함수 안에서 정의하지 않는다** — 매 렌더마다 자식이 다시 마운트되어 전이가 전부 끊긴다(2026-09-08 에 move·check-in·grow 가 "안 되는" 원인이 이거였다). 새 움직임이 필요하면 여기에 원자를 추가한다. 캔버스 토큰 섹션 "모션 원자" 보드에 한 줄씩 살아 있다(토글·재생).

| 원자 | 길이 | 무엇이 | 쓰는 곳 |
|---|---|---|---|
| `pressable` | hover 100 · press 0 → 복귀 100 | 색 한 단계 + `:active` scale .97 + focus 링 + disabled | Button·IconButton·Switch·Checkbox·Radio·Pagination |
| `segment` | 색 slow · 나머지 pressable 과 같음 | 세그먼트 칸 — 글자색이 핀과 같이(slow·ease-move) 바뀐다 | SEG(Tabs·FilterTabs·ToggleGroup) |
| `interactive` | hover in 100 · out 200 · press 0 | card-3 바탕이 들어오고 천천히 빠짐, press 한 단계 더 깊게, focus outline, disabled | ITEM(Menu·Select·Combobox)·ListRow(onClick)·Accordion 트리거·Breadcrumb 링크 |
| `focus-in` | 색 200 ease-out (속성 하나) | offset 2px 고정 outline 의 색만 투명 → accent + transform(손잡이) | Input·Textarea·Select 트리거·Combobox 입력·Slider 손잡이(hover/잡으면 1.1). pressable/segment/interactive 의 focus-visible 도 같은 링 |
| `enter-fade` | in 200 · out 150 | opacity 0 → 1 | Dialog 백드롭 |
| `enter-drop` | in 200 · out 150 | 앵커 쪽(`--transform-origin`, `data-side`)에서 scale .96 + 4px → 제자리 | Menu·Select·Combobox 팝업·Popover·Tooltip |
| `enter-modal` | in 200 · out 150 | opacity + scale .96 → 1 | Dialog |
| `enter-slide` | in 200 · out 150 | opacity + 8px 아래 → 제자리 | Toast |
| `enter-side` | in 200 · out 150 | opacity + 오른쪽 16px → 제자리 | Sheet |
| `move` | base 200 · ease-move | transform·**translate**(Tailwind v4 의 translate-x 는 translate 속성)·background-color | Switch 손잡이(translate 20px)·Checkbox/Radio 바탕(card-3 → accent) |
| `unfold` | in 200 · out 150 — enter-drop 과 같은 문법 | 트리거 쪽에서 4px + 투명도(enter-drop 과 동일) + height 0 ↔ `--accordion-panel-height` | Accordion 패널 |
| `grow` | slow 300 · ease-move | width·height·left·grid-template-columns·stroke-dasharray | Progress 폭·**SlideTrack 핀**(left/width — Tabs·FilterTabs·ToggleGroup 공통)·Gauge 칸(fr)·Donut 호 |
| `check-in` | in 200 · out 150 | scale .5 ↔ 1 + opacity, 양방향(`keepMounted`) | Checkbox 표시·Radio 점 |
| `tint` | base 200 | background-color·color·opacity | Dot·StatusDot·Badge·Chip·Switch 라벨·Accordion 화살표 색 — 톤이 바뀔 때 |
| `flip-open` | base 200 · ease-move | 트리거가 열리면(`data-popup-open`·`aria-expanded`·`data-panel-open`) 180° | Select·Combobox·Menu·Popover 트리거의 chevron, Accordion 화살표 |
| `appear` | base 200 | fade-in 키프레임(마운트 시) | LogViewer 새 줄·Tabs 패널(값 바뀔 때 다시)·Button busy 스피너 |
| 테마 크로스페이드 | slow 300 | `html[data-theme-fade]` 동안 모든 색 전이 | 캔버스 테마 토글이 320ms 동안 붙였다 뗀다 |
| `pulse` / `spin` | 반복 | 투명도 맥동 / 회전 | Dot(progress)·Skeleton / Spinner |
| zoom (JS) | base 200 | CSS `zoom` 을 rAF 로 같은 이징 | 캔버스 ⌘±·⌘0·우하단 버튼 |

### 애니메이션이 놓일 수 있는 자리 — 전수 목록과 결정

| 컴포넌트 | 자리 | 결정 |
|---|---|---|
| Button·IconButton | hover / press / focus / busy | pressable · Spinner spin + appear |
| SEG(Tabs·FilterTabs·ToggleGroup) | hover / press / 선택 이동 | segment · 셋 다 SlideTrack 의 핀이 grow 로 미끄러진다 |
| Switch | 손잡이 이동 / 바탕 / press | move · pressable |
| Checkbox·Radio | 바탕 / 표시 등장·퇴장 / press | move · check-in(양방향) · pressable |
| Input·Textarea·SearchInput·Combobox 입력 | focus 링 / hover / 지우기 버튼 | focus-in · hover 없음 · 지우기 IconButton 은 opacity 로 나타나고 사라짐 |
| Select 트리거 | focus / 팝업 등장 / 항목 강조 / 화살표 | focus-in · enter-drop · interactive · flip-open |
| NumberField | −/+ press / 값 변화 | pressable(IconButton) · 값은 즉시(숫자 tween 없음) |
| Slider | 손잡이 잡기 / 채움 | focus-in(hover·잡으면 1.1) + grab 커서 · 채움은 드래그를 따라 즉시 |
| Progress | 폭 | grow |
| Gauge·Donut | 채움 | grow |
| Sparkline·DotMatrix | 그려짐 / 값 변화 | 없음(정적 — 데이터 갱신 시 그대로 바뀜) |
| Stat·StatTrend | 숫자 변화 | 없음(카운트업 안 함) |
| Dot(progress)·Skeleton | 반복 / 톤 변화 | pulse · tint |
| Badge·Chip·StatusDot | 톤 변화 | tint |
| Tile·Avatar·Kbd | 상태 변화 | 없음 |
| Card·ListRow | hover | Card 없음 · ListRow 는 `onClick` 이 있을 때만 interactive |
| Menu | 팝업 / 항목 / 트리거 화살표 | enter-drop · interactive · flip-open |
| Popover | 팝업 / 트리거 화살표 | enter-drop · flip-open |
| Dialog·ConfirmDialog | 백드롭 / 상자 | enter-fade · enter-modal |
| Tooltip | 팝업 | enter-drop |
| Toast | 등장·퇴장 / 닫기 | enter-slide · pressable(IconButton) |
| Accordion | 행 hover(카드 여백 안 둥근 행) / 화살표 / 패널 | interactive · flip-open + tint · unfold(enter-drop 문법 + 높이) |
| Breadcrumb·Pagination | 링크 hover / 버튼 | interactive · pressable |
| Tabs 패널 | 값 바뀔 때 내용 교체 | appear(key 로 다시 마운트) |
| LogViewer | 새 줄 | appear + 자동 스크롤 |
| TopBar·Toolbar·Callout·Notice·Code·EmptyState | 등장 | 없음(페이지 전환 애니메이션 없음) |
| 캔버스 | 줌 / 테마 전환 | zoom(JS) · 테마 크로스페이드(slow) |

### hover · click · focus · disabled — 레시피 둘 (`index.css` 의 `@utility`)

모든 클릭 가능한 것은 이 둘 중 하나를 붙인다. 컴포넌트마다 transition·focus 클래스를 따로 쓰지 않는다.
- **`pressable`** — 눌리는 것: Button·IconButton·세그먼트(SEG)·Switch·Checkbox·Radio·Pagination. hover 는 색 한 단계(100ms ease-out: secondary card-2→card-3, ghost 투명→card-2, primary/danger opacity 90), **press 는 `:active` 에서 즉시 scale(.97)**(transition 0ms) 하고 놓을 때 100ms 로 돌아온다. 바운스 없음. reduced-motion 이면 scale 도 끈다.
- **`interactive`** — 행·항목·링크·트리거: 메뉴·셀렉트·콤보박스 항목(ITEM), `ListRow onClick`, 아코디언 트리거, 브레드크럼 링크. hover/`data-highlighted` 는 card-3 바탕이 **fast(100) 로 들어오고 base(200) 로 빠진다** — 포인터가 목록을 훑을 때 꼬리 없이 부드럽게 따라온다. press 는 즉시 한 단계 더 깊게(`color-mix(card-3 86%, text)`). 크기·위치는 움직이지 않는다. **hover 바탕은 컨테이너의 안쪽 여백 안에 머문다** — 컨테이너 모서리에 닿거나 넘지 않는다(최소 8px, 팝업은 6px, 카드는 12px). 카드 안 행은 `-mx-3 px-3` 으로 24px 여백 중 12px 만 쓰고, 아코디언은 카드 자체를 p-2 로 줄여 행을 둥글게 둔다. 사용자 지적(2026-09-08): 트리거 hover 가 카드 모서리까지 밀리면 카드 전체가 눌린 것처럼 보인다.
- **focus 는 셋 다 같다 — `outline`**: box-shadow 가 아니라 outline 2px 로 그려서 offset 2px 의 틈에 진짜 바탕이 비친다(accent 버튼 위에서도 보인다). 링은 offset 2px 에 고정해 두고 **색 하나만 base(200) ease-out 으로 들어온다**. offset 이나 width 를 같이 움직이면 outline 이 정수 픽셀로 한 칸씩 뛰어 색이 다 찬 뒤 툭 밀리는 것처럼 끊긴다(사용자 지적 2026-09-08) — 링에서는 속성 하나만 전이한다. 입력·손잡이는 `focus-in`, 버튼·세그먼트·행은 pressable/segment/interactive 안에 같은 규칙. `aria-invalid` 는 bad 색 outline(offset 0). disabled(`:disabled`·`data-disabled`·`aria-disabled`)는 opacity 40 + `not-allowed`.

### 커서

- `pointer` — 누를 수 있는 전부(버튼·세그먼트·행·링크·스위치·체크·라디오와 **그 라벨까지**, Select 트리거, Slider 트랙).
- `text` — Input·Textarea·Combobox 입력(브라우저 기본).
- `grab` / 누르는 동안 `grabbing` — Slider 손잡이.
- `not-allowed` — disabled 전부(라벨 포함, `has-[:disabled]`).
- `default` — 그 외(카드·타일·배지·툴팁 트리거 아님). 캔버스 보드 "인터랙션" 에 넷을 나란히 둔다. `prefers-reduced-motion: reduce` 면 전부 0 에 가깝게(전역 규칙). 스켈레톤 pulse·스피너 회전만 반복 애니메이션이고 그 외 반복·바운스·시차(stagger) 없음.

## 캔버스 나열 규칙 (2026-09-08, 분류 2026-09-09)

- **세로 축은 층(0~4), 가로 축은 역할.** 층 안의 묶음 이름과 순서는 컴포넌트 라이브러리들의 공통 어휘를 따른다(MUI·Ant Design·Chakra·Polaris): **동작 → 입력 → 표시 → 피드백 → 내비게이션 → 오버레이 → 표면**. 없는 역할은 건너뛴다. "어느 층의 무슨 역할" 로 찾으면 한 번에 닿는다.
- 묶음 안은 **컴포넌트 이름 알파벳 순**, 같은 컴포넌트의 변형은 붙여 둔다(간격 24 vs 56 이 그 경계를 말한다).
- 왼쪽 라벨 열은 **목차**다 — 층 이름 아래 그 층의 묶음과 개수를 세로로 세우고, 누르면 그 묶음으로 건너뛴다(`#g-<층>-<묶음>`). 묶음 머리는 이름 + 개수 + 남는 폭을 채우는 hairline.

- 라벨은 `이름 / 변형` 만. 한 행에는 같은 컴포넌트의 변형만.
- 폭: 트랙은 **960**(2026-09-09: 640 에서 넓힘 — 리소스 유기체를 축소 없이 담으려고). 블록 컨트롤(Input·Select·Combobox·InputGroup·CopyField·Textarea·Search)·카드·목록은 트랙을 꽉 채운다. 인라인 컨트롤(버튼·배지·칩·스위치·체크)은 제 폭. 특정 폭이 본질인 것만 고정(NavList 220 · Calendar 336 · SignInCard 400 · NumberField 208).
- 크기: 컴포넌트는 항상 기본 크기(md)로 먼저, 변형 행에서 sm/lg. **보드는 100% 로만 그린다** — 축소해 놓으면 캔버스 안에서 컴포넌트끼리 크기가 어긋나 보인다(사용자 지적 2026-09-09, `wide` 축소 렌더 제거). 유일한 예외는 템플릿(`frame`, 1280×800 을 50%)이고 그건 화면이지 컴포넌트가 아니다. 샘플 데이터는 api·blog·worker / app.example.com / 127.0.0.1:20000 으로 통일.
- 대비 검수: 상태 요소(선택·활성·솔리드 채움)의 글자/바탕 대비를 두 테마에서 재고 4.5 미만이면 토큰을 고친다(accent 위 흰 글자 3.8 은 UI 텍스트로 허용).

## 템플릿 규격 (사용자 요청 2026-09-08 "규정 크기 정해놓고 일관성 있게")

모든 템플릿(`4-templates/`)은 같은 화면 규격 위에 놓인다. 캔버스는 이 프레임을 50% 로 보여 주고(640×400), 줌으로 키워 본다.

| 항목 | 값 |
|---|---|
| 화면 프레임 | **1280 × 800** (데스크톱 기준, 16:10). 캔버스 `frame: true` 가 `bg` 바탕 + `line` 링 1px + 16px 모서리로 그린다 |
| 뼈대 | **AppShell 필수** — 왼쪽 `SideNav` 240 + 본문 `p-8`. 상단 바 없음(2026-09-09) |
| 폭 | 사이드바 240 을 뺀 1040 이 본문 폭. 안쪽 여백 32 를 빼면 내용 976 |
| 머리 | PageHeading(브레드크럼 · 제목 26 · 메타 · 동작) → 본문까지 `mt-6` |
| 본문 격자 | 카드 사이 `gap-5`(20). 2열은 `[340px_1fr]`(홈) 또는 `grid-cols-2`(상세), 설정은 `[220px_1fr] gap-8` |
| 넘침 | 800 을 넘는 내용은 프레임 안에서 잘린다(실제 앱은 스크롤). 템플릿은 첫 화면에 핵심이 보이게 800 안에 맞춘다 |
| 테마 | 캔버스 토글을 따른다. 템플릿이 자기 테마를 강제하지 않는다 |

현재 셋: Analytics(홈 — 대시보드 머리 + TopProjects | EdgeRequests + RecentDeploys) · DetailScreen(상세 — 탭 + 정보·마지막 배포·리소스·활동 카드) · SettingsScreen(설정 — NavList + FormRow 폼 + ActionPanel). 새 템플릿은 이 표를 그대로 따르고, 캔버스 "화면 1280 × 800 · 50%" 묶음에 넣는다.

## Tailwind Plus Application UI 대조 (2026-09-08)

사용자 요청으로 https://tailwindcss.com/plus/ui-blocks/application-ui 의 구성 전부를 우리 문법으로 옮겼다. 매핑:

| Tailwind Plus | 우리 |
|---|---|
| Application shells (stacked) | AppShell = Container + TopBar. sidebar/multi-column 은 결정대로 없음 |
| Page/Card/Section headings | PageHeading · Card(title·subtitle·icon·actions·footer) · SectionHeading |
| Description lists · Stats · Calendars | KeyValue · Stat/StatTrend · Calendar |
| Stacked lists · Grid lists · Feeds · Tables | List + ListRow(lead·sub·value·end) · Card 격자 · Timeline(lead=Avatar) · 표 없음 |
| Form layouts · Input groups · Select · Sign-in · Textareas · Radio · Checkboxes · Toggles · Action panels · Comboboxes | FormRow/FormActions/Fieldset · InputGroup(prefix·suffix·end) · Select · SignInCard · Textarea · RadioGroup/RadioCards · Checkbox(hint) · Switch(hint·boxed) · ActionPanel · Combobox |
| Alerts · Empty states | Notice(action·dismiss)/Callout · EmptyState |
| Navbars · Pagination · Tabs · Vertical nav · Breadcrumbs · Progress bars · Command palettes | TopBar · Pagination · Tabs/FilterTabs/ToggleGroup · NavList · Breadcrumb · Progress/Steps · Command |
| Modal dialogs · Drawers · Notifications | Dialog/ConfirmDialog · Sheet · Toast |
| Avatars · Badges · Dropdowns · Buttons · Button groups | Avatar(status)/AvatarGroup · Badge/Chip/StatusDot · Menu · Button/IconButton/Link · ButtonGroup |
| Containers · Cards · List containers · Media objects · Dividers | Container · Card · List · ListRow · Separator(label) |
| Page examples (home · detail · settings) | Analytics · DetailScreen · SettingsScreen (셋 다 캔버스 테마를 따름) |

## 반응형 (2026-09-09, 사용자 요청 "전체 페이지 반응형")

페이지는 420 부터 1280 까지 가로 스크롤 없이 선다. 규칙: **여백은 sm(640) 에서 한 단계**(Container `px-4 → sm:px-6`, AppShell `py-6 → sm:py-8`, Card `p-5 → sm:p-6`), **머리는 sm 에서 가로로**(PageHeading 은 좁으면 동작이 제목 아래로 내려간다), **전환점은 전부 창 기준**(사용자 결정 2026-09-09) — 컨테이너 쿼리(`@container`)는 쓰지 않는다. 카드 폭 기준은 전환점이 창 크기로 환산되지 않아(카드 768 = 창 912) 예측이 어렵다. 리소스 띠의 2열↔1열은 `lg`(창 1024). 이 카드를 좁은 자리에 다시 놓을 때는 그 자리에 맞는 브레이크포인트를 따로 준다. 긴 이름은 `truncate`, 세그먼트 줄은 `flex-wrap` + 라벨 `shrink-0`. 브레이크포인트는 `sm 640`(여백·머리)·`md 768`(저장 장치 2열)·`lg 1024`(띠 2열) 셋만 쓴다. 새 화면은 420·640·820·1024·1280·1440 여섯 폭에서 `scrollWidth === clientWidth` 를 확인한다.

## 라이트 검증 (2026-09-08)

캔버스 전 보드를 라이트로 찍어 확인했다. 찾은 것 셋과 고침: (1) `text-white` 부재 → `--color-white` 선언, (2) `text-body` 색/크기 충돌 → 색 유틸 `text-sub`, (3) 팝업이 바탕과 톤이 붙음 → `popup` 토큰. 라이트에서 확인해야 할 자리: 솔리드 채움 위 글자(배지·타일·콜아웃·danger), 체크·라디오 표시(white), 슬라이더 손잡이(white), 게이지 흰 글자, 팝업/토스트가 바탕에서 떠 보이는지, terminal(항상 어두움 — 라이트에서도 `#0f172a` 위 `#e5e5e5`). 새 컴포넌트는 두 테마를 다 찍는다.

## 하지 말 것

- 상위 층에서 새 모양 그리기(인라인 svg·손으로 만든 점·직접 쓴 `rounded-card bg-card`). 하위 층에 원자를 추가하고 조합한다.

- 테두리로 카드 구분(바탕 단계로). 6px 이하 radius. 600+ 굵기. 원색.
- 밑줄 탭·hairline 표(세그먼트·간격으로). 그라데이션을 게이지 밖에. 원형 아이콘 버튼. 바운스·스태거 애니메이션.
- 상태를 색으로만. 파괴적 동작에 확인 없이.
