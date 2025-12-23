import { useLocation } from 'react-router-dom'
import BasicSettings from './BasicSettings'
import StyleSettings from './StyleSettings'
import PreviewSettings from './PreviewSettings'
import TransferSettings from './TransferSettings'
import Notifications from './Notifications'

export default function Settings() {
  const location = useLocation()
  const path = location.pathname

  if (path.includes('/style')) return <StyleSettings />
  if (path.includes('/preview')) return <PreviewSettings />
  if (path.includes('/transfer')) return <TransferSettings />
  if (path.includes('/push')) return <Notifications />
  return <BasicSettings />
}
