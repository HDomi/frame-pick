import type { Canvas } from 'fabric'
import { ActiveSelection, FabricImage } from 'fabric'
import type { CanvasSizeId } from '@/lib/canvas-size'
import { getCanvasSizeById } from '@/lib/canvas-size'
import { getWorkspaceSize } from '@/lib/artboard'
import { ensureBackgroundLayer, isBackgroundObject } from '@/lib/background-layer'
import { fitCanvasToContainer } from '@/lib/canvas-fit'
import { CANVAS_JSON_PROPERTIES } from '@/lib/editor-persist-constants'
import { ensureWorkspaceLayout } from '@/lib/image-sticker'
import {
  restoreImageOverlay,
  type OverlayAwareImage,
} from '@/lib/image-overlay'
import type { LayerAwareObject } from '@/lib/layers'
import { normalizeCanvasTextObjects } from '@/lib/normalize-canvas-text'

export interface EditorSnapshot {
  sizeId: CanvasSizeId
  canvasJson: string
  /** undo 후 선택 복원용 layerId 목록 */
  activeLayerIds?: string[]
}

/**
 * 현재 선택 객체의 layerId 목록을 수집한다.
 * @param {Canvas} canvas
 * @returns {string[]}
 */
function collectActiveLayerIds(canvas: Canvas): string[] {
  return canvas
    .getActiveObjects()
    .map((object) => (object as LayerAwareObject).layerId)
    .filter((id): id is string => Boolean(id))
}

/**
 * 현재 캔버스 상태를 스냅샷으로 직렬화한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {CanvasSizeId} sizeId - 해상도 프리셋 ID
 * @returns {EditorSnapshot} - 스냅샷
 */
export function createEditorSnapshot(canvas: Canvas, sizeId: CanvasSizeId): EditorSnapshot {
  const json = canvas.toObject([...CANVAS_JSON_PROPERTIES]) as Record<string, unknown>
  const activeLayerIds = collectActiveLayerIds(canvas)
  json.activeLayerIds = activeLayerIds
  return {
    sizeId,
    canvasJson: JSON.stringify(json),
    activeLayerIds,
  }
}

/**
 * 스냅샷을 캔버스에 복원한 뒤 좌표/렌더를 재계산한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {string} canvasJson - 직렬화된 JSON 문자열
 * @param {CanvasSizeId} [sizeId]
 * @returns {Promise<void>}
 */
export async function applyCanvasJson(
  canvas: Canvas,
  canvasJson: string,
  sizeId?: CanvasSizeId,
): Promise<void> {
  const parsed = JSON.parse(canvasJson) as {
    activeLayerIds?: string[]
  } & object
  const activeLayerIds = Array.isArray(parsed.activeLayerIds) ? parsed.activeLayerIds : []
  await canvas.loadFromJSON(parsed)

  canvas.getObjects().forEach((object) => {
    object.setCoords()
    object.set('dirty', true)
  })

  const artboard = sizeId
    ? getCanvasSizeById(sizeId)
    : { width: 1920, height: 1080 }
  ensureWorkspaceLayout(canvas, artboard)
  ensureBackgroundLayer(canvas)

  const restores: Promise<void>[] = []
  canvas.getObjects().forEach((object) => {
    if (object instanceof FabricImage) {
      restores.push(restoreImageOverlay(object as OverlayAwareImage))
    }
  })
  await Promise.all(restores)

  normalizeCanvasTextObjects(canvas, artboard)

  canvas.discardActiveObject()
  if (activeLayerIds.length > 0) {
    const matched = canvas
      .getObjects()
      .filter((object) => {
        const id = (object as LayerAwareObject).layerId
        return id != null && activeLayerIds.includes(id)
      })
    if (matched.length === 1) {
      canvas.setActiveObject(matched[0]!)
    } else if (matched.length > 1) {
      const selection = new ActiveSelection(matched, { canvas })
      canvas.setActiveObject(selection)
    }
  }

  canvas.calcOffset()
  canvas.requestRenderAll()
}

/**
 * CSS 스케일(fit)을 컨테이너에 다시 맞춘다.
 * undo/redo 중 setDimensions가 cssOnly를 깨뜨린 경우를 복구한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {CanvasSizeId} sizeId - 논리 해상도 ID
 * @returns {void}
 */
export function refitCanvasDisplay(canvas: Canvas, sizeId: CanvasSizeId): void {
  const size = getCanvasSizeById(sizeId)
  const workspace = getWorkspaceSize(size)
  const wrapper = canvas.wrapperEl
  const container = wrapper?.parentElement
  if (!container) {
    return
  }
  fitCanvasToContainer(canvas, container, workspace.width, workspace.height)
}

/**
 * 배경을 제외한 캔버스 객체를 모두 제거한 뒤 배경을 재확보한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @returns {void}
 */
export function clearCanvasObjects(canvas: Canvas): void {
  canvas.discardActiveObject()
  canvas.getObjects().forEach((object) => {
    if (!isBackgroundObject(object)) {
      canvas.remove(object)
    }
  })
  canvas.backgroundImage = undefined
  ensureBackgroundLayer(canvas)
  canvas.requestRenderAll()
}
