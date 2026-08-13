import { SOLID_BG_TOLERANCE } from '@/lib/cutout-constants'

export type Rgb = { r: number; g: number; b: number }

/**
 * 픽셀 RGB 유클리드 거리 제곱
 * @param {Rgb} a
 * @param {Rgb} b
 * @returns {number}
 */
export function colorDist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

/**
 * 모서리 패치의 중앙값으로 단색 배경을 추정한다.
 * @param {Uint8ClampedArray} data - RGBA
 * @param {number} width
 * @param {number} height
 * @returns {Rgb}
 */
export function sampleCornerBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Rgb {
  const patch = 5
  const origins: [number, number][] = [
    [0, 0],
    [Math.max(0, width - patch), 0],
    [0, Math.max(0, height - patch)],
    [Math.max(0, width - patch), Math.max(0, height - patch)],
  ]

  const samples: Rgb[] = []
  for (const [ox, oy] of origins) {
    for (let y = oy; y < oy + patch && y < height; y += 1) {
      for (let x = ox; x < ox + patch && x < width; x += 1) {
        const i = (y * width + x) * 4
        samples.push({
          r: data[i] ?? 0,
          g: data[i + 1] ?? 0,
          b: data[i + 2] ?? 0,
        })
      }
    }
  }

  if (samples.length === 0) {
    return { r: 0, g: 0, b: 0 }
  }

  const mid = Math.floor(samples.length / 2)
  const rs = samples.map((s) => s.r).sort((a, b) => a - b)
  const gs = samples.map((s) => s.g).sort((a, b) => a - b)
  const bs = samples.map((s) => s.b).sort((a, b) => a - b)
  return {
    r: rs[mid] ?? 0,
    g: gs[mid] ?? 0,
    b: bs[mid] ?? 0,
  }
}

/**
 * Blob을 ImageData로 디코딩한다.
 * @param {Blob} imageBlob
 * @returns {Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; imageData: ImageData }>}
 */
async function blobToImageData(imageBlob: Blob) {
  const bitmap = await createImageBitmap(imageBlob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas를 사용할 수 없습니다.')
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  return {
    canvas,
    ctx,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
  }
}

/**
 * ImageData를 PNG Blob으로 만든다.
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {ImageData} imageData
 * @returns {Promise<Blob>}
 */
async function imageDataToPng(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
): Promise<Blob> {
  ctx.putImageData(imageData, 0, 0)
  const out = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
  if (!out) {
    throw new Error('PNG 인코딩에 실패했습니다.')
  }
  return out
}

/**
 * 배경색과 비슷한 픽셀을 완전 투명으로 뚫는다 (로고 안쪽 구멍용).
 * @param {Uint8ClampedArray} data - RGBA (in-place)
 * @param {Rgb} bg
 * @param {number} tolerance
 * @returns {void}
 */
export function punchBackgroundPixels(
  data: Uint8ClampedArray,
  bg: Rgb,
  tolerance: number,
): void {
  const tol2 = tolerance * tolerance
  for (let i = 0; i < data.length; i += 4) {
    const pixel = {
      r: data[i] ?? 0,
      g: data[i + 1] ?? 0,
      b: data[i + 2] ?? 0,
    }
    if (colorDist2(pixel, bg) <= tol2) {
      data[i + 3] = 0
    }
  }
}

/**
 * 가장자리 1px만 약한 안티앨리어싱 (뭉개짐 최소화).
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @returns {void}
 */
function hardenEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  const src = new Uint8ClampedArray(data)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4
      const a = src[idx + 3] ?? 0
      if (a === 0 || a === 255) {
        continue
      }

      let opaque = 0
      let transparent = 0
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) {
            continue
          }
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            transparent += 1
            continue
          }
          const na = src[(ny * width + nx) * 4 + 3] ?? 0
          if (na >= 128) {
            opaque += 1
          } else {
            transparent += 1
          }
        }
      }

      // 경계가 아니면 이진화
      if (opaque === 0 || transparent === 0) {
        data[idx + 3] = a >= 128 ? 255 : 0
        continue
      }

      // 경계: 알파를 더 또렷하게
      data[idx + 3] = a >= 140 ? 255 : a < 80 ? 0 : a
    }
  }
}

/**
 * 불투명 가장자리의 배경색 번짐(프린지)을 피사체 색으로 되돌린다.
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {Rgb} bg
 * @returns {void}
 */
function despillFringe(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: Rgb,
): void {
  const src = new Uint8ClampedArray(data)
  const tol2 = SOLID_BG_TOLERANCE * SOLID_BG_TOLERANCE * 2.2

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4
      const a = src[idx + 3] ?? 0
      if (a < 200) {
        continue
      }

      const pixel = {
        r: src[idx] ?? 0,
        g: src[idx + 1] ?? 0,
        b: src[idx + 2] ?? 0,
      }

      // 투명 이웃이 있는 가장자리만
      let nearTransparent = false
      for (let dy = -1; dy <= 1 && !nearTransparent; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            nearTransparent = true
            break
          }
          if ((src[(ny * width + nx) * 4 + 3] ?? 0) < 32) {
            nearTransparent = true
            break
          }
        }
      }
      if (!nearTransparent) {
        continue
      }

      // 배경색 쪽으로 치우친 픽셀이면 안쪽 불투명 이웃 색으로 교체
      if (colorDist2(pixel, bg) > tol2) {
        continue
      }

      let rSum = 0
      let gSum = 0
      let bSum = 0
      let count = 0
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue
          }
          const nIdx = (ny * width + nx) * 4
          const na = src[nIdx + 3] ?? 0
          if (na < 240) {
            continue
          }
          const nPixel = {
            r: src[nIdx] ?? 0,
            g: src[nIdx + 1] ?? 0,
            b: src[nIdx + 2] ?? 0,
          }
          if (colorDist2(nPixel, bg) <= tol2) {
            continue
          }
          rSum += nPixel.r
          gSum += nPixel.g
          bSum += nPixel.b
          count += 1
        }
      }

      if (count > 0) {
        data[idx] = Math.round(rSum / count)
        data[idx + 1] = Math.round(gSum / count)
        data[idx + 2] = Math.round(bSum / count)
        data[idx + 3] = 255
      } else {
        data[idx + 3] = 0
      }
    }
  }
}

/**
 * 단색(플랫) 배경을 하드 컷으로 제거한다. 로고 안쪽 구멍도 뚫는다.
 * @param {Blob} imageBlob - 원본 이미지
 * @param {number} [tolerance] - RGB 거리 허용
 * @returns {Promise<Blob>} - 투명 PNG
 */
export async function removeSolidBackground(
  imageBlob: Blob,
  tolerance: number = SOLID_BG_TOLERANCE,
): Promise<Blob> {
  const { canvas, ctx, imageData } = await blobToImageData(imageBlob)
  const { data, width, height } = imageData
  const bg = sampleCornerBackground(data, width, height)

  punchBackgroundPixels(data, bg, tolerance)
  hardenEdges(data, width, height)
  despillFringe(data, width, height, bg)

  return imageDataToPng(canvas, ctx, imageData)
}

/**
 * AI 누끼 결과에 원본 배경색으로 안쪽 구멍을 추가 천공한다.
 * @param {Blob} sourceBlob - 원본
 * @param {Blob} cutoutBlob - AI 결과 PNG
 * @param {number} [tolerance]
 * @returns {Promise<Blob>}
 */
export async function punchHolesFromSourceBackground(
  sourceBlob: Blob,
  cutoutBlob: Blob,
  tolerance: number = SOLID_BG_TOLERANCE,
): Promise<Blob> {
  const source = await blobToImageData(sourceBlob)
  const cutout = await blobToImageData(cutoutBlob)

  if (
    source.imageData.width !== cutout.imageData.width ||
    source.imageData.height !== cutout.imageData.height
  ) {
    return cutoutBlob
  }

  const bg = sampleCornerBackground(
    source.imageData.data,
    source.imageData.width,
    source.imageData.height,
  )
  const { data, width, height } = cutout.imageData
  const srcData = source.imageData.data
  const tol2 = tolerance * tolerance

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 0) === 0) {
      continue
    }
    const pixel = {
      r: srcData[i] ?? 0,
      g: srcData[i + 1] ?? 0,
      b: srcData[i + 2] ?? 0,
    }
    if (colorDist2(pixel, bg) <= tol2) {
      data[i + 3] = 0
    }
  }

  hardenEdges(data, width, height)
  despillFringe(data, width, height, bg)

  return imageDataToPng(cutout.canvas, cutout.ctx, cutout.imageData)
}
