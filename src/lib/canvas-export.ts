import type { Canvas } from 'fabric'
import { getArtboardPadding } from '@/lib/artboard'
import type { CanvasSize } from '@/lib/canvas-size'
import {
  getExportExtension,
  getExportMultiplier,
  getExportQualityValue,
  isLossyExportFormat,
  resolveExportPixelSize,
  type ExportFormat,
  type ExportOptions,
} from '@/lib/export-options'

/**
 * 다운로드용 타임스탬프 파일명을 만든다.
 * @param {Pick<CanvasSize, 'width' | 'height'>} size - 출력 해상도
 * @param {ExportFormat} [format='png']
 * @returns {string}
 */
export function createThumbnailFileName(
  size: Pick<CanvasSize, 'width' | 'height'>,
  format: ExportFormat = 'png',
): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
  const ext = getExportExtension(format)
  return `frame-pick-${size.width}x${size.height}-${stamp}.${ext}`
}

/**
 * Fabric 캔버스에서 아트보드 영역만 data URL로 렌더한다.
 * @param {Canvas | null} canvas
 * @param {CanvasSize} size - 아트보드 논리 크기
 * @param {Partial<ExportOptions>} [options]
 * @returns {string | null}
 */
export function getCanvasDataUrl(
  canvas: Canvas | null,
  size: CanvasSize,
  options: Partial<ExportOptions> = {},
): string | null {
  if (!canvas) {
    return null
  }

  const format: ExportFormat = options.format ?? 'png'
  const quality = getExportQualityValue(options.quality ?? 'high')
  const multiplier = options.resolutionId
    ? getExportMultiplier(size, options.resolutionId)
    : 1

  const prevZoom = canvas.getZoom()
  const prevVpt = canvas.viewportTransform
    ? ([...canvas.viewportTransform] as [number, number, number, number, number, number])
    : ([1, 0, 0, 1, 0, 0] as [number, number, number, number, number, number])

  try {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    canvas.setZoom(1)

    const padding = getArtboardPadding(size.width)
    const workspaceMatches =
      Math.abs(canvas.getWidth() - (size.width + padding * 2)) < 2 &&
      Math.abs(canvas.getHeight() - (size.height + padding * 2)) < 2

    const encodeOptions = {
      format,
      quality: isLossyExportFormat(format) ? quality : 1,
      multiplier,
      enableRetinaScaling: false as const,
    }

    if (workspaceMatches) {
      return canvas.toDataURL({
        ...encodeOptions,
        left: padding,
        top: padding,
        width: size.width,
        height: size.height,
      })
    }

    return canvas.toDataURL(encodeOptions)
  } finally {
    canvas.setViewportTransform(prevVpt)
    canvas.setZoom(prevZoom)
    canvas.requestRenderAll()
  }
}

/**
 * data URL을 파일로 저장한다.
 * @param {string} dataUrl
 * @param {string} fileName
 * @returns {void}
 */
function triggerDownload(dataUrl: string, fileName: string): void {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = fileName
  anchor.click()
}

/**
 * 옵션에 따라 아트보드를 내보낸다.
 * @param {Canvas | null} canvas
 * @param {CanvasSize} artboard
 * @param {ExportOptions} options
 * @param {string} [fileName]
 * @returns {boolean}
 */
export function exportCanvas(
  canvas: Canvas | null,
  artboard: CanvasSize,
  options: ExportOptions,
  fileName?: string,
): boolean {
  const dataUrl = getCanvasDataUrl(canvas, artboard, options)
  if (!dataUrl) {
    return false
  }

  const outputSize = resolveExportPixelSize(artboard, options.resolutionId)
  const name = fileName ?? createThumbnailFileName(outputSize, options.format)
  triggerDownload(dataUrl, name)
  return true
}

/**
 * Fabric 캔버스를 현재 논리 해상도 PNG로 다운로드한다.
 * @param {Canvas | null} canvas
 * @param {CanvasSize} size
 * @param {string} [fileName]
 * @returns {boolean}
 * @deprecated exportCanvas 사용
 */
export function exportCanvasAsPng(
  canvas: Canvas | null,
  size: CanvasSize,
  fileName?: string,
): boolean {
  return exportCanvas(
    canvas,
    size,
    { format: 'png', quality: 'high', resolutionId: 'artboard' },
    fileName,
  )
}
