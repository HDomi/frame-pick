'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, FileDropzone, Modal, ProgressBar } from '@/components/ui'
import { useAlertDialog } from '@/contexts/AlertDialogContext'
import { useToast } from '@/contexts/ToastContext'
import { useCanvasImage } from '@/hooks/useCanvasImage'
import { removeBackground } from '@/lib/background-removal'
import { CUTOUT_MAX_EDGE, type CutoutQuality } from '@/lib/cutout-constants'
import {
  detectDeviceCapability,
  downscaleImageFile,
  getCutoutInputWarnings,
  readImageLongestEdge,
} from '@/lib/device-capability'
import { cn } from '@/lib/cn'

interface ImageStickerDialogProps {
  isOpen: boolean
  onClose: () => void
}

const QUALITY_OPTIONS: { value: CutoutQuality; label: string; hint: string }[] = [
  {
    value: 'solid',
    label: '단색 배경',
    hint: '로고·플랫 이미지 추천',
  },
  {
    value: 'quality',
    label: 'AI 고품질',
    hint: '실사·복잡한 배경',
  },
  {
    value: 'fast',
    label: 'AI 빠름',
    hint: '경량·저사양',
  },
]

/**
 * 이미지로 스티커 만들기 다이얼로그 (누끼는 선택)
 * @param {ImageStickerDialogProps} props - props
 * @returns {React.ReactElement}
 */
export function CutoutDialog({ isOpen, onClose }: ImageStickerDialogProps) {
  const { addImageStickerFromBlob } = useCanvasImage()
  const { confirm } = useAlertDialog()
  const { toast } = useToast()
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [useCutout, setUseCutout] = useState(false)
  const [cutoutQuality, setCutoutQuality] = useState<CutoutQuality>('solid')
  const [isRunning, setIsRunning] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort()
      abortRef.current = null
      setSourceFile(null)
      setResultBlob(null)
      setUseCutout(false)
      setCutoutQuality('solid')
      setIsRunning(false)
      setProgressLabel('')
      setProgressPct(0)
      if (sourcePreviewUrl) {
        URL.revokeObjectURL(sourcePreviewUrl)
      }
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl)
      }
      setSourcePreviewUrl(null)
      setResultUrl(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 닫힐 때만 정리
  }, [isOpen])

  /**
   * 파일 선택
   * @param {FileList | null} files - 파일 목록
   * @returns {void}
   */
  const handleFilePick = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) {
      return
    }
    if (!file.type.startsWith('image/')) {
      toast({ message: '이미지 파일만 선택할 수 있습니다.', variant: 'error' })
      return
    }
    if (sourcePreviewUrl) {
      URL.revokeObjectURL(sourcePreviewUrl)
    }
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl)
    }
    setSourceFile(file)
    setSourcePreviewUrl(URL.createObjectURL(file))
    setResultBlob(null)
    setResultUrl(null)
  }

  /**
   * 누끼 실행
   * @returns {Promise<Blob | null>}
   */
  const runCutout = async (): Promise<Blob | null> => {
    if (!sourceFile) {
      return null
    }

    let longestEdge = 0
    try {
      longestEdge = await readImageLongestEdge(sourceFile)
    } catch {
      toast({ message: '이미지를 읽을 수 없습니다.', variant: 'error' })
      return null
    }

    const capability = detectDeviceCapability()
    const inputWarnings = getCutoutInputWarnings(sourceFile, longestEdge)
    const needsHeavyWarn =
      cutoutQuality !== 'solid' && (capability.isLowSpec || inputWarnings.length > 0)

    if (needsHeavyWarn) {
      const reasons = [...capability.reasons, ...inputWarnings].join(', ')
      const ok = await confirm({
        title: 'AI 누끼를 진행할까요?',
        message: `이 환경에서는 처리가 오래 걸리거나 탭이 불안정할 수 있습니다.\n(${reasons})\n\n로고/단색이면 「단색 배경」이 더 깔끔합니다. 긴 변은 ${CUTOUT_MAX_EDGE}px로 줄여 처리합니다.`,
        confirmLabel: '계속',
        cancelLabel: '취소',
        variant: 'info',
      })
      if (!ok) {
        return null
      }
    }

    const controller = new AbortController()
    abortRef.current = controller
    setIsRunning(true)
    setProgressPct(0)
    setProgressLabel('준비 중…')

    try {
      const inputBlob = await downscaleImageFile(sourceFile, CUTOUT_MAX_EDGE)
      const blob = await removeBackground(inputBlob, {
        quality: cutoutQuality,
        signal: controller.signal,
        onProgress: (info) => {
          setProgressPct(Math.round(info.progress))
          setProgressLabel(info.message || info.step)
        },
      })

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl)
      }
      const url = URL.createObjectURL(blob)
      setResultBlob(blob)
      setResultUrl(url)
      setProgressPct(100)
      setProgressLabel('완료')
      return blob
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast({ message: '누끼를 취소했습니다.', variant: 'info' })
      } else {
        const message =
          error instanceof Error ? error.message : '누끼에 실패했습니다.'
        toast({
          message: `${message} 「단색 배경」모드를 시도해 보세요.`,
          variant: 'error',
        })
      }
      return null
    } finally {
      setIsRunning(false)
      abortRef.current = null
    }
  }

  /**
   * 캔버스에 스티커로 추가
   * @returns {Promise<void>}
   */
  const handleAddToCanvas = async () => {
    if (!sourceFile || isRunning) {
      return
    }

    try {
      let blob: Blob = sourceFile
      if (useCutout) {
        if (resultBlob) {
          blob = resultBlob
        } else {
          const cut = await runCutout()
          if (!cut) {
            return
          }
          blob = cut
        }
      }

      const name = sourceFile.name.replace(/\.[^.]+$/, '') || '이미지 스티커'
      const ok = await addImageStickerFromBlob(blob, name)
      if (!ok) {
        toast({ message: '캔버스가 준비되지 않았습니다.', variant: 'error' })
        return
      }
      toast({
        message: '스티커를 추가했습니다. 바깥 핸들로 크기·회전하세요.',
        variant: 'success',
      })
      onClose()
    } catch {
      toast({ message: '캔버스 추가에 실패했습니다.', variant: 'error' })
    }
  }

  /**
   * 취소
   * @returns {void}
   */
  const handleCancelRun = () => {
    abortRef.current?.abort()
  }

  return (
    <Modal
      isOpen={isOpen}
      title="이미지로 스티커 만들기"
      showCloseButton={!isRunning}
      closeOnOverlayClick={!isRunning}
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-text-muted)]">
            로고·단색(안쪽 구멍 포함)은 「단색 배경」, 인물·복잡한 배경은 「AI 고품질」.
          </p>
          <div className="flex gap-2">
            {isRunning ? (
              <Button variant="ghost" onClick={handleCancelRun}>
                취소
              </Button>
            ) : null}
            {useCutout ? (
              <Button
                variant="secondary"
                disabled={!sourceFile || isRunning}
                onClick={() => {
                  void runCutout()
                }}
              >
                누끼 미리보기
              </Button>
            ) : null}
            <Button
              variant="primary"
              disabled={!sourceFile || isRunning}
              onClick={() => {
                void handleAddToCanvas()
              }}
            >
              캔버스에 추가
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <FileDropzone
          title="스티커로 만들 이미지 선택"
          description="PNG / JPEG / WebP · 원본 크기 기준"
          accept="image/png,image/jpeg,image/webp"
          disabled={isRunning}
          onChange={(event) => {
            handleFilePick(event.target.files)
            event.target.value = ''
          }}
        />

        <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={useCutout}
            disabled={isRunning}
            onChange={(event) => {
              setUseCutout(event.target.checked)
            }}
          />
          배경 제거(누끼) 후 추가
        </label>

        {useCutout ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-[var(--color-text-muted)]">누끼 방식</p>
            <div className="grid grid-cols-3 gap-1">
              {QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={isRunning}
                  className={cn(
                    'rounded-md border px-2 py-2 text-left transition-colors',
                    cutoutQuality === option.value
                      ? 'border-[var(--color-accent)] bg-[var(--color-surface-raised)]'
                      : 'border-[var(--color-border)]',
                  )}
                  onClick={() => {
                    setCutoutQuality(option.value)
                    setResultBlob(null)
                    if (resultUrl) {
                      URL.revokeObjectURL(resultUrl)
                      setResultUrl(null)
                    }
                    setProgressLabel('')
                    setProgressPct(0)
                  }}
                >
                  <span className="block text-xs font-medium text-[var(--color-text)]">
                    {option.label}
                  </span>
                  <span className="block text-[10px] text-[var(--color-text-muted)]">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {isRunning || progressLabel ? (
          <div className="space-y-1">
            <ProgressBar value={progressPct} />
            <p className="text-xs text-[var(--color-text-muted)]">{progressLabel}</p>
          </div>
        ) : null}

        <div
          className={
            useCutout
              ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
              : 'grid grid-cols-1 gap-3'
          }
        >
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-2">
            <p className="mb-1 text-xs text-[var(--color-text-muted)]">원본</p>
            {sourcePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sourcePreviewUrl}
                alt="원본 미리보기"
                className="mx-auto max-h-48 object-contain"
              />
            ) : (
              <p className="py-10 text-center text-xs text-[var(--color-text-muted)]">
                이미지를 선택하세요
              </p>
            )}
          </div>
          {useCutout ? (
            <div className="rounded-md border border-[var(--color-border)] bg-[repeating-conic-gradient(#808080_0%_25%,#c0c0c0_0%_50%)] bg-[length:16px_16px] p-2">
              <p className="mb-1 text-xs text-[var(--color-text)] drop-shadow">누끼 결과</p>
              {resultUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resultUrl}
                  alt="누끼 결과"
                  className="mx-auto max-h-48 object-contain"
                />
              ) : (
                <p className="py-10 text-center text-xs text-[var(--color-text-muted)]">
                  미리보기 또는 추가 시 실행
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
