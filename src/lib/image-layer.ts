import type { Canvas, FabricImage } from 'fabric'
import { ensureBackgroundLayer } from '@/lib/background-layer'
import type { LayerAwareObject } from '@/lib/layers'

/** 영상 프레임용 단일 교체 레이어 ID */
export const VIDEO_IMAGE_LAYER_ID = 'layer_video_image'

/** 영상 프레임 레이어 표시 이름 */
export const VIDEO_IMAGE_LAYER_NAME = '영상이미지'

/** 파일 업로드 이미지 레이어 표시 이름 */
export const UPLOADED_IMAGE_LAYER_NAME = '업로드된이미지'

export type ImageSourceKind = 'video' | 'upload'

export type ImageLayerObject = LayerAwareObject & {
  layerType: 'image'
  imageSource?: ImageSourceKind
}

/**
 * 객체가 영상이미지 레이어인지 판별한다.
 * @param {LayerAwareObject | null | undefined} object - 검사 대상
 * @returns {boolean}
 */
export function isVideoImageObject(
  object: LayerAwareObject | null | undefined,
): boolean {
  if (!object) {
    return false
  }
  return (
    object.layerId === VIDEO_IMAGE_LAYER_ID || object.imageSource === 'video'
  )
}

/**
 * 이미지가 캔버스를 cover로 채우도록 스케일·위치를 맞춘다.
 * @param {FabricImage} image - Fabric 이미지
 * @param {number} canvasWidth - 논리 너비
 * @param {number} canvasHeight - 논리 높이
 * @returns {void}
 */
export function fitImageCover(
  image: FabricImage,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const element = image.getElement() as HTMLImageElement | HTMLCanvasElement
  const naturalWidth = element.width || 1
  const naturalHeight = element.height || 1
  const scale = Math.max(canvasWidth / naturalWidth, canvasHeight / naturalHeight)

  image.set({
    originX: 'center',
    originY: 'center',
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    scaleX: scale,
    scaleY: scale,
  })
  image.setCoords()
}

/**
 * 이미지 레이어 메타를 적용한다.
 * @param {FabricImage} image - Fabric 이미지
 * @param {{ layerId: string; layerName: string; imageSource: ImageSourceKind }} meta - 메타
 * @returns {ImageLayerObject}
 */
export function applyImageLayerMeta(
  image: FabricImage,
  meta: { layerId: string; layerName: string; imageSource: ImageSourceKind },
): ImageLayerObject {
  const layerObject = image as unknown as ImageLayerObject
  layerObject.layerId = meta.layerId
  layerObject.layerName = meta.layerName
  layerObject.layerType = 'image'
  layerObject.imageSource = meta.imageSource
  return layerObject
}

/**
 * 영상이미지 레이어를 찾아 교체하거나 없으면 배경 바로 위에 추가한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {FabricImage} nextImage - 새 이미지
 * @returns {ImageLayerObject}
 */
export function upsertVideoImageLayer(canvas: Canvas, nextImage: FabricImage): ImageLayerObject {
  ensureBackgroundLayer(canvas)
  fitImageCover(nextImage, canvas.getWidth(), canvas.getHeight())
  const layer = applyImageLayerMeta(nextImage, {
    layerId: VIDEO_IMAGE_LAYER_ID,
    layerName: VIDEO_IMAGE_LAYER_NAME,
    imageSource: 'video',
  })

  const existing = canvas.getObjects().find((object) => {
    const layerObject = object as ImageLayerObject
    return isVideoImageObject(layerObject)
  })

  if (existing) {
    const index = canvas.getObjects().indexOf(existing)
    canvas.remove(existing)
    canvas.insertAt(index, layer)
  } else {
    canvas.add(layer)
    // 배경 바로 위(인덱스 1)로 고정
    const objects = canvas.getObjects()
    const backgroundIndex = objects.findIndex(
      (object) => (object as LayerAwareObject).layerType === 'background',
    )
    if (backgroundIndex >= 0) {
      canvas.moveObjectTo(layer, backgroundIndex + 1)
    }
  }

  canvas.setActiveObject(layer)
  canvas.requestRenderAll()
  return layer
}

/**
 * 업로드된이미지 레이어를 새로 추가한다. (영상이미지와 절대 병합하지 않음)
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {FabricImage} image - 이미지
 * @param {string} layerId - 새 레이어 ID
 * @returns {ImageLayerObject}
 */
export function addUploadedImageLayer(
  canvas: Canvas,
  image: FabricImage,
  layerId: string,
): ImageLayerObject {
  ensureBackgroundLayer(canvas)
  fitImageCover(image, canvas.getWidth(), canvas.getHeight())
  const layer = applyImageLayerMeta(image, {
    layerId,
    layerName: UPLOADED_IMAGE_LAYER_NAME,
    imageSource: 'upload',
  })
  canvas.add(layer)
  canvas.setActiveObject(layer)
  canvas.requestRenderAll()
  return layer
}
