import { Circle, Line, Rect, Triangle, type FabricObject } from 'fabric'
import type { ArtboardBounds } from '@/lib/artboard'
import { isBackgroundObject } from '@/lib/background-layer'

/** 추가 가능한 도형 종류 */
export type EditorShapeKind = 'rect' | 'ellipse' | 'triangle' | 'line'

const DEFAULT_SHAPE_FILL = '#3b82f6'
const DEFAULT_SHAPE_STROKE = '#ffffff'
const DEFAULT_SHAPE_STROKE_WIDTH = 4
const DEFAULT_LINE_STROKE = '#ffffff'
const DEFAULT_LINE_STROKE_WIDTH = 8

export type EditorShapeObject = Rect | Circle | Triangle | Line

/**
 * Fabric 객체가 에디터 도형인지 판별한다.
 * @param {FabricObject | null | undefined} object
 * @returns {object is EditorShapeObject}
 */
export function isEditorShapeObject(
  object: FabricObject | null | undefined,
): object is EditorShapeObject {
  if (!object || isBackgroundObject(object)) {
    return false
  }
  return (
    object instanceof Rect ||
    object instanceof Circle ||
    object instanceof Triangle ||
    object instanceof Line
  )
}

/**
 * 도형 종류 라벨
 * @param {EditorShapeKind} kind
 * @returns {string}
 */
export function getShapeKindLabel(kind: EditorShapeKind): string {
  if (kind === 'rect') {
    return '사각형'
  }
  if (kind === 'ellipse') {
    return '원'
  }
  if (kind === 'triangle') {
    return '삼각형'
  }
  return '직선'
}

/**
 * Fabric type 문자열에서 도형 종류를 추론한다.
 * @param {FabricObject} object
 * @returns {EditorShapeKind | null}
 */
export function inferShapeKind(object: FabricObject): EditorShapeKind | null {
  const type = object.type?.toLowerCase() ?? ''
  if (type === 'rect') {
    return 'rect'
  }
  if (type === 'circle' || type === 'ellipse') {
    return 'ellipse'
  }
  if (type === 'triangle') {
    return 'triangle'
  }
  if (type === 'line') {
    return 'line'
  }
  return null
}

/**
 * 아트보드 중앙에 기본 도형을 생성한다.
 * @param {EditorShapeKind} kind
 * @param {ArtboardBounds} bounds
 * @param {number} [sizeScale] - 1920 기준 스케일
 * @returns {EditorShapeObject}
 */
export function createEditorShape(
  kind: EditorShapeKind,
  bounds: ArtboardBounds,
  sizeScale = 1,
): EditorShapeObject {
  const cx = bounds.left + bounds.width / 2
  const cy = bounds.top + bounds.height / 2
  const box = Math.round(280 * sizeScale)
  const common = {
    originX: 'center' as const,
    originY: 'center' as const,
    left: cx,
    top: cy,
    fill: DEFAULT_SHAPE_FILL,
    stroke: DEFAULT_SHAPE_STROKE,
    strokeWidth: Math.max(1, Math.round(DEFAULT_SHAPE_STROKE_WIDTH * sizeScale)),
    opacity: 1,
    objectCaching: false,
  }

  if (kind === 'rect') {
    return new Rect({
      ...common,
      width: box,
      height: Math.round(box * 0.7),
      rx: 8,
      ry: 8,
    })
  }

  if (kind === 'ellipse') {
    return new Circle({
      ...common,
      radius: box / 2,
    })
  }

  if (kind === 'triangle') {
    return new Triangle({
      ...common,
      width: box,
      height: box,
    })
  }

  const half = Math.round(220 * sizeScale)
  return new Line([cx - half, cy, cx + half, cy], {
    originX: 'center',
    originY: 'center',
    stroke: DEFAULT_LINE_STROKE,
    strokeWidth: Math.max(2, Math.round(DEFAULT_LINE_STROKE_WIDTH * sizeScale)),
    fill: '',
    opacity: 1,
    objectCaching: false,
    strokeLineCap: 'round',
  })
}
