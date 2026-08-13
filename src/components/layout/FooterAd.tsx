import { PlaceholderBox } from '@/components/ui'

/**
 * 하단 배너 광고 영역 placeholder
 * @returns {React.ReactElement} - 푸터 광고 슬롯
 */
export function FooterAd() {
  return (
    <footer className="flex h-16 shrink-0 items-center justify-center border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <PlaceholderBox className="h-12 w-full max-w-3xl">광고 영역 (AdSense / AdFit)</PlaceholderBox>
    </footer>
  )
}
