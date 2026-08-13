import type { Canvas, FabricImage } from 'fabric'
import { ActiveSelection } from 'fabric'
import {
  getArtboardBounds,
  getArtboardCenter,
  getWorkspaceSize,
  type ArtboardBounds,
} from '@/lib/artboard'
import { applyBackgroundProps, findBackgroundObject, isBackgroundObject } from '@/lib/background-layer'
import type { CanvasSize } from '@/lib/canvas-size'
import { createLayerId, ensureLayerMeta } from '@/lib/layers'

/** 워크스페이스(아트보드 밖) 배경색 */
export const WORKSPACE_BG = '#0c0e12'

/**
 * 캔버스를 아트보드+패딩 워크스페이스로 맞춘다.
 * 구버전 JSON(패딩 없음)은 객체를 패딩만큼 이동한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {Pick<CanvasSize, 'width' | 'height'>} artboard - 아트보드
 * @returns {ArtboardBounds}
 */
export function ensureWorkspaceLayout(
  canvas: Canvas,
  artboard: Pick<CanvasSize, 'width' | 'height'>,
): ArtboardBounds {
  const workspace = getWorkspaceSize(artboard)
  const prevWidth = canvas.getWidth()
  const prevHeight = canvas.getHeight()
  const background = findBackgroundObject(canvas)

  const wasArtboardOnly =
    Math.abs(prevWidth - artboard.width) < 1 && Math.abs(prevHeight - artboard.height) < 1

  const alreadyWorkspace =
    Math.abs(prevWidth - workspace.width) < 1 && Math.abs(prevHeight - workspace.height) < 1

  if (!alreadyWorkspace) {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    canvas.setZoom(1)
    canvas.setDimensions({
      width: workspace.width,
      height: workspace.height,
    })
  }

  canvas.backgroundColor = WORKSPACE_BG

  if (wasArtboardOnly && background) {
    canvas.getObjects().forEach((object) => {
      object.set({
        left: (object.left ?? 0) + workspace.padding,
        top: (object.top ?? 0) + workspace.padding,
      })
      object.setCoords()
    })
  }

  if (background) {
    const fill = background.fill
    applyBackgroundProps(
      background as never,
      artboard.width,
      artboard.height,
      fill as never,
      workspace.padding,
      workspace.padding,
    )
    canvas.sendObjectToBack(background)
  }

  return {
    left: workspace.padding,
    top: workspace.padding,
    width: artboard.width,
    height: artboard.height,
    padding: workspace.padding,
  }
}

/**
 * 이미지 원본 비율로 스티커처럼 배치한다. (캔버스보다 크면 맞춤 축소)
 * @param {FabricImage} image - 이미지
 * @param {ArtboardBounds} bounds - 아트보드
 * @returns {void}
 */
export function placeImageAsNaturalSticker(image: FabricImage, bounds: ArtboardBounds): void {
  const element = image.getElement() as HTMLImageElement | HTMLCanvasElement
  const naturalWidth = element.width || image.width || 1
  const naturalHeight = element.height || image.height || 1
  const maxWidth = bounds.width * 0.92
  const maxHeight = bounds.height * 0.92
  const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight)
  const center = getArtboardCenter(bounds)

  image.set({
    originX: 'center',
    originY: 'center',
    left: center.left,
    top: center.top,
    scaleX: scale,
    scaleY: scale,
  })
  image.setCoords()
}

/**
 * 이미지 파일을 스티커 레이어로 추가하고 선택한다.
 * @param {Canvas} canvas - 캔버스
 * @param {FabricImage} image - 이미지
 * @param {Pick<CanvasSize, 'width' | 'height'>} artboard - 아트보드
 * @param {string} [name] - 레이어 이름
 * @returns {FabricImage}
 */
export function addImageStickerLayer(
  canvas: Canvas,
  image: FabricImage,
  artboard: Pick<CanvasSize, 'width' | 'height'>,
  name = '이미지 스티커',
): FabricImage {
  const bounds = getArtboardBounds(canvas, artboard)
  placeImageAsNaturalSticker(image, bounds)

  const layer = ensureLayerMeta(image)
  layer.layerId = createLayerId()
  layer.layerType = 'sticker'
  layer.layerName = name
  layer.imageSource = 'upload'

  canvas.add(image)
  canvas.setActiveObject(image)
  canvas.requestRenderAll()
  return image
}

/**
 * 다중선택에서 배경을 제외한다.
 * @param {Canvas} canvas
 * @returns {void}
 */
function stripBackgroundFromSelection(canvas: Canvas): void {
  const active = canvas.getActiveObject()
  if (!(active instanceof ActiveSelection)) {
    if (isBackgroundObject(active)) {
      // 레이어 패널 등 프로그래밍 선택은 유지
      return
    }
    return
  }

  const kept = active.getObjects().filter((object) => !isBackgroundObject(object))
  if (kept.length === active.size()) {
    return
  }

  canvas.discardActiveObject()
  if (kept.length === 0) {
    canvas.requestRenderAll()
    return
  }
  if (kept.length === 1) {
    canvas.setActiveObject(kept[0])
    canvas.requestRenderAll()
    return
  }

  const next = new ActiveSelection(kept, { canvas })
  canvas.setActiveObject(next)
  canvas.requestRenderAll()
}

/**
 * 아트보드 밖 드래그 다중선택 + 아트보드 밖 객체 조작을 켠다.
 * 배경은 클릭을 가로채지 않도록 evented=false (레이어 패널로만 선택).
 * @param {Canvas} canvas - 캔버스
 * @returns {void}
 */
export function enableOffArtboardInteraction(canvas: Canvas): void {
  canvas.controlsAboveOverlay = true
  canvas.skipTargetFind = false
  canvas.selection = true

  const background = findBackgroundObject(canvas)
  if (background) {
    background.set({
      selectable: false,
      evented: false,
      hasBorders: false,
      hasControls: false,
    })
  }

  canvas.getObjects().forEach((object) => {
    if (isBackgroundObject(object)) {
      return
    }
    object.set({
      objectCaching: false,
    })
  })

  /**
   * @returns {void}
   */
  const handleSelection = () => {
    stripBackgroundFromSelection(canvas)
  }

  canvas.on('selection:created', handleSelection)
  canvas.on('selection:updated', handleSelection)
}
