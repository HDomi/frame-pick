import type { Canvas, FabricImage } from 'fabric'
import { getArtboardBounds } from '@/lib/artboard'
import { ensureBackgroundLayer } from '@/lib/background-layer'
import type { CanvasSize } from '@/lib/canvas-size'
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
 * 이미지 fit 모드를 아트보드 기준으로 적용한다.
 * @param {FabricImage} image - Fabric 이미지
 * @param {number} artboardWidth - 아트보드 가로
 * @param {number} artboardHeight - 아트보드 세로
 * @param {ImageFitMode} mode - fit 모드
 * @param {{ left: number; top: number }} [origin] - 아트보드 원점
 * @returns {void}
 */
export function fitImageToCanvas(
  image: FabricImage,
  artboardWidth: number,
  artboardHeight: number,
  mode: ImageFitMode = DEFAULT_IMAGE_FIT,
  origin: { left: number; top: number } = { left: 0, top: 0 },
): void {
  const element = image.getElement() as HTMLImageElement | HTMLCanvasElement
  const naturalWidth = element.width || 1
  const naturalHeight = element.height || 1

  let scaleX = artboardWidth / naturalWidth
  let scaleY = artboardHeight / naturalHeight

  if (mode === 'cover') {
    const scale = Math.max(scaleX, scaleY)
    scaleX = scale
    scaleY = scale
  } else if (mode === 'contain') {
    const scale = Math.min(scaleX, scaleY)
    scaleX = scale
    scaleY = scale
  }

  image.set({
    originX: 'center',
    originY: 'center',
    left: origin.left + artboardWidth / 2,
    top: origin.top + artboardHeight / 2,
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
 * 캔버스에서 아트보드 영역을 구한다.
 * @param {Canvas} canvas - 캔버스
 * @returns {{ left: number; top: number; width: number; height: number }}
 */
function resolveArtboard(canvas: Canvas): {
  left: number
  top: number
  width: number
  height: number
} {
  const background = canvas.getObjects().find((object) => {
    return (object as LayerAwareObject).layerType === 'background'
  })
  if (background && (background.width ?? 0) > 100) {
    return {
      left: background.left ?? 0,
      top: background.top ?? 0,
      width: background.width ?? canvas.getWidth(),
      height: background.height ?? canvas.getHeight(),
    }
  }

  const hint: Pick<CanvasSize, 'width' | 'height'> = {
    width: 1920,
    height: 1080,
  }
  return getArtboardBounds(canvas, hint)
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
  const artboard = resolveArtboard(canvas)
  fitImageToCanvas(nextImage, artboard.width, artboard.height, fit, {
    left: artboard.left,
    top: artboard.top,
  })
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
  const artboard = resolveArtboard(canvas)
  fitImageToCanvas(image, artboard.width, artboard.height, fit, {
    left: artboard.left,
    top: artboard.top,
  })
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
  const artboard = resolveArtboard(canvas)
  fitImageToCanvas(
    object as unknown as FabricImage,
    artboard.width,
    artboard.height,
    fit,
    { left: artboard.left, top: artboard.top },
  )
  object.imageFit = fit
  object.set('dirty', true)
  canvas.requestRenderAll()
  canvas.fire('object:modified', { target: object })
}
