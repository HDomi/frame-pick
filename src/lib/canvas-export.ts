import type { Canvas } from 'fabric'
import type { CanvasSize } from '@/lib/canvas-size'

/**
 * 다운로드용 타임스탬프 파일명을 만든다.
 * @param {CanvasSize} size - 현재 해상도
 * @returns {string} - frame-pick-WxH-YYYYMMDD-HHmmss.png
 */
export function createThumbnailFileName(size: CanvasSize): string {
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

  return `frame-pick-${size.width}x${size.height}-${stamp}.png`
}

/**
 * Fabric 캔버스를 논리 해상도 data URL로 렌더한다.
 * @param {Canvas | null} canvas - Fabric 캔버스
 * @param {CanvasSize} size - 논리 해상도
 * @returns {string | null} - PNG data URL
 */
export function getCanvasDataUrl(canvas: Canvas | null, size: CanvasSize): string | null {
  if (!canvas) {
    return null
  }

  // 표시는 CSS 스케일만 쓰므로 zoom=1·논리 해상도 기준으로 그대로보내면 된다.
  // 혹시 줌이 남아 있어도 캡처 전에 논리 해상도로 맞춘다.
  const prevZoom = canvas.getZoom()
  const prevWidth = canvas.getWidth()
  const prevHeight = canvas.getHeight()
  const prevVpt = canvas.viewportTransform
    ? ([...canvas.viewportTransform] as [number, number, number, number, number, number])
    : ([1, 0, 0, 1, 0, 0] as [number, number, number, number, number, number])
  const prevCssWidth = canvas.lowerCanvasEl?.style.width
  const prevCssHeight = canvas.lowerCanvasEl?.style.height

  try {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    canvas.setZoom(1)
    canvas.setDimensions({
      width: size.width,
      height: size.height,
    })

    return canvas.toDataURL({
      format: 'png',
      multiplier: 1,
      enableRetinaScaling: false,
    })
  } finally {
    canvas.setViewportTransform(prevVpt)
    canvas.setZoom(prevZoom)
    canvas.setDimensions({
      width: prevWidth,
      height: prevHeight,
    })
    if (prevCssWidth && prevCssHeight) {
      canvas.setDimensions(
        {
          width: prevCssWidth,
          height: prevCssHeight,
        },
        { cssOnly: true },
      )
    }
    canvas.requestRenderAll()
  }
}

/**
 * Fabric 캔버스를 현재 논리 해상도 PNG로 다운로드한다.
 * @param {Canvas | null} canvas - Fabric 캔버스
 * @param {CanvasSize} size - 논리 해상도
 * @param {string} [fileName] - 저장 파일명
 * @returns {boolean} - 다운로드 시작 성공 여부
 */
export function exportCanvasAsPng(
  canvas: Canvas | null,
  size: CanvasSize,
  fileName = createThumbnailFileName(size),
): boolean {
  const dataUrl = getCanvasDataUrl(canvas, size)
  if (!dataUrl) {
    return false
  }

  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = fileName
  anchor.click()
  return true
}
