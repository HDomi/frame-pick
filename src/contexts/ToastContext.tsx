'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION_MS = 3200

const VARIANT_CLASS: Record<ToastVariant, string> = {
  info: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
  success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
  error: 'border-red-500/40 bg-red-950/90 text-red-100',
}

interface ToastProviderProps {
  children: ReactNode
}

/**
 * 좌상단 토스트 알림 Provider
 * @param {ToastProviderProps} props - children
 * @returns {React.ReactElement}
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([])

  /**
   * 토스트를 제거하고 타이머를 정리한다.
   * @param {string} id - 토스트 ID
   * @returns {void}
   */
  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  /**
   * 토스트를 표시한다.
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
      setItems((prev) => [...prev.slice(-4), item])
      window.setTimeout(() => {
        dismiss(id)
      }, item.durationMs)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-3 left-3 z-[80] flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-lg',
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
