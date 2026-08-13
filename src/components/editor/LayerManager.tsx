'use client'

import { Button } from '@/components/ui'
import { LayerRow } from '@/components/ui/LayerItem'
import { useCanvasLayers } from '@/hooks/useCanvasLayers'
import { useCanvasText } from '@/hooks/useCanvasText'
import type { LayerType } from '@/types/editor'

/**
 * 레이어 타입 라벨을 만든다.
 * @param {LayerType} type - 타입
 * @param {'video' | 'upload' | undefined} imageSource - 이미지 출처
 * @returns {string}
 */
function getTypeLabel(type: LayerType, imageSource?: 'video' | 'upload'): string {
  if (type === 'background') {
    return '배경 · 고정'
  }
  if (type === 'image') {
    if (imageSource === 'video') {
      return '이미지 · 영상'
    }
    if (imageSource === 'upload') {
      return '이미지 · 업로드'
    }
    return '이미지'
  }
  if (type === 'text') {
    return '텍스트'
  }
  if (type === 'shape') {
    return '도형'
  }
  return '스티커'
}

/**
 * 레이어 목록 및 추가/삭제/순서/잠금
 * @returns {React.ReactElement} - 레이어 매니저
 */
export function LayerManager() {
  const {
    layers,
    selectedLayerId,
    isReady,
    selectLayer,
    deleteLayer,
    moveLayerUp,
    moveLayerDown,
    toggleLayerVisible,
    toggleLayerLock,
  } = useCanvasLayers()
  const { addText } = useCanvasText()

  /**
   * 텍스트 레이어를 추가한다.
   * @returns {Promise<void>}
   */
  const handleAddTextLayer = async () => {
    await addText()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        <Button
          variant="tool"
          size="sm"
          fullWidth
          disabled={!isReady}
          onClick={handleAddTextLayer}
        >
          텍스트 추가
        </Button>
      </div>

      {layers.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-border)] px-2 py-3 text-center text-xs text-[var(--color-text-muted)]">
          레이어가 없습니다.
          <br />
          텍스트를 추가해 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {layers.map((layer, index) => {
            const isBackground = layer.type === 'background'
            const nextIsBackground =
              index < layers.length - 1 && layers[index + 1]?.type === 'background'

            return (
              <LayerRow
                key={layer.id}
                name={layer.name}
                typeLabel={getTypeLabel(layer.type, layer.imageSource)}
                active={layer.id === selectedLayerId}
                visible={layer.visible}
                locked={layer.locked}
                deletable={layer.deletable}
                canToggleVisible={!isBackground}
                canToggleLock={!isBackground}
                canMoveUp={!isBackground && !layer.locked && index > 0}
                canMoveDown={
                  !isBackground &&
                  !layer.locked &&
                  index < layers.length - 1 &&
                  !nextIsBackground
                }
                onSelect={() => selectLayer(layer.id)}
                onMoveUp={() => moveLayerUp(layer.id)}
                onMoveDown={() => moveLayerDown(layer.id)}
                onDelete={() => deleteLayer(layer.id)}
                onToggleVisible={() => toggleLayerVisible(layer.id)}
                onToggleLock={() => toggleLayerLock(layer.id)}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
