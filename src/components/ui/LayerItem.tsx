import type { ReactNode } from 'react'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'

interface LayerRowProps {
  name: string
  typeLabel: string
  active?: boolean
  visible?: boolean
  locked?: boolean
  deletable?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  canToggleVisible?: boolean
  canToggleLock?: boolean
  onSelect?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete?: () => void
  onToggleVisible?: () => void
  onToggleLock?: () => void
  className?: string
}

/**
 * 레이어 패널 한 줄 (선택/잠금/이동/삭제)
 * @param {LayerRowProps} props - 행 props
 * @returns {React.ReactElement} - 레이어 행
 */
export function LayerRow({
  name,
  typeLabel,
  active = false,
  visible = true,
  locked = false,
  deletable = true,
  canMoveUp = true,
  canMoveDown = true,
  canToggleVisible = true,
  canToggleLock = false,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggleVisible,
  onToggleLock,
  className,
}: LayerRowProps) {
  return (
    <li
      className={cn(
        'rounded-md border bg-[var(--color-surface-raised)]',
        active ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]',
        className,
      )}
    >
      <div className="flex items-center gap-1 px-1.5 py-1">
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'min-w-0 flex-1 rounded px-1 py-1 text-left',
            (!visible || locked) && 'opacity-50',
          )}
        >
          <span className="block truncate text-sm text-[var(--color-text)]">{name}</span>
          <span className="block text-[10px] text-[var(--color-text-muted)]">{typeLabel}</span>
        </button>

        <div className="flex shrink-0 items-center">
          {canToggleVisible && onToggleVisible ? (
            <IconButton
              label={visible ? '숨기기' : '보이기'}
              className="size-7"
              onClick={onToggleVisible}
            >
              {visible ? (
                <VisibilityIcon sx={{ fontSize: 16 }} />
              ) : (
                <VisibilityOffIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          ) : null}
          {canToggleLock && onToggleLock ? (
            <IconButton
              label={locked ? '잠금 해제' : '잠금'}
              className="size-7"
              onClick={onToggleLock}
            >
              {locked ? (
                <LockOutlinedIcon sx={{ fontSize: 16 }} />
              ) : (
                <LockOpenOutlinedIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          ) : null}
          <IconButton
            label="위로"
            className="size-7 text-xs"
            disabled={!canMoveUp || locked}
            onClick={onMoveUp}
          >
            ↑
          </IconButton>
          <IconButton
            label="아래로"
            className="size-7 text-xs"
            disabled={!canMoveDown || locked}
            onClick={onMoveDown}
          >
            ↓
          </IconButton>
          {deletable ? (
            <IconButton
              label="삭제"
              className="size-7 text-xs"
              disabled={locked}
              onClick={onDelete}
            >
              ×
            </IconButton>
          ) : (
            <span
              className="inline-flex size-7 items-center justify-center text-[var(--color-text-muted)]"
              title="고정 (삭제 불가)"
              aria-label="고정 (삭제 불가)"
            >
              <PushPinOutlinedIcon sx={{ fontSize: 16 }} />
            </span>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * @deprecated LayerRow를 사용하세요. 하위 호환용 래퍼.
 */
export function LayerItem({
  children,
  active = false,
  className,
  onClick,
}: {
  children: ReactNode
  active?: boolean
  className?: string
  onClick?: () => void
}) {
  return (
    <LayerRow
      name={String(children)}
      typeLabel=""
      active={active}
      className={className}
      onSelect={onClick}
      canMoveUp={false}
      canMoveDown={false}
    />
  )
}
