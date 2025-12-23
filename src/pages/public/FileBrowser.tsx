import { useState, useEffect, useRef, useContext } from 'react'
import { createPortal } from 'react-dom'
import Vara from 'vara'
import JSZip from 'jszip'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SharedContext } from './FileRouter'
import { 
  ChevronRight, Home, Folder, File, Download, 
  FileText, FileImage, FileVideo, FileAudio, FileArchive, FileCode,
  FileSpreadsheet, Presentation, Database, Settings, Terminal, Disc,
  Edit3, Trash2, Link2, Copy, Move, Share2, X, FolderOpen, ChevronLeft, ChevronDown,
  RefreshCw, FolderPlus, FilePlus, Upload, CheckSquare, Check, ListTodo, HardDrive,
  ArrowUp, ArrowDown, Sun, Moon, Languages, Lock, Loader2, Package, Search, AlertTriangle
} from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../components/Toast'
import { Tooltip } from '../../components/Tooltip/Tooltip'
import TaskSidebar from '../../components/TaskSidebar'
import UserSettingsSidebar from '../../components/UserSettingsSidebar'
import { ExtractDialog } from '../../components/ExtractDialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import mermaid from 'mermaid'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import '../../styles/pages/file-browser.scss'

// Initialize Mermaid / 初始化 Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'default' })

// Mermaid chart component / Mermaid 图表组件
const MermaidChart = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  
  useEffect(() => {
    if (ref.current && chart) {
      const id = 'mermaid-' + Math.random().toString(36).substr(2, 9)
      mermaid.render(id, chart)
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg
            setError(false)
          }
        })
        .catch(() => {
          setError(true)
        })
    }
  }, [chart])
  
  // Show code block on render failure, don't show error / 渲染失败时显示代码块
  if (error) {
    return <pre className="mermaid-fallback"><code>{chart}</code></pre>
  }
  return <div ref={ref} className="mermaid-chart" />
}

// Emoji mapping / Emoji 映射
const emojiMap: Record<string, string> = {
  'smiley': '😊', 'smile': '😄', 'grin': '😁', 'star': '⭐', 'heart': '❤️',
  'thumbsup': '👍', 'thumbsdown': '👎', 'ok_hand': '👌', 'clap': '👏',
  'fire': '🔥', 'rocket': '🚀', 'warning': '⚠️', 'check': '✅', 'x': '❌',
  'question': '❓', 'exclamation': '❗', 'bulb': '💡', 'memo': '📝',
  'book': '📖', 'link': '🔗', 'lock': '🔒', 'key': '🔑', 'mag': '🔍',
}

// Process Emoji text / 处理 Emoji 文本
const processEmoji = (text: string) => {
  return text.replace(/:([a-z_]+):/g, (match, name) => emojiMap[name] || match)
}

// 检测内容是否是 HTML
const isHtmlContent = (content: string): boolean => {
  const trimmed = content.trim()
  // 检测是否以 <!DOCTYPE 或 <html 开头，或包含常见 HTML 标签
  return /^<!DOCTYPE/i.test(trimmed) || 
         /^<html/i.test(trimmed) ||
         /<(html|head|body|script|style|link|meta)\b/i.test(trimmed)
}

// HTML 内容渲染组件
const HtmlContentRenderer = ({ content, className }: { content: string; className?: string }) => {
  const [loading, setLoading] = useState(true)
  const [height, setHeight] = useState(50)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  // 构建完整的 HTML 文档以确保外部脚本正确加载
  const resetStyle = `<style>html,body{background:transparent!important;margin:0!important;padding:0!important;overflow:hidden!important;}::-webkit-scrollbar{display:none;}</style>`
  const trimmed = content.trim()
  const hasDoctype = /^<!DOCTYPE/i.test(trimmed)
  const hasHtml = /<html[\s>]/i.test(trimmed)
  
  let contentWithStyle: string
  if (hasDoctype || hasHtml) {
    contentWithStyle = content.includes('<head>') 
      ? content.replace('<head>', `<head>${resetStyle}`)
      : content.includes('<HEAD>') 
        ? content.replace('<HEAD>', `<HEAD>${resetStyle}`)
        : content.replace(/<html[^>]*>/i, (match) => `${match}<head>${resetStyle}</head>`)
  } else {
    contentWithStyle = `<!DOCTYPE html><html><head><meta charset="UTF-8">${resetStyle}</head><body>${content}</body></html>`
  }
  
  const handleLoad = () => {
    setLoading(false)
    // 自适应高度，延迟确保字体和脚本加载完成
    const updateHeight = () => {
      try {
        const iframe = iframeRef.current
        if (iframe?.contentDocument?.body) {
          const h = iframe.contentDocument.body.scrollHeight
          setHeight(Math.max(h, 30))
        }
      } catch {}
    }
    updateHeight()
    // 延迟再次更新高度（等待字体加载）
    setTimeout(updateHeight, 500)
    setTimeout(updateHeight, 1500)
  }
  
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px',
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span>加载中...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={contentWithStyle}
        className={className}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        onLoad={handleLoad}
        scrolling="no"
        style={{
          width: '100%',
          height: loading ? 0 : height,
          border: 'none',
          background: 'transparent',
          display: loading ? 'none' : 'block',
          overflow: 'hidden'
        }}
      />
    </div>
  )
}

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
  driver_id?: string
}

interface SpaceInfo {
  used: number
  total: number
  free: number
  show_in_frontend: boolean
}

// File extension to icon mapping (using soft colors) / 文件扩展名到图标的映射
const getFileIcon = (filename: string, isDir: boolean) => {
  if (isDir) return { icon: Folder, color: '#d4a574' }
  
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  
  // Word documents - blue / Word 文档
  if (['doc', 'docx', 'docm', 'dotx', 'dotm', 'odt', 'rtf'].includes(ext)) {
    return { icon: FileText, color: '#2b579a' }
  }
  // Excel spreadsheets - green / Excel 表格
  if (['xls', 'xlsx', 'xlsm', 'xltx', 'csv', 'ods'].includes(ext)) {
    return { icon: FileSpreadsheet, color: '#217346' }
  }
  // PowerPoint presentations - orange-red / PowerPoint 演示
  if (['ppt', 'pptx', 'pptm', 'potx', 'odp', 'key'].includes(ext)) {
    return { icon: Presentation, color: '#d24726' }
  }
  // PDF - red / PDF
  if (['pdf'].includes(ext)) {
    return { icon: FileText, color: '#ff0000' }
  }
  // Plain text / 纯文本
  if (['txt', 'log', 'nfo', 'readme'].includes(ext)) {
    return { icon: FileText, color: '#6b7280' }
  }
  // Markdown
  if (['md', 'mdx', 'markdown'].includes(ext)) {
    return { icon: FileText, color: '#083fa1' }
  }
  
  // Images - pink (including RAW formats) / 图片
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'avif', 'jxl',
       'heic', 'heif', 'tiff', 'tif', 'raw',
       'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'dng',
       'orf', 'rw2', 'raf', 'pef', 'ptx', '3fr', 'iiq', 'erf', 'srw', 'x3f',
       'kdc', 'dcr', 'rwl', 'mos', 'mrw', 'hdr', 'exr'].includes(ext)) {
    return { icon: FileImage, color: '#e91e8c' }
  }
  // Adobe Photoshop - dark blue / Adobe Photoshop
  if (['psd', 'psb'].includes(ext)) {
    return { icon: FileImage, color: '#31a8ff' }
  }
  // Adobe Illustrator - orange / Adobe Illustrator
  if (['ai', 'eps'].includes(ext)) {
    return { icon: FileImage, color: '#ff9a00' }
  }
  // Adobe XD/Figma/Sketch
  if (['xd', 'fig', 'sketch'].includes(ext)) {
    return { icon: FileImage, color: '#ff61f6' }
  }
  
  // Videos - purple / 视频
  if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpeg', 'mpg', '3gp', 'ts', 'mts', 'm2ts', 'vob'].includes(ext)) {
    return { icon: FileVideo, color: '#9333ea' }
  }
  // Streaming media/playlists / 流媒体
  if (['m3u8', 'm3u', 'pls', 'xspf'].includes(ext)) {
    return { icon: FileVideo, color: '#7c3aed' }
  }
  // Adobe Premiere/After Effects
  if (['prproj', 'aep', 'mogrt'].includes(ext)) {
    return { icon: FileVideo, color: '#9999ff' }
  }
  
  // Audio - cyan / 音频
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'ape', 'alac', 'aiff', 'opus', 'mid', 'midi'].includes(ext)) {
    return { icon: FileAudio, color: '#06b6d4' }
  }
  // Encrypted audio - dark cyan / 加密音频
  if (['ncm', 'qmc0', 'qmc2', 'qmc3', 'qmcflac', 'qmcogg', 'mflac', 'mflac0', 'mgg', 'mgg1', 'kgm', 'kgma', 'vpr', 'kwm'].includes(ext)) {
    return { icon: FileAudio, color: '#0891b2' }
  }
  // Adobe Audition
  if (['sesx', 'aup', 'aup3'].includes(ext)) {
    return { icon: FileAudio, color: '#00e4bb' }
  }
  
  // Archives - brown-yellow / 压缩包
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'lz', 'lzma', 'zst', 'cab', 'arj', 'lzh', 'ace', 'uue', 'jar', 'war', 'apk', 'ipa'].includes(ext)) {
    return { icon: FileArchive, color: '#d97706' }
  }
  
  // Disk images - silver / 光盘镜像
  if (['iso', 'img', 'bin', 'cue', 'mdf', 'mds', 'nrg', 'ccd', 'sub'].includes(ext)) {
    return { icon: Disc, color: '#7dd3fc' }
  }
  // Virtual machine disks - dark gray / 虚拟机磁盘
  if (['vmdk', 'vdi', 'vhd', 'vhdx', 'qcow', 'qcow2', 'hdd', 'ova', 'ovf'].includes(ext)) {
    return { icon: HardDrive, color: '#475569' }
  }
  
  // Code files - teal / 代码文件
  if (['js', 'mjs', 'cjs'].includes(ext)) {
    return { icon: FileCode, color: '#f7df1e' } // JavaScript yellow
  }
  if (['ts', 'tsx'].includes(ext)) {
    return { icon: FileCode, color: '#3178c6' } // TypeScript blue
  }
  if (['jsx'].includes(ext)) {
    return { icon: FileCode, color: '#61dafb' } // React cyan
  }
  if (['vue'].includes(ext)) {
    return { icon: FileCode, color: '#42b883' } // Vue green
  }
  if (['py', 'pyw', 'pyx'].includes(ext)) {
    return { icon: FileCode, color: '#3776ab' } // Python blue
  }
  if (['java', 'class', 'jsp'].includes(ext)) {
    return { icon: FileCode, color: '#ed8b00' } // Java orange
  }
  if (['c', 'h'].includes(ext)) {
    return { icon: FileCode, color: '#a8b9cc' } // C gray-blue
  }
  if (['cpp', 'cc', 'cxx', 'hpp', 'hxx'].includes(ext)) {
    return { icon: FileCode, color: '#00599c' } // C++ blue
  }
  if (['cs'].includes(ext)) {
    return { icon: FileCode, color: '#512bd4' } // C# purple
  }
  if (['go'].includes(ext)) {
    return { icon: FileCode, color: '#00add8' } // Go cyan
  }
  if (['rs'].includes(ext)) {
    return { icon: FileCode, color: '#dea584' } // Rust orange
  }
  if (['rb', 'erb'].includes(ext)) {
    return { icon: FileCode, color: '#cc342d' } // Ruby red
  }
  if (['php'].includes(ext)) {
    return { icon: FileCode, color: '#777bb4' } // PHP purple
  }
  if (['swift'].includes(ext)) {
    return { icon: FileCode, color: '#fa7343' } // Swift orange
  }
  if (['kt', 'kts'].includes(ext)) {
    return { icon: FileCode, color: '#7f52ff' } // Kotlin purple
  }
  if (['dart'].includes(ext)) {
    return { icon: FileCode, color: '#0175c2' } // Dart blue
  }
  if (['lua'].includes(ext)) {
    return { icon: FileCode, color: '#000080' } // Lua dark blue
  }
  if (['r', 'rmd'].includes(ext)) {
    return { icon: FileCode, color: '#276dc3' } // R blue
  }
  if (['scala'].includes(ext)) {
    return { icon: FileCode, color: '#dc322f' } // Scala red
  }
  if (['html', 'htm', 'xhtml'].includes(ext)) {
    return { icon: FileCode, color: '#e34f26' } // HTML orange
  }
  if (['css'].includes(ext)) {
    return { icon: FileCode, color: '#1572b6' } // CSS blue
  }
  if (['scss', 'sass', 'less', 'styl'].includes(ext)) {
    return { icon: FileCode, color: '#cc6699' } // Sass pink
  }
  // Other code / 其他代码
  if (['json', 'jsonc', 'json5'].includes(ext)) {
    return { icon: FileCode, color: '#292929' }
  }
  if (['xml', 'xsl', 'xslt', 'svg'].includes(ext)) {
    return { icon: FileCode, color: '#ff6600' }
  }
  if (['yaml', 'yml'].includes(ext)) {
    return { icon: FileCode, color: '#cb171e' }
  }
  if (['toml'].includes(ext)) {
    return { icon: FileCode, color: '#9c4121' }
  }
  
  // Shell scripts - green / Shell 脚本
  if (['sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh'].includes(ext)) {
    return { icon: Terminal, color: '#4eaa25' }
  }
  // Windows scripts - blue / Windows 脚本
  if (['bat', 'cmd', 'ps1', 'psm1', 'psd1'].includes(ext)) {
    return { icon: Terminal, color: '#012456' }
  }
  
  // Database / 数据库
  if (['db', 'sqlite', 'sqlite3', 'sql', 'mdb', 'accdb', 'frm', 'ibd', 'myd', 'myi'].includes(ext)) {
    return { icon: Database, color: '#336791' }
  }
  
  // Configuration files / 配置文件
  if (['ini', 'conf', 'cfg', 'config', 'env', 'properties', 'plist'].includes(ext)) {
    return { icon: Settings, color: '#6b7280' }
  }
  // Docker
  if (['dockerfile'].includes(ext) || filename.toLowerCase() === 'dockerfile') {
    return { icon: Settings, color: '#2496ed' }
  }
  
  // Executable files / 可执行文件
  if (['exe', 'msi', 'dll', 'sys', 'com'].includes(ext)) {
    return { icon: Terminal, color: '#0078d4' } // Windows blue
  }
  if (['app', 'dmg', 'pkg'].includes(ext)) {
    return { icon: Terminal, color: '#999999' } // macOS gray
  }
  if (['deb', 'rpm', 'flatpak', 'snap', 'appimage'].includes(ext)) {
    return { icon: Terminal, color: '#dd4814' } // Linux orange
  }
  
  // Fonts / 字体
  if (['ttf', 'otf', 'woff', 'woff2', 'eot', 'fon'].includes(ext)) {
    return { icon: FileText, color: '#4a5568' }
  }
  
  // E-books / 电子书
  if (['epub', 'mobi', 'azw', 'azw3', 'fb2', 'djvu'].includes(ext)) {
    return { icon: FileText, color: '#f59e0b' }
  }
  
  // 3D models / 3D 模型
  if (['obj', 'fbx', 'stl', 'gltf', 'glb', 'blend', '3ds', 'dae', 'max', 'c4d'].includes(ext)) {
    return { icon: FileImage, color: '#ea7600' }
  }
  
  // Torrents/downloads / 种子下载
  if (['torrent', 'magnet'].includes(ext)) {
    return { icon: File, color: '#2d7d46' }
  }
  
  // Certificates/keys / 证书密钥
  if (['pem', 'crt', 'cer', 'key', 'p12', 'pfx', 'jks'].includes(ext)) {
    return { icon: File, color: '#fbbf24' }
  }
  
  return { icon: File, color: '#9ca3af' }
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  file: FileItem | null
}

interface UserPermissions {
  read_files: boolean
  create_upload: boolean
  rename_files: boolean
  move_files: boolean
  copy_files: boolean
  delete_files: boolean
  allow_direct_link: boolean
  allow_share: boolean
  extract_files: boolean
  is_admin: boolean
}

export default function FileBrowser() {
  const { '*': pathParam } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { t, i18n } = useTranslation()
  
  // 使用 FileRouter 提供的共享上下文
  const shared = useContext(SharedContext)
  const { siteTitle, siteIcon, darkMode, language, hasBackground, isLoggedIn, setIsLoggedIn } = shared
  
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'size' | 'modified', direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  })
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [pagination, setPagination] = useState(() => {
    const savedPerPage = localStorage.getItem('perPage')
    return {
      page: 1,
      perPage: savedPerPage ? parseInt(savedPerPage, 10) : 50,
      total: 0,
      folderCount: 0,
      fileCount: 0
    }
  })
  const [showPerPageDropdown, setShowPerPageDropdown] = useState(false)
  const perPageRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    file: null
  })
  const [renameDialog, setRenameDialog] = useState<{ visible: boolean, file: FileItem | null, newName: string }>({
    visible: false,
    file: null,
    newName: ''
  })
  const [deleteDialog, setDeleteDialog] = useState<{ visible: boolean, file: FileItem | null }>({
    visible: false,
    file: null
  })
  // 路径选择弹窗状态
  const [pathModal, setPathModal] = useState<{
    visible: boolean
    mode: 'copy' | 'move' | 'extract' | null
    names: string[]  // 支持多文件
    targetPath: string
    dirs: FileItem[]
    currentDir: string
    conflictStrategy: 'auto_rename' | 'overwrite' | 'skip'
  }>({
    visible: false,
    mode: null,
    names: [],
    targetPath: '/',
    dirs: [],
    currentDir: '/',
    conflictStrategy: 'auto_rename'
  })
  // 批量删除弹窗
  const [batchDeleteDialog, setBatchDeleteDialog] = useState<{
    visible: boolean
    names: string[]
  }>({ visible: false, names: [] })
  // 解压缩弹窗
  const [extractDialog, setExtractDialog] = useState<{
    visible: boolean
    fileName: string
  }>({ visible: false, fileName: '' })
  const currentPath = pathParam || ''
  const menuRef = useRef<HTMLDivElement>(null)
  const [mkdirDialog, setMkdirDialog] = useState({ visible: false, name: '' })
  const [newFileDialog, setNewFileDialog] = useState({ visible: false, name: '' })
  const [uploadDialog, setUploadDialog] = useState(false)
  const [uploadConflictStrategy, setUploadConflictStrategy] = useState<'auto_rename' | 'overwrite' | 'skip'>('auto_rename')
  const [taskListDialog, setTaskListDialog] = useState(false)
  const [userSettingsDialog, setUserSettingsDialog] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [allFileNames, setAllFileNames] = useState<string[]>([])  // 目录下所有文件名
  const [isPackaging, setIsPackaging] = useState(false)
  const [aboutDialog, setAboutDialog] = useState(false)
  const [driverSpaceInfo, setDriverSpaceInfo] = useState<Record<string, SpaceInfo | null>>({})
  const [siteDescription, setSiteDescription] = useState('')
  // 直链创建弹窗
  const [directLinkDialog, setDirectLinkDialog] = useState<{
    visible: boolean
    file: FileItem | null
    expiresAt: string
    maxAccessCount: string
  }>({ visible: false, file: null, expiresAt: '', maxAccessCount: '' })
  // 分享创建弹窗
  const [shareDialog, setShareDialog] = useState<{
    visible: boolean
    file: FileItem | null
    expiresAt: string
    maxAccessCount: string
    password: string
  }>({ visible: false, file: null, expiresAt: '', maxAccessCount: '', password: '' })
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  // 元信息相关状态
  const [readme, setReadme] = useState('')
  const [header, setHeader] = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [pathPassword, setPathPassword] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('pathPasswords') || '{}')
    } catch {
      return {}
    }
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [showLangMenu, setShowLangMenu] = useState(false)
  // 搜索相关状态
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FileItem[]>([])
  const [searchTotalMatched, setSearchTotalMatched] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [searchType, setSearchType] = useState<'all' | 'file' | 'folder'>('all')
  const [searchTime, setSearchTime] = useState(0)
  const [showPageDropdown, setShowPageDropdown] = useState(false)
  const searchModalInputRef = useRef<HTMLInputElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fullPath = currentPath ? `/${currentPath}` : '/'
    // 清除不在当前路径范围内的密码（退出保护区域时）
    cleanupPasswordsForPath(fullPath)
    loadFiles(currentPath)
  }, [currentPath])

  // 检查搜索是否启用（使用公开API）
  useEffect(() => {
    const checkSearchEnabled = async () => {
      try {
        const res = await api.get('/api/search/enabled')
        if (res.data.code === 200) {
          setSearchEnabled(res.data.data === true)
        }
      } catch {
        setSearchEnabled(false)
      }
    }
    checkSearchEnabled()
  }, [])

  // Ctrl+F 快捷键打开搜索框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && searchEnabled) {
        e.preventDefault()
        setShowSearchModal(true)
        setTimeout(() => searchModalInputRef.current?.focus(), 100)
      }
      // ESC 关闭搜索弹窗
      if (e.key === 'Escape' && showSearchModal) {
        closeSearchModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchEnabled, showSearchModal])
  
  // 关闭搜索弹窗
  const closeSearchModal = () => {
    setShowSearchModal(false)
    setSearchQuery('')
    setSearchResults([])
    setSearchPage(1)
  }
  
  // 打开搜索弹窗
  const openSearchModal = () => {
    setShowSearchModal(true)
    setTimeout(() => searchModalInputRef.current?.focus(), 100)
  }

  // 搜索函数
  const handleSearch = async (page = 1, type?: 'all' | 'file' | 'folder') => {
    if (!searchQuery.trim()) return
    
    const currentType = type ?? searchType
    setIsSearching(true)
    const startTime = performance.now()
    
    try {
      const res = await api.post('/api/search', { 
        query: searchQuery, 
        limit: 50,
        page: page,
        current_path: currentPath ? `/${currentPath}` : '/',
        filter_type: currentType === 'all' ? undefined : currentType
      })
      const elapsed = (performance.now() - startTime) / 1000
      setSearchTime(elapsed)
      
      if (res.data.code === 200 && res.data.data) {
        const newResults = res.data.data.results.map((r: any) => ({
          name: r.name,
          path: r.path,
          is_dir: r.is_dir,
          size: r.size || 0,
          modified: r.modified ? new Date(r.modified * 1000).toLocaleString() : '-'
        }))
        
        setSearchResults(newResults)
        setSearchTotalMatched(res.data.data.total_matched || 0)
        setSearchPage(page)
        if (type) setSearchType(type)
      } else {
        toast.error(res.data.message || t('fileBrowser.searchFailed'))
      }
    } catch {
      toast.error(t('fileBrowser.searchFailed'))
    } finally {
      setIsSearching(false)
    }
  }
  
  
  // 高亮搜索词
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="file-browser__search-highlight">{part}</mark> : part
    )
  }

  // Vara.js 手写动画 - Satisfy 字体（循环播放）
  const varaInitialized = useRef(false)
  useEffect(() => {
    if (varaInitialized.current) return
    const container = document.getElementById('vara-container')
    
    if (container && container.children.length === 0) {
      varaInitialized.current = true
      let isMounted = true
      
      const playAnimation = () => {
        // 检查组件是否仍然挂载且容器存在
        const currentContainer = document.getElementById('vara-container')
        if (!isMounted || !currentContainer) return
        
        currentContainer.innerHTML = ''
        try {
          const vara = new Vara(
            '#vara-container',
            'https://cdn.jsdelivr.net/npm/vara@1.4.0/fonts/Satisfy/SatisfySL.json',
            [{ text: 'YaoList', fontSize: 20, strokeWidth: 1.5, duration: 2000 }],
            { strokeWidth: 1.5, color: '#667eea' }
          )
          vara.animationEnd(() => {
            if (isMounted) {
              setTimeout(playAnimation, 1500)
            }
          })
        } catch (e) {
          // 忽略 Vara 初始化错误
        }
      }
      playAnimation()
      
      return () => {
        isMounted = false
      }
    }
  }, [])

  // 暗色模式切换
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  // 语言切换
  const toggleLanguage = (lang: string) => {
    shared.setLanguage(lang)
    setShowLangMenu(false)
  }

  const announcementShownRef = useRef(false)

  // 站点设置已移到 FileRouter 加载

  useEffect(() => {
    // 加载用户权限（使用 /api/auth/permissions，总是返回权限，不会401）
    const loadPermissions = async () => {
      try {
        const response = await fetch('/api/auth/permissions', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          console.log('权限数据:', data)
          setIsLoggedIn(!data.is_guest)
          
          // 游客被禁用时跳转到登录页
          if (data.is_guest && data.guest_disabled) {
            window.location.href = '/login?msg=guest_disabled'
            return
          }
          
          if (data.permissions) {
            // 确保布尔值正确（后端可能返回0/1）
            setPermissions({
              read_files: !!data.permissions.read_files,
              create_upload: !!data.permissions.create_upload,
              rename_files: !!data.permissions.rename_files,
              move_files: !!data.permissions.move_files,
              copy_files: !!data.permissions.copy_files,
              delete_files: !!data.permissions.delete_files,
              allow_direct_link: !!data.permissions.allow_direct_link,
              allow_share: !!data.permissions.allow_share,
              extract_files: !!data.permissions.extract_files,
              is_admin: !!data.permissions.is_admin
            })
          } else {
            // 已登录但没有权限数据，设置默认只读
            setPermissions({
              read_files: true,
              create_upload: false,
              rename_files: false,
              move_files: false,
              copy_files: false,
              delete_files: false,
              allow_direct_link: false,
              allow_share: false,
              extract_files: false,
              is_admin: false
            })
          }
        } else {
          // 请求失败，跳转到登录页
          window.location.href = '/login?msg=error'
        }
      } catch {
        // 请求失败，跳转到登录页
        window.location.href = '/login?msg=error'
      }
    }
    loadPermissions()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
      if (perPageRef.current && !perPageRef.current.contains(e.target as Node)) {
        setShowPerPageDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // 检查路径是否是另一个路径的子路径
  const isSubPath = (parent: string, child: string): boolean => {
    const normalizedParent = parent.endsWith('/') ? parent : parent + '/'
    const normalizedChild = child.endsWith('/') ? child : child + '/'
    return normalizedChild.startsWith(normalizedParent) || parent === child
  }

  // 清除不在当前路径范围内的密码
  const cleanupPasswordsForPath = (currentPath: string) => {
    const updatedPasswords: Record<string, string> = {}
    let changed = false
    
    for (const [savedPath, pwd] of Object.entries(pathPassword)) {
      // 只保留当前路径的父路径或当前路径本身的密码
      if (isSubPath(savedPath, currentPath)) {
        updatedPasswords[savedPath] = pwd
      } else {
        changed = true
      }
    }
    
    if (changed) {
      setPathPassword(updatedPasswords)
      sessionStorage.setItem('pathPasswords', JSON.stringify(updatedPasswords))
    }
  }

  // 加载驱动空间信息
  const loadDriverSpaceInfo = async (driverId: string) => {
    if (driverSpaceInfo[driverId] !== undefined) return // 已加载过
    try {
      const response = await api.get(`/api/drivers/${driverId}/space`)
      if (response.data.code === 200 && response.data.data) {
        const info = response.data.data
        if (info.show_in_frontend) {
          setDriverSpaceInfo(prev => ({ ...prev, [driverId]: info }))
        }
      }
    } catch {
      // 静默失败
    }
  }

  // 获取路径的密码（包括继承父目录密码）
  const getPasswordForPath = (targetPath: string): string => {
    // 先检查当前路径
    if (pathPassword[targetPath]) {
      return pathPassword[targetPath]
    }
    // 向上查找父目录的密码
    const parts = targetPath.split('/').filter(Boolean)
    for (let i = parts.length - 1; i >= 0; i--) {
      const parentPath = '/' + parts.slice(0, i).join('/')
      const normalizedParent = parentPath === '' ? '/' : parentPath
      if (pathPassword[normalizedParent]) {
        return pathPassword[normalizedParent]
      }
    }
    // 检查根目录
    if (pathPassword['/']) {
      return pathPassword['/']
    }
    return ''
  }

  const loadFiles = async (path: string, page: number = 1, perPage?: number, sort?: { key: string, direction: string }, password?: string) => {
    setLoading(true)
    const itemsPerPage = perPage || pagination.perPage
    const sortBy = sort || sortConfig
    const fullPath = path ? `/${path}` : '/'
    // 获取当前路径的密码（包括继承父目录密码）
    const currentPassword = password || getPasswordForPath(fullPath)
    try {
      const response = await api.post('/api/fs/list', {
        path: fullPath,
        password: currentPassword,
        page: page,
        per_page: itemsPerPage,
        sort_by: sortBy.key,
        sort_order: sortBy.direction,
        refresh: false
      })
      
      // 检查游客是否被禁用
      if (response.data.code === 403 && response.data.message === 'guest_disabled') {
        window.location.href = '/login?msg=guest_disabled'
        return
      }
      
      // 检查是否需要密码
      if (response.data.code === 403) {
        setPasswordRequired(true)
        setFiles([])
        setReadme('')
        setHeader('')
        setLoading(false)
        return
      }
      
      // 检查驱动错误
      if (response.data.code === 500 && response.data.error_type === 'DRIVER_ERROR') {
        setListError(response.data.message || '存储驱动错误')
        setFiles([])
        setReadme('')
        setHeader('')
        setLoading(false)
        return
      }
      
      // 检查文件不存在
      if (response.data.code === 404) {
        setListError(response.data.message || '路径不存在')
        setFiles([])
        setReadme('')
        setHeader('')
        setLoading(false)
        return
      }
      
      // 清除错误状态
      setListError(null)
      setPasswordRequired(false)
      const data = response.data.data
      const fileList = data?.content || []
      setFiles(fileList)
      setReadme(data?.readme || '')
      setHeader(data?.header || '')
      // 保存所有文件名用于全选
      setAllFileNames(data?.all_names || fileList.map((f: FileItem) => f.name))
      setPagination({
        page: data?.page || 1,
        perPage: data?.per_page || 10,
        total: data?.total || 0,
        folderCount: data?.folder_count || 0,
        fileCount: data?.file_count || 0
      })
      
      // 异步加载挂载点的空间信息
      fileList.forEach((file: FileItem) => {
        if (file.driver_id && file.is_dir) {
          loadDriverSpaceInfo(file.driver_id)
        }
      })
    } catch (err) {
      console.error('加载文件失败:', err)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }
  
  // 处理密码提交
  const handlePasswordSubmit = async () => {
    const fullPath = currentPath ? `/${currentPath}` : '/'
    setPasswordLoading(true)
    setPasswordError(false)
    
    try {
      const response = await api.post('/api/fs/list', {
        path: fullPath,
        password: passwordInput,
        page: 1,
        per_page: pagination.perPage,
        refresh: false
      })
      
      if (response.data.code === 403) {
        // 密码错误
        setPasswordError(true)
        toast.error(t('fileBrowser.passwordError') || '密码错误，请重试')
        setPasswordLoading(false)
        return
      }
      
      // 密码正确，保存并加载
      const newPasswords = { ...pathPassword, [fullPath]: passwordInput }
      setPathPassword(newPasswords)
      sessionStorage.setItem('pathPasswords', JSON.stringify(newPasswords))
      setPasswordRequired(false)
      setPasswordInput('')
      
      const data = response.data.data
      setFiles(data?.content || [])
      setReadme(data?.readme || '')
      setHeader(data?.header || '')
      setPagination({
        page: data?.page || 1,
        perPage: data?.per_page || 10,
        total: data?.total || 0,
        folderCount: data?.folder_count || 0,
        fileCount: data?.file_count || 0
      })
    } catch (err) {
      setPasswordError(true)
      toast.error(t('fileBrowser.passwordError') || '密码错误，请重试')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSort = (key: 'name' | 'size' | 'modified') => {
    const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    const newSort = { key, direction: newDirection as 'asc' | 'desc' }
    setSortConfig(newSort)
    loadFiles(currentPath, 1, pagination.perPage, newSort)
  }

  const getBreadcrumbs = () => {
    if (!currentPath) return [{ name: t('fileBrowser.home'), path: '' }]
    
    const parts = currentPath.split('/').filter(Boolean)
    const breadcrumbs = [{ name: t('fileBrowser.home'), path: '' }]
    
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/')
      breadcrumbs.push({ name: decodeURIComponent(part), path })
    })
    
    return breadcrumbs
  }

  const handleNavigate = (path: string) => {
    navigate(path ? `/${path}` : '/')
  }

  const getFilePath = (fileName: string) => {
    return currentPath ? `/${currentPath}/${fileName}` : `/${fileName}`
  }

  const handleDownload = async (file: FileItem) => {
    try {
      const filePath = getFilePath(file.name)
      const response = await api.post('/api/fs/get_download_url', { path: filePath })
      if (response.data.code === 200) {
        window.open(response.data.data.url, '_blank')
      } else {
        toast.error(response.data.message || t('fileBrowser.operationFailed'))
      }
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
  }

  const handleContextMenu = (e: React.MouseEvent, file: FileItem) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      file
    })
  }

  const handleRename = () => {
    if (!contextMenu.file) return
    setRenameDialog({
      visible: true,
      file: contextMenu.file,
      newName: contextMenu.file.name
    })
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const confirmRename = async () => {
    if (!renameDialog.file || !renameDialog.newName) return
    if (renameDialog.newName === renameDialog.file.name) {
      setRenameDialog({ visible: false, file: null, newName: '' })
      return
    }
    try {
      const filePath = getFilePath(renameDialog.file.name)
      const response = await api.post('/api/fs/rename', { path: filePath, name: renameDialog.newName })
      if (response.data.code === 200) {
        toast.success(t('fileBrowser.renameSuccess'))
        loadFiles(currentPath)
      } else {
        toast.error(response.data.message || t('fileBrowser.operationFailed'))
      }
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
    setRenameDialog({ visible: false, file: null, newName: '' })
  }

  const handleDelete = () => {
    if (!contextMenu.file) return
    setDeleteDialog({
      visible: true,
      file: contextMenu.file
    })
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const confirmDelete = async () => {
    if (!deleteDialog.file) return
    try {
      const filePath = getFilePath(deleteDialog.file.name)
      const response = await api.post('/api/fs/remove', { path: filePath })
      if (response.data.code === 200) {
        toast.success(t('fileBrowser.deleteSuccess'))
        loadFiles(currentPath)
      } else {
        toast.error(response.data.message || t('fileBrowser.operationFailed'))
      }
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
    setDeleteDialog({ visible: false, file: null })
  }

  const handleCopyDirectLink = () => {
    if (!contextMenu.file) return
    setDirectLinkDialog({
      visible: true,
      file: contextMenu.file,
      expiresAt: '',
      maxAccessCount: ''
    })
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleCreateDirectLink = async () => {
    if (!directLinkDialog.file) return
    try {
      const filePath = getFilePath(directLinkDialog.file.name)
      const response = await api.post('/api/fs/get_direct_link', { 
        path: filePath,
        expires_at: directLinkDialog.expiresAt || null,
        max_access_count: directLinkDialog.maxAccessCount ? parseInt(directLinkDialog.maxAccessCount) : null
      })
      if (response.data.code === 200) {
        // Use URL directly from backend / 直接使用后端返回的URL
        await navigator.clipboard.writeText(response.data.data.url)
        toast.success(t('fileBrowser.copySuccess'))
      } else {
        toast.error(response.data.message || t('fileBrowser.operationFailed'))
      }
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
    setDirectLinkDialog({ visible: false, file: null, expiresAt: '', maxAccessCount: '' })
  }

  // 打开路径选择弹窗（单文件）
  const openPathModal = async (mode: 'copy' | 'move') => {
    if (!contextMenu.file) return
    setContextMenu(prev => ({ ...prev, visible: false }))
    openPathModalWithNames(mode, [contextMenu.file.name])
  }
  
  // 打开解压缩弹窗
  const openExtractModal = () => {
    if (!contextMenu.file) return
    setContextMenu(prev => ({ ...prev, visible: false }))
    setExtractDialog({ visible: true, fileName: contextMenu.file.name })
  }
  
  // 打开路径选择弹窗（支持多文件）
  const openPathModalWithNames = async (mode: 'copy' | 'move' | 'extract', names: string[]) => {
    try {
      const response = await api.post('/api/fs/list', { path: '/', page: 1, per_page: 999, refresh: false })
      const dirs = (response.data.data?.content || []).filter((f: FileItem) => f.is_dir)
      setPathModal({
        visible: true,
        mode,
        names,
        targetPath: '/',
        dirs,
        currentDir: '/',
        conflictStrategy: 'auto_rename'
      })
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
  }

  // 加载路径选择弹窗的目录
  const loadPathModalDirs = async (path: string) => {
    try {
      const response = await api.post('/api/fs/list', { path: path || '/', page: 1, per_page: 999, refresh: false })
      const dirs = (response.data.data?.content || []).filter((f: FileItem) => f.is_dir)
      setPathModal(prev => ({
        ...prev,
        dirs,
        currentDir: path,
        targetPath: path
      }))
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
  }

  // 执行复制/移动/解压缩
  const handleCopyMove = async () => {
    if (pathModal.names.length === 0 || !pathModal.mode) return
    
    // 解压缩模式
    if (pathModal.mode === 'extract') {
      try {
        const srcPath = currentPath ? `/${currentPath}/${pathModal.names[0]}` : `/${pathModal.names[0]}`
        const response = await api.post('/api/fs/extract', {
          src_path: srcPath,
          dst_path: pathModal.currentDir || '/',
          put_into_new_dir: true,
          overwrite: pathModal.conflictStrategy === 'overwrite'
        })
        if (response.data.code === 200) {
          toast.success(t('fileBrowser.extractStarted'))
        } else {
          toast.error(response.data.message || t('fileBrowser.operationFailed'))
        }
      } catch (err) {
        toast.error(t('fileBrowser.operationFailed'))
      }
      setPathModal(prev => ({ ...prev, visible: false }))
      return
    }
    
    const endpoint = pathModal.mode === 'copy' ? '/api/fs/copy' : '/api/fs/move'
    
    try {
      const response = await api.post(endpoint, {
        src_dir: currentPath ? `/${currentPath}` : '/',
        dst_dir: pathModal.currentDir || '/',
        names: pathModal.names,
        conflict_strategy: pathModal.conflictStrategy
      })
      if (response.data.code === 200) {
        toast.success(pathModal.mode === 'copy' ? t('fileBrowser.copySuccess') : t('fileBrowser.moveSuccess'))
        loadFiles(currentPath)
        // 清除选择状态
        setSelectionMode(false)
        setSelectedFiles([])
      } else {
        toast.error(response.data.message || t('fileBrowser.operationFailed'))
      }
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
    setPathModal(prev => ({ ...prev, visible: false }))
  }

  // 创建分享
  const handleShare = () => {
    if (!contextMenu.file) return
    setShareDialog({
      visible: true,
      file: contextMenu.file,
      expiresAt: '',
      maxAccessCount: '',
      password: ''
    })
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleCreateShare = async () => {
    if (!shareDialog.file) return
    try {
      const filePath = getFilePath(shareDialog.file.name)
      const response = await api.post('/api/shares', { 
        path: filePath,
        expires_at: shareDialog.expiresAt || null,
        max_access_count: shareDialog.maxAccessCount ? parseInt(shareDialog.maxAccessCount) : null,
        password: shareDialog.password || null
      })
      if (response.data.code === 200) {
        // 分享页面地址使用当前域名 / Share page URL uses current domain
        const url = window.location.origin + response.data.data.url
        await navigator.clipboard.writeText(url)
        toast.success(t('fileBrowser.shareCreated'))
      } else {
        toast.error(response.data.message || t('fileBrowser.operationFailed'))
      }
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
    setShareDialog({ visible: false, file: null, expiresAt: '', maxAccessCount: '', password: '' })
  }

  // 创建文件夹
  const handleMkdir = async () => {
    if (!mkdirDialog.name.trim()) {
      toast.error(t('fileBrowser.enterFolderName'))
      return
    }
    try {
      const response = await api.post('/api/fs/mkdir', {
        path: currentPath ? `/${currentPath}/${mkdirDialog.name}` : `/${mkdirDialog.name}`
      })
      if (response.data.code === 200) {
        toast.success(t('fileBrowser.createFolderSuccess'))
        setMkdirDialog({ visible: false, name: '' })
        loadFiles(currentPath)
      } else {
        toast.error(response.data.message || t('fileBrowser.operationFailed'))
      }
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
  }

  // 创建文件
  const handleNewFile = async () => {
    if (!newFileDialog.name.trim()) {
      toast.error(t('fileBrowser.enterFileName'))
      return
    }
    try {
      const response = await api.post('/api/fs/write', {
        path: currentPath ? `/${currentPath}/${newFileDialog.name}` : `/${newFileDialog.name}`,
        content: ''
      })
      if (response.data.code === 200) {
        toast.success(t('fileBrowser.createFileSuccess'))
        setNewFileDialog({ visible: false, name: '' })
        loadFiles(currentPath)
      } else {
        toast.error(response.data.message || t('fileBrowser.operationFailed'))
      }
    } catch (err) {
      toast.error(t('fileBrowser.operationFailed'))
    }
  }

  // 分片大小：128MB（大分片减少HTTP请求开销）
  const CHUNK_SIZE = 32 * 1024 * 1024
  
  // 上传任务取消状态（taskId -> cancelled）
  const uploadCancelledRef = useRef<Set<string>>(new Set())
  
  // 取消上传任务
  const cancelUploadTask = (taskId: string) => {
    uploadCancelledRef.current.add(taskId)
    // 调用后端取消API
    api.post('/api/tasks/cancel', { task_id: taskId }).catch(console.error)
  }
  
  // 检查任务是否已取消
  const isUploadCancelled = (taskId: string) => {
    return uploadCancelledRef.current.has(taskId)
  }

  // 上传单个文件（支持分片和断点续传）
  const uploadSingleFile = async (
    file: File, 
    _taskId: string, // 本地任务ID（已由后端管理）
    relativePath?: string,
    batchTaskId?: string // 后端批次任务ID
  ) => {
    const targetPath = currentPath ? `/${currentPath}` : '/'
    const filename = relativePath || file.name
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    let uploadedSize = 0
    
    // 小文件直接上传
    if (totalChunks <= 1) {
      const formData = new FormData()
      formData.append('path', targetPath)
      formData.append('filename', filename)
      formData.append('totalSize', String(file.size))
      if (batchTaskId) {
        formData.append('taskId', batchTaskId)
      }
      formData.append('file', file)
      
      const response = await api.post('/api/fs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.code === 200) {
        return true
      }
      throw new Error(response.data.message || '上传失败')
    }
    
    // 大文件分片上传 - 查询已上传的分片
    let uploadedChunks: number[] = []
    try {
      const statusRes = await api.post('/api/fs/upload/status', {
        path: targetPath,
        filename,
        total_chunks: totalChunks
      })
      if (statusRes.data.code === 200) {
        uploadedChunks = statusRes.data.data?.uploadedChunks || []
        uploadedSize = uploadedChunks.length * CHUNK_SIZE
      }
    } catch {
      // 忽略错误，从头开始上传
    }
    
    // 上传缺失的分片（带重试逻辑）
    const MAX_RETRIES = 3
    
    for (let i = 0; i < totalChunks; i++) {
      if (uploadedChunks.includes(i)) continue
      
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      
      let lastError: Error | null = null
      
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          const formData = new FormData()
          formData.append('path', targetPath)
          formData.append('filename', filename)
          formData.append('chunkIndex', String(i))
          formData.append('totalChunks', String(totalChunks))
          formData.append('totalSize', String(file.size))
          if (batchTaskId) {
            formData.append('taskId', batchTaskId)
          }
          formData.append('file', chunk)
          
          const response = await api.post('/api/fs/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000 // 2分钟超时
          })
          
          if (response.data.code === 499) {
            // 任务已取消
            throw new Error('CANCELLED')
          }
          if (response.data.code === 498) {
            // 任务已暂停，等待后重试（不计入重试次数）
            console.log('任务已暂停，等待恢复...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            retry-- // 不计入重试次数
            continue
          }
          if (response.data.code !== 200) {
            throw new Error(response.data.message || '分片上传失败')
          }
          
          uploadedSize += chunk.size
          lastError = null
          break // 成功，跳出重试循环
        } catch (err: any) {
          // 取消错误不重试
          if (err.message === 'CANCELLED') {
            throw err
          }
          lastError = err
          console.warn(`分片 ${i} 上传失败，重试 ${retry + 1}/${MAX_RETRIES}:`, err.message)
          if (retry < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1))) // 递增延迟
          }
        }
      }
      
      if (lastError) {
        throw lastError // 重试用尽，抛出最后一个错误
      }
    }
    
    return true
  }

  // 处理文件上传（支持文件夹）- 完全依赖后端任务状态
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files)
    const targetPath = currentPath ? `/${currentPath}` : '/'
    
    // 调用后端API创建批次任务
    let backendTaskId: string | null = null
    let resolvedFiles: { original: string, resolved: string | null, skipped: boolean }[] = []
    try {
      const batchResponse = await api.post('/api/fs/upload/batch', {
        target_path: targetPath,
        files: fileArray.map(f => ({
          path: (f as any).webkitRelativePath || f.name,
          size: f.size
        })),
        conflict_strategy: uploadConflictStrategy
      })
      
      if (batchResponse.data.code === 200 && batchResponse.data.data?.taskId) {
        backendTaskId = batchResponse.data.data.taskId
        resolvedFiles = batchResponse.data.data.files || []
      } else {
        toast.error(batchResponse.data.message || t('fileBrowser.createUploadTaskFailed'))
        return
      }
    } catch (err) {
      console.error('Failed to create batch task:', err)
      toast.error(t('fileBrowser.createUploadTaskFailed'))
      return
    }
    
    // 关闭上传弹窗并通知用户
    setUploadDialog(false)
    toast.info(t('fileBrowser.uploadStarted', { count: fileArray.length }))
    
    // 顺序上传文件（使用后端返回的resolved路径）
    for (let i = 0; i < fileArray.length; i++) {
      // 检查任务是否已取消
      if (backendTaskId && isUploadCancelled(backendTaskId)) {
        console.log(`任务已取消: ${backendTaskId}`)
        toast.info(t('fileBrowser.uploadCancelled'))
        break
      }
      
      const file = fileArray[i]
      const originalPath = (file as any).webkitRelativePath || file.name
      
      // 查找对应的resolved路径
      const resolved = resolvedFiles.find(r => r.original === originalPath)
      if (resolved?.skipped) {
        console.log(`跳过文件: ${originalPath}`)
        continue
      }
      
      // 使用resolved路径的文件名（如果有重命名）
      const uploadFilename = resolved?.resolved 
        ? resolved.resolved.split('/').pop() || originalPath
        : originalPath
      
      try {
        await uploadSingleFile(file, '', uploadFilename, backendTaskId || undefined)
      } catch (err: any) {
        // 如果是取消导致的错误，不记录
        if (backendTaskId && isUploadCancelled(backendTaskId)) {
          break
        }
        console.error(`上传文件 ${uploadFilename} 失败:`, err)
      }
    }
    
    // 清理取消状态
    if (backendTaskId) {
      uploadCancelledRef.current.delete(backendTaskId)
    }
    
    // 上传完成后刷新文件列表
    const uploadTargetPath = targetPath.replace(/^\//, '')
    if (currentPath === uploadTargetPath || currentPath.startsWith(uploadTargetPath + '/')) {
      loadFiles(currentPath)
    }
  }

  // 刷新文件列表
  const handleRefresh = () => {
    loadFiles(currentPath)
    toast.success(t('fileBrowser.refreshSuccess'))
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i]
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className={`file-browser ${hasBackground ? 'file-browser--with-bg' : ''}`}>
      <div className="file-browser__header">
        <div className="file-browser__header-left">
          <img src={siteIcon} alt={siteTitle} className="file-browser__logo" />
          <h1 className="file-browser__site-title">{siteTitle}</h1>
        </div>
        <div className="file-browser__header-right">
          {/* 搜索按钮 */}
          {searchEnabled && (
            <Tooltip text={t('search.placeholder')} position="bottom">
              <button 
                className="file-browser__header-btn"
                onClick={openSearchModal}
              >
                <Search size={18} />
              </button>
            </Tooltip>
          )}
          <div className="file-browser__lang-switch">
            <Tooltip text={t('fileBrowser.switchLanguage')} position="bottom">
              <button 
                className="file-browser__header-btn"
                onClick={() => setShowLangMenu(!showLangMenu)}
              >
                <Languages size={18} />
              </button>
            </Tooltip>
            {showLangMenu && (
              <div className="file-browser__lang-menu">
                <button 
                  className={`file-browser__lang-item ${language === 'zh-CN' ? 'active' : ''}`}
                  onClick={() => toggleLanguage('zh-CN')}
                >
                  简体中文
                </button>
                <button 
                  className={`file-browser__lang-item ${language === 'en-US' ? 'active' : ''}`}
                  onClick={() => toggleLanguage('en-US')}
                >
                  English
                </button>
              </div>
            )}
          </div>
          <Tooltip text={darkMode ? t('fileBrowser.switchToLight') : t('fileBrowser.switchToDark')} position="bottom">
            <button 
              className="file-browser__header-btn"
              onClick={() => shared.setDarkMode(!darkMode)}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </Tooltip>
        </div>
      </div>
      
      {/* 顶部说明 (Header) - 在面包屑卡片上方 */}
      {header && !passwordRequired && (
        <div className="file-browser__meta-card file-browser__meta-card--header">
          <div className="file-browser__meta-content">
            {isHtmlContent(header) ? (
              <HtmlContentRenderer content={header} className="file-browser__html-content" />
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const lang = match?.[1]
                    const code = String(children).replace(/\n$/, '')
                    if (lang === 'mermaid') {
                      return <MermaidChart chart={code} />
                    }
                    return <code className={className} {...props}>{children}</code>
                  },
                  p({ children }) {
                    if (typeof children === 'string') {
                      return <p>{processEmoji(children)}</p>
                    }
                    return <p>{children}</p>
                  }
                }}
              >{header}</ReactMarkdown>
            )}
          </div>
        </div>
      )}


      <div className="file-browser__breadcrumb-card">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.path} className="file-browser__breadcrumb-item">
            {index === 0 ? (
              <Link to="/" className="file-browser__breadcrumb-link">
                <Home size={18} />
                <span>{crumb.name}</span>
              </Link>
            ) : (
              <>
                <ChevronRight size={18} className="file-browser__breadcrumb-separator" />
                <Link 
                  to={`/${crumb.path}`}
                  className={`file-browser__breadcrumb-link ${index === breadcrumbs.length - 1 ? 'file-browser__breadcrumb-link--current' : ''}`}
                >
                  {crumb.name}
                </Link>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="file-browser__main-card">
        {/* 密码验证界面 */}
        {passwordRequired ? (
          <div className={`file-browser__password ${passwordError ? 'shake' : ''}`}>
            <div className="file-browser__password-icon">
              <Lock size={48} />
            </div>
            <h2>{t('fileBrowser.passwordRequired') || '需要密码'}</h2>
            <p>{t('fileBrowser.passwordHint') || '此目录需要密码才能访问'}</p>
            <div className="file-browser__password-form">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  setPasswordError(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && !passwordLoading && handlePasswordSubmit()}
                placeholder={t('fileBrowser.enterPassword') || '请输入密码'}
                className={passwordError ? 'error' : ''}
                autoFocus
                disabled={passwordLoading}
              />
              <button onClick={handlePasswordSubmit} disabled={passwordLoading || !passwordInput}>
                {passwordLoading ? (
                  <span className="file-browser__password-loading"></span>
                ) : (
                  t('fileBrowser.confirm') || '确认'
                )}
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="file-browser__loading">
            <div className="file-browser__spinner"></div>
            <p>{t('fileBrowser.loading')}</p>
          </div>
        ) : listError ? (
          <div className="file-browser__error">
            <AlertTriangle size={48} className="file-browser__error-icon" />
            <div className="file-browser__error-title">{t('fileBrowser.driverError', '存储驱动故障')}</div>
            <div className="file-browser__error-message">{listError}</div>
          </div>
        ) : files.length === 0 ? (
          <div className="file-browser__empty">
            <Folder size={48} />
            <p>{t('fileBrowser.emptyFolder')}</p>
          </div>
        ) : (
          <div className="file-browser__table">
            <div className={`file-browser__table-header ${selectionMode ? 'selection-mode' : ''}`}>
              {selectionMode && (
                <div className="file-browser__col-checkbox">
                  <span 
                    className={`file-browser__checkbox ${selectedFiles.length === allFileNames.length && allFileNames.length > 0 ? 'checked' : ''}`}
                    onClick={() => {
                      if (selectedFiles.length === allFileNames.length) {
                        setSelectedFiles([])
                      } else {
                        setSelectedFiles([...allFileNames])
                      }
                    }}
                  >
                    <Check size={12} />
                  </span>
                </div>
              )}
              <div 
                className={`file-browser__col-name ${sortConfig.key === 'name' ? 'active' : ''}`}
                onClick={() => handleSort('name')}
              >
                {t('fileBrowser.name')}
                {sortConfig.key === 'name' && (
                  sortConfig.direction === 'asc' ? <ArrowUp className="sort-icon" size={14} /> : <ArrowDown className="sort-icon" size={14} />
                )}
              </div>
              <div 
                className={`file-browser__col-size ${sortConfig.key === 'size' ? 'active' : ''}`}
                onClick={() => handleSort('size')}
              >
                {t('fileBrowser.size')}
                {sortConfig.key === 'size' && (
                  sortConfig.direction === 'asc' ? <ArrowUp className="sort-icon" size={14} /> : <ArrowDown className="sort-icon" size={14} />
                )}
              </div>
              <div 
                className={`file-browser__col-date ${sortConfig.key === 'modified' ? 'active' : ''}`}
                onClick={() => handleSort('modified')}
              >
                {t('fileBrowser.modified')}
                {sortConfig.key === 'modified' && (
                  sortConfig.direction === 'asc' ? <ArrowUp className="sort-icon" size={14} /> : <ArrowDown className="sort-icon" size={14} />
                )}
              </div>
              <div className="file-browser__col-actions"></div>
            </div>
            <div className="file-browser__table-body">
              {files.map((file, index) => {
                const { icon: IconComponent, color } = getFileIcon(file.name, file.is_dir)
                const isSelected = selectedFiles.includes(file.name)
                return (
                  <div 
                    key={file.name || `file-${index}`}
                    className={`file-browser__row ${selectionMode ? 'selection-mode' : ''} ${file.is_dir ? 'file-browser__row--folder' : ''} ${contextMenu.file?.name === file.name ? 'file-browser__row--active' : ''} ${isSelected ? 'file-browser__row--selected' : ''}`}
                    style={{ '--row-index': index } as React.CSSProperties}
                    onClick={() => {
                      if (selectionMode) {
                        setSelectedFiles(prev => 
                          isSelected ? prev.filter(p => p !== file.name) : [...prev, file.name]
                        )
                      } else {
                        // 目录和文件都跳转到对应路径（文件会显示预览页面）
                        handleNavigate(currentPath ? `${currentPath}/${file.name}` : file.name)
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                  >
                    {selectionMode && (
                      <div className="file-browser__col-checkbox">
                        <span 
                          className={`file-browser__checkbox ${isSelected ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFiles(prev => 
                              isSelected ? prev.filter(p => p !== file.name) : [...prev, file.name]
                            )
                          }}
                        >
                          <Check size={12} />
                        </span>
                      </div>
                    )}
                    <div className="file-browser__col-name">
                      <IconComponent size={24} style={{ color }} className="file-browser__file-icon" />
                      <span className="file-browser__file-name">{file.name}</span>
                      {file.driver_id && driverSpaceInfo[file.driver_id] && (() => {
                        const info = driverSpaceInfo[file.driver_id]!
                        const usagePercent = Math.min(100, (info.used / info.total) * 100)
                        const colorClass = usagePercent >= 90 ? 'critical' : usagePercent >= 70 ? 'warning' : 'normal'
                        return (
                          <span className={`file-browser__space-badge file-browser__space-badge--${colorClass}`}>
                            <span className="file-browser__space-progress" style={{ width: `${usagePercent}%` }} />
                            <span className="file-browser__space-text">
                              {formatSize(info.used)} / {formatSize(info.total)}
                            </span>
                          </span>
                        )
                      })()}
                    </div>
                    <div className="file-browser__col-size">
                      {formatSize(file.size)}
                    </div>
                    <div className="file-browser__col-date">
                      {formatDate(file.modified)}
                    </div>
                    <div className="file-browser__col-actions">
                      <Tooltip text={file.is_dir ? t('fileBrowser.packDownload') : t('fileBrowser.download')} position="left">
                        <button 
                          className="file-browser__download-btn" 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(file)
                          }}
                        >
                          <Download size={16} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 文件统计信息 */}
            <div className="file-browser__footer">
              <div className="file-browser__stats">
                {(() => {
                  const parts = []
                  if (pagination.folderCount > 0) parts.push(`${pagination.folderCount} ${t('fileBrowser.folders')}`)
                  if (pagination.fileCount > 0) parts.push(`${pagination.fileCount} ${t('fileBrowser.files')}`)
                  return parts.join(' ') || t('fileBrowser.emptyFolder')
                })()}
              </div>

              {/* 页码导航 - 超过10项显示 */}
              {pagination.total > 10 && (
                <div className="file-browser__pagination">
                  <Tooltip text={t('fileBrowser.prevPage')} position="top">
                    <button 
                      className="file-browser__pagination-btn file-browser__pagination-btn--icon"
                      disabled={pagination.page === 1}
                      onClick={() => loadFiles(currentPath, pagination.page - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </Tooltip>
                  <span className="file-browser__pagination-info">
                    {pagination.page} / {Math.ceil(pagination.total / pagination.perPage)}
                  </span>
                  <Tooltip text={t('fileBrowser.nextPage')} position="top">
                    <button 
                      className="file-browser__pagination-btn file-browser__pagination-btn--icon"
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.perPage)}
                      onClick={() => loadFiles(currentPath, pagination.page + 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </Tooltip>
                </div>
              )}

              {/* 每页数选择器 */}
              <div className="file-browser__per-page" ref={perPageRef}>
                <div 
                  className="file-browser__per-page-trigger"
                  onClick={(e) => {
                    e.stopPropagation()
                    const rect = e.currentTarget.getBoundingClientRect()
                    setDropdownPosition({
                      top: rect.bottom + 8,
                      left: rect.left + rect.width / 2
                    })
                    setShowPerPageDropdown(!showPerPageDropdown)
                  }}
                >
                  {pagination.perPage} {t('fileBrowser.perPage')}
                </div>
              </div>
            </div>

            {/* 每页数下拉菜单 - 使用 Portal 渲染到 body */}
            {showPerPageDropdown && createPortal(
              <div 
                className="file-browser__per-page-dropdown"
                style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                onClick={(e) => e.stopPropagation()}
              >
                {[10, 20, 50, 100].map(num => (
                  <div 
                    key={num}
                    className={`file-browser__per-page-option ${pagination.perPage === num ? 'file-browser__per-page-option--active' : ''}`}
                    onClick={() => {
                      setShowPerPageDropdown(false)
                      localStorage.setItem('perPage', String(num))
                      loadFiles(currentPath, 1, num)
                    }}
                  >
                    {num} {t('fileBrowser.perPage')}
                  </div>
                ))}
              </div>,
              document.body
            )}

            {/* 右键菜单 - 使用 Portal 渲染到 body 避免 backdrop-filter 影响定位 */}
            {contextMenu.visible && contextMenu.file && createPortal(
              <div 
                ref={menuRef}
                className="file-browser__context-menu"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                {permissions?.read_files && (
                  <button onClick={() => { handleDownload(contextMenu.file!); setContextMenu(prev => ({ ...prev, visible: false })) }}>
                    <Download size={18} style={{ color: '#007aff' }} /> {contextMenu.file.is_dir ? t('fileBrowser.packDownload') : t('fileBrowser.download')}
                  </button>
                )}
                {permissions?.rename_files && (
                  <button onClick={handleRename}>
                    <Edit3 size={18} style={{ color: '#ff9500' }} /> {t('fileBrowser.rename')}
                  </button>
                )}
                {permissions?.copy_files && (
                  <button onClick={() => openPathModal('copy')}>
                    <Copy size={18} style={{ color: '#34c759' }} /> {t('fileBrowser.copyTo')}
                  </button>
                )}
                {permissions?.move_files && (
                  <button onClick={() => openPathModal('move')}>
                    <Move size={18} style={{ color: '#5856d6' }} /> {t('fileBrowser.moveTo')}
                  </button>
                )}
                {permissions?.extract_files && !contextMenu.file.is_dir && /\.(zip|jar|war|apk|ipa|epub|zipx|tar|tgz|7z)$/i.test(contextMenu.file.name) && (
                  <button onClick={openExtractModal}>
                    <FileArchive size={18} style={{ color: '#ff6b35' }} /> {t('fileBrowser.extractTo') || '解压到...'}
                  </button>
                )}
                {permissions?.delete_files && (
                  <button onClick={handleDelete}>
                    <Trash2 size={18} style={{ color: '#ff3b30' }} /> {t('fileBrowser.delete')}
                  </button>
                )}
                {permissions?.allow_share && (
                  <button onClick={handleShare}>
                    <Share2 size={18} style={{ color: '#30b0c7' }} /> {t('fileBrowser.createShare')}
                  </button>
                )}
                {!contextMenu.file.is_dir && permissions?.allow_direct_link && (
                  <button onClick={handleCopyDirectLink}>
                    <Link2 size={18} style={{ color: '#af52de' }} /> {t('fileBrowser.copyDirectLink')}
                  </button>
                )}
              </div>,
              document.body
            )}

            {/* 路径选择弹窗 */}
            {pathModal.visible && createPortal(
              <div className="file-browser__modal-overlay" onClick={() => setPathModal(prev => ({ ...prev, visible: false }))}>
                <div className="file-browser__path-modal" onClick={e => e.stopPropagation()}>
                  <div className="file-browser__path-modal-header">
                    <h3>{pathModal.mode === 'copy' ? t('fileBrowser.copyTo') : pathModal.mode === 'extract' ? t('fileBrowser.extractTo') : t('fileBrowser.moveTo')} {pathModal.names.length > 1 ? t('fileBrowser.itemsCount', { count: pathModal.names.length }) : ''}</h3>
                    <button className="file-browser__path-modal-close" onClick={() => setPathModal(prev => ({ ...prev, visible: false }))}>
                      <X size={20} />
                    </button>
                  </div>
                  <div className="file-browser__path-modal-content">
                    <div className="file-browser__path-modal-current">
                      {t('fileBrowser.currentLocation')}: <strong>{pathModal.currentDir || '/'}</strong>
                    </div>
                    <div className="file-browser__path-modal-list">
                      {pathModal.currentDir !== '/' && (
                        <div 
                          className="file-browser__path-modal-item file-browser__path-modal-item--back"
                          onClick={() => {
                            const parts = pathModal.currentDir.split('/').filter(Boolean)
                            parts.pop()
                            loadPathModalDirs(parts.length ? '/' + parts.join('/') : '/')
                          }}
                        >
                          <FolderOpen size={18} /> {t('fileBrowser.goBack')}
                        </div>
                      )}
                      {pathModal.dirs.map(dir => (
                        <div 
                          key={dir.name}
                          className="file-browser__path-modal-item"
                          onClick={() => {
                            const newPath = pathModal.currentDir === '/' ? `/${dir.name}` : `${pathModal.currentDir}/${dir.name}`
                            loadPathModalDirs(newPath)
                          }}
                        >
                          <Folder size={18} /> {dir.name}
                        </div>
                      ))}
                      {pathModal.dirs.length === 0 && pathModal.currentDir !== '/' && (
                        <div className="file-browser__path-modal-empty">
                          {t('fileBrowser.noSubfolders')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 冲突处理选项 */}
                  <div className="file-browser__path-modal-conflict">
                    <div className="file-browser__path-modal-conflict-label">{t('fileBrowser.ifFileExists')}</div>
                    <div className="file-browser__path-modal-conflict-options">
                      <label className="file-browser__path-modal-conflict-option">
                        <input 
                          type="radio" 
                          name="conflict" 
                          checked={pathModal.conflictStrategy === 'auto_rename'}
                          onChange={() => setPathModal(prev => ({ ...prev, conflictStrategy: 'auto_rename' }))}
                        />
                        <span>{t('fileBrowser.autoRename')}</span>
                      </label>
                      <label className="file-browser__path-modal-conflict-option">
                        <input 
                          type="radio" 
                          name="conflict" 
                          checked={pathModal.conflictStrategy === 'overwrite'}
                          onChange={() => setPathModal(prev => ({ ...prev, conflictStrategy: 'overwrite' }))}
                        />
                        <span>{t('fileBrowser.overwrite')}</span>
                      </label>
                      <label className="file-browser__path-modal-conflict-option">
                        <input 
                          type="radio" 
                          name="conflict" 
                          checked={pathModal.conflictStrategy === 'skip'}
                          onChange={() => setPathModal(prev => ({ ...prev, conflictStrategy: 'skip' }))}
                        />
                        <span>{t('fileBrowser.skip')}</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="file-browser__path-modal-footer">
                    <button className="file-browser__path-modal-btn file-browser__path-modal-btn--cancel" onClick={() => setPathModal(prev => ({ ...prev, visible: false }))}>
                      {t('fileBrowser.cancel')}
                    </button>
                    <button className="file-browser__path-modal-btn file-browser__path-modal-btn--confirm" onClick={handleCopyMove}>
                      {t('fileBrowser.confirmAction', { action: pathModal.mode === 'copy' ? t('fileBrowser.copy') : t('fileBrowser.move') })}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* 重命名弹窗 - 与新建文件夹相同样式 */}
            {renameDialog.visible && createPortal(
              <div className="file-browser__dialog-overlay" onClick={() => setRenameDialog({ visible: false, file: null, newName: '' })}>
                <div className="file-browser__dialog" onClick={e => e.stopPropagation()}>
                  <h3 className="file-browser__dialog-title">{t('fileBrowser.renameTitle')}</h3>
                  <input 
                    type="text"
                    className="file-browser__dialog-input"
                    value={renameDialog.newName}
                    onChange={(e) => setRenameDialog(prev => ({ ...prev, newName: e.target.value }))}
                    placeholder={t('fileBrowser.enterNewName')}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                  />
                  <div className="file-browser__dialog-actions">
                    <button 
                      className="file-browser__dialog-btn file-browser__dialog-btn--secondary"
                      onClick={() => setRenameDialog({ visible: false, file: null, newName: '' })}
                    >
                      {t('fileBrowser.cancel')}
                    </button>
                    <button 
                      className="file-browser__dialog-btn file-browser__dialog-btn--primary"
                      onClick={confirmRename}
                    >
                      {t('fileBrowser.confirm')}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* 删除确认弹窗 - Apple Design 风格 */}
            {deleteDialog.visible && createPortal(
              <div className="file-browser__modal-overlay" onClick={() => setDeleteDialog({ visible: false, file: null })}>
                <div className="file-browser__delete-dialog" onClick={e => e.stopPropagation()}>
                  <div className="file-browser__delete-dialog-icon">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="file-browser__delete-dialog-title">
                    {t('fileBrowser.deleteTitle')}
                  </h3>
                  <p className="file-browser__delete-dialog-filename">
                    {deleteDialog.file?.name}
                  </p>
                  <p className="file-browser__delete-dialog-warning">
                    {t('fileBrowser.deleteWarning')}
                  </p>
                  <div className="file-browser__delete-dialog-actions">
                    <button 
                      className="file-browser__delete-dialog-btn file-browser__delete-dialog-btn--cancel" 
                      onClick={() => setDeleteDialog({ visible: false, file: null })}
                    >
                      {t('fileBrowser.cancel')}
                    </button>
                    <button 
                      className="file-browser__delete-dialog-btn file-browser__delete-dialog-btn--delete" 
                      onClick={confirmDelete}
                    >
                      {t('fileBrowser.delete')}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* 批量删除确认弹窗 */}
            {batchDeleteDialog.visible && createPortal(
              <div className="file-browser__modal-overlay" onClick={() => setBatchDeleteDialog({ visible: false, names: [] })}>
                <div className="file-browser__delete-dialog" onClick={e => e.stopPropagation()}>
                  <div className="file-browser__delete-dialog-icon">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="file-browser__delete-dialog-title">
                    {t('fileBrowser.deleteItems', { count: batchDeleteDialog.names.length })}
                  </h3>
                  <p className="file-browser__delete-dialog-warning">
                    {t('fileBrowser.deleteWarning')}
                  </p>
                  <div className="file-browser__delete-dialog-actions">
                    <button 
                      className="file-browser__delete-dialog-btn file-browser__delete-dialog-btn--cancel" 
                      onClick={() => setBatchDeleteDialog({ visible: false, names: [] })}
                    >
                      {t('fileBrowser.cancel')}
                    </button>
                    <button 
                      className="file-browser__delete-dialog-btn file-browser__delete-dialog-btn--delete" 
                      onClick={async () => {
                        let successCount = 0
                        let failCount = 0
                        for (const name of batchDeleteDialog.names) {
                          const filePath = currentPath ? `/${currentPath}/${name}` : `/${name}`
                          try {
                            const response = await api.post('/api/fs/remove', { path: filePath })
                            if (response.data.code === 200) {
                              successCount++
                            } else {
                              failCount++
                            }
                          } catch {
                            failCount++
                          }
                        }
                        if (failCount === 0) {
                          toast.success(t('fileBrowser.deleteSuccess', { count: successCount }))
                        } else {
                          toast.warning(t('fileBrowser.deletePartial', { success: successCount, fail: failCount }))
                        }
                        loadFiles(currentPath)
                        setSelectionMode(false)
                        setSelectedFiles([])
                        setBatchDeleteDialog({ visible: false, names: [] })
                      }}
                    >
                      {t('fileBrowser.delete')}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* 直链创建弹窗 */}
            {directLinkDialog.visible && createPortal(
              <div className="file-browser__modal-overlay" onClick={() => setDirectLinkDialog({ visible: false, file: null, expiresAt: '', maxAccessCount: '' })}>
                <div className="file-browser__direct-link-dialog" onClick={e => e.stopPropagation()}>
                  <div className="file-browser__direct-link-dialog-header">
                    <h3>{t('fileBrowser.createDirectLink')}</h3>
                    <button onClick={() => setDirectLinkDialog({ visible: false, file: null, expiresAt: '', maxAccessCount: '' })}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="file-browser__direct-link-dialog-body">
                    <p className="file-browser__direct-link-dialog-filename">
                      <Link2 size={16} />
                      {directLinkDialog.file?.name}
                    </p>
                    <div className="file-browser__direct-link-dialog-field">
                      <label>{t('fileBrowser.expiresAt', '过期时间')}</label>
                      <input
                        type="datetime-local"
                        value={directLinkDialog.expiresAt}
                        onChange={e => setDirectLinkDialog(prev => ({ ...prev, expiresAt: e.target.value }))}
                      />
                      <span className="file-browser__direct-link-dialog-hint">{t('fileBrowser.expiresAtHint', '留空表示永不过期')}</span>
                    </div>
                    <div className="file-browser__direct-link-dialog-field">
                      <label>{t('fileBrowser.maxAccessCount', '最大访问次数')}</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="∞"
                        value={directLinkDialog.maxAccessCount}
                        onChange={e => setDirectLinkDialog(prev => ({ ...prev, maxAccessCount: e.target.value }))}
                      />
                      <span className="file-browser__direct-link-dialog-hint">{t('fileBrowser.maxAccessCountHint', '留空表示无限制')}</span>
                    </div>
                  </div>
                  <div className="file-browser__direct-link-dialog-actions">
                    <button 
                      className="file-browser__direct-link-dialog-btn file-browser__direct-link-dialog-btn--cancel"
                      onClick={() => setDirectLinkDialog({ visible: false, file: null, expiresAt: '', maxAccessCount: '' })}
                    >
                      {t('common.cancel', '取消')}
                    </button>
                    <button 
                      className="file-browser__direct-link-dialog-btn file-browser__direct-link-dialog-btn--create"
                      onClick={handleCreateDirectLink}
                    >
                      {t('fileBrowser.createAndCopy', '创建并复制')}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {/* 分享创建弹窗 */}
            {shareDialog.visible && createPortal(
              <div className="file-browser__modal-overlay" onClick={() => setShareDialog({ visible: false, file: null, expiresAt: '', maxAccessCount: '', password: '' })}>
                <div className="file-browser__direct-link-dialog" onClick={e => e.stopPropagation()}>
                  <div className="file-browser__direct-link-dialog-header">
                    <h3>{t('fileBrowser.createShare')}</h3>
                    <button onClick={() => setShareDialog({ visible: false, file: null, expiresAt: '', maxAccessCount: '', password: '' })}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="file-browser__direct-link-dialog-body">
                    <p className="file-browser__direct-link-dialog-filename">
                      <Share2 size={16} />
                      {shareDialog.file?.name}
                    </p>
                    <div className="file-browser__direct-link-dialog-field">
                      <label>{t('fileBrowser.sharePassword')}</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder={t('fileBrowser.sharePasswordPlaceholder')}
                        value={shareDialog.password}
                        onChange={e => setShareDialog(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                    <div className="file-browser__direct-link-dialog-field">
                      <label>{t('fileBrowser.expiresAt')}</label>
                      <input
                        type="datetime-local"
                        value={shareDialog.expiresAt}
                        onChange={e => setShareDialog(prev => ({ ...prev, expiresAt: e.target.value }))}
                      />
                      <span className="file-browser__direct-link-dialog-hint">{t('fileBrowser.expiresAtHint')}</span>
                    </div>
                    <div className="file-browser__direct-link-dialog-field">
                      <label>{t('fileBrowser.maxAccessCount')}</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="∞"
                        value={shareDialog.maxAccessCount}
                        onChange={e => setShareDialog(prev => ({ ...prev, maxAccessCount: e.target.value }))}
                      />
                      <span className="file-browser__direct-link-dialog-hint">{t('fileBrowser.maxAccessCountHint')}</span>
                    </div>
                  </div>
                  <div className="file-browser__direct-link-dialog-actions">
                    <button 
                      className="file-browser__direct-link-dialog-btn file-browser__direct-link-dialog-btn--cancel"
                      onClick={() => setShareDialog({ visible: false, file: null, expiresAt: '', maxAccessCount: '', password: '' })}
                    >
                      {t('common.cancel')}
                    </button>
                    <button 
                      className="file-browser__direct-link-dialog-btn file-browser__direct-link-dialog-btn--create"
                      onClick={handleCreateShare}
                    >
                      {t('fileBrowser.createAndCopy')}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
        )}
      </div>

      {/* 底部说明 (Readme) - 在文件列表卡片下方 */}
      {readme && !passwordRequired && (
        <div className="file-browser__meta-card file-browser__meta-card--readme">
          <div className="file-browser__meta-content">
            {isHtmlContent(readme) ? (
              <HtmlContentRenderer content={readme} className="file-browser__html-content" />
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const lang = match?.[1]
                    const code = String(children).replace(/\n$/, '')
                    if (lang === 'mermaid') {
                      return <MermaidChart chart={code} />
                    }
                    return <code className={className} {...props}>{children}</code>
                  },
                  p({ children }) {
                    if (typeof children === 'string') {
                      return <p>{processEmoji(children)}</p>
                    }
                    return <p>{children}</p>
                  }
                }}
              >{readme}</ReactMarkdown>
            )}
          </div>
        </div>
      )}

      {/* 悬浮工具栏 - 竖向排版 */}
      <div className="file-browser__floating-toolbar">
        <Tooltip text={t('fileBrowser.refresh')} position="left">
          <button 
            className="file-browser__toolbar-btn file-browser__toolbar-btn--refresh" 
            onClick={handleRefresh}
          >
            <RefreshCw size={20} />
          </button>
        </Tooltip>
        
        {permissions?.create_upload && (
          <>
            <Tooltip text={t('fileBrowser.newFile')} position="left">
              <button 
                className="file-browser__toolbar-btn file-browser__toolbar-btn--newfile"
                onClick={() => setNewFileDialog({ visible: true, name: '' })}
              >
                <FilePlus size={20} />
              </button>
            </Tooltip>
            <Tooltip text={t('fileBrowser.newFolder')} position="left">
              <button 
                className="file-browser__toolbar-btn file-browser__toolbar-btn--newfolder"
                onClick={() => setMkdirDialog({ visible: true, name: '' })}
              >
                <FolderPlus size={20} />
              </button>
            </Tooltip>
            <Tooltip text={t('fileBrowser.upload')} position="left">
              <button 
                className="file-browser__toolbar-btn file-browser__toolbar-btn--upload"
                onClick={() => setUploadDialog(true)}
              >
                <Upload size={20} />
              </button>
            </Tooltip>
          </>
        )}
        
        <Tooltip text={selectionMode ? t('fileBrowser.cancelMultiSelect') : t('fileBrowser.multiSelect')} position="left">
          <button 
            className="file-browser__toolbar-btn file-browser__toolbar-btn--select"
            onClick={() => setSelectionMode(!selectionMode)}
          >
            <CheckSquare size={20} />
          </button>
        </Tooltip>
        
        <Tooltip text={t('fileBrowser.taskList')} position="left">
          <button 
            className="file-browser__toolbar-btn file-browser__toolbar-btn--tasks"
            onClick={() => setTaskListDialog(true)}
          >
            <ListTodo size={20} />
          </button>
        </Tooltip>

      </div>

      {/* 选择操作栏 - 底部居中 */}
      {selectionMode && selectedFiles.length > 0 && (
        <div className="file-browser__selection-bar">
          <span className="file-browser__selection-count">
            {selectedFiles.length}
          </span>
          
          {permissions?.rename_files && selectedFiles.length === 1 && (
            <Tooltip text={t('fileBrowser.rename')} position="top">
              <button 
                className="file-browser__toolbar-btn file-browser__toolbar-btn--rename"
                onClick={() => toast.info(t('fileBrowser.developing'))}
              >
                <Edit3 size={20} />
              </button>
            </Tooltip>
          )}
          
          {permissions?.move_files && (
            <Tooltip text={t('fileBrowser.move')} position="top">
              <button 
                className="file-browser__toolbar-btn file-browser__toolbar-btn--move"
                onClick={() => openPathModalWithNames('move', selectedFiles)}
              >
                <Move size={20} />
              </button>
            </Tooltip>
          )}
          
          {permissions?.copy_files && (
            <Tooltip text={t('fileBrowser.copy')} position="top">
              <button 
                className="file-browser__toolbar-btn file-browser__toolbar-btn--copy"
                onClick={() => openPathModalWithNames('copy', selectedFiles)}
              >
                <Copy size={20} />
              </button>
            </Tooltip>
          )}
          
          {permissions?.delete_files && (
            <Tooltip text={t('fileBrowser.delete')} position="top">
              <button 
                className="file-browser__toolbar-btn file-browser__toolbar-btn--delete"
                onClick={() => setBatchDeleteDialog({ visible: true, names: selectedFiles })}
              >
                <Trash2 size={20} />
              </button>
            </Tooltip>
          )}

          {permissions?.allow_direct_link && (
            <Tooltip text={t('fileBrowser.copyLink')} position="top">
              <button 
                className="file-browser__toolbar-btn file-browser__toolbar-btn--link"
                onClick={async () => {
                  // 批量获取直链
                  const links: string[] = []
                  for (const name of selectedFiles) {
                    const filePath = currentPath ? `/${currentPath}/${name}` : `/${name}`
                    try {
                      const res = await api.post('/api/fs/get_direct_link', { path: filePath })
                      if (res.data.code === 200) {
                        // Use URL directly from backend / 直接使用后端返回的URL
                        links.push(res.data.data.url)
                      }
                    } catch {}
                  }
                  if (links.length > 0) {
                    await navigator.clipboard.writeText(links.join('\n'))
                    toast.success(t('fileBrowser.copyLinkSuccess', { count: links.length }))
                  } else {
                    toast.error(t('fileBrowser.getLinkFailed'))
                  }
                }}
              >
                <Link2 size={20} />
              </button>
            </Tooltip>
          )}

          <Tooltip text={selectedFiles.length > 1 ? t('fileBrowser.batchDownload') : t('fileBrowser.download')} position="top">
            <button 
              className={`file-browser__toolbar-btn file-browser__toolbar-btn--download ${isPackaging ? 'loading' : ''}`}
              disabled={isPackaging}
              onClick={async () => {
              if (selectedFiles.length === 0) return
              
              // 单个非目录文件直接下载
              if (selectedFiles.length === 1) {
                const name = selectedFiles[0]
                const file = files.find(f => f.name === name)
                if (file && !file.is_dir) {
                  const filePath = currentPath ? `/${currentPath}/${name}` : `/${name}`
                  try {
                    const res = await api.post('/api/fs/get_download_url', { path: filePath })
                    if (res.data.code === 200) {
                      window.open(res.data.data.url, '_blank')
                    }
                  } catch {}
                  return
                }
              }

              // 多文件打包下载
              setIsPackaging(true)
              toast.info(t('fileBrowser.packagingWarning'))

              try {
                const zip = new JSZip()
                
                // 递归获取文件夹内所有文件
                const fetchFolderFiles = async (folderPath: string): Promise<{name: string, path: string}[]> => {
                  const result: {name: string, path: string}[] = []
                  try {
                    const response = await api.post('/api/fs/list', { 
                      path: folderPath,
                      page: 1,
                      per_page: 1000
                    })
                    if (response.data.code === 200) {
                      const items = response.data.data.content || []
                      for (const item of items) {
                        const itemPath = `${folderPath}/${item.name}`
                        if (item.is_dir) {
                          const subFiles = await fetchFolderFiles(itemPath)
                          result.push(...subFiles)
                        } else {
                          result.push({ name: item.name, path: itemPath })
                        }
                      }
                    }
                  } catch (err) {
                    console.error(`Failed to fetch folder ${folderPath}:`, err)
                  }
                  return result
                }

                // 收集所有要下载的文件
                const allFiles: {name: string, path: string, zipPath: string}[] = []
                const basePath = currentPath ? `/${currentPath}` : ''
                
                for (const name of selectedFiles) {
                  const file = files.find(f => f.name === name)
                  const itemPath = `${basePath}/${name}`
                  
                  if (file?.is_dir) {
                    const folderFiles = await fetchFolderFiles(itemPath)
                    for (const f of folderFiles) {
                      const relativePath = f.path.substring(itemPath.length).replace(/^\//, '')
                      allFiles.push({ 
                        name: f.name, 
                        path: f.path,
                        zipPath: `${name}/${relativePath}`
                      })
                    }
                  } else {
                    allFiles.push({ name, path: itemPath, zipPath: name })
                  }
                }

                if (allFiles.length === 0) {
                  toast.info(t('fileBrowser.noFilesToDownload'))
                  setIsPackaging(false)
                  return
                }

                // 逐个获取文件并添加到ZIP
                for (const file of allFiles) {
                  try {
                    const res = await api.post('/api/fs/get_download_url', { path: file.path })
                    if (res.data.code === 200) {
                      const fileResponse = await fetch(res.data.data.url)
                      const blob = await fileResponse.blob()
                      zip.file(file.zipPath, blob)
                    }
                  } catch (err) {
                    console.error(`Failed to download ${file.name}:`, err)
                  }
                }

                // 生成ZIP文件
                const content = await zip.generateAsync({ type: 'blob' })
                
                // 触发下载
                const downloadUrl = URL.createObjectURL(content)
                const a = document.createElement('a')
                a.href = downloadUrl
                a.download = `${currentPath?.split('/').pop() || 'files'}_${new Date().toISOString().slice(0, 10)}.zip`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(downloadUrl)

                toast.success(t('fileBrowser.downloadComplete'))
              } catch (err) {
                toast.error(t('fileBrowser.packageFailed'))
              } finally {
                setIsPackaging(false)
              }
            }}
          >
              {isPackaging ? <Loader2 size={20} className="spinning" /> : (selectedFiles.length > 1 ? <Package size={20} /> : <Download size={20} />)}
            </button>
          </Tooltip>
          
          <Tooltip text={t('fileBrowser.cancelSelection')} position="top">
            <button 
              className="file-browser__toolbar-btn file-browser__toolbar-btn--cancel"
              onClick={() => {
                setSelectionMode(false)
                setSelectedFiles([])
              }}
            >
              <X size={20} />
            </button>
          </Tooltip>
        </div>
      )}

      {/* 新建文件夹对话框 */}
      {mkdirDialog.visible && createPortal(
        <div className="file-browser__dialog-overlay" onClick={() => setMkdirDialog({ visible: false, name: '' })}>
          <div className="file-browser__dialog" onClick={e => e.stopPropagation()}>
            <h3 className="file-browser__dialog-title">{t('fileBrowser.newFolder')}</h3>
            <input
              type="text"
              className="file-browser__dialog-input"
              value={mkdirDialog.name}
              onChange={(e) => setMkdirDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('fileBrowser.enterFolderName')}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleMkdir()}
            />
            <div className="file-browser__dialog-actions">
              <button 
                className="file-browser__dialog-btn file-browser__dialog-btn--secondary"
                onClick={() => setMkdirDialog({ visible: false, name: '' })}
              >
                {t('fileBrowser.cancel')}
              </button>
              <button 
                className="file-browser__dialog-btn file-browser__dialog-btn--primary"
                onClick={handleMkdir}
              >
                {t('fileBrowser.create')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 新建文件对话框 */}
      {newFileDialog.visible && createPortal(
        <div className="file-browser__dialog-overlay" onClick={() => setNewFileDialog({ visible: false, name: '' })}>
          <div className="file-browser__dialog" onClick={e => e.stopPropagation()}>
            <h3 className="file-browser__dialog-title">{t('fileBrowser.newFile')}</h3>
            <input
              type="text"
              className="file-browser__dialog-input"
              value={newFileDialog.name}
              onChange={(e) => setNewFileDialog(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('fileBrowser.enterFileName')}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNewFile()}
            />
            <div className="file-browser__dialog-actions">
              <button 
                className="file-browser__dialog-btn file-browser__dialog-btn--secondary"
                onClick={() => setNewFileDialog({ visible: false, name: '' })}
              >
                {t('fileBrowser.cancel')}
              </button>
              <button 
                className="file-browser__dialog-btn file-browser__dialog-btn--primary"
                onClick={handleNewFile}
              >
                {t('fileBrowser.create')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 上传弹窗 */}
      {uploadDialog && createPortal(
        <div className="file-browser__dialog-overlay" onClick={() => setUploadDialog(false)}>
          <div className="file-browser__upload-dialog file-browser__upload-dialog--wide" onClick={e => e.stopPropagation()}>
            <h3 className="file-browser__dialog-title">{t('fileBrowser.uploadFiles')}</h3>
            <div 
              className="file-browser__upload-area"
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault()
                // 支持拖拽文件夹
                const items = e.dataTransfer.items
                if (items) {
                  const files: File[] = []
                  
                  // 递归读取文件夹
                  const readEntry = async (entry: any): Promise<void> => {
                    if (entry.isFile) {
                      return new Promise((resolve) => {
                        entry.file((file: File) => {
                          // 保留文件夹路径
                          Object.defineProperty(file, 'webkitRelativePath', {
                            value: entry.fullPath.substring(1),
                            writable: false
                          })
                          files.push(file)
                          resolve()
                        })
                      })
                    } else if (entry.isDirectory) {
                      const reader = entry.createReader()
                      return new Promise((resolve) => {
                        reader.readEntries(async (entries: any[]) => {
                          for (const entry of entries) {
                            await readEntry(entry)
                          }
                          resolve()
                        })
                      })
                    }
                  }
                  
                  for (let i = 0; i < items.length; i++) {
                    const item = items[i]
                    if (item.kind === 'file') {
                      const entry = item.webkitGetAsEntry()
                      if (entry) {
                        await readEntry(entry)
                      }
                    }
                  }
                  
                  if (files.length > 0) {
                    const fileList = files as any
                    fileList.length = files.length
                    handleFileUpload(fileList)
                  }
                } else {
                  handleFileUpload(e.dataTransfer.files)
                }
              }}
            >
              <Upload size={40} className="file-browser__upload-icon" />
              <p className="file-browser__upload-text">{t('fileBrowser.dragOrClick')}</p>
              <p className="file-browser__upload-hint">{t('fileBrowser.supportMultiple')}</p>
              
              {/* 上传按钮 */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button 
                  className="file-browser__dialog-btn file-browser__dialog-btn--primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  {t('fileBrowser.uploadFiles')}
                </button>
                <button 
                  className="file-browser__dialog-btn file-browser__dialog-btn--primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    folderInputRef.current?.click()
                  }}
                >
                  {t('fileBrowser.uploadFolder')}
                </button>
              </div>
            </div>
            
            {/* 冲突处理选项 */}
            <div className="file-browser__upload-conflict">
              <div className="file-browser__upload-conflict-label">{t('fileBrowser.ifFileExists')}</div>
              <div className="file-browser__upload-conflict-options">
                <label className="file-browser__upload-conflict-option">
                  <input 
                    type="radio" 
                    name="uploadConflict" 
                    checked={uploadConflictStrategy === 'auto_rename'}
                    onChange={() => setUploadConflictStrategy('auto_rename')}
                  />
                  <span>{t('fileBrowser.autoRename')}</span>
                </label>
                <label className="file-browser__upload-conflict-option">
                  <input 
                    type="radio" 
                    name="uploadConflict" 
                    checked={uploadConflictStrategy === 'overwrite'}
                    onChange={() => setUploadConflictStrategy('overwrite')}
                  />
                  <span>{t('fileBrowser.overwrite')}</span>
                </label>
                <label className="file-browser__upload-conflict-option">
                  <input 
                    type="radio" 
                    name="uploadConflict" 
                    checked={uploadConflictStrategy === 'skip'}
                    onChange={() => setUploadConflictStrategy('skip')}
                  />
                  <span>{t('fileBrowser.skip')}</span>
                </label>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory="true"
              // @ts-ignore
              directory=""
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            
            
            <div className="file-browser__dialog-actions">
              <button 
                className="file-browser__dialog-btn file-browser__dialog-btn--secondary"
                onClick={() => setUploadDialog(false)}
              >
                {t('fileBrowser.close')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* 任务侧边栏 - 始终渲染以保持轮询连接 */}
      <TaskSidebar 
        visible={taskListDialog} 
        onClose={() => setTaskListDialog(false)} 
        alwaysConnect={true}
        onCancelUpload={cancelUploadTask}
      />

      {/* 解压缩弹窗 */}
      <ExtractDialog
        visible={extractDialog.visible}
        fileName={extractDialog.fileName}
        sourcePath={currentPath ? `/${currentPath}` : '/'}
        onClose={() => setExtractDialog({ visible: false, fileName: '' })}
        onSuccess={() => loadFiles(currentPath)}
      />

      {/* 关于弹窗 */}
      {aboutDialog && createPortal(
        <div className="file-browser__dialog-overlay" onClick={() => setAboutDialog(false)}>
          <div className="file-browser__about-dialog" onClick={e => e.stopPropagation()}>
            <img src={siteIcon} alt={siteTitle} className="file-browser__about-logo" />
            <h2 className="file-browser__about-title">{siteTitle}</h2>
            {siteDescription && (
              <p className="file-browser__about-desc">{siteDescription}</p>
            )}
            <div className="file-browser__about-info">
              <span>Powered by YaoList</span>
            </div>
            <button 
              className="file-browser__dialog-btn file-browser__dialog-btn--primary"
              onClick={() => setAboutDialog(false)}
            >
              {t('fileBrowser.close')}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 搜索弹窗 */}
      {showSearchModal && createPortal(
        <div className="file-browser__search-modal-overlay" onClick={closeSearchModal}>
          <div className="file-browser__search-modal" onClick={e => e.stopPropagation()}>
            <div className="file-browser__search-modal-header">
              <div className="file-browser__search-modal-input-wrapper">
                <Search size={20} className="file-browser__search-modal-icon" />
                <input
                  ref={searchModalInputRef}
                  type="text"
                  className="file-browser__search-modal-input"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    className="file-browser__search-modal-clear"
                    onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button className="file-browser__search-modal-close" onClick={closeSearchModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="file-browser__search-modal-body" ref={searchResultsRef}>
              {/* 搜索类型筛选和统计 */}
              {(searchResults.length > 0 || searchQuery) && !isSearching && (
                <div className="file-browser__search-modal-filters">
                  <div className="file-browser__search-modal-filter-btns">
                    <button 
                      className={`file-browser__search-modal-filter-btn ${searchType === 'all' ? 'active' : ''}`}
                      onClick={() => { setSearchType('all'); if (searchQuery) handleSearch(1, 'all') }}
                    >
                      {t('search.all')}
                    </button>
                    <button 
                      className={`file-browser__search-modal-filter-btn ${searchType === 'file' ? 'active' : ''}`}
                      onClick={() => { setSearchType('file'); if (searchQuery) handleSearch(1, 'file') }}
                    >
                      {t('search.filesOnly')}
                    </button>
                    <button 
                      className={`file-browser__search-modal-filter-btn ${searchType === 'folder' ? 'active' : ''}`}
                      onClick={() => { setSearchType('folder'); if (searchQuery) handleSearch(1, 'folder') }}
                    >
                      {t('search.foldersOnly')}
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <span className="file-browser__search-modal-stats">
                      {t('search.resultsFound', { count: searchTotalMatched, time: searchTime.toFixed(2) })}
                    </span>
                  )}
                </div>
              )}
              
              {isSearching ? (
                <div className="file-browser__search-modal-loading">
                  <Loader2 size={32} className="file-browser__spinning" />
                  <span>{t('search.searching')}</span>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="file-browser__search-modal-results">
                    {searchResults.map((item, idx) => {
                      const { icon: Icon, color } = getFileIcon(item.name, item.is_dir)
                      const modifiedDate = item.modified || '-'
                      return (
                        <div 
                          key={idx} 
                          className="file-browser__search-modal-item"
                          onClick={() => {
                            closeSearchModal()
                            if (item.is_dir) {
                              navigate(item.path)
                            } else {
                              const dir = item.path.substring(0, item.path.lastIndexOf('/')) || '/'
                              navigate(dir)
                            }
                          }}
                        >
                          <Icon size={24} style={{ color, flexShrink: 0 }} />
                          <div className="file-browser__search-modal-item-info">
                            <span className="file-browser__search-modal-item-name">
                              {highlightText(item.name, searchQuery)}
                            </span>
                            <span className="file-browser__search-modal-item-path">{item.path}</span>
                          </div>
                          <span className="file-browser__search-modal-item-meta">
                            {item.is_dir ? t('fileBrowser.folder') : formatSize(item.size)}
                          </span>
                          <span className="file-browser__search-modal-item-date">
                            {modifiedDate}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {(() => {
                    const totalPages = Math.ceil(searchTotalMatched / 50)
                    if (totalPages <= 1) return null
                    const pages: (number | string)[] = []
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i)
                    } else {
                      pages.push(1)
                      if (searchPage > 3) pages.push('...')
                      for (let i = Math.max(2, searchPage - 1); i <= Math.min(totalPages - 1, searchPage + 1); i++) {
                        pages.push(i)
                      }
                      if (searchPage < totalPages - 2) pages.push('...')
                      pages.push(totalPages)
                    }
                    return (
                      <div className="file-browser__search-modal-pagination">
                        <div className="file-browser__search-modal-page-dropdown-wrapper">
                          <button 
                            className="file-browser__search-modal-page-dropdown-trigger"
                            onClick={() => setShowPageDropdown(!showPageDropdown)}
                          >
                            {searchPage}
                            <ChevronDown size={14} className={showPageDropdown ? 'rotated' : ''} />
                          </button>
                          {showPageDropdown && (
                            <div className="file-browser__search-modal-page-dropdown">
                              {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                  key={i + 1}
                                  className={`file-browser__search-modal-page-dropdown-item ${searchPage === i + 1 ? 'active' : ''}`}
                                  onClick={() => {
                                    handleSearch(i + 1)
                                    setShowPageDropdown(false)
                                  }}
                                >
                                  {i + 1}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {pages.map((p, i) => (
                          p === '...' ? (
                            <span key={`ellipsis-${i}`} className="file-browser__search-modal-page-ellipsis">...</span>
                          ) : (
                            <button
                              key={p}
                              className={`file-browser__search-modal-page-num ${searchPage === p ? 'active' : ''}`}
                              onClick={() => handleSearch(p as number)}
                              disabled={isSearching}
                            >
                              {p}
                            </button>
                          )
                        ))}
                        <button 
                          className="file-browser__search-modal-page-btn"
                          onClick={() => handleSearch(searchPage + 1)}
                          disabled={searchPage >= totalPages || isSearching}
                        >
                          &gt;
                        </button>
                        <span className="file-browser__search-modal-page-total">{totalPages}</span>
                      </div>
                    )
                  })()}
                </>
              ) : searchQuery ? (
                <div className="file-browser__search-modal-empty">
                  <Search size={48} className="file-browser__search-modal-empty-icon" />
                  <span>{t('search.noResults')}</span>
                </div>
              ) : (
                <div className="file-browser__search-modal-hint">
                  <Search size={48} className="file-browser__search-modal-hint-icon" />
                  <span>{t('search.hint')}</span>
                  <span className="file-browser__search-modal-shortcut">Ctrl + F</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 用户设置侧边栏 */}
      <UserSettingsSidebar 
        visible={userSettingsDialog} 
        onClose={() => setUserSettingsDialog(false)}
        permissions={permissions}
      />

      {/* 页面底部 */}
      <div className="file-browser__page-footer">
        <a 
          href="https://github.com/ChuYao233/YaoList" 
          target="_blank" 
          rel="noopener noreferrer"
          className="file-browser__page-footer-link"
        >
          <span id="vara-container" className="file-browser__vara-container"></span>
        </a>
        <span className="file-browser__page-footer-sep">|</span>
        {isLoggedIn ? (
          <a 
            href="#" 
            className="file-browser__page-footer-link"
            onClick={(e) => { e.preventDefault(); setUserSettingsDialog(true) }}
          >
            {t('userSettings.title')}
          </a>
        ) : (
          <a href="/login" className="file-browser__page-footer-link">{t('login.loginButton')}</a>
        )}
      </div>
    </div>
  )
}
