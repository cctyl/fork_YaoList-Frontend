import React from 'react'
import './Tooltip.scss'

interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  text, 
  children, 
  position = 'left'
}) => {
  return (
    <div className={`tooltip-wrapper tooltip-wrapper--${position}`}>
      {children}
      <span className="tooltip-text">{text}</span>
    </div>
  )
}

export default Tooltip
