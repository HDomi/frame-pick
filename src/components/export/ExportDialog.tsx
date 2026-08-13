'use client'

import { useMemo, useState } from 'react'
import { Button, FormField, Modal, SegmentedControl } from '@/components/ui'
import {
  DEFAULT_EXPORT_OPTIONS,
  EXPORT_RESOLUTION_PRESETS,
  isLossyExportFormat,
  resolveExportPixelSize,
  type ExportFormat,
  type ExportOptions,
  type ExportQualityLevel,
  type ExportResolutionId,
} from '@/lib/export-options'
import type { CanvasSize } from '@/lib/canvas-size'
import { cn } from '@/lib/cn'

interface ExportDialogProps {
  isOpen: boolean
  artboard: CanvasSize
  isExporting?: boolean
  onClose: () => void
  onExport: (options: ExportOptions) => void | Promise<void>
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]

const QUALITY_OPTIONS: { value: ExportQualityLevel; label: string }[] = [
  { value: 'low', label: '저' },
  { value: 'medium', label: '중' },
  { value: 'high', label: '고' },
]

/**
 * 썸네일 다운로드 설정 다이얼로그
 * @param {ExportDialogProps} props
 * @returns {React.ReactElement}
 */
export function ExportDialog({
  isOpen,
  artboard,
  isExporting = false,
  onClose,
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>(DEFAULT_EXPORT_OPTIONS.format)
  const [quality, setQuality] = useState<ExportQualityLevel>(DEFAULT_EXPORT_OPTIONS.quality)
  const [resolutionId, setResolutionId] = useState<ExportResolutionId>(
    DEFAULT_EXPORT_OPTIONS.resolutionId,
  )

  const outputSize = useMemo(
    () => resolveExportPixelSize(artboard, resolutionId),
    [artboard, resolutionId],
  )

  const lossy = isLossyExportFormat(format)
  const scale = outputSize.width / artboard.width
  const scaleLabel =
    Math.abs(scale - 1) < 0.01 ? '원본' : scale > 1 ? `${scale.toFixed(2)}× 업` : `${scale.toFixed(2)}× 다운`

  /**
   * 다운로드 실행
   * @returns {void}
   */
  const handleExport = () => {
    void onExport({ format, quality, resolutionId })
  }

  return (
    <Modal
      isOpen={isOpen}
      title="다운로드"
      showCloseButton={!isExporting}
      closeOnOverlayClick={!isExporting}
      onClose={onClose}
      className="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={isExporting} onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" disabled={isExporting} onClick={handleExport}>
            {isExporting ? '내보내는 중…' : '다운로드'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs text-[var(--color-text-muted)]">
          아트보드 {artboard.width}×{artboard.height}
          {artboard.id === 'fhd_1080' ? ' (기본 Full HD)' : ''} · 출력{' '}
          {outputSize.width}×{outputSize.height} ({scaleLabel})
        </p>

        <FormField label="해상도">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {EXPORT_RESOLUTION_PRESETS.map((preset) => {
              const selected = resolutionId === preset.id
              const sizeLabel =
                preset.width == null
                  ? `${artboard.width}×${artboard.height}`
                  : `${preset.width}×${preset.height}`
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isExporting}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left transition-colors',
                    selected
                      ? 'border-[var(--color-accent)] bg-[var(--color-surface-raised)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]',
                  )}
                  onClick={() => {
                    setResolutionId(preset.id)
                  }}
                >
                  <span className="block text-sm font-medium text-[var(--color-text)]">
                    {preset.label === '아트보드' ? `아트보드 (${sizeLabel})` : preset.label}
                  </span>
                  <span className="block text-[10px] text-[var(--color-text-muted)]">
                    {preset.description}
                  </span>
                </button>
              )
            })}
          </div>
        </FormField>

        <FormField label="파일 형식">
          <SegmentedControl
            value={format}
            disabled={isExporting}
            options={FORMAT_OPTIONS}
            onChange={setFormat}
          />
          <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
            {format === 'png'
              ? '투명·무손실. 용량은 가장 큽니다.'
              : format === 'jpeg'
                ? '호환성 좋음. 투명 배경은 불투명으로 합쳐집니다.'
                : '용량·화질 균형. 일부 구형 환경은 미지원일 수 있습니다.'}
          </p>
        </FormField>

        <FormField label={`화질${lossy ? '' : ' (JPEG/WebP만)'}`}>
          <SegmentedControl
            value={quality}
            disabled={isExporting || !lossy}
            options={QUALITY_OPTIONS}
            onChange={setQuality}
          />
          <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
            {lossy
              ? '저 = 용량↓ · 고 = 디테일↑'
              : 'PNG는 무손실이라 화질 단계가 적용되지 않습니다.'}
          </p>
        </FormField>
      </div>
    </Modal>
  )
}
