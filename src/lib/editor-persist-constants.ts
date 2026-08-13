/** 자동 임시저장 간격 (ms) */
export const AUTO_SAVE_INTERVAL_MS = 60_000

/** undo/redo 최대 스텝 수 */
export const HISTORY_MAX_STEPS = 20

/** 드래프트 고정 키 */
export const DRAFT_ROW_ID = 'current'

/** 워크스페이스 상태 고정 키 */
export const WORKSPACE_ROW_ID = 'current'

/** 기본 프로젝트/페이지 (다중 프로젝트 UI 이전 시드) */
export const DEFAULT_PROJECT_ID = 'project_default'
export const DEFAULT_PAGE_ID = 'page_default'
export const DEFAULT_PROJECT_NAME = '기본 프로젝트'
export const DEFAULT_PAGE_NAME = '페이지 1'

/** Fabric toJSON에 포함할 커스텀 속성 */
export const CANVAS_JSON_PROPERTIES = [
  'layerId',
  'layerName',
  'layerType',
  'imageSource',
  'imageFit',
] as const
