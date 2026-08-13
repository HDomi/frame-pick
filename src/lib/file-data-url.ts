/**
 * File을 data URL로 읽어 Fabric 재렌더 후에도 유지되는 소스로 만든다.
 * (ObjectURL을 즉시 revoke하면 setDimensions 이후 이미지가 사라짐)
 * @param {File} file - 이미지 파일
 * @returns {Promise<string>}
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    /**
     * @returns {void}
     */
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('파일을 읽을 수 없습니다.'))
    }
    /**
     * @returns {void}
     */
    reader.onerror = () => {
      reject(new Error('파일 읽기에 실패했습니다.'))
    }
    reader.readAsDataURL(file)
  })
}
