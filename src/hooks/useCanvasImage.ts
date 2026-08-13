'use client'

import { useCallback } from 'react'
import { FabricImage } from 'fabric'
import { useCanvas } from '@/hooks/useCanvas'
import {
  addUploadedImageLayer,
  upsertVideoImageLayer,
} from '@/lib/image-layer'
import { createLayerId } from '@/lib/layers'

/**
 * 영상이미지·업로드된이미지 레이어를 캔버스에 올리는 훅
 * @returns 이미지 레이어 API
 */
export function useCanvasImage() {
  const { canvas, isReady } = useCanvas()

  /**
   * 영상 프레임을 「영상이미지」 레이어에 적용(교체)한다.
   * @param {string} dataUrl - 프레임 data URL
   * @returns {Promise<boolean>}
   */
  const applyVideoFrame = useCallback(
    async (dataUrl: string): Promise<boolean> => {
      if (!canvas) {
        return false
      }
      const image = await FabricImage.fromURL(dataUrl)
      upsertVideoImageLayer(canvas, image)
      return true
    },
    [canvas],
  )

  /**
   * 파일에서 「업로드된이미지」 레이어를 새로 추가한다.
   * @param {File} file - 이미지 파일
   * @returns {Promise<boolean>}
   */
  const addUploadedImage = useCallback(
    async (file: File): Promise<boolean> => {
      if (!canvas) {
        return false
      }
      const objectUrl = URL.createObjectURL(file)
      try {
        const image = await FabricImage.fromURL(objectUrl)
        addUploadedImageLayer(canvas, image, createLayerId())
        return true
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    },
    [canvas],
  )

  return {
    isReady,
    applyVideoFrame,
    addUploadedImage,
  }
}
