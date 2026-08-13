/**
 * className 문자열을 공백으로 합친다.
 * @param {...(string | false | null | undefined)[]} values - 클래스 값들
 * @returns {string} - 합쳐진 className
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
