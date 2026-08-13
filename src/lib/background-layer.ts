import { Rect, type Canvas, type FabricObject } from 'fabric'
import type { LayerAwareObject } from '@/lib/layers'

/** 배경 레이어 고정 ID — 절대 변경/삭제하지 않음 */
export const BACKGROUND_LAYER_ID = 'layer_background'

/** 기본 배경 색상 */
export const DEFAULT_BACKGROUND_FILL = '#1a1d24'

export type BackgroundObject = LayerAwareObject & {
  layerType: 'background'
}

/**
 * 객체가 잠긴 배경 레이어인지 판별한다.
 * @param {FabricObject | null | undefined} object - 검사 대상
 * @returns {boolean}
 */
export function isBackgroundObject(object: FabricObject | null | undefined): boolean {
  if (!object) {
    return false
  }
  const layerObject = object as LayerAwareObject
  return (
    layerObject.layerId === BACKGROUND_LAYER_ID || layerObject.layerType === 'background'
  )
}

/**
 * 배경 Rect에 잠금·메타 속성을 적용한다.
 * @param {Rect} rect - 배경 Rect
 * @param {number} width - 캔버스 논리 너비
 * @param {number} height - 캔버스 논리 높이
 * @param {string} [fill] - 채움 색
 * @returns {BackgroundObject}
 */
export function applyBackgroundProps(
  rect: Rect,
  width: number,
  height: number,
  fill: string = DEFAULT_BACKGROUND_FILL,
): BackgroundObject {
  rect.set({
    left: 0,
    top: 0,
    width,
    height,
    fill,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    originX: 'left',
    originY: 'top',
    selectable: true,
    evented: true,
    hasControls: false,
    hasBorders: true,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    lockSkewingX: true,
    lockSkewingY: true,
    hoverCursor: 'default',
    moveCursor: 'default',
    objectCaching: false,
  })
  const background = rect as unknown as BackgroundObject
  background.layerId = BACKGROUND_LAYER_ID
  background.layerName = '배경'
  background.layerType = 'background'
  background.setCoords()
  return background
}

/**
 * 새 배경 Rect를 생성한다.
 * @param {number} width - 논리 너비
 * @param {number} height - 논리 높이
 * @param {string} [fill] - 채움 색
 * @returns {BackgroundObject}
 */
export function createBackgroundRect(
  width: number,
  height: number,
  fill: string = DEFAULT_BACKGROUND_FILL,
): BackgroundObject {
  return applyBackgroundProps(new Rect(), width, height, fill)
}

/**
 * 캔버스에서 배경 객체를 찾는다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @returns {BackgroundObject | undefined}
 */
export function findBackgroundObject(canvas: Canvas): BackgroundObject | undefined {
  return canvas.getObjects().find(isBackgroundObject) as BackgroundObject | undefined
}

/**
 * 배경을 캔버스 크기에 맞추고 최하위로 고정한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {BackgroundObject} background - 배경 객체
 * @returns {void}
 */
export function syncBackgroundToCanvas(canvas: Canvas, background: BackgroundObject): void {
  const fill =
    typeof background.fill === 'string' && background.fill
      ? background.fill
      : DEFAULT_BACKGROUND_FILL
  applyBackgroundProps(background as unknown as Rect, canvas.getWidth(), canvas.getHeight(), fill)
  canvas.sendObjectToBack(background)
  canvas.requestRenderAll()
}

/**
 * 배경 레이어가 없으면 생성하고, 있으면 크기·잠금·순서를 보정한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {string} [fallbackFill] - 신규 생성 시 색상
 * @returns {BackgroundObject}
 */
export function ensureBackgroundLayer(
  canvas: Canvas,
  fallbackFill: string = DEFAULT_BACKGROUND_FILL,
): BackgroundObject {
  const existing = findBackgroundObject(canvas)
  if (existing) {
    syncBackgroundToCanvas(canvas, existing)
    return existing
  }

  const background = createBackgroundRect(
    canvas.getWidth(),
    canvas.getHeight(),
    fallbackFill,
  )
  canvas.add(background)
  canvas.sendObjectToBack(background)
  canvas.requestRenderAll()
  return background
}

/**
 * 배경 채움 색을 반환한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @returns {string}
 */
export function getBackgroundFill(canvas: Canvas): string {
  const background = findBackgroundObject(canvas)
  if (background && typeof background.fill === 'string' && background.fill) {
    return background.fill
  }
  return DEFAULT_BACKGROUND_FILL
}

/**
 * 배경 채움 색을 설정한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {string} fill - hex 색상
 * @returns {void}
 */
export function setBackgroundFill(canvas: Canvas, fill: string): void {
  const background = ensureBackgroundLayer(canvas, fill)
  background.set('fill', fill)
  background.set('dirty', true)
  canvas.requestRenderAll()
  canvas.fire('object:modified', { target: background })
}
