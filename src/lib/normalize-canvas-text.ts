import { IText, Textbox, type Canvas, type FabricObject } from 'fabric'
import { getArtboardBounds } from '@/lib/artboard'
import type { CanvasSize } from '@/lib/canvas-size'
import { DEFAULT_TEXTBOX_WIDTH_RATIO } from '@/lib/editor-text'
import type { LayerAwareObject } from '@/lib/layers'

/**
 * 아트보드 대비 텍스트 최대 허용 너비(px)를 구한다.
 * @param {number} artboardWidth - 아트보드 가로
 * @returns {number}
 */
function getMaxTextWidth(artboardWidth: number): number {
  return Math.max(120, Math.round(artboardWidth * DEFAULT_TEXTBOX_WIDTH_RATIO))
}

/**
 * 캔버스가 살아 있는지 확인한다.
 * @param {Canvas | null | undefined} canvas
 * @returns {canvas is Canvas}
 */
function isLiveCanvas(canvas: Canvas | null | undefined): canvas is Canvas {
  return Boolean(canvas && !canvas.disposed && canvas.lowerCanvasEl)
}

/**
 * 텍스트 편집 중인지
 * @param {FabricObject} object
 * @returns {boolean}
 */
function isEditingText(object: FabricObject): boolean {
  return Boolean((object as { isEditing?: boolean }).isEditing)
}

/**
 * 과도하게 넓은 IText를 Textbox로 교체한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {IText} source - 원본 IText
 * @param {number} width - Textbox 너비
 * @returns {Textbox | null}
 */
function replaceITextWithTextbox(
  canvas: Canvas,
  source: IText,
  width: number,
): Textbox | null {
  if (!isLiveCanvas(canvas) || !source.canvas) {
    return null
  }

  if (source.isEditing) {
    try {
      source.exitEditing()
    } catch {
      return null
    }
  }

  const layer = source as LayerAwareObject
  const center = source.getCenterPoint()

  const next = new Textbox(source.text ?? '', {
    left: center.x,
    top: center.y,
    originX: 'center',
    originY: 'center',
    width,
    fill: source.fill as never,
    stroke: source.stroke ?? undefined,
    strokeWidth: source.strokeWidth,
    fontSize: source.fontSize,
    fontFamily: source.fontFamily,
    fontWeight: source.fontWeight,
    fontStyle: source.fontStyle,
    underline: source.underline,
    linethrough: source.linethrough,
    overline: source.overline,
    textAlign: source.textAlign,
    lineHeight: source.lineHeight,
    charSpacing: source.charSpacing,
    paintFirst: source.paintFirst,
    shadow: source.shadow ?? undefined,
    opacity: source.opacity,
    angle: source.angle,
    scaleX: source.scaleX,
    scaleY: source.scaleY,
    styles: source.styles as never,
    splitByGrapheme: true,
  })

  const nextLayer = next as LayerAwareObject
  nextLayer.layerId = layer.layerId
  nextLayer.layerType = layer.layerType ?? 'text'
  nextLayer.layerName = layer.layerName

  const index = canvas.getObjects().indexOf(source)
  if (index < 0) {
    return null
  }

  const wasActive = canvas.getActiveObject() === source
  canvas.remove(source)
  canvas.insertAt(index, next)
  if (wasActive) {
    canvas.setActiveObject(next)
  }
  return next
}

/**
 * 캔버스 텍스트가 레이아웃을 밀어내지 않도록 정규화한다.
 * 편집 중인 객체는 건너뛴다 (Fabric 내부 canvas 참조가 끊기며 requestRenderAll 크래시).
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {Pick<CanvasSize, 'width' | 'height'>} artboard - 아트보드
 * @returns {boolean} - 변경 여부
 */
export function normalizeCanvasTextObjects(
  canvas: Canvas,
  artboard: Pick<CanvasSize, 'width' | 'height'>,
): boolean {
  if (!isLiveCanvas(canvas)) {
    return false
  }

  const bounds = getArtboardBounds(canvas, artboard)
  const maxWidth = getMaxTextWidth(bounds.width)
  let changed = false

  const objects = [...canvas.getObjects()]
  for (const object of objects) {
    if (!object.canvas || isEditingText(object)) {
      continue
    }

    if (object instanceof Textbox) {
      let localChanged = false
      if (!object.splitByGrapheme) {
        object.set({ splitByGrapheme: true })
        localChanged = true
      }
      const scaledWidth = object.getScaledWidth()
      if (scaledWidth > bounds.width * 1.05) {
        object.set({
          width: Math.min(maxWidth, Math.round(bounds.width * 0.95)) / (object.scaleX || 1),
        })
        localChanged = true
      }
      if (localChanged) {
        object.initDimensions()
        object.setCoords()
        changed = true
      }
      continue
    }

    if (!(object instanceof IText)) {
      continue
    }

    if (object.getScaledWidth() <= maxWidth * 1.15) {
      continue
    }

    if (replaceITextWithTextbox(canvas, object, maxWidth)) {
      changed = true
    }
  }

  if (changed && isLiveCanvas(canvas)) {
    canvas.requestRenderAll()
  }
  return changed
}

/**
 * 단일 텍스트 객체 변경 직후 너비를 바로 정규화한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {FabricObject} object - 변경된 객체
 * @param {Pick<CanvasSize, 'width' | 'height'>} artboard - 아트보드
 * @returns {void}
 */
export function normalizeTextObjectIfNeeded(
  canvas: Canvas,
  object: FabricObject,
  artboard: Pick<CanvasSize, 'width' | 'height'>,
): void {
  if (!isLiveCanvas(canvas)) {
    return
  }
  if (!(object instanceof IText) && !(object instanceof Textbox)) {
    return
  }
  if (isEditingText(object)) {
    return
  }
  normalizeCanvasTextObjects(canvas, artboard)
}
