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
import type { Canvas } from 'fabric'
import {
  DEFAULT_CANVAS_SIZE_ID,
  getCanvasSizeById,
  type CanvasSize,
  type CanvasSizeId,
} from '@/lib/canvas-size'
import { applyCanvasSize } from '@/lib/canvas-fit'

interface CanvasContextValue {
  canvas: Canvas | null
  isReady: boolean
  canvasSize: CanvasSize
  canvasSizeId: CanvasSizeId
  registerCanvas: (nextCanvas: Canvas | null) => void
  setCanvasSizeId: (nextId: CanvasSizeId, options?: { skipObjectScale?: boolean }) => void
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

interface CanvasProviderProps {
  children: ReactNode
}

/**
 * Fabric 캔버스 인스턴스·해상도를 앱 전역에서 공유하는 Provider
 * @param {CanvasProviderProps} props - children
 * @returns {React.ReactElement} - Provider
 */
export function CanvasProvider({ children }: CanvasProviderProps) {
  const [canvas, setCanvas] = useState<Canvas | null>(null)
  const [canvasSizeId, setCanvasSizeIdState] = useState<CanvasSizeId>(DEFAULT_CANVAS_SIZE_ID)
  const canvasSize = useMemo(() => getCanvasSizeById(canvasSizeId), [canvasSizeId])
  const canvasSizeIdRef = useRef(canvasSizeId)
  canvasSizeIdRef.current = canvasSizeId

  /**
   * 캔버스 인스턴스를 등록/해제한다.
   * @param {Canvas | null} nextCanvas - 등록할 캔버스
   * @returns {void}
   */
  const registerCanvas = useCallback((nextCanvas: Canvas | null) => {
    setCanvas(nextCanvas)
  }, [])

  /**
   * 논리 해상도 프리셋을 변경한다.
   * @param {CanvasSizeId} nextId - 다음 프리셋 ID
   * @param {{ skipObjectScale?: boolean }} [options] - JSON 복원 시 객체 재스케일 생략
   * @returns {void}
   */
  const setCanvasSizeId = useCallback(
    (nextId: CanvasSizeId, options?: { skipObjectScale?: boolean }) => {
      const prevId = canvasSizeIdRef.current
      if (prevId === nextId) {
        if (options?.skipObjectScale && canvas) {
          const size = getCanvasSizeById(nextId)
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
          canvas.setZoom(1)
          canvas.setDimensions({ width: size.width, height: size.height })
        }
        return
      }

      const nextSize = getCanvasSizeById(nextId)

      if (canvas) {
        if (options?.skipObjectScale) {
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
          canvas.setZoom(1)
          canvas.setDimensions({
            width: nextSize.width,
            height: nextSize.height,
          })
        } else {
          applyCanvasSize(canvas, nextSize, getCanvasSizeById(prevId))
        }
      }

      setCanvasSizeIdState(nextId)
    },
    [canvas],
  )

  const value = useMemo<CanvasContextValue>(
    () => ({
      canvas,
      isReady: canvas !== null,
      canvasSize,
      canvasSizeId,
      registerCanvas,
      setCanvasSizeId,
    }),
    [canvas, canvasSize, canvasSizeId, registerCanvas, setCanvasSizeId],
  )

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
}

/**
 * 공유 Fabric 캔버스 컨텍스트 훅
 * @returns {CanvasContextValue} - 캔버스 상태
 */
export function useCanvas(): CanvasContextValue {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvas는 CanvasProvider 안에서만 사용할 수 있습니다.')
  }
  return context
}
