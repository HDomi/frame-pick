# Frame Pick — 상세 개발 계획서 (PLAN_DETAIL.md)

> 상위 문서: [PLAN.md](./PLAN.md)  
> 현재 상태: **Phase 3 MVP 구현** — 누끼 다이얼로그(rembg MIT) + 스티커 + 텍스트 프리셋/stroke + 햄버거 약관 페이지. 광고는 stub.

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
- [x] 샘플 시점: **0~90% 구간** 균등 중간점 (`FRAME_SAMPLE_MAX_RATIO`)
- [x] 시킹 → `seeked` → canvas `drawImage` → JPEG dataURL
- [x] 순차 처리 + `AbortController` + 진행률
- [x] `VideoSessionProvider` + 프레임 **다이얼로그** (하단 갤러리 영역 제거)
- [x] 업로드 영상 유지 → 카드 클릭 시 다이얼로그 재오픈
- [x] 프레임 클릭 → **「영상이미지」** 레이어 cover 적용 (단일 레이어 교체)
- [x] **수동 시킹** 슬라이더 + 캡처/적용
- [x] **추출 중 편집 잠금**
- [x] fit: cover / contain / stretch
- [x] 프레임 수 **8장** (고정)
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

### 2.3 예상 버그 / 함정 — 대응 상태

| 이슈 | 원인 | 대응 | 상태 |
| :--- | :--- | :--- | :--- |
| MOV/HEVC 재생 불가 | Safari 외 브라우저 코덱 미지원 | 업로드 카피 + 에러 메시지 Chrome/MP4(H.264) 권장, 헤더 `?` 안내 | ✅ |
| `duration === Infinity` | 일부 webm/스트리밍식 메타데이터 | 강제 시킹·seekable fallback + 타임아웃 | ✅ |
| seek가 키프레임만 스냅 | 브라우저/코덱 한계 | 다이얼로그 카피 + seeked 타임아웃 폴백 | ✅ |
| 대용량 4K 영상 OOM | dataURL 다수 + 원본 | 섬네일 긴변 720 다운스케일, 적용 시 1920 재캡처, 200MB+ 경고 | ✅ |
| iOS Safari 제한 | 정책·메모리 | playsinline/muted + play/pause 깨우기, 헤더 `?`에 iOS 안내 | ✅ |
| 연속 업로드 메모리 누수 | ObjectURL/프레임 유지 | extract 시마다 revoke, 교체 시 frames 비움 | ✅ |
| 가로/세로 영상 배경 | 비-16:9 | cover/contain/stretch UI | ✅ |

### 2.4 기획 결정 (닫힘)

1. **샘플링 공식**: **0~90% 구간 고정** 균등 중간점 (`FRAME_SAMPLE_MAX_RATIO = 0.9`).
2. **수동 시킹**: **포함** — 프레임 다이얼로그 슬라이더로 시점 캡처/적용.
3. **프레임 수**: **고정 8장** (그리드 UX 균형). 옵션 UI는 두지 않음.
4. **배경 fit 모드**: **cover / contain / stretch 전부** — 적용 시·우측 패널에서 변경. 기본 `cover`.
5. **추출 중 편집 잠금**: **잠금** — 전역 로딩 + 캔버스 selection/타겟 비활성 + 툴 버튼 비활성.
6. **유튜브 URL 입력**: **미적용 (Out of Scope)** — 서버 없이 불가에 가까움.

---

## 3. Phase 3 — 누끼 제거 + 텍스트/레이어/스티커

### 3.1 할 일

#### AI 누끼 (다이얼로그 · lazy load)

- [x] 좌측 툴 버튼 라벨: **「누끼 후 업로드」** → 다이얼로그 오픈
- [x] 다이얼로그 플로우: 파일 선택 → (선택) 미리보기 → 누끼 실행 → 결과 확인 → **캔버스에 「업로드된이미지」로 추가**
- [x] 버튼 클릭 시에만 엔진 `import()` (초기 번들 제외)
- [x] 모델/WASM을 `public/`에 두고 `basePath` 정합
- [x] 진행 UI: “모델 준비 중…”, “배경 제거 중…” + 취소
- [x] 저사양 사전 경고 Confirm (§3.4.3)
- [x] 실패·타임아웃 토스트 + 폴백 문구

#### 텍스트 스타일 컨트롤

- [x] 선택 객체 변경 시 `TextControls` 동기화 (채움 색상은 부분 구현됨)
- [x] stroke / strokeWidth / fill / shadow / fontFamily / fontSize (charSpacing/lineHeight는 추후)
- [x] Highlight Box: Fabric `textBackgroundColor`
- [x] 그라데이션·곡선 텍스트: **MVP 제외** (§3.4.5)

#### 텍스트 프리셋

- [x] 카테고리 4종 + 카테고리당 2~3 프리셋 (§3.4.4)
- [x] 적용 시 새 텍스트 추가 또는 선택 텍스트에 스타일만 덮어쓰기 (기본: **선택 있으면 덮어쓰기, 없으면 추가**)

#### 약관 / 라이선스 / 내비

- [x] 헤더 로고 옆 **햄버거 메뉴** → 약관·라이선스·개인정보(고지) 페이지 이동
- [x] 정적 페이지: `/terms`, `/licenses`, `/privacy` (`output: 'export'` + `basePath` 호환)
- [x] 사용 패키지·에셋 라이선스 표기 (`§3.4.2`)

#### 레이어 매니저

- [x] Fabric 객체 ↔ `EditorLayer` 매핑
- [x] 위/아래, visible, delete (+ 배경 제한)
- [x] lock 토글(배경 외 일반 레이어)
- [x] 배경 레이어 삭제 제한

#### 스티커

- [x] MVP 세트: **직접 제작 YouTube 강조 SVG** + **Fluent Emoji Flat 서브셋(MIT)** (§3.4.6)
- [x] `public/stickers/{arrows,marks,emoji}/*.svg` + 매니페스트 JSON
- [x] SVG → Fabric 로드 (`BASE_PATH` 접두)
- [x] `/licenses`에 스티커·이모지 출처/라이선스 명시

### 3.2 완료 기준

- 「누끼 후 업로드」→ 다이얼로그에서만 누끼 → 투명 PNG가 업로드 이미지 레이어로 추가
- 첫 누끼만 모델 다운로드, 이후 캐시로 체감 개선
- 저사양에서 경고 Confirm 후 시도 가능 (버튼 숨김 없음)
- 텍스트 외곽선·그림자·프리셋 반영
- 레이어 순서가 캔버스 z-index와 일치 + lock
- 스티커 추가·변형 가능
- 햄버거 → 약관/라이선스 페이지 접근

### 3.3 예상 버그 / 함정

| 이슈 | 원인 | 대응 |
| :--- | :--- | :--- |
| WASM/모델 CORS 또는 404 | Pages + basePath + worker 경로 | `public/` 자체 호스팅, publicPath에 `BASE_PATH` |
| 첫 누끼 30초+ / 실패 | 모델 용량·네트워크·저사양 | 용량 안내, 진행 UI, 취소, §3.4.3 |
| 메인 스레드 정지 | WASM UI 블로킹 | worker/WebGPU 옵션, 전역 로딩 |
| 투명 PNG가 검게 export | premultiplied alpha | PNG export, fill 확인 |
| 레이어 목록 desync | Fabric 이벤트 미구독 | `object:added/removed/modified` | ✅ |
| 잠금 객체가 선택됨 | lock 플래그만 UI | `selectable`/`evented` | ✅ |
| SVG 스티커 폰트/스타일 유실 | 복잡한 SVG | path 단순 SVG + emoji flat만 |
| AGPL 광고 SaaS 리스크 | imgly AGPL-3.0 | **MIT 계열 엔진 채택** (§3.4.2) |
| 정적 export 라우트 404 | App Router 동적만 | `terms`/`licenses`/`privacy`를 정적 `page.tsx`로 |

### 3.4 기획 결정 (닫힘)

#### 3.4.1 누끼 대상 · UX

| 항목 | 결정 |
| :--- | :--- |
| 대상 | **선택 레이어 누끼 아님**. 항상 **새 파일 업로드 → 다이얼로그에서 누끼** |
| 버튼 문구 | **「누끼 후 업로드」** |
| 결과 레이어 | 투명 PNG를 **「업로드된이미지」** (`imageSource: 'upload'`)로 **신규 추가** (영상이미지와 분리) |
| 재편집 | 이미 올린 레이어를 다시 누끼하지 않음. 다시 하려면 다이얼로그에서 파일 재선택 |

**플로우**

```text
[누끼 후 업로드] → Dialog
  1) 이미지 선택 (png/jpeg/webp)
  2) 저사양/용량 경고 Confirm (해당 시)
  3) 모델 lazy load + 누끼 진행 (취소 가능)
  4) 전/후 미리보기
  5) [캔버스에 추가] → Fabric 이미지 레이어 → Dialog 닫기
```

#### 3.4.2 라이선스 · 약관 · 수익화

| 항목 | 결정 |
| :--- | :--- |
| 수익화 | AdSense/AdFit 등 **광고 수익 가능** 전제. 약관/라이선스 페이지에 고지 |
| 누끼 엔진 | `@imgly/background-removal`는 **AGPL-3.0** → 광고 있는 웹 서비스에 **카피레프트 리스크**. **채택하지 않음** |
| 대체 엔진 (1순위) | **`@bunnio/rembg-web`(MIT)** — 브라우저 ONNX, 모델 self-host |
| 대체 엔진 (2순위) | `@huggingface/transformers` + 세그멘테이션 모델 — **모델 카드 상업 조항을 구현 직 재확인** 후 확정 |
| 고지 UX | 로고 옆 **햄버거** → `이용약관` / `오픈소스·에셋 라이선스` / `개인정보 고지` |
| 경로 | `/terms`, `/licenses`, `/privacy` (GitHub Pages + `basePath`) |

`/licenses`에 최소 표기: rembg(또는 채택 엔진), onnxruntime, Fabric, 폰트, Fluent Emoji(해당 시), 자체 SVG.

> 법률 자문 대체가 아님. 배포 전 LICENSE 파일·모델 카드 원문을 한 번 더 확인한다.

#### 3.4.3 저사양 정책

**원칙: 버튼 숨김 없음. 경고 후 시도 허용.**

| 조건 (하나라도) | 판정 |
| :--- | :--- |
| `navigator.deviceMemory` ≤ 4 (지원 시) | 저사양 |
| `navigator.hardwareConcurrency` ≤ 4 | 저사양 |
| `matchMedia('(max-width: 767px)')` 또는 coarse pointer | 모바일/터치 → **항상 Confirm** |
| 입력 이미지 긴 변 > 2560 또는 파일 > 15MB | 대용량 → Confirm + (선택) 긴 변 1920 리사이즈 후 추론 |

**동작**

1. 저사양/모바일/대용량이면 Confirm: 예상 소요·메모리·탭 크래시 가능 안내 → 확인 시에만 진행.
2. 모델은 **경량 우선** (예: `u2netp` / quantized). 일반 기기는 기본 모델.
3. **타임아웃** (예: 90s) + **취소** → 부분 결과 폐기, 토스트.
4. OOM/실패 시: “이 기기에서는 누끼가 어려울 수 있습니다. 해상도를 낮추거나 PC에서 시도해 주세요.”
5. 패널 리사이즈·편집 잠금은 누끼 진행 중 전역 로딩과 동일하게 적용.

#### 3.4.4 프리셋 카테고리 상세

| 카테고리 | 용도 | 프리셋 예 (이름) | 스타일 요지 |
| :--- | :--- | :--- | :--- |
| 어그로 뉴스형 | 클릭유도 썸네일 | `속보`, `충격`, `특종` | Black Han Sans급 굵은 산세리프, 흰 채움 + 검정 두꺼운 stroke, 강한 그림자 |
| 브이로그/감성 | 일상·리뷰 | `감성`, `데일리` | Noto/고운 둥근 계열, 파스텔 fill, stroke 약함, 그림자 soft |
| 정보 전달형 | 요약·리스트 | `요약`, `꿀팁` | Noto Sans KR Bold, 높은 대비, stroke 중간, Highlight Box |
| 게임/리액션 | 하이라이트 | `GG`, `레전드` | 네온/원색 fill, 두꺼운 stroke+그림자, (스티커와 병행) |

- MVP: 카테고리 **4**, 총 프리셋 **8~10**.
- 폰트는 기존 로드 폰트 + 상용/SIL OFL 확인된 것만. (Cafe24 등은 라이선스 확인 후 포함)

#### 3.4.5 곡선 텍스트 · 그라데이션

| 항목 | 결정 |
| :--- | :--- |
| 곡선 텍스트 | **MVP 제외** (백로그) |
| 텍스트 그라데이션 fill | **MVP 제외** (백로그) |
| MVP 범위 | fill / stroke / strokeWidth / shadow / fontSize / fontFamily / charSpacing / lineHeight / Highlight Box |

#### 3.4.6 스티커 세트 범위

**방향**: “이모지 npm 통째 번들”보다 **유튜브 썸네일 필수 도형(자체 SVG) + MIT 이모지 소수 서브셋**.

| 그룹 | 내용 | 라이선스 | 수량(MVP) |
| :--- | :--- | :--- | :--- |
| arrows | 좌/우/위/곡선형 화살표, 원 강조 | 자체 제작 | 6~8 |
| marks | 느낌표, 물음표, 별, 번개, 말풍선(단순) | 자체 제작 | 6~8 |
| shapes | 둥근 사각/원 하이라이트 링 | 자체 제작 | 4 |
| emoji | 👍🔥😂😮✅❌ 등 리액션 | **Fluent Emoji Flat (MIT)** 서브셋만 vendoring | 12~16 |

**추천 패키지/소스 (참고)**

| 소스 | 라이선스 | 비고 |
| :--- | :--- | :--- |
| [microsoft/fluentui-emoji](https://github.com/microsoft/fluentui-emoji) Flat | MIT | **채택 후보** — 상업·광고 OK, NOTICE 유지 |
| [googlefonts/noto-emoji](https://github.com/googlefonts/noto-emoji) | Apache-2.0 | 대안 |
| Twemoji | CC-BY 4.0 | 사용 가능하나 **표시 크레딧** 필요 → MVP에서는 비우선 |
| OpenMoji | CC-BY-SA 4.0 | ShareAlike → **제외** |
| `@svgmoji/*` | 래퍼 MIT, 에셋은 원본 라이선스 | CDN 전체 스프라이트(수 MB)는 **비권장** — 필요 파일만 `public/`에 복사 |
| Lucide / Phosphor | MIT | 아이콘용. 썸네일 “스티커감”은 약함 → 보조만 |

구현: 스티커 패널 카테고리 탭 → 클릭 시 `FabricImage.fromURL(\`${BASE_PATH}/stickers/...\`)` 또는 path SVG.

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
7) 텍스트 stroke/shadow 확장 + 프리셋 + 스티커
8) 누끼 다이얼로그 lazy load (MIT 엔진)
8b) 햄버거 + 약관/라이선스 페이지
9) 다운로드 모달 + 광고
10) 프로젝트/페이지 UI (스키마 이미 준비)
```

---

## 7. Out of Scope (명시)

- 유튜브 URL 입력·원격 영상 다운로드 (서버 필요)
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
| P0 | 배경 fit 모드 | **결정: cover/contain/stretch 전부**, 기본 cover |
| P0 | 프레임 샘플링 | **결정: 0~90% 균등 중간점, 8장** |
| P0 | imgly 라이선스 | **결정: AGPL 미채택**. MIT `@bunnio/rembg-web` 1순위 (§3.4.2) |
| P0 | 누끼 UX | **결정: 「누끼 후 업로드」다이얼로그**, 선택 레이어 누끼 없음 |
| P0 | 저사양 누끼 | **결정: 숨김 없음, 경고 후 시도** (§3.4.3) |
| P0 | 곡선/그라데이션 텍스트 | **결정: MVP 제외** |
| P0 | 스티커 범위 | **결정: 자체 SVG + Fluent Emoji Flat 서브셋** (§3.4.6) |
| P1 | 텍스트 프리셋 상세 | **결정: 4카테고리 / 8~10프리셋** (§3.4.4) |
| P1 | 파일 크기 상한 | **부분 결정: 누끼 입력 15MB·긴변 2560 경고** (일반 업로드 상한은 추후) |
| P2 | 강제 3초 광고 | 미결 |
| P2 | PWA | 미결 |

---

## 9. 다음 스프린트 제안

**목표**: Phase 3 착수 — 누끼 다이얼로그 + 약관/햄버거 + 스티커 MVP + 텍스트 stroke

1. 헤더 햄버거 + `/terms` `/licenses` `/privacy` 정적 페이지  
2. 「누끼 후 업로드」다이얼로그 + `@bunnio/rembg-web` lazy + 저사양 Confirm  
3. 스티커 매니페스트 + 자체 SVG + Fluent Flat 소수  
4. 텍스트 stroke/shadow/Highlight Box + 프리셋 4카테고리  
