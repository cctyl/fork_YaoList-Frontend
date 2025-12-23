// 文件预览器索引
// 参照 OpenList 实现

import { lazy } from 'react'

// 文件类型枚举
export enum FileType {
  UNKNOWN = 0,
  FOLDER = 1,
  VIDEO = 2,
  AUDIO = 3,
  TEXT = 4,
  IMAGE = 5,
  DOCUMENT = 6,
}

// 根据扩展名获取文件类型
export function getFileType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  
  // 图片（包括 RAW 格式）
  const imageFormats = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'heic', 'heif', 'tiff', 'tif', 'avif', 'jxl',
    // RAW 格式
    'cr2', 'cr3',        // Canon
    'nef', 'nrw',        // Nikon
    'arw', 'srf', 'sr2', // Sony
    'orf',               // Olympus
    'rw2',               // Panasonic
    'raf',               // Fujifilm
    'pef', 'ptx',        // Pentax
    'dng',               // Adobe DNG
    'raw', '3fr',        // Hasselblad
    'iiq',               // Phase One
    'erf',               // Epson
    'srw',               // Samsung
    'x3f',               // Sigma
    'kdc', 'dcr',        // Kodak
    'rwl',               // Leica
    'mos',               // Leaf
    'mrw',               // Minolta
    'hdr', 'exr',        // HDR 格式
  ]
  if (imageFormats.includes(ext)) {
    return FileType.IMAGE
  }
  
  // 视频
  if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpeg', 'mpg', '3gp', 'ts', 'm3u8'].includes(ext)) {
    return FileType.VIDEO
  }
  
  // 音频（包括私有加密格式）
  const audioFormats = [
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'ape', 'alac', 'aiff', 'opus',
    // 网易云音乐
    'ncm',
    // QQ 音乐
    'qmc0', 'qmc2', 'qmc3', 'qmcflac', 'qmcogg', 'mflac', 'mflac0', 'mgg', 'mgg1',
    // 酷狗音乐
    'kgm', 'kgma',
    // 酷我音乐
    'vpr', 'kwm'
  ]
  if (audioFormats.includes(ext)) {
    return FileType.AUDIO
  }
  
  // 文本/代码
  const textFormats = [
    // 文本
    'txt', 'log', 'csv',
    // 配置
    'json', 'xml', 'yaml', 'yml', 'ini', 'conf', 'config', 'toml', 'env',
    // 前端
    'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'vue', 'svelte',
    // 后端
    'py', 'pyw', 'rb', 'php', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'hxx', 'cs', 'go', 'rs', 'swift', 'kt', 'kts', 'scala',
    // 脚本
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'bat', 'cmd',
    // 数据库/查询
    'sql',
    // 其他语言
    'r', 'lua', 'pl', 'pm', 'ex', 'exs', 'clj', 'hs', 'ml', 'fs', 'nim', 'zig', 'd', 'v',
    // 标记语言
    'md', 'markdown', 'rst', 'tex', 'adoc',
    // 特殊文件
    'gitignore', 'dockerignore', 'editorconfig', 'prettierrc', 'eslintrc', 'babelrc',
    'makefile', 'dockerfile', 'vagrantfile', 'gemfile', 'rakefile',
  ]
  if (textFormats.includes(ext)) {
    return FileType.TEXT
  }
  
  // 特殊文件名（无扩展名）
  const specialFiles = ['dockerfile', 'makefile', 'gemfile', 'rakefile', 'vagrantfile', '.gitignore', '.dockerignore', '.env']
  if (specialFiles.includes(filename.toLowerCase())) {
    return FileType.TEXT
  }
  
  // 文档
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext)) {
    return FileType.DOCUMENT
  }
  
  return FileType.UNKNOWN
}

// 预览器配置
export interface PreviewConfig {
  name: string
  type?: FileType
  exts?: string[]
  component: React.LazyExoticComponent<React.ComponentType<any>>
}

// 下载预览器（所有文件都有）
const DownloadPreview = lazy(() => import('./DownloadPreview'))

// 预览器列表（使用翻译键）
export const previews: PreviewConfig[] = [
  {
    name: 'previewType.image',
    type: FileType.IMAGE,
    component: lazy(() => import('./ImagePreview')),
  },
  {
    name: 'previewType.video',
    type: FileType.VIDEO,
    component: lazy(() => import('./VideoPreview')),
  },
  {
    name: 'previewType.audio',
    type: FileType.AUDIO,
    component: lazy(() => import('./AudioPreview')),
  },
  {
    name: 'previewType.text',
    type: FileType.TEXT,
    component: lazy(() => import('./TextPreview')),
  },
  {
    name: 'previewType.pdf',
    exts: ['pdf'],
    component: lazy(() => import('./PdfPreview')),
  },
  {
    name: 'previewType.psd',
    exts: ['psd', 'psb'],
    component: lazy(() => import('./PsdPreview')),
  },
  {
    name: 'previewType.word',
    exts: ['doc', 'docx', 'odt'],
    component: lazy(() => import('./WordPreview')),
  },
  {
    name: 'previewType.excel',
    exts: ['xls', 'xlsx', 'ods', 'csv'],
    component: lazy(() => import('./ExcelPreview')),
  },
  {
    name: 'previewType.ppt',
    exts: ['ppt', 'pptx', 'odp'],
    component: lazy(() => import('./PptPreview')),
  },
  {
    name: 'previewType.markdown',
    exts: ['md', 'markdown'],
    component: lazy(() => import('./MarkdownPreview')),
  },
  {
    name: 'previewType.html',
    exts: ['html', 'htm'],
    component: lazy(() => import('./HtmlPreview')),
  },
  {
    name: 'previewType.archive',
    exts: ['zip', 'jar', 'apk', 'ipa', 'epub'],
    component: lazy(() => import('./ArchivePreview')),
  },
]

// 音频格式列表（导出供其他组件使用）
export const audioExtensions = [
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'ape', 'alac', 'aiff', 'opus',
  'ncm', 'qmc0', 'qmc2', 'qmc3', 'qmcflac', 'qmcogg', 'mflac', 'mflac0', 'mgg', 'mgg1',
  'kgm', 'kgma', 'vpr', 'kwm'
]

// 视频格式列表（导出供其他组件使用）
export const videoExtensions = [
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpeg', 'mpg', '3gp', 'ts', 'm3u8'
]

// 加密音频格式
const encryptedAudioFormats = [
  'ncm',
  'qmc0', 'qmc2', 'qmc3', 'qmcflac', 'qmcogg', 'mflac', 'mflac0', 'mgg', 'mgg1',
  'kgm', 'kgma',
  'vpr', 'kwm'
]

// 检查是否为加密音频格式
export function isEncryptedAudioFormat(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return encryptedAudioFormats.includes(ext)
}

// 获取文件的预览器（所有文件都包含"下载"预览）
// allowEncryptedAudio: 是否允许加密音频预览（需要后台开启）
export function getPreviewers(filename: string, allowEncryptedAudio: boolean = false): PreviewConfig[] {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const fileType = getFileType(filename)
  const isEncrypted = isEncryptedAudioFormat(filename)
  
  const result: PreviewConfig[] = []
  
  for (const preview of previews) {
    // 优先匹配扩展名
    if (preview.exts && preview.exts.includes(ext)) {
      result.push(preview)
    }
    // 然后匹配类型
    else if (preview.type === fileType) {
      // 如果是加密音频且未开启加密预览，跳过音频预览器
      if (isEncrypted && preview.type === FileType.AUDIO && !allowEncryptedAudio) {
        continue
      }
      result.push(preview)
    }
  }
  
  // 所有文件都添加"下载"预览
  result.push({
    name: 'previewType.download',
    component: DownloadPreview,
  })
  
  return result
}

// 获取默认预览器
export function getDefaultPreviewer(filename: string): PreviewConfig | null {
  const previewers = getPreviewers(filename)
  return previewers[0] || null
}
