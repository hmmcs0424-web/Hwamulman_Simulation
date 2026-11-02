# 화물맨 업무 가이드 — AI 편집 가이드

이 문서는 `index.html`을 편집하는 AI 어시스턴트가 **대화를 시작하자마자 읽어야 할 핵심 컨텍스트**입니다.

---

## 프로젝트 개요

**화물맨 업무 가이드** — 화물 배차 콜센터 상담사용 인트라넷 가이드 사이트.

- **단일 파일 사이트**: 모든 UI·CSS·JS가 `index.html` 한 파일에 들어 있음 (약 7,000줄 이상)
- **로컬 개발 서버**: `python -m http.server 3456` (루트에서 실행)
- **백엔드**: Firebase Firestore (시뮬레이터 flow 데이터 저장)

---

## 폴더 구조

```
index.html              ← 메인 파일 (CSS + HTML + JS 전부)
차주앱/
  flow.json             ← 차주앱 시뮬레이터 경로 설정 (Firestore 덮어쓰기 가능)
  [이미지들]
빽통앱/
  flow.json
  [이미지들]
채널톡/
  [이미지들]
빽통PC/
  content.html          ← 빽통 PC 업무 가이드 본문 (관리자가 사이트에서 직접 편집·저장)
vendor/                 ← 외부 JS 모듈 (건드리지 말 것)
```

---

## index.html 구조 — CSS 섹션 (line 1~680 근처)

CSS는 `<style>` 블록 하나에 모두 포함. `/* ── 이름 ── */` 주석으로 섹션 구분.

| 섹션 주석 | 내용 |
|-----------|------|
| `/* ── TOP NAV ── */` (L26) | 상단 네비게이션 바 |
| `/* ── MAIN LAYOUT ── */` (L54) | 전체 레이아웃 (사이드바 + 콘텐츠) |
| `/* ── PHONE FRAME ── */` (L127) | 차주앱·빽통앱 스마트폰 프레임 |
| `/* ── PC FRAME ── */` (L246) | 빽통PC·채널톡 PC 프레임 |
| `/* ── 빽통 PC 가이드 영역 ── */` (L348) | content.html 뷰어 + 관리자 툴바 |
| `/* ── INFO PANEL ── */` (L387) | 오른쪽 화면 정보 패널 |
| `/* ── CHAT OVERLAY ── */` (L439) | 채널톡 교육 전용 |

> CSS를 추가할 때는 관련 섹션 바로 아래에 삽입하고, 새 `/* ── 이름 ── */` 헤더를 붙이세요.

---

## index.html 구조 — HTML 섹션

주요 영역 ID:

| ID | 설명 | 표시 조건 |
|----|------|-----------|
| `#guidePage` | 업무 가이드 페이지 (FAQ·공지 등) | `activePage === 'guide'` |
| `#phoneArea` | 차주앱·빽통앱 스마트폰 시뮬레이터 | 앱 타입 섹션 |
| `#pcArea` | 채널톡 PC 프레임 | `type === 'pc'` 섹션 |
| `#pcGuideArea` | 빽통PC 가이드 뷰어 | `type === 'guide'` 섹션 |
| `#ctEduArea` | 채널톡 교육 전용 레이아웃 | `activeSec === '채널톡'` |
| `.info-panel` | 오른쪽 상세/편집 패널 | 시뮬레이터 모드 |

모달은 HTML 맨 아래쪽 `</div><!-- /main-layout -->` 이후에 위치.

---

## index.html 구조 — JS 섹션 (line 1635~)

`// ═══ 섹션명 ═══` 구분자로 정리됨.

| 섹션 | 시작 라인 | 내용 |
|------|-----------|------|
| SECTION CONFIG | ~1635 | `SECS` 객체, `FLOW_SAVE_GUARD_SECTIONS` |
| BOOT | ~2424 | `boot()` — 앱 초기화 진입점 |
| SECTION SWITCHING | ~2562 | `switchSec()`, `loadSec()`, `applySec()` |
| 빽통 PC 가이드 | ~2629 | `loadPcGuide()`, `savePcGuideContent()`, 편집 함수들 |
| NAVIGATION | ~2950 | 핫스팟 클릭, 화면 이동 |
| RENDER SCREEN | ~3322 | `renderScreen()`, 이미지 표시 |
| HOTSPOTS | ~3954 | 핫스팟 그리기·편집 |
| BREADCRUMB | ~4307 | 상단 경로 표시 |
| SCREEN LIST | ~4322 | 왼쪽 화면 목록 |

---

## 섹션 타입 시스템 (`SECS` 객체)

```js
const SECS = {
  '차주앱': { type:'app',   flowUrl:'차주앱/flow.json' },
  '빽통앱': { type:'app',   flowUrl:'빽통앱/flow.json' },
  '빽통PC': { type:'guide', contentUrl:'빽통PC/content.html', title:'빽통 PC' },
  '채널톡': { type:'pc',    frame:'chrome', flowUrl:'채널톡/flow.json', ... },
};
```

- **`type:'app'`** — 스마트폰 프레임 + flow.json 기반 화면 시뮬레이터
- **`type:'pc'`** — PC 브라우저 프레임 + flow.json 기반 시뮬레이터 (현재 채널톡만)
- **`type:'guide'`** — HTML 파일을 fetch해서 뷰어로 보여주는 가이드 모드 (현재 빽통PC만)

---

## 핵심 전역 변수

| 변수 | 의미 |
|------|------|
| `activeSec` | 현재 선택된 섹션 이름 (`'차주앱'` 등) |
| `activePage` | `'simulator'` 또는 `'guide'` |
| `adminMode` | 관리자 로그인 여부 |
| `counselorPreviewMode` | 상담사 미리보기 모드 |
| `cache[name]` | 섹션별 flow/cur/hist 캐시 |
| `pcGuideDirty` | 빽통PC 가이드 미저장 변경 여부 |

---

## 주요 함수

| 함수 | 역할 |
|------|------|
| `switchSec(name)` | 섹션 전환 (미저장 확인 → loadSec → applySec) |
| `applySec(name)` | 섹션에 맞게 레이아웃 영역 표시/숨김 |
| `syncAdminUI()` | 관리자 모드 상태에 맞춰 모든 UI 동기화. **로그인/로그아웃/섹션 전환 후 반드시 호출** |
| `renderScreen(sec, screenId)` | 화면 이미지 + 핫스팟 렌더링 |
| `loadPcGuide()` | 빽통PC/content.html을 fetch해서 `#pcGuideContent`에 주입 |
| `savePcGuideContent()` | File System Access API로 content.html 덮어쓰기 (미지원 시 다운로드) |

---

## 절대 건드리지 말아야 할 것

- **`vendor/` 폴더** — 외부 모듈, 수정 금지
- **`차주앱`, `빽통앱`, `채널톡` 관련 로직** — 빽통PC 작업 시 절대 변경하지 않을 것  
  (사용자 지시: *"차주앱이나 빽통앱, 채널톡 등 다른 목록의 코드는 건드리지 않도록 주의"*)
- **Firebase 설정** (`FIREBASE_CONFIG`) — 변경 금지
- **`flow.json` 포맷** — `{ screens: {}, start: null, imageManifest: [] }` 구조 유지

---

## 빽통PC 가이드 편집 방법

1. **사이트에서 편집**: 관리자 로그인 → 빽통 PC 메뉴 → 툴바에서 텍스트·박스·강조 편집 → 저장(content.html에 기록)
2. **파일 직접 편집**: `빽통PC/content.html`의 `<div id="guide-content">` 안 내용을 수정
   - `.box-info` / `.box-warn` / `.box-tip` — 정보/주의/팁 박스
   - `.hl-blue` / `.hl-yellow` / `.hl-red` — 인라인 강조 텍스트
   - `<hr>` — 섹션 구분선
3. **index.html에서 뷰어 스타일 변경**: `/* ── 빽통 PC 가이드 영역 ── */` (L348) 섹션 수정

---

## 개발 서버 실행

```bash
python -m http.server 3456
```

또는 Claude Code 내 `Hwamulman` 서버 프로필로 실행.

---

## 커밋 규칙

- 관련 파일만 `git add` (전체 `git add .` 금지 — 불필요한 작업 파일 포함됨)
- 커밋 메시지 끝에 Attribution 추가:
  ```
  Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
  ```
