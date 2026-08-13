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
import { extractVideoFrames } from '@/lib/video-frame-extractor'
import type { ExtractedFrame } from '@/types/editor'

interface VideoSessionContextValue {
  videoName: string | null
  frames: ExtractedFrame[]
  isDialogOpen: boolean
  hasVideo: boolean
  openDialog: () => void
  closeDialog: () => void
  clearVideo: () => void
  uploadVideo: (file: File) => Promise<void>
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
  const [frames, setFrames] = useState<ExtractedFrame[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * 프레임 선택 다이얼로그를 연다.
   * @returns {void}
   */
  const openDialog = useCallback(() => {
    if (frames.length === 0) {
      toast({ message: '먼저 영상을 업로드해 주세요.', variant: 'info' })
      return
    }
    setIsDialogOpen(true)
  }, [frames.length, toast])

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
    setFrames([])
    setIsDialogOpen(false)
  }, [])

  /**
   * 영상을 업로드하고 프레임을 추출한 뒤 다이얼로그를 연다.
   * @param {File} file - 영상 파일
   * @returns {Promise<void>}
   */
  const uploadVideo = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) {
        toast({
          message: '영상 파일만 업로드할 수 있습니다. (MP4/WebM/MOV)',
          variant: 'error',
        })
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const nextFrames = await withLoading(
          async (update) => {
            update({ message: '프레임 추출 중…', progress: 0 })
            return extractVideoFrames(file, {
              signal: controller.signal,
              onProgress: (progress) => {
                update({ message: '프레임 추출 중…', progress })
              },
            })
          },
          { message: '영상 업로드 중…', progress: 0 },
        )

        setVideoName(file.name)
        setFrames(nextFrames)
        setIsDialogOpen(true)
        toast({
          message: `${nextFrames.length}개 프레임을 추출했습니다.`,
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
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [toast, withLoading],
  )

  const value = useMemo<VideoSessionContextValue>(
    () => ({
      videoName,
      frames,
      isDialogOpen,
      hasVideo: frames.length > 0,
      openDialog,
      closeDialog,
      clearVideo,
      uploadVideo,
    }),
    [
      clearVideo,
      closeDialog,
      frames,
      isDialogOpen,
      openDialog,
      uploadVideo,
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
