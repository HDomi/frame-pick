import { LegalPageShell } from '@/components/layout/LegalPageShell'

/**
 * 오픈소스·에셋 라이선스 고지
 * @returns {React.ReactElement}
 */
export default function LicensesPage() {
  return (
    <LegalPageShell title="오픈소스·에셋 라이선스">
      <p>
        Frame Pick은 아래 오픈소스 소프트웨어와 에셋을 사용합니다. 각 라이선스 조건을
        준수합니다.
      </p>

      <h2 className="text-base font-semibold">소프트웨어</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Next.js / React</strong> — MIT
        </li>
        <li>
          <strong>Fabric.js</strong> — MIT
        </li>
        <li>
          <strong>@bunnio/rembg-web</strong> (배경 제거) — MIT
        </li>
        <li>
          <strong>onnxruntime-web</strong> — MIT
        </li>
        <li>
          <strong>u2netp.onnx</strong> 모델 — rembg/U²-Net 계열 공개 가중치 (프로젝트 문서 및
          원 배포처 라이선스 참고)
        </li>
      </ul>

      <h2 className="text-base font-semibold">폰트</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Noto Sans KR</strong> — SIL Open Font License 1.1
        </li>
      </ul>

      <h2 className="text-base font-semibold">스티커·이모지</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>화살표/강조/도형 SVG</strong> — Frame Pick 자체 제작
        </li>
        <li>
          <strong>Fluent Emoji Flat</strong> (일부) — Copyright (c) Microsoft Corporation,{' '}
          <a
            className="underline"
            href="https://github.com/microsoft/fluentui-emoji"
            target="_blank"
            rel="noreferrer"
          >
            MIT License
          </a>
        </li>
      </ul>

      <p>
        전체 고지 파일은 각 패키지 및 저장소의 LICENSE를 따릅니다. 상업적 이용·광고 게재는
        위 라이선스가 허용하는 범위에서 이루어집니다.
      </p>
      <p className="text-[var(--color-text-muted)]">최종 업데이트: 2026-08-13</p>
    </LegalPageShell>
  )
}
