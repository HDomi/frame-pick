import { LegalPageShell } from '@/components/layout/LegalPageShell'

/**
 * 개인정보 고지 (로컬 처리 중심)
 * @returns {React.ReactElement}
 */
export default function PrivacyPage() {
  return (
    <LegalPageShell title="개인정보 고지">
      <p>
        Frame Pick은 서버 API 없이 동작하는 정적 웹앱입니다. 영상·이미지 파일은 이용자
        브라우저에서만 처리되며, Frame Pick 운영 서버로 원본 파일이 전송되지 않습니다.
      </p>
      <h2 className="text-base font-semibold">로컬 저장</h2>
      <p>
        편집 초안·히스토리는 브라우저 IndexedDB 등에 저장될 수 있습니다. 브라우저 데이터
        삭제로 제거할 수 있습니다.
      </p>
      <h2 className="text-base font-semibold">AI 누끼</h2>
      <p>
        배경 제거 모델은 기기에서 추론합니다. 모델 파일은 서비스 정적 호스팅 경로 또는
        브라우저 캐시에서 내려받습니다.
      </p>
      <h2 className="text-base font-semibold">광고·분석</h2>
      <p>
        광고 네트워크(AdSense/AdFit 등) 연동 시 해당 사업자의 쿠키·식별자가 사용될 수
        있습니다. 세부 내용은 각 광고 사업자 정책을 따릅니다.
      </p>
      <h2 className="text-base font-semibold">문의</h2>
      <p>저장소 이슈 또는 프로젝트 관리자 연락처로 문의할 수 있습니다.</p>
      <p className="text-[var(--color-text-muted)]">최종 업데이트: 2026-08-13</p>
    </LegalPageShell>
  )
}
