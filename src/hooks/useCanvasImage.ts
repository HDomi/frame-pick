'use client'

import { useCallback, useEffect, useState } from 'react'
import { FabricImage } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { DEFAULT_IMAGE_FIT } from '@/lib/constants'
import { readFileAsDataUrl } from '@/lib/file-data-url'
import {
  addUploadedImageLayer,
  applyImageFitMode,
  type ImageFitMode,
  type ImageLayerObject,
  upsertVideoImageLayer,
} from '@/lib/image-layer'
import { createLayerId, ensureLayerMeta, type LayerAwareObject } from '@/lib/layers'

/**
 * 영상이미지·업로드된이미지 레이어를 캔버스에 올리는 훅
 * @returns 이미지 레이어 API
 */
export function useCanvasImage() {
  const { canvas, isReady } = useCanvas()
  const [selectedImageFit, setSelectedImageFit] = useState<ImageFitMode | null>(null)
  const [hasImageTarget, setHasImageTarget] = useState(false)

  /**
   * 선택 이미지의 fit 상태를 동기화한다.
   * @returns {void}
   */
  const syncSelection = useCallback(() => {
    if (!canvas) {
      setHasImageTarget(false)
      setSelectedImageFit(null)
      return
    }
    const active = canvas.getActiveObject() as LayerAwareObject | undefined
    if (!active || active.layerType !== 'image') {
      setHasImageTarget(false)
      setSelectedImageFit(null)
      return
    }
    const imageObject = active as ImageLayerObject
    setHasImageTarget(true)
    setSelectedImageFit(imageObject.imageFit ?? DEFAULT_IMAGE_FIT)
  }, [canvas])

  useEffect(() => {
    if (!canvas) {
      return
    }
    const handle = () => {
      syncSelection()
    }
    canvas.on('selection:created', handle)
    canvas.on('selection:updated', handle)
    canvas.on('selection:cleared', handle)
    canvas.on('object:modified', handle)
    syncSelection()
    return () => {
      canvas.off('selection:created', handle)
      canvas.off('selection:updated', handle)
      canvas.off('selection:cleared', handle)
      canvas.off('object:modified', handle)
    }
  }, [canvas, syncSelection])

  /**
   * 영상 프레임을 「영상이미지」 레이어에 적용(교체)한다.
   * @param {string} dataUrl - 프레임 data URL
   * @param {ImageFitMode} [fit] - fit 모드
   * @returns {Promise<boolean>}
   */
  const applyVideoFrame = useCallback(
    async (dataUrl: string, fit: ImageFitMode = DEFAULT_IMAGE_FIT): Promise<boolean> => {
      if (!canvas) {
        return false
      }
      const image = await FabricImage.fromURL(dataUrl)
      upsertVideoImageLayer(canvas, image, fit)
      return true
    },
    [canvas],
  )

  /**
   * 파일에서 「업로드된이미지」 레이어를 새로 추가한다.
   * @param {File} file - 이미지 파일
   * @param {ImageFitMode} [fit] - fit 모드
   * @returns {Promise<boolean>}
   */
  const addUploadedImage = useCallback(
    async (file: File, fit: ImageFitMode = DEFAULT_IMAGE_FIT): Promise<boolean> => {
      if (!canvas) {
        return false
      }
      const dataUrl = await readFileAsDataUrl(file)
      const image = await FabricImage.fromURL(dataUrl)
      addUploadedImageLayer(canvas, image, createLayerId(), fit)
      return true
    },
    [canvas],
  )

  /**
   * Blob(누끼 결과 등)을 「업로드된이미지」 레이어로 추가한다.
   * @param {Blob} blob - 이미지 Blob
   * @param {string} [fileName] - 파일명 힌트
   * @param {ImageFitMode} [fit] - fit 모드
   * @returns {Promise<boolean>}
   */
  const addUploadedImageFromBlob = useCallback(
    async (
      blob: Blob,
      fileName = 'cutout.png',
      fit: ImageFitMode = DEFAULT_IMAGE_FIT,
    ): Promise<boolean> => {
      if (!canvas) {
        return false
      }
      const file = new File([blob], fileName, { type: blob.type || 'image/png' })
      return addUploadedImage(file, fit)
    },
    [addUploadedImage, canvas],
  )

  /**
   * 선택된 이미지 레이어의 fit을 변경한다.
   * @param {ImageFitMode} fit - fit 모드
   * @returns {boolean}
   */
  const setActiveImageFit = useCallback(
    (fit: ImageFitMode): boolean => {
      if (!canvas) {
        return false
      }
      const active = canvas.getActiveObject() as LayerAwareObject | undefined
      if (!active || active.layerType !== 'image') {
        return false
      }
      ensureLayerMeta(active)
      applyImageFitMode(canvas, active as ImageLayerObject, fit)
      setSelectedImageFit(fit)
      return true
    },
    [canvas],
  )

  return {
    isReady,
    hasImageTarget,
    selectedImageFit,
    applyVideoFrame,
    addUploadedImage,
    addUploadedImageFromBlob,
    setActiveImageFit,
  }
}
