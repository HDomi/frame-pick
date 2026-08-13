/** 영상에서 자동 추출할 프레임 개수 */
export const FRAME_EXTRACT_COUNT = 10

/** PNG 다운로드 전 광고 모달 대기 시간 (ms) */
export const DOWNLOAD_AD_DELAY_MS = 3000

/** GitHub Pages 프로젝트 경로 (로컬 dev는 빈 문자열) */
export const BASE_PATH = process.env.NODE_ENV === 'production' ? '/frame-pick' : ''

/** 텍스트 기본 채움색 */
export const DEFAULT_TEXT_FILL = '#ffffff'

/** 텍스트 기본 외곽선색 */
export const DEFAULT_TEXT_STROKE = '#000000'

/** 텍스트 기본 외곽선 두께 */
export const DEFAULT_TEXT_STROKE_WIDTH = 4

/** 텍스트 기본 크기 (FHD 기준, 720p에서는 스케일됨) */
export const DEFAULT_TEXT_FONT_SIZE = 96

/** 16:9 비율 */
export const CANVAS_ASPECT_RATIO = 16 / 9
