'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, FileDropzone, Modal, ProgressBar } from '@/components/ui'
import { useAlertDialog } from '@/contexts/AlertDialogContext'
import { useToast } from '@/contexts/ToastContext'
import { useCanvasImage } from '@/hooks/useCanvasImage'
import { removeBackground } from '@/lib/background-removal'
import { CUTOUT_MAX_EDGE } from '@/lib/cutout-constants'
import {
  detectDeviceCapability,
  downscaleImageFile,
  getCutoutInputWarnings,
  readImageLongestEdge,
} from '@/lib/device-capability'

interface CutoutDialogProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * 누끼 후 업로드 다이얼로그
 * @param {CutoutDialogProps} props - props
 * @returns {React.ReactElement}
 */
export function CutoutDialog({ isOpen, onClose }: CutoutDialogProps) {
  const { addUploadedImageFromBlob } = useCanvasImage()
  const { confirm } = useAlertDialog()
  const { toast } = useToast()
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
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
   * @returns {Promise<void>}
   */
  const handleRunCutout = async () => {
    if (!sourceFile || isRunning) {
      return
    }

    let longestEdge = 0
    try {
      longestEdge = await readImageLongestEdge(sourceFile)
    } catch {
      toast({ message: '이미지를 읽을 수 없습니다.', variant: 'error' })
      return
    }

    const capability = detectDeviceCapability()
    const inputWarnings = getCutoutInputWarnings(sourceFile, longestEdge)
    const shouldWarn = capability.isLowSpec || inputWarnings.length > 0

    if (shouldWarn) {
      const reasons = [...capability.reasons, ...inputWarnings].join(', ')
      const ok = await confirm({
        title: '누끼를 진행할까요?',
        message: `이 환경에서는 처리가 오래 걸리거나 탭이 불안정할 수 있습니다.\n(${reasons})\n\n첫 실행 시 모델을 받으며, 긴 변은 ${CUTOUT_MAX_EDGE}px로 줄여 처리합니다.`,
        confirmLabel: '계속',
        cancelLabel: '취소',
        variant: 'info',
      })
      if (!ok) {
        return
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
        preferLightModel: true,
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
      toast({ message: '누끼가 완료되었습니다. 캔버스에 추가하세요.', variant: 'success' })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast({ message: '누끼를 취소했습니다.', variant: 'info' })
      } else {
        const message =
          error instanceof Error ? error.message : '누끼에 실패했습니다.'
        toast({
          message: `${message} 해상도를 낮추거나 PC에서 다시 시도해 주세요.`,
          variant: 'error',
        })
      }
    } finally {
      setIsRunning(false)
      abortRef.current = null
    }
  }

  /**
   * 결과를 캔버스에 추가
   * @returns {Promise<void>}
   */
  const handleAddToCanvas = async () => {
    if (!resultBlob) {
      return
    }
    try {
      const ok = await addUploadedImageFromBlob(resultBlob, '누끼이미지.png')
      if (!ok) {
        toast({ message: '캔버스가 준비되지 않았습니다.', variant: 'error' })
        return
      }
      toast({ message: '누끼 이미지를 추가했습니다.', variant: 'success' })
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
      title="누끼 후 업로드"
      showCloseButton={!isRunning}
      closeOnOverlayClick={!isRunning}
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-text-muted)]">
            새 파일을 올려 배경을 제거한 뒤 업로드된이미지 레이어로 추가합니다.
          </p>
          <div className="flex gap-2">
            {isRunning ? (
              <Button variant="ghost" onClick={handleCancelRun}>
                취소
              </Button>
            ) : null}
            <Button
              variant="secondary"
              disabled={!sourceFile || isRunning}
              onClick={() => {
                void handleRunCutout()
              }}
            >
              누끼 실행
            </Button>
            <Button
              variant="primary"
              disabled={!resultBlob || isRunning}
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
          title="누끼할 이미지 선택"
          description="PNG / JPEG / WebP"
          accept="image/png,image/jpeg,image/webp"
          disabled={isRunning}
          onChange={(event) => {
            handleFilePick(event.target.files)
            event.target.value = ''
          }}
        />

        {isRunning || progressLabel ? (
          <div className="space-y-1">
            <ProgressBar value={progressPct} />
            <p className="text-xs text-[var(--color-text-muted)]">{progressLabel}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className="rounded-md border border-[var(--color-border)] bg-[repeating-conic-gradient(#808080_0%_25%,#c0c0c0_0%_50%)] bg-[length:16px_16px] p-2">
            <p className="mb-1 text-xs text-[var(--color-text)] drop-shadow">결과</p>
            {resultUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resultUrl}
                alt="누끼 결과"
                className="mx-auto max-h-48 object-contain"
              />
            ) : (
              <p className="py-10 text-center text-xs text-[var(--color-text-muted)]">
                누끼 실행 후 표시
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
