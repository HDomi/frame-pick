'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface LoadingState {
  visible: boolean
  message: string
  progress: number | null
}

interface ShowLoadingOptions {
  message?: string
  progress?: number | null
}

interface LoadingContextValue {
  isLoading: boolean
  showLoading: (options?: ShowLoadingOptions | string) => void
  updateLoading: (options: ShowLoadingOptions) => void
  hideLoading: () => void
  /** 작업 동안 로딩을 띄우고 끝나면 닫는다 */
  withLoading: <T>(
    task: (update: (options: ShowLoadingOptions) => void) => Promise<T>,
    options?: ShowLoadingOptions | string,
  ) => Promise<T>
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

const INITIAL_STATE: LoadingState = {
  visible: false,
  message: '처리 중…',
  progress: null,
}

interface LoadingProviderProps {
  children: ReactNode
}

/**
 * 전역 차단형 로딩 오버레이 Provider
 * @param {LoadingProviderProps} props - children
 * @returns {React.ReactElement}
 */
export function LoadingProvider({ children }: LoadingProviderProps) {
  const [state, setState] = useState<LoadingState>(INITIAL_STATE)

  /**
   * 로딩 오버레이를 연다.
   * @param {ShowLoadingOptions | string} [options] - 메시지/진행률
   * @returns {void}
   */
  const showLoading = useCallback((options?: ShowLoadingOptions | string) => {
    const normalized =
      typeof options === 'string'
        ? { message: options, progress: null as number | null }
        : {
            message: options?.message ?? '처리 중…',
            progress: options?.progress ?? null,
          }
    setState({
      visible: true,
      message: normalized.message,
      progress: normalized.progress,
    })
  }, [])

  /**
   * 로딩 메시지/진행률을 갱신한다.
   * @param {ShowLoadingOptions} options - 갱신 값
   * @returns {void}
   */
  const updateLoading = useCallback((options: ShowLoadingOptions) => {
    setState((prev) => ({
      visible: true,
      message: options.message ?? prev.message,
      progress: options.progress === undefined ? prev.progress : options.progress,
    }))
  }, [])

  /**
   * 로딩 오버레이를 닫는다.
   * @returns {void}
   */
  const hideLoading = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  /**
   * 비동기 작업 동안 로딩을 표시한다.
   * @param {Function} task - 작업 함수
   * @param {ShowLoadingOptions | string} [options] - 초기 로딩 옵션
   * @returns {Promise<T>}
   */
  const withLoading = useCallback(
    async <T,>(
      task: (update: (options: ShowLoadingOptions) => void) => Promise<T>,
      options?: ShowLoadingOptions | string,
    ): Promise<T> => {
      showLoading(options)
      try {
        return await task(updateLoading)
      } finally {
        hideLoading()
      }
    },
    [hideLoading, showLoading, updateLoading],
  )

  const value = useMemo<LoadingContextValue>(
    () => ({
      isLoading: state.visible,
      showLoading,
      updateLoading,
      hideLoading,
      withLoading,
    }),
    [hideLoading, showLoading, state.visible, updateLoading, withLoading],
  )

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {state.visible ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4"
          role="alert"
          aria-busy="true"
          aria-live="assertive"
        >
          <div className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl">
            <p className="mb-3 text-center text-sm font-medium text-[var(--color-text)]">
              {state.message}
            </p>
            <ProgressBar
              value={state.progress ?? 0}
              indeterminate={state.progress == null}
            />
            {state.progress != null ? (
              <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
                {Math.round(state.progress)}%
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </LoadingContext.Provider>
  )
}

/**
 * 전역 로딩 훅
 * @returns {LoadingContextValue}
 */
export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading은 LoadingProvider 안에서만 사용할 수 있습니다.')
  }
  return context
}
