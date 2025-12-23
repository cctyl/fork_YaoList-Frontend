import { useState, useEffect, useRef, createContext } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../utils/api'
import FileBrowser from './FileBrowser'
import FilePreview from './FilePreview'

// 共享上下文，避免组件切换时重新加载
export const SharedContext = createContext<{
  backgroundImage: string
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  language: string
  setLanguage: (value: string) => void
  siteTitle: string
  siteIcon: string
  isLoggedIn: boolean
  setIsLoggedIn: (value: boolean) => void
  hasBackground: boolean
  glassEffect: boolean
}>({
  backgroundImage: '',
  darkMode: false,
  setDarkMode: () => {},
  language: 'zh-CN',
  setLanguage: () => {},
  siteTitle: 'YaoList',
  siteIcon: '/favicon.ico',
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  hasBackground: false,
  glassEffect: false
})

// 兼容旧的 BackgroundContext
export const BackgroundContext = SharedContext

// 获取路径的密码（包括继承父目录密码）
const getPasswordForPath = (targetPath: string): string => {
  try {
    const pathPassword = JSON.parse(sessionStorage.getItem('pathPasswords') || '{}')
    if (pathPassword[targetPath]) {
      return pathPassword[targetPath]
    }
    const parts = targetPath.split('/').filter(Boolean)
    for (let i = parts.length - 1; i >= 0; i--) {
      const parentPath = '/' + parts.slice(0, i).join('/')
      const normalizedParent = parentPath === '' ? '/' : parentPath
      if (pathPassword[normalizedParent]) {
        return pathPassword[normalizedParent]
      }
    }
    if (pathPassword['/']) {
      return pathPassword['/']
    }
  } catch {}
  return ''
}

// 通过文件名判断是否是文件（有后缀且不以.开头）
const guessIsFile = (path: string): boolean => {
  const fileName = path.split('/').pop() || ''
  return fileName.includes('.') && !fileName.startsWith('.')
}

// 路径类型状态
type PathState = 'loading' | 'folder' | 'file'

/**
 * 文件路由器 - 根据路径类型显示不同的页面
 * 如果是目录，显示 FileBrowser
 * 如果是文件，显示 FilePreview
 * 避免在文件路径上错误调用fs/list
 */
export default function FileRouter() {
  const { '*': pathParam } = useParams()
  const currentPath = pathParam || ''
  const { i18n } = useTranslation()
  
  // 路径状态：loading表示正在确认类型
  const [pathState, setPathState] = useState<PathState>('loading')
  const [backgroundImage, setBackgroundImage] = useState('')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'zh-CN')
  const [siteTitle, setSiteTitle] = useState('YaoList')
  const [siteIcon, setSiteIcon] = useState('/favicon.ico')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [glassEffect, setGlassEffect] = useState(false)
  
  const checkedPaths = useRef<Map<string, boolean>>(new Map())
  const settingsLoaded = useRef(false)

  // 加载站点设置（只加载一次）
  useEffect(() => {
    if (settingsLoaded.current) return
    settingsLoaded.current = true
    
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings/public')
        if (response.ok) {
          const data = await response.json()
          if (data.background_image) {
            setBackgroundImage(data.background_image)
          }
          if (data.site_title) {
            setSiteTitle(data.site_title)
            document.title = data.site_title
          }
          if (data.site_icon) {
            setSiteIcon(data.site_icon)
          }
          // 毛玻璃效果设置
          setGlassEffect(!!data.glass_effect)
        }
      } catch {}
    }
    loadSettings()
    
    // 检查登录状态（使用 /api/auth/permissions，不会401）
    const checkLogin = async () => {
      try {
        const res = await fetch('/api/auth/permissions', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          // 游客被禁用时跳转到登录页
          if (data.is_guest && data.guest_disabled) {
            window.location.href = '/login?msg=guest_disabled'
            return
          }
          // is_guest=true 表示游客，is_guest=false 表示已登录用户
          setIsLoggedIn(!data.is_guest)
        } else {
          setIsLoggedIn(false)
        }
      } catch {
        setIsLoggedIn(false)
      }
    }
    checkLogin()
  }, [])

  // 监听 darkMode 变化（从 localStorage）
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('darkMode')
      setDarkMode(saved === 'true')
    }
    window.addEventListener('storage', handleStorage)
    
    // 定期检查 localStorage（因为同页面修改不触发 storage 事件）
    const interval = setInterval(() => {
      const saved = localStorage.getItem('darkMode')
      const newDarkMode = saved === 'true'
      if (newDarkMode !== darkMode) {
        setDarkMode(newDarkMode)
      }
    }, 100)
    
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [darkMode])

  useEffect(() => {
    // 先通过fs/get确认路径类型，再决定渲染
    const checkPathType = async () => {
      // 根路径一定是目录，直接设置
      if (!currentPath) {
        setPathState('folder')
        return
      }

      // 如果已经检查过这个路径，直接使用缓存结果
      if (checkedPaths.current.has(currentPath)) {
        const cached = checkedPaths.current.get(currentPath)!
        setPathState(cached ? 'folder' : 'file')
        return
      }

      // 设置为loading状态，等待确认
      setPathState('loading')

      try {
        const fullPath = '/' + currentPath
        const password = getPasswordForPath(fullPath)
        
        // 获取路径信息（带密码）- 关键：必须等待结果再渲染
        const response = await api.post('/api/fs/get', { path: fullPath, password })
        
        if (response.data.code === 200) {
          const info = response.data.data
          const isDir = info.is_dir
          checkedPaths.current.set(currentPath, isDir)
          setPathState(isDir ? 'folder' : 'file')
        } else if (response.data.code === 403) {
          // 需要密码时，使用文件后缀判断
          const isFile = guessIsFile(currentPath)
          setPathState(isFile ? 'file' : 'folder')
        } else {
          // 如果获取失败，使用文件后缀判断
          const isFile = guessIsFile(currentPath)
          checkedPaths.current.set(currentPath, !isFile)
          setPathState(isFile ? 'file' : 'folder')
        }
      } catch {
        // 出错时使用文件后缀判断
        const isFile = guessIsFile(currentPath)
        checkedPaths.current.set(currentPath, !isFile)
        setPathState(isFile ? 'file' : 'folder')
      }
    }

    checkPathType()
  }, [currentPath])

  // 背景图片样式（仅亮色模式）
  const hasBackground = !!(backgroundImage && !darkMode)
  const backgroundStyle = hasBackground ? {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  } : {}

  // 语言切换处理
  const handleSetLanguage = (lang: string) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
    i18n.changeLanguage(lang)
  }

  // 深色模式切换处理
  const handleSetDarkMode = (value: boolean) => {
    setDarkMode(value)
    localStorage.setItem('darkMode', String(value))
    document.documentElement.setAttribute('data-theme', value ? 'dark' : 'light')
  }

  // 共享上下文值
  const sharedValue = {
    backgroundImage,
    darkMode,
    setDarkMode: handleSetDarkMode,
    language,
    setLanguage: handleSetLanguage,
    siteTitle,
    siteIcon,
    isLoggedIn,
    setIsLoggedIn,
    hasBackground,
    glassEffect
  }
  
  // 应用毛玻璃效果
  useEffect(() => {
    if (glassEffect) {
      document.documentElement.classList.add('glass-enabled')
    } else {
      document.documentElement.classList.remove('glass-enabled')
    }
  }, [glassEffect])

  // 根据路径类型渲染对应组件，背景图片在外层容器
  // loading时显示加载指示器，等待确认后再渲染组件
  return (
    <SharedContext.Provider value={sharedValue}>
      <div className={`file-router-bg ${hasBackground ? 'has-custom-bg' : ''}`} style={backgroundStyle}>
        {pathState === 'loading' ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            color: darkMode ? '#fff' : '#333'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                border: '3px solid currentColor',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
            </div>
          </div>
        ) : pathState === 'folder' ? (
          <FileBrowser key="browser" />
        ) : (
          <FilePreview key="preview" />
        )}
      </div>
    </SharedContext.Provider>
  )
}
