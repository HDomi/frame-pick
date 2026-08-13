'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLoading } from '@/contexts/LoadingContext'
import { useToast } from '@/contexts/ToastContext'
import {
  captureFrameAtTime,
  extractVideoFrames,
} from '@/lib/video-frame-extractor'
import { FRAME_THUMB_MAX_EDGE, VIDEO_SIZE_WARN_BYTES } from '@/lib/video-constants'
import type { ExtractedFrame } from '@/types/editor'

interface VideoSessionContextValue {
  videoName: string | null
  videoFile: File | null
  videoDuration: number
  frames: ExtractedFrame[]
  isDialogOpen: boolean
  isExtracting: boolean
  hasVideo: boolean
  openDialog: () => void
  closeDialog: () => void
  clearVideo: () => void
  uploadVideo: (file: File) => Promise<void>
  captureManualFrame: (timeSec: number) => Promise<ExtractedFrame | null>
}

const VideoSessionContext = createContext<VideoSessionContextValue | null>(null)

interface VideoSessionProviderProps {
  children: ReactNode
}

/**
 * 업로드된 영상·추출 프레임·다이얼로그 상태를 공유한다.
 * @param {VideoSessionProviderProps} props - children
 * @returns {React.ReactElement}
 */
export function VideoSessionProvider({ children }: VideoSessionProviderProps) {
  const { withLoading } = useLoading()
  const { toast } = useToast()
  const [videoName, setVideoName] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [frames, setFrames] = useState<ExtractedFrame[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * 프레임 선택 다이얼로그를 연다.
   * @returns {void}
   */
  const openDialog = useCallback(() => {
    if (!videoFile && frames.length === 0) {
      toast({ message: '먼저 영상을 업로드해 주세요.', variant: 'info' })
      return
    }
    setIsDialogOpen(true)
  }, [frames.length, toast, videoFile])

  /**
   * 다이얼로그를 닫는다.
   * @returns {void}
   */
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  /**
   * 영상·프레임 상태를 초기화한다.
   * @returns {void}
   */
  const clearVideo = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setVideoName(null)
    setVideoFile(null)
    setVideoDuration(0)
    setFrames([])
    setIsDialogOpen(false)
    setIsExtracting(false)
  }, [])

  /**
   * 영상을 업로드하고 0~90% 구간 프레임을 추출한 뒤 다이얼로그를 연다.
   * @param {File} file - 영상 파일
   * @returns {Promise<void>}
   */
  const uploadVideo = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) {
        toast({
          message:
            '영상 파일만 업로드할 수 있습니다. Chrome + MP4(H.264)를 권장합니다.',
          variant: 'error',
        })
        return
      }

      if (file.size >= VIDEO_SIZE_WARN_BYTES) {
        toast({
          message:
            '파일이 큽니다(200MB+). iOS/저사양에서는 추출이 실패할 수 있어요.',
          variant: 'info',
          durationMs: 4000,
        })
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      // 이전 프레임 dataURL 참조 해제 (메모리)
      setFrames([])
      setIsExtracting(true)

      try {
        const result = await withLoading(
          async (update) => {
            update({ message: '프레임 추출 중… (편집 잠금)', progress: 0 })
            return extractVideoFrames(file, {
              signal: controller.signal,
              thumbMaxEdge: FRAME_THUMB_MAX_EDGE,
              onProgress: (progress) => {
                update({ message: '프레임 추출 중… (편집 잠금)', progress })
              },
            })
          },
          { message: '영상 업로드 중… (편집 잠금)', progress: 0 },
        )

        setVideoName(file.name)
        setVideoFile(file)
        setVideoDuration(result.duration)
        setFrames(result.frames)
        setIsDialogOpen(true)
        toast({
          message: `${result.frames.length}개 프레임을 추출했습니다. (0~90% 구간)`,
          variant: 'success',
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        const message =
          error instanceof Error ? error.message : '프레임 추출에 실패했습니다.'
        toast({ message, variant: 'error' })
      } finally {
        setIsExtracting(false)
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [toast, withLoading],
  )

  /**
   * 수동 시킹으로 프레임 1장을 캡처해 목록에 추가한다.
   * @param {number} timeSec - 캡처 시각
   * @returns {Promise<ExtractedFrame | null>}
   */
  const captureManualFrame = useCallback(
    async (timeSec: number): Promise<ExtractedFrame | null> => {
      if (!videoFile) {
        toast({ message: '업로드된 영상이 없습니다.', variant: 'error' })
        return null
      }

      try {
        const frame = await withLoading(
          async () =>
            captureFrameAtTime(videoFile, timeSec, {
              maxEdge: FRAME_THUMB_MAX_EDGE,
            }),
          '선택한 시점 캡처 중…',
        )
        setFrames((prev) => {
          const nextIndex = prev.length
          return [...prev, { ...frame, index: nextIndex }]
        })
        toast({ message: '수동 캡처 프레임을 추가했습니다.', variant: 'success' })
        return frame
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '캡처에 실패했습니다.'
        toast({ message, variant: 'error' })
        return null
      }
    },
    [toast, videoFile, withLoading],
  )

  const value = useMemo<VideoSessionContextValue>(
    () => ({
      videoName,
      videoFile,
      videoDuration,
      frames,
      isDialogOpen,
      isExtracting,
      hasVideo: Boolean(videoFile) || frames.length > 0,
      openDialog,
      closeDialog,
      clearVideo,
      uploadVideo,
      captureManualFrame,
    }),
    [
      captureManualFrame,
      clearVideo,
      closeDialog,
      frames,
      isDialogOpen,
      isExtracting,
      openDialog,
      uploadVideo,
      videoDuration,
      videoFile,
      videoName,
    ],
  )

  return (
    <VideoSessionContext.Provider value={value}>{children}</VideoSessionContext.Provider>
  )
}

/**
 * 영상 세션 훅
 * @returns {VideoSessionContextValue}
 */
export function useVideoSession(): VideoSessionContextValue {
  const context = useContext(VideoSessionContext)
  if (!context) {
    throw new Error('useVideoSession은 VideoSessionProvider 안에서만 사용할 수 있습니다.')
  }
  return context
}
