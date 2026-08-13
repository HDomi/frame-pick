import {
  FabricImage,
  loadSVGFromURL,
  util,
  type FabricObject,
} from 'fabric'

/**
 * SVG 문자열에 width/height가 없으면 viewBox 기준으로 넣는다.
 * (img/dataURL 로드 시 0×0 되는 경우 방지)
 * @param {string} svgText - SVG 원문
 * @returns {string}
 */
function ensureSvgSizeAttributes(svgText: string): string {
  if (/\swidth\s*=/.test(svgText) && /\sheight\s*=/.test(svgText)) {
    return svgText
  }
  const viewBoxMatch = svgText.match(/viewBox\s*=\s*"([^"]+)"/i)
  let width = 128
  let height = 128
  if (viewBoxMatch?.[1]) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      width = parts[2]
      height = parts[3]
    }
  }
  return svgText.replace(
    /<svg\b/i,
    `<svg width="${width}" height="${height}"`,
  )
}

/**
 * SVG URL을 data URL로 변환한다.
 * @param {string} url - SVG URL
 * @returns {Promise<string>}
 */
async function svgUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`스티커 로드 실패 (${response.status})`)
  }
  const svgText = ensureSvgSizeAttributes(await response.text())
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
}

/**
 * 스티커 SVG를 Fabric 객체로 로드한다.
 * 벡터 파싱을 우선하고, 실패 시 래스터(data URL)로 폴백한다.
 * @param {string} url - 스티커 URL
 * @returns {Promise<FabricObject>}
 */
export async function loadStickerFabricObject(url: string): Promise<FabricObject> {
  const parsed = await loadSVGFromURL(url)
  const valid = (parsed.objects ?? []).filter((object): object is FabricObject => {
    return object != null
  })

  if (valid.length > 0) {
    if (valid.length === 1) {
      return valid[0]!
    }
    return util.groupSVGElements(valid, parsed.options)
  }

  const dataUrl = await svgUrlToDataUrl(url)
  return FabricImage.fromURL(dataUrl)
}
