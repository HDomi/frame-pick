import type { ReactNode } from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'

interface ModalProps {
  isOpen: boolean
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  overlayClassName?: string
  showCloseButton?: boolean
  /** false면 오버레이 클릭으로 닫지 않음 */
  closeOnOverlayClick?: boolean
  onClose?: () => void
}

/**
 * 공통 모달 셸
 * @param {ModalProps} props - 모달 props
 * @returns {React.ReactElement | null} - 모달
 */
export function Modal({
  isOpen,
  title,
  children,
  footer,
  className,
  overlayClassName,
  showCloseButton = false,
  closeOnOverlayClick = true,
  onClose,
}: ModalProps) {
  if (!isOpen) {
    return null
  }

  /**
   * 오버레이 클릭 시 닫기
   * @param {React.MouseEvent<HTMLDivElement>} event - 클릭 이벤트
   * @returns {void}
   */
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!closeOnOverlayClick) {
      return
    }
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4',
        overlayClassName,
      )}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl',
          className,
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          {showCloseButton ? (
            <IconButton label="닫기" onClick={onClose}>
              <span aria-hidden className="text-xl leading-none">
                ×
              </span>
            </IconButton>
          ) : null}
        </div>
        {children}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  )
}
