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
import { useCanvas } from '@/hooks/useCanvas'
import { useEditorDb } from '@/hooks/useEditorDb'
import { useAlertDialog } from '@/contexts/AlertDialogContext'
import { useToast } from '@/contexts/ToastContext'
import {
  applyCanvasJson,
  clearCanvasObjects,
  createEditorSnapshot,
  refitCanvasDisplay,
} from '@/lib/canvas-snapshot'
import { type CanvasSizeId } from '@/lib/canvas-size'
import { ensureBackgroundLayer } from '@/lib/background-layer'
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft-repository'
import { AUTO_SAVE_INTERVAL_MS } from '@/lib/editor-persist-constants'
import {
  clearHistory,
  getHistoryFlags,
  getRedoStep,
  getUndoStep,
  moveHistoryCursor,
  pushHistoryStep,
} from '@/lib/history-repository'

interface EditorSessionContextValue {
  isHydrated: boolean
  isSaving: boolean
  lastSavedAt: number | null
  canUndo: boolean
  canRedo: boolean
  saveDraftNow: () => Promise<void>
  resetEditor: () => Promise<void>
  undo: () => Promise<void>
  redo: () => Promise<void>
}

const EditorSessionContext = createContext<EditorSessionContextValue | null>(null)

interface EditorSessionProviderProps {
  children: ReactNode
}

/**
 * 드래프트 자동저장·히스토리(undo/redo) 세션 Provider
 * @param {EditorSessionProviderProps} props - children
 * @returns {React.ReactElement}
 */
export function EditorSessionProvider({ children }: EditorSessionProviderProps) {
  const { canvas, isReady, canvasSizeId, setCanvasSizeId } = useCanvas()
  const { ensureDb, isReady: isDbReady } = useEditorDb()
  const { toast } = useToast()
  const { confirm } = useAlertDialog()
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const isApplyingRef = useRef(false)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasSizeIdRef = useRef(canvasSizeId)
  canvasSizeIdRef.current = canvasSizeId

  /**
   * undo/redo 버튼 상태를 갱신한다.
   * @returns {Promise<void>}
   */
  const refreshHistoryFlags = useCallback(async () => {
    const db = await ensureDb()
    const flags = await getHistoryFlags(db)
    setCanUndo(flags.canUndo)
    setCanRedo(flags.canRedo)
  }, [ensureDb])

  /**
   * 스냅샷을 적용한다. (size 포함)
   * @param {string} canvasJson - JSON
   * @param {CanvasSizeId} sizeId - 해상도
   * @returns {Promise<void>}
   */
  const applySnapshot = useCallback(
    async (canvasJson: string, sizeId: CanvasSizeId) => {
      if (!canvas) {
        return
      }

      // 진행 중 디바운스 기록이 redo 스택을 지우지 않도록 취소
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current)
        historyTimerRef.current = null
      }

      isApplyingRef.current = true
      try {
        if (canvasSizeIdRef.current !== sizeId) {
          setCanvasSizeId(sizeId, { skipObjectScale: true })
        }
        // 동일 해상도에서 setDimensions를 다시 호출하면 cssOnly 스케일이 깨져
        // 중앙 객체가 overflow로 잘려 안 보이는 버그가 난다. JSON만 복원한다.
        await applyCanvasJson(canvas, canvasJson, sizeId)
        refitCanvasDisplay(canvas, sizeId)
      } finally {
        // loadFromJSON 이벤트 플러시 이후 히스토리 기록 재개
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isApplyingRef.current = false
          })
        })
      }
    },
    [canvas, setCanvasSizeId],
  )

  /**
   * 현재 상태를 히스토리에 기록한다.
   * @returns {Promise<void>}
   */
  const recordHistory = useCallback(async () => {
    if (!canvas || isApplyingRef.current) {
      return
    }
    const db = await ensureDb()
    const snapshot = createEditorSnapshot(canvas, canvasSizeIdRef.current)
    await pushHistoryStep(db, snapshot)
    await refreshHistoryFlags()
  }, [canvas, ensureDb, refreshHistoryFlags])

  /**
   * 디바운스 후 히스토리를 기록한다.
   * @returns {void}
   */
  const scheduleHistoryRecord = useCallback(() => {
    if (!canvas || isApplyingRef.current) {
      return
    }
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current)
    }
    historyTimerRef.current = setTimeout(() => {
      void recordHistory()
    }, 400)
  }, [canvas, recordHistory])

  /**
   * 임시저장(드래프트)을 즉시 수행한다.
   * @returns {Promise<void>}
   */
  const saveDraftNow = useCallback(async () => {
    if (!canvas) {
      return
    }
    setIsSaving(true)
    try {
      const db = await ensureDb()
      const snapshot = createEditorSnapshot(canvas, canvasSizeIdRef.current)
      const updatedAt = await saveDraft(db, snapshot)
      setLastSavedAt(updatedAt)
    } finally {
      setIsSaving(false)
    }
  }, [canvas, ensureDb])

  /**
   * 에디터를 초기화한다.
   * @returns {Promise<void>}
   */
  const resetEditor = useCallback(async () => {
    if (!canvas) {
      return
    }
    const confirmed = await confirm({
      title: '에디터 초기화',
      message: '현재 편집 내용을 모두 초기화할까요?\n저장된 임시본도 삭제됩니다.',
      confirmLabel: '초기화',
      cancelLabel: '취소',
      variant: 'danger',
    })
    if (!confirmed) {
      return
    }

    isApplyingRef.current = true
    try {
      clearCanvasObjects(canvas)
      ensureBackgroundLayer(canvas)
      const db = await ensureDb()
      await clearDraft(db)
      await clearHistory(db)
      const snapshot = createEditorSnapshot(canvas, canvasSizeIdRef.current)
      await pushHistoryStep(db, snapshot)
      setLastSavedAt(null)
      await refreshHistoryFlags()
      toast({ message: '에디터를 초기화했습니다.', variant: 'success' })
    } finally {
      requestAnimationFrame(() => {
        isApplyingRef.current = false
      })
    }
  }, [canvas, confirm, ensureDb, refreshHistoryFlags, toast])

  /**
   * Undo
   * @returns {Promise<void>}
   */
  const undo = useCallback(async () => {
    if (!canvas) {
      return
    }
    const db = await ensureDb()
    const step = await getUndoStep(db)
    if (!step) {
      return
    }
    await applySnapshot(step.canvasJson, step.sizeId)
    await moveHistoryCursor(db, step.id)
    await refreshHistoryFlags()
  }, [applySnapshot, canvas, ensureDb, refreshHistoryFlags])

  /**
   * Redo
   * @returns {Promise<void>}
   */
  const redo = useCallback(async () => {
    if (!canvas) {
      return
    }
    const db = await ensureDb()
    const step = await getRedoStep(db)
    if (!step) {
      return
    }
    await applySnapshot(step.canvasJson, step.sizeId)
    await moveHistoryCursor(db, step.id)
    await refreshHistoryFlags()
  }, [applySnapshot, canvas, ensureDb, refreshHistoryFlags])

  // 초기 복원
  useEffect(() => {
    if (!canvas || !isReady || !isDbReady || isHydrated) {
      return
    }

    let cancelled = false

    /**
     * 드래프트/히스토리 초기 로드
     * @returns {Promise<void>}
     */
    const hydrate = async () => {
      const db = await ensureDb()
      if (cancelled) {
        return
      }

      const draft = await loadDraft(db)
      if (cancelled) {
        return
      }

      isApplyingRef.current = true
      try {
        if (draft) {
          if (draft.sizeId !== canvasSizeIdRef.current) {
            setCanvasSizeId(draft.sizeId, { skipObjectScale: true })
          }
          await applyCanvasJson(canvas, draft.canvasJson, draft.sizeId)
          refitCanvasDisplay(canvas, draft.sizeId)
          setLastSavedAt(draft.updatedAt)
          toast({ message: '임시저장본을 불러왔습니다.', variant: 'info' })
        } else {
          ensureBackgroundLayer(canvas)
        }

        await clearHistory(db)
        const snapshot = createEditorSnapshot(canvas, draft?.sizeId ?? canvasSizeIdRef.current)
        await pushHistoryStep(db, snapshot)
        await refreshHistoryFlags()
      } finally {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isApplyingRef.current = false
            if (!cancelled) {
              setIsHydrated(true)
            }
          })
        })
      }
    }

    void hydrate()

    return () => {
      cancelled = true
    }
  }, [canvas, ensureDb, isDbReady, isHydrated, isReady, refreshHistoryFlags, setCanvasSizeId, toast])

  // 캔버스 변경 → 히스토리
  useEffect(() => {
    if (!canvas || !isHydrated) {
      return
    }

    const handleChange = () => {
      scheduleHistoryRecord()
    }

    canvas.on('object:added', handleChange)
    canvas.on('object:removed', handleChange)
    canvas.on('object:modified', handleChange)

    return () => {
      canvas.off('object:added', handleChange)
      canvas.off('object:removed', handleChange)
      canvas.off('object:modified', handleChange)
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current)
      }
    }
  }, [canvas, isHydrated, scheduleHistoryRecord])

  // 해상도 변경도 히스토리에 반영
  useEffect(() => {
    if (!canvas || !isHydrated || isApplyingRef.current) {
      return
    }
    scheduleHistoryRecord()
  }, [canvas, canvasSizeId, isHydrated, scheduleHistoryRecord])

  // 1분 자동저장
  useEffect(() => {
    if (!canvas || !isHydrated) {
      return
    }

    const timer = setInterval(() => {
      void saveDraftNow()
    }, AUTO_SAVE_INTERVAL_MS)

    return () => {
      clearInterval(timer)
    }
  }, [canvas, isHydrated, saveDraftNow])

  // 단축키
  useEffect(() => {
    if (!isHydrated) {
      return
    }

    /**
     * Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z
     * @param {KeyboardEvent} event - 키보드 이벤트
     * @returns {void}
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const isMod = event.metaKey || event.ctrlKey
      if (!isMod || key !== 'z') {
        return
      }

      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return
        }
      }

      event.preventDefault()
      if (event.shiftKey) {
        void redo()
      } else {
        void undo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isHydrated, redo, undo])

  const value = useMemo<EditorSessionContextValue>(
    () => ({
      isHydrated,
      isSaving,
      lastSavedAt,
      canUndo,
      canRedo,
      saveDraftNow,
      resetEditor,
      undo,
      redo,
    }),
    [
      canRedo,
      canUndo,
      isHydrated,
      isSaving,
      lastSavedAt,
      redo,
      resetEditor,
      saveDraftNow,
      undo,
    ],
  )

  return (
    <EditorSessionContext.Provider value={value}>{children}</EditorSessionContext.Provider>
  )
}

/**
 * 에디터 세션(저장/히스토리) 훅
 * @returns {EditorSessionContextValue}
 */
export function useEditorSession(): EditorSessionContextValue {
  const context = useContext(EditorSessionContext)
  if (!context) {
    throw new Error('useEditorSession은 EditorSessionProvider 안에서만 사용할 수 있습니다.')
  }
  return context
}
