import { ActiveSelection, type Canvas, type FabricObject } from 'fabric'
import { isBackgroundObject } from '@/lib/background-layer'
import { CANVAS_JSON_PROPERTIES } from '@/lib/editor-persist-constants'
import { VIDEO_IMAGE_LAYER_ID } from '@/lib/image-layer'
import {
  createLayerId,
  ensureLayerMeta,
  type LayerAwareObject,
} from '@/lib/layers'

/** 붙여넣기마다 이동 오프셋 (px) */
export const PASTE_OFFSET_PX = 24

const CLONE_PROPS = [...CANVAS_JSON_PROPERTIES]

/** 메모리 클립보드 (Fabric 클론) */
let clipboardClone: FabricObject | null = null
let pasteGeneration = 0

/**
 * 입력 포커스 중인지 (네이티브 복사/붙여넣기 우선)
 * @param {EventTarget | null} target
 * @returns {boolean}
 */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

/**
 * 텍스트 편집 중인지
 * @param {FabricObject | null | undefined} object
 * @returns {boolean}
 */
function isTextEditing(object: FabricObject | null | undefined): boolean {
  if (!object) {
    return false
  }
  return Boolean((object as { isEditing?: boolean }).isEditing)
}

/**
 * 붙여넣은 객체에 새 레이어 메타·잠금 해제를 적용한다.
 * @param {FabricObject} object
 * @returns {void}
 */
function preparePastedObject(object: FabricObject): void {
  const layer = ensureLayerMeta(object) as LayerAwareObject
  const wasVideoSingleton =
    layer.layerId === VIDEO_IMAGE_LAYER_ID || layer.imageSource === 'video'

  layer.layerId = createLayerId()
  if (wasVideoSingleton) {
    layer.imageSource = 'upload'
  }

  const name = layer.layerName?.trim() || '레이어'
  if (!name.includes('복사')) {
    layer.layerName = `${name} 복사`
  }

  object.set({
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    lockMovementX: false,
    lockMovementY: false,
    lockScalingX: false,
    lockScalingY: false,
    lockRotation: false,
    lockSkewingX: false,
    lockSkewingY: false,
  })
  object.setCoords()
}

/**
 * 활성 객체를 클립보드에 복사한다. (배경·텍스트 편집 중 제외)
 * @param {Canvas | null} canvas
 * @returns {Promise<boolean>}
 */
export async function copyCanvasSelection(canvas: Canvas | null): Promise<boolean> {
  if (!canvas) {
    return false
  }
  const active = canvas.getActiveObject()
  if (!active || isBackgroundObject(active) || isTextEditing(active)) {
    return false
  }

  if (active instanceof ActiveSelection) {
    const copyable = active.getObjects().filter((object) => !isBackgroundObject(object))
    if (copyable.length === 0) {
      return false
    }
  }

  clipboardClone = await active.clone(CLONE_PROPS)
  pasteGeneration = 0
  return true
}

/**
 * 클립보드 객체를 오프셋하여 붙여넣는다.
 * @param {Canvas | null} canvas
 * @returns {Promise<boolean>}
 */
export async function pasteCanvasClipboard(canvas: Canvas | null): Promise<boolean> {
  if (!canvas || !clipboardClone) {
    return false
  }

  pasteGeneration += 1
  const offset = PASTE_OFFSET_PX * pasteGeneration
  const cloned = await clipboardClone.clone(CLONE_PROPS)

  cloned.set({
    left: (cloned.left ?? 0) + offset,
    top: (cloned.top ?? 0) + offset,
    evented: true,
  })

  canvas.discardActiveObject()

  if (cloned instanceof ActiveSelection) {
    cloned.canvas = canvas
    cloned.getObjects().forEach((child) => {
      preparePastedObject(child)
      canvas.add(child)
    })
    cloned.setCoords()
    canvas.setActiveObject(cloned)
    canvas.fire('object:modified', { target: cloned })
  } else {
    preparePastedObject(cloned)
    canvas.add(cloned)
    canvas.setActiveObject(cloned)
    canvas.fire('object:modified', { target: cloned })
  }

  canvas.requestRenderAll()
  return true
}

/**
 * 클립보드에 내용이 있는지
 * @returns {boolean}
 */
export function hasCanvasClipboard(): boolean {
  return clipboardClone != null
}
