import { Textbox, type TextboxProps } from 'fabric'
import type { ArtboardBounds } from '@/lib/artboard'
import {
  DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_STROKE,
  DEFAULT_TEXT_STROKE_WIDTH,
} from '@/lib/constants'
import { EDITOR_FONT_FAMILY } from '@/lib/editor-font'

/** 아트보드 대비 기본 텍스트 박스 너비 비율 */
export const DEFAULT_TEXTBOX_WIDTH_RATIO = 0.72

type CreateEditorTextboxOptions = {
  text: string
  bounds: ArtboardBounds
  fontSizeScale?: number
  fontFamily?: string
  overrides?: Partial<TextboxProps>
}

/**
 * 아트보드 폭에 맞춰 줄바꿈되는 에디터 텍스트박스를 만든다.
 * (IText는 한 줄로 무한히 늘어나 레이아웃을 밀어낼 수 있음)
 * @param {CreateEditorTextboxOptions} options - 생성 옵션
 * @returns {Textbox}
 */
export function createEditorTextbox(options: CreateEditorTextboxOptions): Textbox {
  const {
    text,
    bounds,
    fontSizeScale = bounds.width / 1920,
    fontFamily = EDITOR_FONT_FAMILY,
    overrides = {},
  } = options

  const centerLeft = bounds.left + bounds.width / 2
  const centerTop = bounds.top + bounds.height / 2
  const width = Math.max(120, Math.round(bounds.width * DEFAULT_TEXTBOX_WIDTH_RATIO))

  return new Textbox(text, {
    left: centerLeft,
    top: centerTop,
    originX: 'center',
    originY: 'center',
    width,
    fill: DEFAULT_TEXT_FILL,
    stroke: DEFAULT_TEXT_STROKE,
    strokeWidth: DEFAULT_TEXT_STROKE_WIDTH * fontSizeScale,
    fontSize: DEFAULT_TEXT_FONT_SIZE * fontSizeScale,
    fontFamily,
    fontWeight: '700',
    paintFirst: 'stroke',
    splitByGrapheme: true,
    ...overrides,
  })
}
