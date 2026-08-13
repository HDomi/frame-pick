/**
 * WASM 기반 배경 제거를 동적 로드 후 실행한다.
 * TODO: @imgly/background-removal dynamic import 연동
 * @param {Blob | string} _imageSource - 원본 이미지
 * @returns {Promise<Blob | null>} - 투명 배경 PNG Blob
 */
export async function removeBackground(
  _imageSource: Blob | string,
): Promise<Blob | null> {
  // const { removeBackground } = await import('@imgly/background-removal')
  return null
}
