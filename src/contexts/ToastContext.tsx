'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'

export type ToastVariant = 'info' | 'success' | 'error'

export interface ToastInput {
  message: string
  variant?: ToastVariant
  durationMs?: number
}

interface ToastItem extends Required<Pick<ToastInput, 'message' | 'variant' | 'durationMs'>> {
  id: string
}

interface ToastContextValue {
  toast: (input: ToastInput | string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** 토스트 기본 표시 시간 (ms) */
const DEFAULT_DURATION_MS = 2000

/** 동시에 쌓을 수 있는 최대 개수 (초과 시 가장 오래된 것부터 제거) */
const MAX_TOAST_STACK = 8

const VARIANT_CLASS: Record<ToastVariant, string> = {
  info: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
  success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
  error: 'border-red-500/40 bg-red-950/90 text-red-100',
}

interface ToastProviderProps {
  children: ReactNode
}

/**
 * 상단 중앙 스택형 토스트 Provider
 * @param {ToastProviderProps} props - children
 * @returns {React.ReactElement}
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  /**
   * 토스트를 제거하고 타이머를 정리한다.
   * @param {string} id - 토스트 ID
   * @returns {void}
   */
  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => {
        clearTimeout(timer)
      })
      timers.clear()
    }
  }, [])

  /**
   * 토스트를 스택에 추가한다. (새 항목이 위)
   * @param {ToastInput | string} input - 메시지 또는 옵션
   * @returns {void}
   */
  const toast = useCallback(
    (input: ToastInput | string) => {
      const payload: ToastInput = typeof input === 'string' ? { message: input } : input
      const id = `toast_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      const item: ToastItem = {
        id,
        message: payload.message,
        variant: payload.variant ?? 'info',
        durationMs: payload.durationMs ?? DEFAULT_DURATION_MS,
      }

      setItems((prev) => {
        const next = [item, ...prev]
        if (next.length <= MAX_TOAST_STACK) {
          return next
        }
        const overflow = next.slice(MAX_TOAST_STACK)
        overflow.forEach((old) => {
          const timer = timersRef.current.get(old.id)
          if (timer) {
            clearTimeout(timer)
            timersRef.current.delete(old.id)
          }
        })
        return next.slice(0, MAX_TOAST_STACK)
      })

      const timer = window.setTimeout(() => {
        dismiss(id)
      }, item.durationMs)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-3 left-1/2 z-[80] flex w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col items-stretch gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto animate-[toast-in_180ms_ease-out] rounded-md border px-3 py-2 text-sm shadow-lg',
              VARIANT_CLASS[item.variant],
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * 토스트 훅
 * @returns {ToastContextValue}
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast는 ToastProvider 안에서만 사용할 수 있습니다.')
  }
  return context
}
