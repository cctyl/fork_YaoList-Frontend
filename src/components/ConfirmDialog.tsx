import '../styles/components/confirm-dialog.scss'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="confirm-dialog__overlay" onClick={onCancel}>
      <div className="confirm-dialog__container" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__header">
          <h3>{title}</h3>
        </div>
        <div className="confirm-dialog__body">
          <p>{message}</p>
        </div>
        <div className="confirm-dialog__footer">
          <button 
            className={`confirm-dialog__btn confirm-dialog__btn--confirm ${danger ? 'confirm-dialog__btn--danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button className="confirm-dialog__btn confirm-dialog__btn--cancel" onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}
