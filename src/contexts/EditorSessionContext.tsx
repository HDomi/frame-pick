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
import { DEFAULT_CANVAS_SIZE_ID, type CanvasSizeId } from '@/lib/canvas-size'
import { ensureBackgroundLayer } from '@/lib/background-layer'
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft-repository'
import {
  AUTO_SAVE_INTERVAL_MS,
  DEFAULT_PAGE_ID,
  DEFAULT_PROJECT_ID,
} from '@/lib/editor-persist-constants'
import {
  clearHistory,
  getHistoryFlags,
  getRedoStep,
  getUndoStep,
  moveHistoryCursor,
  pushHistoryStep,
  type HistoryPushOptions,
} from '@/lib/history-repository'
import {
  createPage,
  createProject,
  getPage,
  getWorkspacePointer,
  listPages,
  listProjects,
  renamePage,
  renameProject,
  setWorkspacePointer,
  softDeletePage,
  softDeleteProject,
  type PageRow,
  type ProjectRow,
} from '@/lib/project-repository'

interface EditorSessionContextValue {
  isHydrated: boolean
  isSaving: boolean
  lastSavedAt: number | null
  /** 다음 자동저장 예정 시각 (epoch ms) */
  nextAutoSaveAt: number | null
  canUndo: boolean
  canRedo: boolean
  projects: ProjectRow[]
  pages: PageRow[]
  currentProjectId: string
  currentPageId: string
  saveDraftNow: () => Promise<void>
  resetEditor: () => Promise<void>
  undo: () => Promise<void>
  redo: () => Promise<void>
  refreshWorkspace: () => Promise<void>
  switchPage: (pageId: string) => Promise<void>
  switchProject: (projectId: string) => Promise<void>
  createProjectAndSwitch: () => Promise<void>
  createPageAndSwitch: () => Promise<void>
  renameCurrentProject: (name: string) => Promise<void>
  renameCurrentPage: (name: string) => Promise<void>
  deleteCurrentPage: () => Promise<void>
  deleteCurrentProject: () => Promise<void>
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
  const [nextAutoSaveAt, setNextAutoSaveAt] = useState<number | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [pages, setPages] = useState<PageRow[]>([])
  const [currentProjectId, setCurrentProjectId] = useState(DEFAULT_PROJECT_ID)
  const [currentPageId, setCurrentPageId] = useState(DEFAULT_PAGE_ID)

  const isApplyingRef = useRef(false)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingHistoryMetaRef = useRef<HistoryPushOptions>({})
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasSizeIdRef = useRef(canvasSizeId)
  canvasSizeIdRef.current = canvasSizeId
  const persistDraftRef = useRef<() => Promise<void>>(async () => {})
  const scheduleAutoSaveRef = useRef<() => void>(() => {})

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
   * 프로젝트/페이지 목록과 포인터를 갱신한다.
   * @returns {Promise<void>}
   */
  const refreshWorkspace = useCallback(async () => {
    const db = await ensureDb()
    const pointer = await getWorkspacePointer(db)
    const nextProjects = await listProjects(db)
    const nextPages = await listPages(db, pointer.projectId)
    setProjects(nextProjects)
    setPages(nextPages)
    setCurrentProjectId(pointer.projectId)
    setCurrentPageId(pointer.pageId)
  }, [ensureDb])

  /**
   * 현재 상태를 히스토리에 기록한다.
   * @param {HistoryPushOptions} [options]
   * @returns {Promise<void>}
   */
  const recordHistory = useCallback(
    async (options: HistoryPushOptions = {}) => {
      if (!canvas || isApplyingRef.current) {
        return
      }
      const db = await ensureDb()
      const snapshot = createEditorSnapshot(canvas, canvasSizeIdRef.current)
      await pushHistoryStep(db, snapshot, options)
      await refreshHistoryFlags()
    },
    [canvas, ensureDb, refreshHistoryFlags],
  )

  /**
   * 디바운스 후 히스토리를 기록한다. (드래그 중에는 modified만 오므로 자연 병합)
   * @param {HistoryPushOptions} [options]
   * @returns {void}
   */
  const scheduleHistoryRecord = useCallback(
    (options: HistoryPushOptions = {}) => {
      if (!canvas || isApplyingRef.current) {
        return
      }
      if (options.label || options.commandType) {
        pendingHistoryMetaRef.current = options
      }
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current)
      }
      historyTimerRef.current = setTimeout(() => {
        const meta = pendingHistoryMetaRef.current
        pendingHistoryMetaRef.current = {}
        void recordHistory(meta)
      }, 400)
    },
    [canvas, recordHistory],
  )

  /**
   * 드래프트를 DB에 기록한다. (타이머 재예약 없음)
   * @returns {Promise<void>}
   */
  const persistDraft = useCallback(async () => {
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

  persistDraftRef.current = persistDraft

  /**
   * 다음 자동저장을 예약한다.
   * @returns {void}
   */
  const scheduleNextAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    const at = Date.now() + AUTO_SAVE_INTERVAL_MS
    setNextAutoSaveAt(at)
    autoSaveTimerRef.current = setTimeout(() => {
      void persistDraftRef.current().finally(() => {
        scheduleAutoSaveRef.current()
      })
    }, AUTO_SAVE_INTERVAL_MS)
  }, [])

  scheduleAutoSaveRef.current = scheduleNextAutoSave

  /**
   * 임시저장(드래프트)을 즉시 수행하고 자동저장 타이머를 리셋한다.
   * @returns {Promise<void>}
   */
  const saveDraftNow = useCallback(async () => {
    await persistDraft()
    scheduleNextAutoSave()
  }, [persistDraft, scheduleNextAutoSave])

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
      setNextAutoSaveAt(null)
      await refreshHistoryFlags()
      toast({ message: '에디터를 초기화했습니다.', variant: 'success' })
      scheduleNextAutoSave()
    } finally {
      requestAnimationFrame(() => {
        isApplyingRef.current = false
      })
    }
  }, [canvas, confirm, ensureDb, refreshHistoryFlags, scheduleNextAutoSave, toast])

  /**
   * 페이지 JSON을 캔버스에 올린 뒤 히스토리를 시드한다.
   * @param {PageRow | null} page
   * @returns {Promise<void>}
   */
  const loadPageContent = useCallback(
    async (page: PageRow | null) => {
      if (!canvas) {
        return
      }
      isApplyingRef.current = true
      try {
        if (page?.canvasJson) {
          const sizeId = page.sizeId || DEFAULT_CANVAS_SIZE_ID
          if (canvasSizeIdRef.current !== sizeId) {
            setCanvasSizeId(sizeId, { skipObjectScale: true })
          }
          await applyCanvasJson(canvas, page.canvasJson, sizeId)
          refitCanvasDisplay(canvas, sizeId)
        } else {
          clearCanvasObjects(canvas)
          ensureBackgroundLayer(canvas)
          refitCanvasDisplay(canvas, canvasSizeIdRef.current)
        }
        const db = await ensureDb()
        await clearHistory(db)
        const snapshot = createEditorSnapshot(canvas, canvasSizeIdRef.current)
        await pushHistoryStep(db, snapshot, { label: '페이지 로드', commandType: 'hydrate' })
        await refreshHistoryFlags()
      } finally {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isApplyingRef.current = false
          })
        })
      }
    },
    [canvas, ensureDb, refreshHistoryFlags, setCanvasSizeId],
  )

  /**
   * 페이지로 전환한다.
   * @param {string} pageId
   * @returns {Promise<void>}
   */
  const switchPage = useCallback(
    async (pageId: string) => {
      if (!canvas || pageId === currentPageId) {
        return
      }
      await persistDraft()
      const db = await ensureDb()
      const page = await getPage(db, pageId)
      if (!page) {
        toast({ message: '페이지를 찾을 수 없습니다.', variant: 'error' })
        return
      }
      await setWorkspacePointer(db, { projectId: page.projectId, pageId: page.id })
      await loadPageContent(page)
      await refreshWorkspace()
      scheduleNextAutoSave()
      toast({ message: `"${page.name}" 페이지로 전환했습니다.`, variant: 'info' })
    },
    [
      canvas,
      currentPageId,
      ensureDb,
      loadPageContent,
      persistDraft,
      refreshWorkspace,
      scheduleNextAutoSave,
      toast,
    ],
  )

  /**
   * 프로젝트로 전환한다. (첫 페이지로)
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  const switchProject = useCallback(
    async (projectId: string) => {
      if (!canvas || projectId === currentProjectId) {
        return
      }
      await persistDraft()
      const db = await ensureDb()
      const nextPages = await listPages(db, projectId)
      const first = nextPages[0]
      if (!first) {
        toast({ message: '프로젝트에 페이지가 없습니다.', variant: 'error' })
        return
      }
      await setWorkspacePointer(db, { projectId, pageId: first.id })
      await loadPageContent(first)
      await refreshWorkspace()
      scheduleNextAutoSave()
      toast({ message: '프로젝트를 전환했습니다.', variant: 'info' })
    },
    [
      canvas,
      currentProjectId,
      ensureDb,
      loadPageContent,
      persistDraft,
      refreshWorkspace,
      scheduleNextAutoSave,
      toast,
    ],
  )

  /**
   * 새 프로젝트를 만들고 전환한다.
   * @returns {Promise<void>}
   */
  const createProjectAndSwitch = useCallback(async () => {
    if (!canvas) {
      return
    }
    await persistDraft()
    const db = await ensureDb()
    const { project, page } = await createProject(db)
    await setWorkspacePointer(db, { projectId: project.id, pageId: page.id })
    await loadPageContent(page)
    await refreshWorkspace()
    scheduleNextAutoSave()
    toast({ message: `"${project.name}" 프로젝트를 만들었습니다.`, variant: 'success' })
  }, [canvas, ensureDb, loadPageContent, persistDraft, refreshWorkspace, scheduleNextAutoSave, toast])

  /**
   * 현재 프로젝트에 페이지를 추가하고 전환한다.
   * @returns {Promise<void>}
   */
  const createPageAndSwitch = useCallback(async () => {
    if (!canvas) {
      return
    }
    await persistDraft()
    const db = await ensureDb()
    const page = await createPage(db, currentProjectId)
    await setWorkspacePointer(db, { projectId: currentProjectId, pageId: page.id })
    await loadPageContent(page)
    await refreshWorkspace()
    scheduleNextAutoSave()
    toast({ message: `"${page.name}" 페이지를 추가했습니다.`, variant: 'success' })
  }, [
    canvas,
    currentProjectId,
    ensureDb,
    loadPageContent,
    persistDraft,
    refreshWorkspace,
    scheduleNextAutoSave,
    toast,
  ])

  /**
   * @param {string} name
   * @returns {Promise<void>}
   */
  const renameCurrentProject = useCallback(
    async (name: string) => {
      const db = await ensureDb()
      await renameProject(db, currentProjectId, name)
      await refreshWorkspace()
    },
    [currentProjectId, ensureDb, refreshWorkspace],
  )

  /**
   * @param {string} name
   * @returns {Promise<void>}
   */
  const renameCurrentPage = useCallback(
    async (name: string) => {
      const db = await ensureDb()
      await renamePage(db, currentPageId, name)
      await refreshWorkspace()
    },
    [currentPageId, ensureDb, refreshWorkspace],
  )

  /**
   * 현재 페이지 삭제 후 형제 페이지로 이동
   * @returns {Promise<void>}
   */
  const deleteCurrentPage = useCallback(async () => {
    if (pages.length <= 1) {
      toast({ message: '마지막 페이지는 삭제할 수 없습니다.', variant: 'info' })
      return
    }
    const confirmed = await confirm({
      title: '페이지 삭제',
      message: '이 페이지를 삭제할까요?',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      variant: 'danger',
    })
    if (!confirmed) {
      return
    }
    await persistDraft()
    const db = await ensureDb()
    const removingId = currentPageId
    const ok = await softDeletePage(db, removingId)
    if (!ok) {
      toast({ message: '페이지를 삭제할 수 없습니다.', variant: 'error' })
      return
    }
    const remaining = (await listPages(db, currentProjectId)).filter((p) => p.id !== removingId)
    const next = remaining[0]
    if (!next) {
      return
    }
    await setWorkspacePointer(db, { projectId: currentProjectId, pageId: next.id })
    await loadPageContent(next)
    await refreshWorkspace()
    scheduleNextAutoSave()
    toast({ message: '페이지를 삭제했습니다.', variant: 'success' })
  }, [
    confirm,
    currentPageId,
    currentProjectId,
    ensureDb,
    loadPageContent,
    pages.length,
    persistDraft,
    refreshWorkspace,
    scheduleNextAutoSave,
    toast,
  ])

  /**
   * 현재 프로젝트 삭제 후 다른 프로젝트로 이동
   * @returns {Promise<void>}
   */
  const deleteCurrentProject = useCallback(async () => {
    if (projects.length <= 1) {
      toast({ message: '마지막 프로젝트는 삭제할 수 없습니다.', variant: 'info' })
      return
    }
    const confirmed = await confirm({
      title: '프로젝트 삭제',
      message: '이 프로젝트와 하위 페이지를 삭제할까요?',
      confirmLabel: '삭제',
      cancelLabel: '취소',
      variant: 'danger',
    })
    if (!confirmed) {
      return
    }
    await persistDraft()
    const db = await ensureDb()
    const removingId = currentProjectId
    const ok = await softDeleteProject(db, removingId)
    if (!ok) {
      toast({ message: '프로젝트를 삭제할 수 없습니다.', variant: 'error' })
      return
    }
    const remaining = (await listProjects(db)).filter((p) => p.id !== removingId)
    const nextProject = remaining[0]
    if (!nextProject) {
      return
    }
    const nextPages = await listPages(db, nextProject.id)
    const nextPage = nextPages[0]
    if (!nextPage) {
      return
    }
    await setWorkspacePointer(db, { projectId: nextProject.id, pageId: nextPage.id })
    await loadPageContent(nextPage)
    await refreshWorkspace()
    scheduleNextAutoSave()
    toast({ message: '프로젝트를 삭제했습니다.', variant: 'success' })
  }, [
    confirm,
    currentProjectId,
    ensureDb,
    loadPageContent,
    persistDraft,
    projects.length,
    refreshWorkspace,
    scheduleNextAutoSave,
    toast,
  ])

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

      isApplyingRef.current = true
      try {
        await refreshWorkspace()
        const draft = await loadDraft(db)
        if (cancelled) {
          return
        }

        if (draft) {
          if (draft.sizeId !== canvasSizeIdRef.current) {
            setCanvasSizeId(draft.sizeId, { skipObjectScale: true })
          }
          await applyCanvasJson(canvas, draft.canvasJson, draft.sizeId)
          refitCanvasDisplay(canvas, draft.sizeId)
          setLastSavedAt(draft.updatedAt)
          toast({ message: '임시저장본을 불러왔습니다.', variant: 'info' })
        } else {
          const pointer = await getWorkspacePointer(db)
          const page = await getPage(db, pointer.pageId)
          if (page?.canvasJson) {
            await applyCanvasJson(canvas, page.canvasJson, page.sizeId)
            refitCanvasDisplay(canvas, page.sizeId)
          } else {
            ensureBackgroundLayer(canvas)
          }
        }

        await clearHistory(db)
        const snapshot = createEditorSnapshot(canvas, draft?.sizeId ?? canvasSizeIdRef.current)
        await pushHistoryStep(db, snapshot, { label: '세션 시작', commandType: 'hydrate' })
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
  }, [
    canvas,
    ensureDb,
    isDbReady,
    isHydrated,
    isReady,
    refreshHistoryFlags,
    refreshWorkspace,
    setCanvasSizeId,
    toast,
  ])

  // 캔버스 변경 → 히스토리 (이동/스케일 중에는 modified 한 번만)
  useEffect(() => {
    if (!canvas || !isHydrated) {
      return
    }

    /**
     * @returns {void}
     */
    const handleAdded = () => {
      scheduleHistoryRecord({ label: '객체 추가', commandType: 'add' })
    }
    /**
     * @returns {void}
     */
    const handleRemoved = () => {
      scheduleHistoryRecord({ label: '객체 삭제', commandType: 'remove' })
    }
    /**
     * @returns {void}
     */
    const handleModified = () => {
      scheduleHistoryRecord({ label: '객체 수정', commandType: 'modify' })
    }

    canvas.on('object:added', handleAdded)
    canvas.on('object:removed', handleRemoved)
    canvas.on('object:modified', handleModified)

    return () => {
      canvas.off('object:added', handleAdded)
      canvas.off('object:removed', handleRemoved)
      canvas.off('object:modified', handleModified)
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

  // 자동저장 타이머 (저장·수동저장 시마다 간격 리셋)
  useEffect(() => {
    if (!canvas || !isHydrated) {
      setNextAutoSaveAt(null)
      return
    }

    scheduleNextAutoSave()

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
      setNextAutoSaveAt(null)
    }
  }, [canvas, isHydrated, scheduleNextAutoSave])

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
      nextAutoSaveAt,
      canUndo,
      canRedo,
      projects,
      pages,
      currentProjectId,
      currentPageId,
      saveDraftNow,
      resetEditor,
      undo,
      redo,
      refreshWorkspace,
      switchPage,
      switchProject,
      createProjectAndSwitch,
      createPageAndSwitch,
      renameCurrentProject,
      renameCurrentPage,
      deleteCurrentPage,
      deleteCurrentProject,
    }),
    [
      canRedo,
      canUndo,
      createPageAndSwitch,
      createProjectAndSwitch,
      currentPageId,
      currentProjectId,
      deleteCurrentPage,
      deleteCurrentProject,
      isHydrated,
      isSaving,
      lastSavedAt,
      nextAutoSaveAt,
      pages,
      projects,
      redo,
      refreshWorkspace,
      renameCurrentPage,
      renameCurrentProject,
      resetEditor,
      saveDraftNow,
      switchPage,
      switchProject,
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
