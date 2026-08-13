import type { FabricObject } from 'fabric'
import { BACKGROUND_LAYER_ID, isBackgroundObject } from '@/lib/background-layer'
import {
  UPLOADED_IMAGE_LAYER_NAME,
  VIDEO_IMAGE_LAYER_ID,
  VIDEO_IMAGE_LAYER_NAME,
  type ImageSourceKind,
  isVideoImageObject,
} from '@/lib/image-layer'
import type { EditorLayer, LayerType } from '@/types/editor'

export type LayerAwareObject = FabricObject & {
  layerId?: string
  layerName?: string
  layerType?: LayerType
  imageSource?: ImageSourceKind
}

/**
 * 레이어 고유 ID를 생성한다.
 * @returns {string} - layer id
 */
export function createLayerId(): string {
  return `layer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Fabric 객체 타입으로 레이어 종류를 추론한다.
 * @param {FabricObject} object - Fabric 객체
 * @returns {LayerType} - 레이어 타입
 */
export function inferLayerType(object: FabricObject): LayerType {
  const type = object.type?.toLowerCase() ?? ''

  if (type.includes('text') || type === 'i-text' || type === 'textbox') {
    return 'text'
  }
  if (type === 'image') {
    return 'image'
  }
  if (type === 'path' || type === 'group' || type === 'polyline') {
    return 'sticker'
  }
  return 'sticker'
}

/**
 * 레이어 기본 표시 이름을 만든다.
 * @param {LayerType} layerType - 레이어 타입
 * @param {FabricObject} object - Fabric 객체
 * @returns {string} - 표시 이름
 */
export function createDefaultLayerName(layerType: LayerType, object: FabricObject): string {
  if (layerType === 'text') {
    const textValue = 'text' in object ? String((object as { text?: string }).text ?? '') : ''
    const trimmed = textValue.trim()
    return trimmed ? trimmed.slice(0, 16) : '텍스트'
  }
  if (layerType === 'image') {
    if (isVideoImageObject(object as LayerAwareObject)) {
      return VIDEO_IMAGE_LAYER_NAME
    }
    const source = (object as LayerAwareObject).imageSource
    if (source === 'upload') {
      return UPLOADED_IMAGE_LAYER_NAME
    }
    return '이미지'
  }
  if (layerType === 'background') {
    return '배경'
  }
  return '스티커'
}

/**
 * Fabric 객체에 레이어 메타데이터가 없으면 부여한다.
 * @param {FabricObject} object - Fabric 객체
 * @returns {LayerAwareObject} - 메타데이터가 붙은 객체
 */
export function ensureLayerMeta(object: FabricObject): LayerAwareObject {
  const layerObject = object as LayerAwareObject

  if (isBackgroundObject(object)) {
    layerObject.layerId = BACKGROUND_LAYER_ID
    layerObject.layerType = 'background'
    layerObject.layerName = '배경'
    return layerObject
  }

  if (isVideoImageObject(layerObject) || layerObject.layerId === VIDEO_IMAGE_LAYER_ID) {
    layerObject.layerId = VIDEO_IMAGE_LAYER_ID
    layerObject.layerType = 'image'
    layerObject.layerName = VIDEO_IMAGE_LAYER_NAME
    layerObject.imageSource = 'video'
    return layerObject
  }

  if (!layerObject.layerId) {
    layerObject.layerId = createLayerId()
  }
  if (!layerObject.layerType) {
    layerObject.layerType = inferLayerType(object)
  }
  if (layerObject.layerType === 'image' && !layerObject.imageSource) {
    layerObject.imageSource = 'upload'
    if (!layerObject.layerName || layerObject.layerName === '이미지') {
      layerObject.layerName = UPLOADED_IMAGE_LAYER_NAME
    }
  }
  if (layerObject.layerType === 'text') {
    layerObject.layerName = createDefaultLayerName('text', object)
  } else if (!layerObject.layerName) {
    layerObject.layerName = createDefaultLayerName(layerObject.layerType, object)
  }

  return layerObject
}

/**
 * Fabric 객체를 EditorLayer로 변환한다.
 * @param {FabricObject} object - Fabric 객체
 * @returns {EditorLayer} - 에디터 레이어
 */
export function toEditorLayer(object: FabricObject): EditorLayer {
  const layerObject = ensureLayerMeta(object)
  const isBackground = layerObject.layerType === 'background'

  return {
    id: layerObject.layerId!,
    name: layerObject.layerName!,
    type: layerObject.layerType!,
    visible: object.visible !== false,
    locked: isBackground || object.selectable === false || object.evented === false,
    deletable: !isBackground,
  }
}

/**
 * 캔버스 객체 목록을 포토샵처럼 위=앞 순서로 변환한다.
 * @param {FabricObject[]} objects - Fabric getObjects() (아래→위)
 * @returns {EditorLayer[]} - UI용 레이어 목록 (위→아래)
 */
export function listLayersFrontFirst(objects: FabricObject[]): EditorLayer[] {
  return [...objects].reverse().map(toEditorLayer)
}

/**
 * ID로 캔버스 객체를 찾는다.
 * @param {FabricObject[]} objects - 객체 목록
 * @param {string} layerId - 레이어 ID
 * @returns {LayerAwareObject | undefined} - 찾은 객체
 */
export function findObjectByLayerId(
  objects: FabricObject[],
  layerId: string,
): LayerAwareObject | undefined {
  return objects.find((object) => {
    const layerObject = ensureLayerMeta(object)
    return layerObject.layerId === layerId
  }) as LayerAwareObject | undefined
}
