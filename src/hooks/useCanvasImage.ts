'use client'

import { useCallback, useEffect, useState } from 'react'
import { FabricImage } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import { DEFAULT_IMAGE_FIT } from '@/lib/constants'
import { readFileAsDataUrl } from '@/lib/file-data-url'
import { addImageStickerLayer } from '@/lib/image-sticker'
import {
  applyImageOverlayFill,
  createDefaultOverlayState,
  type OverlayAwareImage,
} from '@/lib/image-overlay'
import {
  addUploadedImageLayer,
  applyImageFitMode,
  type ImageFitMode,
  type ImageLayerObject,
  upsertVideoImageLayer,
} from '@/lib/image-layer'
import { createLayerId, ensureLayerMeta, type LayerAwareObject } from '@/lib/layers'
import type { FillValue } from '@/lib/fill-value'

/**
 * 틴트 가능한 이미지(영상/업로드/이미지 스티커)인지
 * @param {unknown} object
 * @returns {object is OverlayAwareImage & LayerAwareObject}
 */
function isTintableImage(
  object: unknown,
): object is OverlayAwareImage & LayerAwareObject {
  if (!object || typeof object !== 'object') {
    return false
  }
  const layer = object as LayerAwareObject
  if (layer.layerType !== 'image' && layer.layerType !== 'sticker') {
    return false
  }
  return object instanceof FabricImage || layer.type === 'image'
}

/**
 * 영상이미지·업로드된이미지·이미지 스티커를 캔버스에 올리는 훅
 * @returns 이미지 레이어 API
 */
export function useCanvasImage() {
  const { canvas, canvasSize, isReady } = useCanvas()
  const [selectedImageFit, setSelectedImageFit] = useState<ImageFitMode | null>(null)
  const [hasImageTarget, setHasImageTarget] = useState(false)
  const [opacity, setOpacity] = useState(1)
  const [overlayEnabled, setOverlayEnabled] = useState(false)
  const [overlayFill, setOverlayFill] = useState<FillValue>(
    createDefaultOverlayState().fill,
  )

  /**
   * 선택 이미지 상태를 동기화한다.
   * @returns {void}
   */
  const syncSelection = useCallback(() => {
    if (!canvas) {
      setHasImageTarget(false)
      setSelectedImageFit(null)
      setOpacity(1)
      setOverlayEnabled(false)
      return
    }
    const active = canvas.getActiveObject() as LayerAwareObject | undefined
    if (!isTintableImage(active)) {
      setHasImageTarget(false)
      setSelectedImageFit(null)
      setOpacity(1)
      setOverlayEnabled(false)
      return
    }

    setHasImageTarget(true)
    setOpacity(typeof active.opacity === 'number' ? active.opacity : 1)
    const imageObject = active as ImageLayerObject
    setSelectedImageFit(
      imageObject.layerType === 'image'
        ? (imageObject.imageFit ?? DEFAULT_IMAGE_FIT)
        : null,
    )

    const saved = active.overlayFill
    if (saved && typeof saved === 'object' && 'mode' in saved) {
      setOverlayEnabled(true)
      setOverlayFill(saved as FillValue)
    } else {
      setOverlayEnabled(false)
      setOverlayFill(createDefaultOverlayState().fill)
    }
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
   * Blob을 「이미지 스티커」로 원본 비율 배치하고 선택한다.
   * @param {Blob} blob - 이미지 Blob
   * @param {string} [name] - 레이어 이름
   * @returns {Promise<boolean>}
   */
  const addImageStickerFromBlob = useCallback(
    async (blob: Blob, name = '이미지 스티커'): Promise<boolean> => {
      if (!canvas) {
        return false
      }
      const dataUrl = await readFileAsDataUrl(
        new File([blob], `${name}.png`, { type: blob.type || 'image/png' }),
      )
      const image = await FabricImage.fromURL(dataUrl)
      addImageStickerLayer(canvas, image, canvasSize, name)
      return true
    },
    [canvas, canvasSize],
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

  /**
   * 이미지 레이어 투명도
   * @param {number} next
   * @returns {boolean}
   */
  const setActiveOpacity = useCallback(
    (next: number) => {
      if (!canvas) {
        return false
      }
      const active = canvas.getActiveObject() as LayerAwareObject | undefined
      if (!isTintableImage(active)) {
        return false
      }
      const clamped = Math.min(1, Math.max(0, next))
      active.set('opacity', clamped)
      active.set('dirty', true)
      canvas.requestRenderAll()
      canvas.fire('object:modified', { target: active })
      setOpacity(clamped)
      return true
    },
    [canvas],
  )

  /**
   * 오버레이 on/off + 채움
   * @param {boolean} enabled
   * @param {FillValue} [fill]
   * @returns {Promise<boolean>}
   */
  const setActiveOverlay = useCallback(
    async (enabled: boolean, fill?: FillValue): Promise<boolean> => {
      if (!canvas) {
        return false
      }
      const active = canvas.getActiveObject() as LayerAwareObject | undefined
      if (!isTintableImage(active)) {
        return false
      }

      const nextFill = fill ?? overlayFill
      await applyImageOverlayFill(active, enabled ? nextFill : null)
      canvas.requestRenderAll()
      canvas.fire('object:modified', { target: active })
      setOverlayEnabled(enabled)
      if (fill) {
        setOverlayFill(fill)
      }
      return true
    },
    [canvas, overlayFill],
  )

  /**
   * 오버레이 채움만 갱신
   * @param {FillValue} fill
   * @returns {Promise<boolean>}
   */
  const setActiveOverlayFill = useCallback(
    async (fill: FillValue): Promise<boolean> => {
      setOverlayFill(fill)
      if (!overlayEnabled) {
        return true
      }
      return setActiveOverlay(true, fill)
    },
    [overlayEnabled, setActiveOverlay],
  )

  return {
    isReady,
    hasImageTarget,
    selectedImageFit,
    opacity,
    overlayEnabled,
    overlayFill,
    applyVideoFrame,
    addUploadedImage,
    addImageStickerFromBlob,
    setActiveImageFit,
    setActiveOpacity,
    setActiveOverlay,
    setActiveOverlayFill,
  }
}