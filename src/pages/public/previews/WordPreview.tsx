import { useState, useEffect, useRef } from 'react'
import { Download, Maximize } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { renderAsync } from 'docx-preview'
import './previews.scss'

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface WordPreviewProps {
  file: FileItem
  url: string
}

export default function WordPreview({ file, url }: WordPreviewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filename = file.name

  useEffect(() => {
    if (!url || !containerRef.current) return

    const loadDocument = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch document')
        
        const blob = await response.blob()
        
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          await renderAsync(blob, containerRef.current, undefined, {
            className: 'docx-preview-wrapper',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true,
          })
        }
        setLoading(false)
      } catch (err: any) {
        setError(err.message || t('preview.wordLoadError'))
        setLoading(false)
      }
    }

    loadDocument()
  }, [url, t])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const toggleFullscreen = () => {
    const container = document.querySelector('.preview--word')
    if (!document.fullscreenElement) {
      container?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (!url) {
    return (
      <div className="preview preview--word">
        <div className="preview__word-loading">
          <div className="preview__spinner"></div>
          <p>{t('preview.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="preview preview--word">
      {/* 工具栏 */}
      <div className="preview__toolbar">
        <div className="preview__toolbar-group">
          <span className="preview__toolbar-text">{filename}</span>
        </div>
        <div className="preview__toolbar-group">
          <button className="preview__toolbar-btn" onClick={handleDownload} title={t('preview.download')}>
            <Download size={18} />
          </button>
          <button className="preview__toolbar-btn" onClick={toggleFullscreen} title={t('preview.fullscreen')}>
            <Maximize size={18} />
          </button>
        </div>
      </div>

      {/* Word 容器 */}
      <div className="preview__word-container">
        {loading && (
          <div className="preview__word-loading">
            <div className="preview__spinner"></div>
            <p>{t('preview.loading')}</p>
          </div>
        )}
        {error && (
          <div className="preview__word-error">
            <p>{error}</p>
          </div>
        )}
        <div 
          ref={containerRef} 
          className="preview__word-content"
          style={{ display: loading || error ? 'none' : 'block' }}
        />
      </div>
    </div>
  )
}
