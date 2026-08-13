import type { Canvas } from 'fabric'
import type { CanvasSize } from '@/lib/canvas-size'

/**
 * 아트보드(내보내기 영역) 바깥 여백 — 컨트롤 핸들이 캔버스 밖에서도 잡히도록
 * (논리 px, 아트보드 기준 약 12%)
 */
export const ARTBOARD_PADDING_RATIO = 0.12

/**
 * 아트보드 기준 패딩(px)을 계산한다.
 * @param {number} artboardWidth - 아트보드 가로
 * @returns {number}
 */
export function getArtboardPadding(artboardWidth: number): number {
  return Math.max(120, Math.round(artboardWidth * ARTBOARD_PADDING_RATIO))
}

/**
 * 워크스페이스(패딩 포함) 크기를 계산한다.
 * @param {Pick<CanvasSize, 'width' | 'height'>} artboard - 아트보드
 * @returns {{ width: number; height: number; padding: number }}
 */
export function getWorkspaceSize(artboard: Pick<CanvasSize, 'width' | 'height'>): {
  width: number
  height: number
  padding: number
} {
  const padding = getArtboardPadding(artboard.width)
  return {
    width: artboard.width + padding * 2,
    height: artboard.height + padding * 2,
    padding,
  }
}

export type ArtboardBounds = {
  left: number
  top: number
  width: number
  height: number
  padding: number
}

/**
 * 현재 Fabric 캔버스에서 아트보드 영역을 추정한다.
 * @param {Canvas} canvas - Fabric 캔버스
 * @param {Pick<CanvasSize, 'width' | 'height'>} artboard - 기대 아트보드
 * @returns {ArtboardBounds}
 */
export function getArtboardBounds(
  canvas: Canvas,
  artboard: Pick<CanvasSize, 'width' | 'height'>,
): ArtboardBounds {
  const padding = getArtboardPadding(artboard.width)
  const expectedWorkspace = getWorkspaceSize(artboard)
  const width = canvas.getWidth()
  const height = canvas.getHeight()

  // 이미 워크스페이스 레이아웃이면 패딩 사용, 구버전(아트보드=캔버스)이면 0
  const isWorkspace =
    Math.abs(width - expectedWorkspace.width) < 1 &&
    Math.abs(height - expectedWorkspace.height) < 1

  if (isWorkspace) {
    return {
      left: padding,
      top: padding,
      width: artboard.width,
      height: artboard.height,
      padding,
    }
  }

  return {
    left: 0,
    top: 0,
    width,
    height,
    padding: 0,
  }
}

/**
 * 아트보드 중심 좌표
 * @param {ArtboardBounds} bounds - 아트보드
 * @returns {{ left: number; top: number }}
 */
export function getArtboardCenter(bounds: ArtboardBounds): { left: number; top: number } {
  return {
    left: bounds.left + bounds.width / 2,
    top: bounds.top + bounds.height / 2,
  }
}
