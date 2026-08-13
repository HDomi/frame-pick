/**
 * 에디터 레이어 종류
 */
export type LayerType = 'background' | 'image' | 'text' | 'sticker'

/**
 * 캔버스에 올라가는 레이어 메타데이터
 */
export interface EditorLayer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  locked: boolean
  /** false면 UI/단축키에서 삭제 불가 (배경) */
  deletable: boolean
  /** 이미지 출처 (영상/업로드) */
  imageSource?: 'video' | 'upload'
}

/**
 * 영상에서 추출한 프레임 섬네일
 */
export interface ExtractedFrame {
  id: string
  index: number
  timeSec: number
  dataUrl: string
}

/**
 * 텍스트 스타일 프리셋
 */
export interface TextStylePreset {
  id: string
  name: string
  fontFamily: string
  fontSize: number
  fill: string
  stroke: string
  strokeWidth: number
}
