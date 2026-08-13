'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export type AlertDialogVariant = 'info' | 'danger'

interface AlertDialogViewProps {
  isOpen: boolean
  title: string
  message: string
  variant?: AlertDialogVariant
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 브라우저 alert/confirm 대체 UI
 * @param {AlertDialogViewProps} props - 다이얼로그 props
 * @returns {React.ReactElement | null}
 */
export function AlertDialogView({
  isOpen,
  title,
  message,
  variant = 'info',
  confirmLabel = '확인',
  cancelLabel = '취소',
  showCancel = false,
  onConfirm,
  onCancel,
}: AlertDialogViewProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      showCloseButton
      closeOnOverlayClick={false}
      onClose={onCancel}
      overlayClassName="z-[85]"
      className="max-w-sm"
      footer={
        <div className="flex justify-end gap-2">
          {showCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            variant={variant === 'danger' ? 'primary' : 'secondary'}
            className={
              variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : undefined
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-text-muted)]">
        {message}
      </p>
    </Modal>
  )
}
