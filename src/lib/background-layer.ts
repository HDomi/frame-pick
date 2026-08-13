import { Gradient, Rect, type Canvas, type FabricObject } from 'fabric'
import { getArtboardPadding, getWorkspaceSize } from '@/lib/artboard'
import {
  createFabricFill,
  createSolidFill,
  parseFabricFill,
  type FillValue,
} from '@/lib/fill-value'
import type { LayerAwareObject } from '@/lib/layers'

/** 배경 레이어 고정 ID — 절대 변경/삭제하지 않음 */
export const BACKGROUND_LAYER_ID = 'layer_background'

/** 기본 배경 색상 */
export const DEFAULT_BACKGROUND_FILL = '#1a1d24'

export type BackgroundObject = LayerAwareObject & {
  layerType: 'background'
}

export type BackgroundFillInput = string | Gradient<'linear'> | FillValue

/**
 * 배경에 넣을 fill 값을 정규화한다.
 * @param {unknown} fill
 * @returns {string | Gradient<'linear'>}
 */
function resolveBackgroundFabricFill(fill: unknown): string | Gradient<'linear'> {
  if (fill instanceof Gradient) {
    return fill
  }
  if (typeof fill === 'string' && fill) {
    return fill
  }
  if (fill && typeof fill === 'object' && 'mode' in fill) {
    return createFabricFill(fill as FillValue)
  }
  // sync 시 기존 Gradient plain / 유지
  if (fill && typeof fill === 'object' && 'colorStops' in fill) {
    return createFabricFill(parseFabricFill(fill, DEFAULT_BACKGROUND_FILL))
  }
  return DEFAULT_BACKGROUND_FILL
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
 * @param {number} width - 아트보드 가로
 * @param {number} height - 아트보드 세로
 * @param {BackgroundFillInput} [fill] - 채움 (단색/그라데이션)
 * @param {number} [left=0] - 아트보드 원점 x
 * @param {number} [top=0] - 아트보드 원점 y
 * @returns {BackgroundObject}
 */
export function applyBackgroundProps(
  rect: Rect,
  width: number,
  height: number,
  fill: BackgroundFillInput = DEFAULT_BACKGROUND_FILL,
  left = 0,
  top = 0,
): BackgroundObject {
  rect.set({
    left,
    top,
    width,
    height,
    fill: resolveBackgroundFabricFill(fill),
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    originX: 'left',
    originY: 'top',
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
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
 * @param {number} width - 아트보드 가로
 * @param {number} height - 아트보드 세로
 * @param {BackgroundFillInput} [fill] - 채움
 * @param {number} [left=0] - 원점 x
 * @param {number} [top=0] - 원점 y
 * @returns {BackgroundObject}
 */
export function createBackgroundRect(
  width: number,
  height: number,
  fill: BackgroundFillInput = DEFAULT_BACKGROUND_FILL,
  left = 0,
  top = 0,
): BackgroundObject {
  return applyBackgroundProps(new Rect(), width, height, fill, left, top)
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
 * 캔버스 크기에서 아트보드 크기를 추론한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @returns {{ width: number; height: number; padding: number }}
 */
function inferArtboardFromCanvas(canvas: Canvas): {
  width: number
  height: number
  padding: number
} {
  const width = canvas.getWidth()
  const height = canvas.getHeight()
  const background = findBackgroundObject(canvas)

  if (background && (background.width ?? 0) > 100) {
    const bw = background.width ?? width
    const bh = background.height ?? height
    const pad = getArtboardPadding(bw)
    const workspace = getWorkspaceSize({ width: bw, height: bh })
    if (Math.abs(width - workspace.width) < 2) {
      return { width: bw, height: bh, padding: pad }
    }
    if (Math.abs((background.left ?? 0) - pad) < 2) {
      return { width: bw, height: bh, padding: pad }
    }
  }

  for (const candidate of [1920, 1280] as const) {
    const pad = getArtboardPadding(candidate)
    const artW = width - pad * 2
    const artH = height - pad * 2
    if (artW === candidate || Math.abs(artW - candidate) < 2) {
      return { width: artW, height: artH, padding: pad }
    }
  }

  return { width, height, padding: 0 }
}

/**
 * 배경을 아트보드 크기에 맞추고 최하위로 고정한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {BackgroundObject} background - 배경 객체
 * @returns {void}
 */
export function syncBackgroundToCanvas(canvas: Canvas, background: BackgroundObject): void {
  const fill = resolveBackgroundFabricFill(background.fill)
  const artboard = inferArtboardFromCanvas(canvas)
  applyBackgroundProps(
    background as unknown as Rect,
    artboard.width,
    artboard.height,
    fill,
    artboard.padding,
    artboard.padding,
  )
  canvas.sendObjectToBack(background)
  canvas.requestRenderAll()
}

/**
 * 배경 레이어가 없으면 생성하고, 있으면 크기·잠금·순서를 보정한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {BackgroundFillInput} [fallbackFill] - 신규 생성 시 채움
 * @returns {BackgroundObject}
 */
export function ensureBackgroundLayer(
  canvas: Canvas,
  fallbackFill: BackgroundFillInput = DEFAULT_BACKGROUND_FILL,
): BackgroundObject {
  const existing = findBackgroundObject(canvas)
  if (existing) {
    syncBackgroundToCanvas(canvas, existing)
    return existing
  }

  const artboard = inferArtboardFromCanvas(canvas)
  const background = createBackgroundRect(
    artboard.width,
    artboard.height,
    fallbackFill,
    artboard.padding,
    artboard.padding,
  )
  canvas.add(background)
  canvas.sendObjectToBack(background)
  canvas.requestRenderAll()
  return background
}

/**
 * 배경 채움(UI용 FillValue)을 반환한다.
 * @param {Canvas} canvas
 * @returns {FillValue}
 */
export function getBackgroundFillValue(canvas: Canvas): FillValue {
  const background = findBackgroundObject(canvas)
  if (!background) {
    return createSolidFill(DEFAULT_BACKGROUND_FILL)
  }
  return parseFabricFill(background.fill, DEFAULT_BACKGROUND_FILL)
}

/**
 * 배경 채움 색을 반환한다. (단색 호환 — 그라데이션이면 시작색)
 * @param {Canvas} canvas - Fabric 캔버스
 * @returns {string}
 * @deprecated getBackgroundFillValue 사용
 */
export function getBackgroundFill(canvas: Canvas): string {
  const value = getBackgroundFillValue(canvas)
  return value.mode === 'solid' ? value.color : value.colorA
}

/**
 * 배경 채움을 설정한다.
 * @param {Canvas} canvas
 * @param {BackgroundFillInput} fill
 * @returns {void}
 */
export function setBackgroundFill(canvas: Canvas, fill: BackgroundFillInput): void {
  const fabricFill = resolveBackgroundFabricFill(fill)
  const background = ensureBackgroundLayer(
    canvas,
    typeof fabricFill === 'string' ? fabricFill : DEFAULT_BACKGROUND_FILL,
  )
  background.set('fill', fabricFill)
  background.set('dirty', true)
  canvas.requestRenderAll()
  canvas.fire('object:modified', { target: background })
}
