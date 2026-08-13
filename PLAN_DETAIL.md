# Frame Pick — 상세 개발 계획서 (PLAN_DETAIL.md)

> 상위 문서: [PLAN.md](./PLAN.md)  
> 현재 상태: **Phase 2 완료** — Fabric v7.4.0 + 텍스트/레이어/잠금 배경 + 영상 프레임 다이얼로그 + 업로드 이미지 + 전역 로딩/토스트. 누끼/스티커/광고는 stub.

---

## 0. 현재 코드 기준점

| 영역 | 경로 | 상태 |
| :--- | :--- | :--- |
| 정적 배포 설정 | `next.config.ts` | `output: 'export'`, `basePath: '/frame-pick'` (dev는 basePath 없음) |
| 에디터 셸 | `src/app/page.tsx` | 헤더·워크스페이스·푸터 |
| 캔버스 | `CanvasViewport` + `CanvasContext` | 논리 1920×1080 기본 / 1280×720, **cssOnly fit** |
| 배경 | `lib/background-layer.ts` | 잠긴 Rect, 색상 변경, **삭제 불가** |
| 레이어 | `useCanvasLayers` + `LayerManager` | 추가/삭제/↑↓/표시, 배경 보호 |
| 저장·히스토리 | `EditorSessionContext` + EasySqlite | 1분 자동저장, undo/redo 20스텝, **page_id 스코프 스키마** |
| 다중 프로젝트 스키마 | `projects` / `pages` / `workspace_state` | UI는 추후, **스키마·시드·드래프트 연결 선행** |
| 모바일 UX | `MobileEditorSheet` | `<md` 하단 시트(도구/레이어/스타일), `md+` PC 3단 |
| 영상/누끼 | stub | Phase 2~3 |

**작업 원칙**

1. 브라우저 전용 API는 전부 `'use client'` + SSR 가드.
2. GitHub Pages이므로 API Route / 서버 액션 금지.
3. 대용량(WASM·모델)은 버튼 클릭 시 `import()`.

---

## 1. Phase 1 — Fabric 캔버스 코어

### 1.1 할 일 (구체 체크리스트)

- [x] `fabric` 패키지 설치 — **fabric@7.4.0** (2026-03 기준 npm latest)
- [x] `CanvasViewport` Fabric 마운트 + cssOnly 스케일 + ResizeObserver
- [x] `useCanvas` Context 공유 + dispose
- [x] 텍스트 추가 (Noto Sans KR)
- [x] PNG 미리보기/다운로드 (논리 해상도 캡처)
- [x] 잠금 배경 Rect + 색상 선택 + 삭제/순서/숨김 보호
- [x] 레이어 패널 동기화
- [x] IndexedDB 드래프트 + undo/redo
- [x] 모바일 시트형 툴바 (`md` 미만)

### 1.2 완료 기준 (Acceptance)

- 데스크톱·태블릿(md+)에서 3단 편집, 모바일에서 시트 탭으로 동일 기능 접근
- 텍스트 추가 → 드래그/리사이즈/회전
- 배경 색 변경 가능, 배경 삭제 불가 (UI·Delete키)
- `pnpm build` 정적 export 성공

### 1.3 예상 버그 / 함정 — 대응 상태

| 이슈 | 원인 | 대응 | 상태 |
| :--- | :--- | :--- | :--- |
| Fabric SSR 크래시 | App Router 서버 평가 | client 경계 + 동적 마운트 | ✅ |
| HiDPI 흐린 export | CSS vs buffer | `enableRetinaScaling: false`, 논리 해상도 캡처 | ✅ |
| 줌 후 좌표/텍스트 튀김 | viewport zoom 사용 | **cssOnly fit만**, export 전 논리 유지 | ✅ 수정됨 |
| undo/redo 후 화면 공백 | `setDimensions`가 cssOnly 파괴 | 동일 해상도는 JSON만 복원 + `refitCanvasDisplay` | ✅ 수정됨 |
| 한글 깨짐 | 폰트 미로드 | `document.fonts` + Noto Sans KR | ✅ |
| `basePath` 자산 404 | 절대경로 | `BASE_PATH` / env prefix | 진행 중(스티커 Phase) |
| Strict Mode dispose | 더블 마운트 | cleanup `dispose` + register null | ✅ |
| 배경 삭제/뒤로 밀림 | 일반 레이어와 동일 취급 | `layer_background` 고정 ID, delete/move/hide 가드 | ✅ |
| 해상도 변경 시 배경 왜곡 | 배경도 비율 스케일 | `applyCanvasSize`에서 배경 제외 후 full-bleed 재동기화 | ✅ |
| 모바일 3단 사용 불가 | 좁은 폭 | `<md` 시트, `md+` PC 레이아웃 | ✅ |
| 히스토리·저장이 페이지 혼선 | 단일 스택 | `page_id` 컬럼 + workspace 포인터 (UI는 추후) | ✅ 스키마 |

### 1.4 기획 결정 (닫힘)

1. **Fabric**: **v7.4.0 고정** (최신).
2. **배경 모델**: 잠긴 최하위 **Rect 레이어** (`background`). `canvas.backgroundColor`/`backgroundImage`는 보조가 아님.
3. **모바일 UX**: `<768px` 하단 시트, **태블릿(md)부터 PC 레이아웃**.
4. **Undo/Redo**: Phase 1 포함 (SQLite 스냅샷, 최대 20). 고도화는 §1.5.
5. **다중 페이지/프로젝트**: UI는 추후. **스키마는 Phase 1에서 선행** (`projects`, `pages`, `workspace_state`, drafts/history `page_id`).

### 1.5 Undo/Redo 고도화 체크 (추후)

현재: 캔버스 JSON 풀 스냅샷 + 디바운스 400ms + 분기 truncate + 페이지 스코프 컬럼.

| 항목 | 왜 필요한지 | 방향 |
| :--- | :--- | :--- |
| **커맨드 메타** | `label` / `command_type` 컬럼 이미 추가됨 | push 시 `add_text`, `move`, `fill` 등 태깅 → 히스토리 UI |
| **연속 제스처 병합** | 드래그 중 스텝 폭발 | `object:scaling/moving` 중에는 기록 안 하고 `modified` 1회, 또는 동일 command_type coalesce |
| **페이지별 커서** | 페이지 전환 시 히스토리 혼선 방지 | `history_meta`를 page당 1행으로 확장하거나 `(page_id, cursor_id)` |
| **hydrate 시 히스토리 보존** | 지금은 로드 후 clear+1스텝 | 세션 복원 옵션 / 체크포인트 |
| **메모리·용량** | 1080p JSON×20 | 차등 패치 또는 압축(추후), 지금은 N=20으로 충분 |
| **선택 상태 복원** | undo 후 selection 소실 | 스냅샷에 active layerId 옵션 |
| **Redo 스택 UX** | 새 편집 시 redo 삭제됨(정상) | 토스트/히스토리 패널로 가시화 |

---

## 2. Phase 2 — 영상 프레임 추출 + 이미지 업로드

### 2.1 할 일

#### 프레임 추출 (`video-frame-extractor.ts`)

- [x] `URL.createObjectURL(file)` → hidden `<video>` + `loadedmetadata`
- [x] `duration` 확보 (Infinity / NaN 가드)
- [x] 샘플 시점: **중간점 균등** `(i+0.5)/N` (시작/끝 블랙 회피)
- [x] 시킹 → `seeked` → canvas `drawImage` → JPEG dataURL
- [x] 순차 처리 + `AbortController` + 진행률
- [x] `VideoSessionProvider` + 프레임 **다이얼로그** (하단 갤러리 영역 제거)
- [x] 업로드 영상 유지 → 카드 클릭 시 다이얼로그 재오픈
- [x] 프레임 클릭 → **「영상이미지」** 레이어 cover 적용 (단일 레이어 교체)

#### 이미지 업로드

- [x] 파일 input: `image/png,image/jpeg,image/webp`
- [x] Fabric `FabricImage.fromURL` (v7)
- [x] cover 스케일 + **「업로드된이미지」** 레이어 추가 (`imageSource: 'upload'`)
- [x] Object URL revoke
- [x] 영상이미지와 **항상 별개 레이어** (`imageSource: 'video' | 'upload'`)

#### UX 인프라

- [x] 전역 Progress Loading (화면 차단)
- [x] 좌상단 Toast (저장/추출/업로드/다운로드/undo 등)

### 2.2 완료 기준

- [x] MP4에서 10장 섬네일 생성
- [x] 섬네일 클릭 시 영상이미지 레이어 반영
- [x] 이미지 업로드 후 레이어 이동/스케일 가능
- [x] 추출 중 전역 진행률, 실패 시 토스트

### 2.3 예상 버그 / 함정

| 이슈 | 원인 | 대응 |
| :--- | :--- | :--- |
| MOV/HEVC 재생 불가 | Safari 외 브라우저 코덱 미지원 | 지원 포맷 명시, 실패 시 “Chrome/MP4(H.264) 권장” |
| `duration === Infinity` | 일부 webm/스트리밍식 메타데이터 | 부분 로드 후 재시도, 또는 실패 처리 |
| seek가 키프레임만 스냅 | 브라우저/코덱 한계 | “정확 시점” 기대치 낮추고 UX 카피 조정 |
| 대용량 4K 영상 OOM | dataURL 10장 + 원본 Blob 동시 유지 | 섬네일은 JPEG 축소본, 원본은 필요 시에만 유지 |
| iOS Safari 자동재생/디코드 제한 | 정책·메모리 | 사용자 제스처 직후 로드, 해상도 다운스케일 옵션 |
| 연속 업로드 시 메모리 누수 | ObjectURL 미해제 | `revokeObjectURL` + frames 교체 시 이전 dataURL 참조 끊기 |
| 가로/세로 영상 배경 | 비-16:9 | cover(크롭) vs contain(레터박스) **정책 확정 필요** |

### 2.4 기획 구체화가 필요한 항목

1. **샘플링 공식**: 10%~100% vs 균등 중간점(권장: 중간점).
2. **수동 시킹**: 슬라이더로 원하는 시각 1장 추가 캡처를 MVP에 넣을지.
3. **프레임 수**: 고정 10 vs 5/10/20 옵션 (메모리·UX 트레이드오프).
4. **배경 fit 모드**: cover / contain / stretch 중 기본값과 UI 노출 여부.
5. **추출 중 편집 잠금**: 추출 완료 전 캔버스 조작 허용 여부.
6. **유튜브 URL 입력**: 서버 없이 불가에 가까움. **명시적으로 Out of Scope**로 문서화 권장.

---

## 3. Phase 3 — 누끼 제거 + 텍스트/레이어/스티커

### 3.1 할 일

#### AI 누끼 (`@imgly/background-removal`)

- [ ] `BackgroundRemovalButton`에서만 `import('@imgly/background-removal')`
- [ ] 모델 public 경로 / CDN 경로와 `basePath` 정합
- [ ] 로딩 스피너 + 진행 단계 문구 (“모델 다운로드 중…”, “배경 제거 중…”)
- [ ] 결과 Blob → Fabric Image(투명 PNG) 추가
- [ ] 실패·타임아웃·저사양 기기 폴백 메시지

#### 텍스트 스타일 컨트롤

- [ ] 선택 객체 변경 시 `TextControls` 동기화 (채움 색상은 부분 구현됨)
- [ ] stroke / strokeWidth / fill / shadow / fontFamily / fontSize / charSpacing / lineHeight
- [ ] Highlight Box: 텍스트 뒤 `Rect` 연동 vs Fabric 배경 속성 — **방식 선택**
- [ ] 그라데이션·곡선 텍스트: MVP 이후 백로그로 분리 권장 (복잡도 높음)

#### 레이어 매니저

- [x] Fabric 객체 ↔ `EditorLayer` 매핑
- [x] 위/아래, visible, delete (+ 배경 제한)
- [ ] lock 토글(배경 외 일반 레이어)
- [x] 배경 레이어 삭제 제한

#### 스티커

- [ ] `public/stickers/*.svg` 최소 세트
- [ ] SVG → Fabric 객체 로드 (`basePath` 주의)
- [ ] 라이선스: 직접 제작 또는 CC0/상용 가능 에셋만

### 3.2 완료 기준

- 누끼 버튼 첫 클릭에만 큰 다운로드, 두 번째부터 캐시로 체감 개선
- 텍스트 외곽선·그림자 실시간 반영
- 레이어 순서가 캔버스 z-index와 일치
- 스티커 추가·변형 가능

### 3.3 예상 버그 / 함정

| 이슈 | 원인 | 대응 |
| :--- | :--- | :--- |
| WASM/모델 CORS 또는 404 | Pages + basePath + worker 경로 | `public/` 배치, config의 publicPath/wasmPaths 확인 |
| 첫 누끼 30초+ / 실패 | 모델 용량·네트워크·저사양 | 용량 안내, 진행 UI, 취소 버튼 |
| 메인 스레드 정지 | WASM이 UI 블로킹 | 라이브러리 worker 옵션 확인 |
| 투명 PNG가 검게 export | premultiplied alpha / 포맷 | PNG export, fill 확인 |
| 레이어 목록 desync | Fabric 이벤트 미구독 | `object:added/removed/modified`로 동기화 | ✅ |
| 잠금 객체가 선택됨 | lock 플래그만 UI | `selectable`/`evented` + 배경 잠금 속성 | ✅ 배경 |
| SVG 스티커 폰트/스타일 유실 | 복잡한 SVG | 단순 path SVG로 제한 |

### 3.4 기획 구체화가 필요한 항목

1. **누끼 대상**: “선택 레이어” vs “새 파일 업로드 후 누끼”.
2. **모델 라이선스·약관**: `@imgly/background-removal` 상업/광고 수익 사용 가능 여부.
3. **저사양 정책**: 모바일/4GB RAM에서 누끼 버튼 숨김 vs 경고 후 시도.
4. **프리셋 카테고리 상세**.
5. **곡선 텍스트·그라데이션**: MVP 제외 권장.
6. **스티커 세트 범위**.

---

## 4. Phase 4 —보내기 · 광고 · 성능 · SEO 마감

### 4.1 할 일

- [x] PNG export (미리보기/다운로드) — 광고 타이머·슬롯은 미완
- [ ] 다운로드 모달: 실제 3초 타이머 + AdSense/AdFit
- [ ] OG 이미지 + metadata
- [ ] Lighthouse 점검
- [x] IndexedDB 초안 저장/복원 (드래프트) — 프로젝트 UI는 추후
- [ ] (선택) PWA

### 4.2~4.4

기존 함정 표·결정 항목 유지. 저장 포맷은 Fabric JSON + 커스텀 `layerId/layerName/layerType`.

---

## 5. 크로스 커팅 이슈 (전 Phase 공통)

### 5.1 상태 관리

- Fabric 객체가 단일 진실 공급원, UI는 이벤트 구독.
- DB: `projects` → `pages` → draft/history는 `page_id`로 연결. `workspace_state`가 현재 포인터.

### 5.2 스키마 선행 설계 (다중 프로젝트/페이지)

```text
projects (id, name, timestamps, deleted)
pages (id, project_id, name, sort_order, size_id, canvas_json, …)
workspace_state (id='current', project_id, page_id)
drafts (+ project_id, page_id)     -- 빠른 복원용 캐시
history_steps (+ page_id, label, command_type)
history_meta (+ page_id)
```

시드: `project_default` / `page_default`. UI 전환 시 `setWorkspacePointer` + page canvas 로드만 추가하면 됨.

### 5.3 에러 UX / 접근성 / 라이선스

공통 토스트, aria-label, 폰트·스티커·imgly·Fabric·광고 정책 체크리스트는 출시 전 §5.4 유지.

---

## 6. 권장 구현 순서

```text
1) Fabric + Context + 텍스트 + 배경 ✅
2) cssOnly 스케일 + PNG export ✅
3) 레이어 + 저장 + undo ✅
4) 모바일 시트 ✅
5) 이미지 업로드
6) 비디오 프레임 → 배경/이미지
7) 텍스트 stroke/shadow 확장 + 스티커
8) 누끼 lazy load
9) 다운로드 모달 + 광고
10) 프로젝트/페이지 UI (스키마 이미 준비)
```

---

## 7. Out of Scope (명시)

- 유튜브/구글 로그인, 클라우드 저장
- 서버에서 영상 다운로드·프레임 추출
- 팀 협업·댓글
- 완전한 포토샵 대체
- 자동 자막·TTS·LLM 카피 생성
- 모바일 네이티브 앱

---

## 8. 열린 결정 목록

| 우선순위 | 결정 항목 | 상태 |
| :---: | :--- | :--- |
| P0 | Fabric 메이저 버전 | **결정: fabric@7.4.0** |
| P0 | 캔버스 해상도 | **결정: 1920×1080 기본 + 1280×720** |
| P0 | 배경 모델 | **결정: 잠긴 Rect 레이어** |
| P0 | 모바일 지원 | **결정: `<md` 시트 / `md+` PC** |
| P0 | Undo/Redo | **결정: Phase 1 포함**, 고도화는 §1.5 |
| P0 | 다중 프로젝트 스키마 | **결정: 스키마 선행, UI 추후** |
| P0 | 배경 fit 모드 | **결정: cover** (영상·업로드 이미지) |
| P0 | 프레임 샘플링 | **결정: 중간점 균등 `(i+0.5)/N`** |
| P0 | imgly 라이선스 | 미결 — Phase 3 |
| P1 | 파일 크기 상한 | 미결 |
| P2 | 강제 3초 광고 | 미결 |
| P2 | PWA | 미결 |

---

## 9. 다음 스프린트 제안

**목표**: Phase 2 — 이미지 업로드 + 영상 프레임 → 배경/레이어 반영

1. 이미지 업로드 → Fabric Image 레이어  
2. 프레임 추출 실동 + 갤러리  
3. 배경 Rect와 프레임 이미지 합성 정책(cover) 확정  
4. (여유) undo 커맨드 메타 태깅  
