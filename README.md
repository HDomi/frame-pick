# Frame Pick

유튜브 영상 업로드용 썸네일 생성·편집기 (100% 클라이언트 사이드, 서버 비용 $0).

## 스택

| 구분 | 기술 |
| :--- | :--- |
| 프레임워크 | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 |
| 캔버스 | **Fabric.js 7.4.0** |
| 누끼 | `@bunnio/rembg-web`(MIT) + `onnxruntime-web` (브라우저 ONNX) |
| 로컬 DB | `@h_domi/domi-indexed-sqlite` (IndexedDB) |
| 패키지 | pnpm |
| 배포 | GitHub Pages (`output: 'export'`, `basePath: '/frame-pick'`) |

## 현재 구현 상태 (Phase 1~3 + 폴리시)

### 캔버스·뷰포트
- 아트보드 **1920×1080** 고정 (16:9). 편집 중 해상도 전환 UI 없음
- **일러스트형 패스트보드**: 가운데 아트보드 + 바깥 편집 여백. 셸 전체가 히트 영역 (**cover fit**)
- 좌·우 패널은 편집 여백 위 **오버레이**
- 화면 표시는 논리 좌표 유지 + CSS `cssOnly` 스케일 (내보내기 해상도 불변)
- **뷰포트 이동**
  - 빈 여백 드래그 / 스페이스·휠 버튼 드래그 / 트랙패드 스크롤
- **줌** (커서 기준)
  - ⌘/Ctrl + 휠, 핀치, 하단 −/%/+/맞춤 버튼, ⌘/Ctrl +/−/0
- **다중선택**: Shift + 빈 곳 드래그 (마퀴)

### 텍스트·타이포
- **Textbox** + grapheme 줄바꿈 (긴 URL·복붙 가드)
- **Google Fonts ~30종** + 기본 Noto Sans KR
- 글자 효과: **굵게 / 기울임 / 밑줄 / 취소선** (부분 선택 적용)
- 글자 크기·채움 전체/부분 선택 적용
- 외곽선(stroke)·그림자·하이라이트, 카테고리 프리셋
- Ctrl/Cmd+C · V 객체 복사/붙여넣기 (텍스트 입력 중은 네이티브 우선)

### 색상·채움
- 단색·**선형 그라데이션** (배경·텍스트 등)
- 모든 `ColorPicker`에서 **투명(알파)** 지원
  - 피커 알파 슬라이더, 프리셋「투명」, **`#RRGGBBAA` 8자리 직접 입력**

### 도형
- 사각형 · 원 · 삼각형 · **직선** 추가
- 채움(투명 채움 포함) · 선 색/두께 · 레이어 투명도
- 레이어 타입 `shape`, 스타일 탭「도형」

### 배경·레이어
- **잠금 배경 레이어**: 단색/그라데이션, 삭제·숨김·순서 변경 불가 (레이어 목록에서 선택)
- 레이어 패널: 추가 / 삭제 / ↑↓ / 표시 / 잠금
- 스타일 드로어: 선택 시 자동 오픈 (배경 / 이미지 / 텍스트 / 도형)

### 다운로드·미리보기
- **다운로드 다이얼로그**에서 설정 후 저장
  - 해상도: 아트보드 / 1280×720 / 1920×1080 / 2560×1440 / 3840×2160
  - 형식: PNG · JPEG · WebP
  - 화질: 저 / 중 / 고 (JPEG·WebP만, PNG는 무손실)
- 미리보기는 현재 아트보드 캡처 (뷰포트 줌과 무관)

### 영상·이미지
- 영상 업로드 → **8프레임 (0~90% 구간)** 추출 → 다이얼로그에서 선택
- **수동 시킹**으로 원하는 시점 추가 캡처/적용
- 프레임 → **「영상이미지」** 레이어 (**cover / contain / stretch**)
- **이미지 업로드** → **「업로드된이미지」** 레이어
- **이미지로 스티커 만들기**: 원본 비율로 스티커 배치(아트보드보다 크면만 축소), 선택 상태로 추가
- 추출/처리 중 **편집 잠금**
- 유튜브 URL 입력은 **미지원 (Out of Scope)**

### AI 누끼 (온디바이스)
- 「이미지로 스티커 만들기」에서 **배경 제거(누끼)** 선택 가능
- 방식 3종
  - **단색 배경**: 로고·플랫·안쪽 구멍에 강함 (하드 컷)
  - **AI 고품질**: `silueta` (~44MB, CI/로컬 `public/models/`)
  - **AI 빠름**: `u2netp` (~4.4MB, 저장소에 포함)
- 저사양·큰 이미지는 **숨기지 않고 경고 후 진행**
- 모델·WASM은 누끼 실행 시 lazy load

### 스티커
- `public/stickers/` 매니페스트 기반 (화살표·마크·도형·이모지)
- 자체 SVG + Fluent Emoji Flat(MIT) 서브셋
- SVG는 `loadSVGFromURL` 경로로 로드 (빈 이미지 이슈 회피)

### 저장·히스토리·프로젝트
- 1분 자동 임시저장 + 헤더 카운트다운 / 수동 임시저장 / 초기화
- Undo / Redo (최대 20스텝, Ctrl/Cmd+Z · Shift+Z)
  - 스텝에 **label/command_type** 기록, 드래그 제스처는 `modified` 1회로 병합
  - undo/redo 후 **선택(layerId) 복원**
- **다중 프로젝트·페이지 UI** (헤더 스위처) — 스키마 `projects` / `pages` / `workspace_state`

### 정렬·스냅
- 객체 이동 시 아트보드 가장자리·중앙·이웃 객체에 **스냅 + 가이드선**

### 업로드 제한
- 일반 이미지: **25MB 초과 거부**, 10MB 이상 경고
- 누끼 입력 15MB·영상 200MB 경고 (기존)

### 레이아웃·UX·SEO·법적 페이지
- **md 이상**: 전체 편집 여백 + 좌·우 패널 오버레이, 패널 % 리사이즈(선호값 DB 저장)
- **md 미만**: 하단 시트형 툴바 (도구 / 레이어 / 스타일)
- 전역 로딩 오버레이 + 상단 중앙 토스트
- 햄버거 메뉴 → `/terms` · `/licenses` · `/privacy`
- **OG 이미지** (`public/og-image.png`) + metadata · `robots.txt` · `sitemap.xml`
- 캔버스 `aria-label`, `:focus-visible` 링, muted 대비 보강

### 아직 stub / 미구현
- 다운로드 광고 타이머·AdSense/AdFit 실연동
- 곡선 텍스트 (백로그)
- (선택) PWA

상세 계획: [PLAN.md](./PLAN.md), [PLAN_DETAIL.md](./PLAN_DETAIL.md)

## 로컬 실행

```bash
pnpm install
pnpm dev
```

개발 서버: [http://localhost:3000](http://localhost:3000)  
(프로덕션 / GitHub Pages는 `/frame-pick/` 경로)

### 고품질 누끼 모델 (선택)

`u2netp.onnx`는 저장소에 포함됩니다. **AI 고품질(`silueta`)** 을 쓰려면:

```bash
mkdir -p public/models
curl -fsSL -o public/models/silueta.onnx \
  https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx
```

`silueta.onnx`는 용량이 커서 gitignore 대상이며, GitHub Actions 배포 빌드에서 자동으로 받습니다.  
모델이 없으면 AI 고품질은 경량 모델로 폴백합니다.

## 빌드

```bash
pnpm build
```

정적 결과물은 `out/`에 생성됩니다.

## 배포

`main` 브랜치 push 시 GitHub Actions가 Pages에 자동 배포합니다.

**필수**: 저장소 Settings → Pages → **Source = GitHub Actions**  
(소스 미설정 시 `deploy-pages`가 404로 실패할 수 있습니다.)

## 주요 경로

```text
src/
  components/
    ai/              # 누끼·이미지 스티커 다이얼로그
    canvas/          # Fabric 뷰포트·줌 컨트롤
    editor/          # 레이어·텍스트·도형·스티커·배경·폰트 로더
    export/          # 다운로드 설정 다이얼로그
    layout/          # 헤더, 셸/모바일 시트, 법적 페이지
    ui/              # ColorPicker(알파)·FillPicker 등 공통 UI
  contexts/          # Canvas, EditorSession(저장·undo)
  hooks/             # 줌/팬, 텍스트·도형·레이어·클립보드 등
  lib/               # artboard/fit/zoom/export/google-fonts/shapes, DB
public/
  models/            # u2netp.onnx (+ 로컬/CI silueta.onnx)
  stickers/          # 스티커 SVG + manifest.json
```
