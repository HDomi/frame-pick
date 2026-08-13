import type { Canvas, FabricImage } from 'fabric'
import { ensureBackgroundLayer } from '@/lib/background-layer'
import { DEFAULT_IMAGE_FIT } from '@/lib/constants'
import type { LayerAwareObject } from '@/lib/layers'

/** 영상 프레임용 단일 교체 레이어 ID */
export const VIDEO_IMAGE_LAYER_ID = 'layer_video_image'

/** 영상 프레임 레이어 표시 이름 */
export const VIDEO_IMAGE_LAYER_NAME = '영상이미지'

/** 파일 업로드 이미지 레이어 표시 이름 */
export const UPLOADED_IMAGE_LAYER_NAME = '업로드된이미지'

export type ImageSourceKind = 'video' | 'upload'

/** 캔버스 대비 이미지 배치 방식 */
export type ImageFitMode = 'cover' | 'contain' | 'stretch'

export type ImageLayerObject = LayerAwareObject & {
  layerType: 'image'
  imageSource?: ImageSourceKind
  imageFit?: ImageFitMode
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
 * 이미지 fit 모드를 적용한다.
 * @param {FabricImage} image - Fabric 이미지
 * @param {number} canvasWidth - 논리 너비
 * @param {number} canvasHeight - 논리 높이
 * @param {ImageFitMode} mode - fit 모드
 * @returns {void}
 */
export function fitImageToCanvas(
  image: FabricImage,
  canvasWidth: number,
  canvasHeight: number,
  mode: ImageFitMode = DEFAULT_IMAGE_FIT,
): void {
  const element = image.getElement() as HTMLImageElement | HTMLCanvasElement
  const naturalWidth = element.width || 1
  const naturalHeight = element.height || 1

  let scaleX = canvasWidth / naturalWidth
  let scaleY = canvasHeight / naturalHeight

  if (mode === 'cover') {
    const scale = Math.max(scaleX, scaleY)
    scaleX = scale
    scaleY = scale
  } else if (mode === 'contain') {
    const scale = Math.min(scaleX, scaleY)
    scaleX = scale
    scaleY = scale
  }
  // stretch: scaleX/scaleY 그대로

  image.set({
    originX: 'center',
    originY: 'center',
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    scaleX,
    scaleY,
  })
  image.setCoords()
}

/**
 * @deprecated fitImageToCanvas(..., 'cover') 사용
 * @param {FabricImage} image - 이미지
 * @param {number} canvasWidth - 너비
 * @param {number} canvasHeight - 높이
 * @returns {void}
 */
export function fitImageCover(
  image: FabricImage,
  canvasWidth: number,
  canvasHeight: number,
): void {
  fitImageToCanvas(image, canvasWidth, canvasHeight, 'cover')
}

/**
 * 이미지 레이어 메타를 적용한다.
 * @param {FabricImage} image - Fabric 이미지
 * @param {{ layerId: string; layerName: string; imageSource: ImageSourceKind; imageFit?: ImageFitMode }} meta - 메타
 * @returns {ImageLayerObject}
 */
export function applyImageLayerMeta(
  image: FabricImage,
  meta: {
    layerId: string
    layerName: string
    imageSource: ImageSourceKind
    imageFit?: ImageFitMode
  },
): ImageLayerObject {
  const layerObject = image as unknown as ImageLayerObject
  layerObject.layerId = meta.layerId
  layerObject.layerName = meta.layerName
  layerObject.layerType = 'image'
  layerObject.imageSource = meta.imageSource
  layerObject.imageFit = meta.imageFit ?? DEFAULT_IMAGE_FIT
  return layerObject
}

/**
 * 영상이미지 레이어를 찾아 교체하거나 없으면 배경 바로 위에 추가한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {FabricImage} nextImage - 새 이미지
 * @param {ImageFitMode} [fit] - fit 모드
 * @returns {ImageLayerObject}
 */
export function upsertVideoImageLayer(
  canvas: Canvas,
  nextImage: FabricImage,
  fit: ImageFitMode = DEFAULT_IMAGE_FIT,
): ImageLayerObject {
  ensureBackgroundLayer(canvas)
  fitImageToCanvas(nextImage, canvas.getWidth(), canvas.getHeight(), fit)
  const layer = applyImageLayerMeta(nextImage, {
    layerId: VIDEO_IMAGE_LAYER_ID,
    layerName: VIDEO_IMAGE_LAYER_NAME,
    imageSource: 'video',
    imageFit: fit,
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
 * 업로드된이미지 레이어를 새로 추가한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {FabricImage} image - 이미지
 * @param {string} layerId - 새 레이어 ID
 * @param {ImageFitMode} [fit] - fit 모드
 * @returns {ImageLayerObject}
 */
export function addUploadedImageLayer(
  canvas: Canvas,
  image: FabricImage,
  layerId: string,
  fit: ImageFitMode = DEFAULT_IMAGE_FIT,
): ImageLayerObject {
  ensureBackgroundLayer(canvas)
  fitImageToCanvas(image, canvas.getWidth(), canvas.getHeight(), fit)
  const layer = applyImageLayerMeta(image, {
    layerId,
    layerName: UPLOADED_IMAGE_LAYER_NAME,
    imageSource: 'upload',
    imageFit: fit,
  })
  canvas.add(layer)
  canvas.setActiveObject(layer)
  canvas.requestRenderAll()
  return layer
}

/**
 * 선택(또는 지정) 이미지 레이어의 fit을 다시 적용한다.
 * @param {Canvas} canvas - 캔버스
 * @param {ImageLayerObject} object - 이미지 레이어
 * @param {ImageFitMode} fit - fit 모드
 * @returns {void}
 */
export function applyImageFitMode(
  canvas: Canvas,
  object: ImageLayerObject,
  fit: ImageFitMode,
): void {
  fitImageToCanvas(object as unknown as FabricImage, canvas.getWidth(), canvas.getHeight(), fit)
  object.imageFit = fit
  object.set('dirty', true)
  canvas.requestRenderAll()
  canvas.fire('object:modified', { target: object })
}
