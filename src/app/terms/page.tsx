import { LegalPageShell } from '@/components/layout/LegalPageShell'

/**
 * 이용약관 페이지
 * @returns {React.ReactElement}
 */
export default function TermsPage() {
  return (
    <LegalPageShell title="이용약관">
      <p>
        Frame Pick(이하 &quot;서비스&quot;)은 브라우저에서 동작하는 유튜브 썸네일 편집
        도구입니다. 본 약관은 서비스 이용에 적용됩니다.
      </p>
      <h2 className="text-base font-semibold">1. 서비스 성격</h2>
      <p>
        서비스는 사용자의 기기(브라우저)에서 영상·이미지를 처리합니다. 서버에 원본 파일을
        업로드하지 않으며, 편집 결과는 기본적으로 기기 로컬(IndexedDB 등)에 저장됩니다.
      </p>
      <h2 className="text-base font-semibold">2. 광고·수익화</h2>
      <p>
        서비스는 Google AdSense, Kakao AdFit 등 광고를 통해 운영비를 충당하고 수익을 창출할 수
        있습니다. 다운로드 대기 화면 등에 광고가 표시될 수 있습니다.
      </p>
      <h2 className="text-base font-semibold">3. 이용자 책임</h2>
      <p>
        업로드·편집·배포하는 콘텐츠의 저작권·초상권·상표권 등 법적 책임은 이용자에게 있습니다.
        타인의 권리를 침해하는 용도로 사용해서는 안 됩니다.
      </p>
      <h2 className="text-base font-semibold">4. 면책</h2>
      <p>
        서비스는 &quot;있는 그대로&quot; 제공됩니다. 브라우저·기기 성능, 코덱 지원, AI 누끼
        품질 차이로 인한 결과물 하자에 대해 보증하지 않습니다.
      </p>
      <h2 className="text-base font-semibold">5. 약관 변경</h2>
      <p>필요 시 약관을 개정할 수 있으며, 개정 내용은 본 페이지에 게시합니다.</p>
      <p className="text-[var(--color-text-muted)]">최종 업데이트: 2026-08-13</p>
    </LegalPageShell>
  )
}
