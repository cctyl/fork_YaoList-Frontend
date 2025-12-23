import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import './Toast.scss'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'plain'

export interface ToastProps {
  id: string
  type: ToastType
  message: string
  duration?: number
  onClose: (id: string) => void
}

export default function Toast({ id, type, message, duration = 3000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onClose(id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => onClose(id), 300)
  }

  const icons: Record<ToastType, JSX.Element | null> = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />,
    plain: null
  }

  return (
    <div className={`toast toast--${type} ${isExiting ? 'toast--exiting' : ''}`}>
      {icons[type] && <div className="toast__icon">{icons[type]}</div>}
      <div className="toast__message">{message}</div>
      <button className="toast__close" onClick={handleClose}>
        <X size={16} />
      </button>
    </div>
  )
}
