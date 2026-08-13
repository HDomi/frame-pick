# Frame Pick

유튜브 영상 업로드용 썸네일 생성·편집기 (100% 클라이언트 사이드, 서버 비용 $0).

## 스택

| 구분 | 기술 |
| :--- | :--- |
| 프레임워크 | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 |
| 캔버스 | **Fabric.js 7.4.0** |
| 로컬 DB | `@h_domi/domi-indexed-sqlite` (IndexedDB) |
| 패키지 | pnpm |
| 배포 | GitHub Pages (`output: 'export'`, `basePath: '/frame-pick'`) |

## 현재 구현 상태 (Phase 1~2)

### 캔버스·편집
- 논리 해상도 **1920×1080(기본)** / **1280×720** 옵션, 16:9 고정
- 화면 표시는 논리 좌표 유지 + **CSS `cssOnly` 스케일** (줌 export 좌표 버그 방지)
- 텍스트 추가·이동·스케일·회전 (Noto Sans KR)
- 텍스트 전체/부분 선택 색상 (`ColorPicker`)
- **잠금 배경 레이어**: 색상 변경 가능, 삭제·숨김·순서 변경 불가
- 레이어 패널: 추가 / 삭제 / ↑↓ / 표시 토글 (배경 보호)
- PNG 미리보기·다운로드 (논리 해상도 캡처)

### 영상·이미지 (Phase 2)
- 영상 업로드 → **10프레임 중간점 추출** → 다이얼로그에서 선택
- 업로드된 영상은 유지, 카드 클릭 시 프레임 다이얼로그 재오픈
- 프레임 선택 → **「영상이미지」** 레이어에 cover 적용 (언제든 교체)
- **이미지 업로드** → **「업로드된이미지」** 레이어 추가 (영상이미지와 별개)

### 저장·히스토리
- 1분 자동 임시저장 + 수동 임시저장 / 초기화
- Undo / Redo (최대 20스텝, Ctrl/Cmd+Z · Shift+Z)
- 스키마 선행: `projects` / `pages` / `workspace_state` + drafts·history `page_id`  
  (다중 프로젝트·페이지 **UI는 추후**, 데이터 모델은 대응 가능)

### 레이아웃·UX
- **md 이상(태블릿~PC)**: 좌·중·우 3단, 패널 % 리사이즈(선호값 DB 저장)
- **md 미만**: 하단 시트형 툴바 (도구 / 레이어 / 스타일)로 동일 기능 접근
- **전역 로딩 오버레이** (화면 차단) + **좌상단 토스트**

### 아직 stub / 미구현
- AI 누끼 제거, 스티커 세트
- 다운로드 광고 타이머·AdSense/AdFit
- 다중 프로젝트·페이지 UI

상세 계획·함정 대응: [PLAN.md](./PLAN.md), [PLAN_DETAIL.md](./PLAN_DETAIL.md)

## 로컬 실행

```bash
pnpm install
pnpm dev
```

개발 서버: [http://localhost:3000](http://localhost:3000)  
(프로덕션 / GitHub Pages는 `/frame-pick/` 경로)

## 빌드

```bash
pnpm build
```

정적 결과물은 `out/`에 생성됩니다.

## 배포

`main` 브랜치 push 시 GitHub Actions가 Pages에 자동 배포합니다.

## 주요 경로

```text
src/
  components/
    canvas/          # Fabric 뷰포트
    editor/          # 레이어·텍스트·배경 컨트롤
    layout/          # 헤더, 3단/모바일 시트 워크스페이스
    ui/              # 공통 UI (Button, ColorPicker, Modal, …)
  contexts/          # Canvas, EditorSession(저장·undo)
  hooks/             # 캔버스·레이어·배경·패널 등
  lib/               # fit/export/snapshot, DB 스키마·리포지토리, 배경 레이어
```
