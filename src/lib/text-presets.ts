import {
  DEFAULT_TEXT_FILL,
  DEFAULT_TEXT_FONT_SIZE,
  DEFAULT_TEXT_STROKE,
  DEFAULT_TEXT_STROKE_WIDTH,
} from '@/lib/constants'
import { EDITOR_FONT_FAMILY } from '@/lib/editor-font'
import type { TextStylePreset } from '@/types/editor'

export type TextPresetCategoryId = 'aggro' | 'vlog' | 'info' | 'game'

export interface TextPresetCategory {
  id: TextPresetCategoryId
  label: string
  presets: TextStylePreset[]
}

/**
 * 텍스트 스타일 프리셋 카탈로그 (MVP 8~10)
 */
export const TEXT_PRESET_CATEGORIES: TextPresetCategory[] = [
  {
    id: 'aggro',
    label: '어그로 뉴스',
    presets: [
      {
        id: 'breaking',
        name: '속보',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 10,
      },
      {
        id: 'shock',
        name: '충격',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE * 1.05,
        fill: '#FFCC00',
        stroke: '#000000',
        strokeWidth: 12,
      },
      {
        id: 'scoop',
        name: '특종',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE,
        fill: '#FF3B30',
        stroke: '#FFFFFF',
        strokeWidth: 8,
      },
    ],
  },
  {
    id: 'vlog',
    label: '브이로그',
    presets: [
      {
        id: 'mood',
        name: '감성',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE * 0.85,
        fill: '#FFE4EC',
        stroke: '#5C4033',
        strokeWidth: 2,
      },
      {
        id: 'daily',
        name: '데일리',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE * 0.8,
        fill: '#FFFFFF',
        stroke: '#6B7280',
        strokeWidth: 3,
      },
    ],
  },
  {
    id: 'info',
    label: '정보',
    presets: [
      {
        id: 'summary',
        name: '요약',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE * 0.75,
        fill: '#FFFFFF',
        stroke: '#111827',
        strokeWidth: 5,
      },
      {
        id: 'tip',
        name: '꿀팁',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE * 0.8,
        fill: '#D1FAE5',
        stroke: '#065F46',
        strokeWidth: 4,
      },
    ],
  },
  {
    id: 'game',
    label: '게임/리액션',
    presets: [
      {
        id: 'gg',
        name: 'GG',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE * 1.1,
        fill: '#22D3EE',
        stroke: '#0F172A',
        strokeWidth: 9,
      },
      {
        id: 'legend',
        name: '레전드',
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: DEFAULT_TEXT_FONT_SIZE,
        fill: '#A78BFA',
        stroke: '#000000',
        strokeWidth: 8,
      },
    ],
  },
]

export const DEFAULT_TEXT_SHADOW = {
  color: 'rgba(0,0,0,0.55)',
  blur: 8,
  offsetX: 4,
  offsetY: 4,
}

export { DEFAULT_TEXT_FILL, DEFAULT_TEXT_STROKE, DEFAULT_TEXT_STROKE_WIDTH }
