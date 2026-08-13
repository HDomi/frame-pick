/**
 * 반투명 잔여 알파만 정리한다. (과도한 soft feather 없음)
 * @param {Blob} pngBlob - 투명 PNG
 * @returns {Promise<Blob>}
 */
export async function cleanupCutoutFringe(pngBlob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(pngBlob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    bitmap.close()
    return pngBlob
  }

  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0
    if (a > 0 && a < 40) {
      data[i + 3] = 0
    } else if (a > 220) {
      data[i + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)

  const out = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
  return out ?? pngBlob
}
