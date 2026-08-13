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
import {
  AlertDialogView,
  type AlertDialogVariant,
} from '@/components/ui/AlertDialog'

export interface AlertOptions {
  title?: string
  message: string
  confirmLabel?: string
  variant?: AlertDialogVariant
}

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: AlertDialogVariant
}

interface AlertDialogContextValue {
  /** window.alert 대체 — 확인 후 resolve */
  alert: (options: AlertOptions | string) => Promise<void>
  /** window.confirm 대체 — 확인 true / 취소 false */
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

type DialogMode = 'alert' | 'confirm'

interface DialogState {
  open: boolean
  mode: DialogMode
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  variant: AlertDialogVariant
}

const INITIAL_STATE: DialogState = {
  open: false,
  mode: 'alert',
  title: '알림',
  message: '',
  confirmLabel: '확인',
  cancelLabel: '취소',
  variant: 'info',
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null)

interface AlertDialogProviderProps {
  children: ReactNode
}

/**
 * 앱 전역 Alert/Confirm 다이얼로그 Provider
 * @param {AlertDialogProviderProps} props - children
 * @returns {React.ReactElement}
 */
export function AlertDialogProvider({ children }: AlertDialogProviderProps) {
  const [state, setState] = useState<DialogState>(INITIAL_STATE)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  /**
   * 대기 중인 Promise를 종료하고 다이얼로그를 닫는다.
   * @param {boolean} result - confirm 결과 (alert는 항상 true)
   * @returns {void}
   */
  const settle = useCallback((result: boolean) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setState(INITIAL_STATE)
    resolve?.(result)
  }, [])

  /**
   * alert 다이얼로그를 연다.
   * @param {AlertOptions | string} input - 메시지 또는 옵션
   * @returns {Promise<void>}
   */
  const alert = useCallback((input: AlertOptions | string) => {
    const options: AlertOptions = typeof input === 'string' ? { message: input } : input
    return new Promise<void>((resolve) => {
      resolverRef.current = () => {
        resolve()
      }
      setState({
        open: true,
        mode: 'alert',
        title: options.title ?? '알림',
        message: options.message,
        confirmLabel: options.confirmLabel ?? '확인',
        cancelLabel: '취소',
        variant: options.variant ?? 'info',
      })
    })
  }, [])

  /**
   * confirm 다이얼로그를 연다.
   * @param {ConfirmOptions | string} input - 메시지 또는 옵션
   * @returns {Promise<boolean>}
   */
  const confirm = useCallback((input: ConfirmOptions | string) => {
    const options: ConfirmOptions =
      typeof input === 'string' ? { message: input } : input
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({
        open: true,
        mode: 'confirm',
        title: options.title ?? '확인',
        message: options.message,
        confirmLabel: options.confirmLabel ?? '확인',
        cancelLabel: options.cancelLabel ?? '취소',
        variant: options.variant ?? 'danger',
      })
    })
  }, [])

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm])

  return (
    <AlertDialogContext.Provider value={value}>
      {children}
      <AlertDialogView
        isOpen={state.open}
        title={state.title}
        message={state.message}
        variant={state.variant}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        showCancel={state.mode === 'confirm'}
        onConfirm={() => {
          settle(true)
        }}
        onCancel={() => {
          settle(false)
        }}
      />
    </AlertDialogContext.Provider>
  )
}

/**
 * Alert/Confirm 훅
 * @returns {AlertDialogContextValue}
 */
export function useAlertDialog(): AlertDialogContextValue {
  const context = useContext(AlertDialogContext)
  if (!context) {
    throw new Error('useAlertDialog는 AlertDialogProvider 안에서만 사용할 수 있습니다.')
  }
  return context
}
