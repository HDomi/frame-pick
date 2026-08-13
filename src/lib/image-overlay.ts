import { FabricImage, filters } from 'fabric'
import {
  createFabricFill,
  createSolidFill,
  fillValueToCssBackground,
  type FillValue,
} from '@/lib/fill-value'

export type ImageOverlayState = {
  enabled: boolean
  fill: FillValue
}

/** 이미지/스티커에 저장하는 오버레이 메타 키 */
export const IMAGE_OVERLAY_PROP = 'overlayFill'

export type OverlayAwareImage = FabricImage & {
  overlayFill?: FillValue | null
}

/**
 * 그라데이션 FillValue를 캔버스 data URL로 만든다.
 * @param {FillValue} value
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function fillToDataUrl(value: FillValue, width: number, height: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return ''
  }

  if (value.mode === 'solid') {
    ctx.fillStyle = fillValueToCssBackground(value)
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  } else {
    const angle =
      value.direction === 'vertical'
        ? Math.PI / 2
        : value.direction === 'diagonal'
          ? Math.PI / 4
          : 0
    // CSS와 동일하게 linear-gradient 근사: 가로/세로/대각
    let x0 = 0
    let y0 = 0
    let x1 = canvas.width
    let y1 = 0
    if (value.direction === 'vertical') {
      x1 = 0
      y1 = canvas.height
    } else if (value.direction === 'diagonal') {
      x1 = canvas.width
      y1 = canvas.height
    }
    void angle
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1)
    const fabricFill = createFabricFill(value)
    if (typeof fabricFill === 'string') {
      gradient.addColorStop(0, fabricFill)
      gradient.addColorStop(1, fabricFill)
    } else {
      for (const stop of fabricFill.colorStops ?? []) {
        gradient.addColorStop(stop.offset, String(stop.color))
      }
    }
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return canvas.toDataURL('image/png')
}

/**
 * 오버레이용 Blend 필터를 제거한다.
 * @param {FabricImage} image
 * @returns {void}
 */
function stripOverlayFilters(image: FabricImage): void {
  image.filters = (image.filters ?? []).filter((filter) => {
    const type = (filter as { type?: string }).type
    return type !== 'BlendColor' && type !== 'BlendImage'
  })
}

/**
 * 이미지에 단색/그라데이션 오버레이를 적용한다.
 * @param {OverlayAwareImage} image
 * @param {FillValue | null} fill - null이면 제거
 * @returns {Promise<void>}
 */
export async function applyImageOverlayFill(
  image: OverlayAwareImage,
  fill: FillValue | null,
): Promise<void> {
  stripOverlayFilters(image)
  image.overlayFill = fill

  if (!fill) {
    image.applyFilters()
    image.set('dirty', true)
    return
  }

  if (fill.mode === 'solid') {
    image.filters = [
      ...(image.filters ?? []),
      new filters.BlendColor({
        color: fill.color,
        mode: 'tint',
        alpha: fill.opacity,
      }),
    ]
    image.applyFilters()
    image.set('dirty', true)
    return
  }

  const element = image.getElement() as HTMLImageElement | HTMLCanvasElement
  const width = element.width || image.width || 1
  const height = element.height || image.height || 1
  const dataUrl = fillToDataUrl(fill, width, height)
  if (!dataUrl) {
    return
  }

  const blendSource = await FabricImage.fromURL(dataUrl)
  image.filters = [
    ...(image.filters ?? []),
    new filters.BlendImage({
      image: blendSource,
      mode: 'multiply',
      alpha: 1,
    }),
  ]
  image.applyFilters()
  image.set('dirty', true)
}

/**
 * 저장된 overlayFill을 다시 적용한다 (JSON 복원 후).
 * @param {OverlayAwareImage} image
 * @returns {Promise<void>}
 */
export async function restoreImageOverlay(image: OverlayAwareImage): Promise<void> {
  const saved = image.overlayFill
  if (!saved || typeof saved !== 'object' || !('mode' in saved)) {
    return
  }
  await applyImageOverlayFill(image, saved as FillValue)
}

/**
 * 기본 오버레이 UI 상태
 * @returns {ImageOverlayState}
 */
export function createDefaultOverlayState(): ImageOverlayState {
  return {
    enabled: false,
    fill: createSolidFill('#3b82f6', 0.45),
  }
}
