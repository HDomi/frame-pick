'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FabricObject } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { isBackgroundObject } from '@/lib/background-layer'
import {
  ensureLayerMeta,
  findObjectByLayerId,
  listLayersFrontFirst,
  type LayerAwareObject,
} from '@/lib/layers'
import type { EditorLayer } from '@/types/editor'

/**
 * Fabric 객체와 레이어 패널을 동기화하는 훅
 * @returns 레이어 목록 및 조작 API
 */
export function useCanvasLayers() {
  const { canvas, isReady } = useCanvas()
  const [layers, setLayers] = useState<EditorLayer[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

  /**
   * 캔버스 상태를 레이어 목록으로 동기화한다.
   * @returns {void}
   */
  const syncLayers = useCallback(() => {
    if (!canvas) {
      setLayers([])
      setSelectedLayerId(null)
      return
    }

    const objects = canvas.getObjects()
    objects.forEach((object) => {
      ensureLayerMeta(object)
    })

    setLayers(listLayersFrontFirst(objects))

    const active = canvas.getActiveObject() as LayerAwareObject | undefined
    if (active && !Array.isArray(active)) {
      const meta = ensureLayerMeta(active)
      setSelectedLayerId(meta.layerId ?? null)
    } else {
      setSelectedLayerId(null)
    }
  }, [canvas])

  useEffect(() => {
    if (!canvas) {
      setLayers([])
      setSelectedLayerId(null)
      return
    }

    const handleSync = () => {
      syncLayers()
    }

    canvas.on('object:added', handleSync)
    canvas.on('object:removed', handleSync)
    canvas.on('object:modified', handleSync)
    canvas.on('selection:created', handleSync)
    canvas.on('selection:updated', handleSync)
    canvas.on('selection:cleared', handleSync)

    syncLayers()

    return () => {
      canvas.off('object:added', handleSync)
      canvas.off('object:removed', handleSync)
      canvas.off('object:modified', handleSync)
      canvas.off('selection:created', handleSync)
      canvas.off('selection:updated', handleSync)
      canvas.off('selection:cleared', handleSync)
    }
  }, [canvas, syncLayers])

  /**
   * 레이어 ID에 해당하는 객체를 반환한다.
   * @param {string} layerId - 레이어 ID
   * @returns {FabricObject | undefined}
   */
  const getObjectById = useCallback(
    (layerId: string): FabricObject | undefined => {
      if (!canvas) {
        return undefined
      }
      return findObjectByLayerId(canvas.getObjects(), layerId)
    },
    [canvas],
  )

  /**
   * 레이어를 선택한다.
   * @param {string} layerId - 레이어 ID
   * @returns {void}
   */
  const selectLayer = useCallback(
    (layerId: string) => {
      if (!canvas) {
        return
      }
      const object = getObjectById(layerId)
      if (!object) {
        return
      }
      canvas.setActiveObject(object)
      canvas.requestRenderAll()
      syncLayers()
    },
    [canvas, getObjectById, syncLayers],
  )

  /**
   * 레이어를 삭제한다.
   * @param {string} layerId - 레이어 ID
   * @returns {void}
   */
  const deleteLayer = useCallback(
    (layerId: string) => {
      if (!canvas) {
        return
      }
      const object = getObjectById(layerId)
      if (!object || isBackgroundObject(object)) {
        return
      }
      canvas.remove(object)
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      syncLayers()
    },
    [canvas, getObjectById, syncLayers],
  )

  /**
   * 레이어를 한 단계 앞으로 보낸다. (목록에서 위로)
   * @param {string} layerId - 레이어 ID
   * @returns {void}
   */
  const moveLayerUp = useCallback(
    (layerId: string) => {
      if (!canvas) {
        return
      }
      const object = getObjectById(layerId)
      if (!object || isBackgroundObject(object)) {
        return
      }
      canvas.bringObjectForward(object)
      canvas.requestRenderAll()
      syncLayers()
    },
    [canvas, getObjectById, syncLayers],
  )

  /**
   * 레이어를 한 단계 뒤로 보낸다. (목록에서 아래로)
   * @param {string} layerId - 레이어 ID
   * @returns {void}
   */
  const moveLayerDown = useCallback(
    (layerId: string) => {
      if (!canvas) {
        return
      }
      const object = getObjectById(layerId)
      if (!object || isBackgroundObject(object)) {
        return
      }

      const objects = canvas.getObjects()
      const index = objects.indexOf(object)
      // 배경(인덱스 0) 아래로 내려가지 않음
      if (index <= 1) {
        return
      }

      canvas.sendObjectBackwards(object)
      canvas.requestRenderAll()
      syncLayers()
    },
    [canvas, getObjectById, syncLayers],
  )

  /**
   * 레이어 표시 여부를 토글한다. (배경은 숨기기 불가)
   * @param {string} layerId - 레이어 ID
   * @returns {void}
   */
  const toggleLayerVisible = useCallback(
    (layerId: string) => {
      if (!canvas) {
        return
      }
      const object = getObjectById(layerId)
      if (!object || isBackgroundObject(object)) {
        return
      }
      object.visible = !object.visible
      canvas.requestRenderAll()
      syncLayers()
    },
    [canvas, getObjectById, syncLayers],
  )

  // Delete / Backspace로 선택 객체 삭제 (배경 제외)
  useEffect(() => {
    if (!canvas) {
      return
    }

    /**
     * Delete 키로 활성 객체를 제거한다.
     * @param {KeyboardEvent} event - 키보드 이벤트
     * @returns {void}
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return
      }
      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return
        }
      }

      const active = canvas.getActiveObject()
      if (!active || isBackgroundObject(active)) {
        return
      }

      // 텍스트 편집 중 Backspace는 글자 삭제
      if (
        'isEditing' in active &&
        (active as { isEditing?: boolean }).isEditing &&
        event.key === 'Backspace'
      ) {
        return
      }

      event.preventDefault()
      canvas.remove(active)
      canvas.discardActiveObject()
      canvas.requestRenderAll()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [canvas])

  return {
    layers,
    selectedLayerId,
    isReady,
    selectLayer,
    deleteLayer,
    moveLayerUp,
    moveLayerDown,
    toggleLayerVisible,
    syncLayers,
  }
}
