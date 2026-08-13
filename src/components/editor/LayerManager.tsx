'use client'

import { Button } from '@/components/ui'
import { LayerRow } from '@/components/ui/LayerItem'
import { useCanvasLayers } from '@/hooks/useCanvasLayers'
import { useCanvasText } from '@/hooks/useCanvasText'
import type { LayerType } from '@/types/editor'

const LAYER_TYPE_LABEL: Record<LayerType, string> = {
  text: '텍스트',
  image: '이미지',
  sticker: '스티커',
  background: '배경',
}

/**
 * 레이어 목록 및 추가/삭제/순서 이동
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
                typeLabel={LAYER_TYPE_LABEL[layer.type]}
                active={layer.id === selectedLayerId}
                visible={layer.visible}
                deletable={layer.deletable}
                canToggleVisible={!isBackground}
                canMoveUp={!isBackground && index > 0}
                canMoveDown={!isBackground && index < layers.length - 1 && !nextIsBackground}
                onSelect={() => selectLayer(layer.id)}
                onMoveUp={() => moveLayerUp(layer.id)}
                onMoveDown={() => moveLayerDown(layer.id)}
                onDelete={() => deleteLayer(layer.id)}
                onToggleVisible={() => toggleLayerVisible(layer.id)}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
