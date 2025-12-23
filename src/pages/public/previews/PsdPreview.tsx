import { useState, useEffect, useRef } from 'react'
import { Download, Maximize } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Psd from '@webtoon/psd'
import './previews.scss'

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface PsdPreviewProps {
  file: FileItem
  url: string
}

export default function PsdPreview({ file, url }: PsdPreviewProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const filename = file.name

  useEffect(() => {
    if (!url) return

    const loadPsd = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch file')

        const arrayBuffer = await response.arrayBuffer()
        const psd = Psd.parse(arrayBuffer)

        setDimensions({ width: psd.width, height: psd.height })

        // 渲染合成图像到canvas
        const composite = await psd.composite()
        
        if (canvasRef.current) {
          const canvas = canvasRef.current
          canvas.width = psd.width
          canvas.height = psd.height
          
          const ctx = canvas.getContext('2d')
          if (ctx) {
            const imageData = ctx.createImageData(psd.width, psd.height)
            imageData.data.set(composite)
            ctx.putImageData(imageData, 0, 0)
          }
        }

        setLoading(false)
      } catch (err: any) {
        console.error('PSD preview error:', err)
        setError(err.message || t('preview.psdLoadError'))
        setLoading(false)
      }
    }

    loadPsd()
  }, [url, t])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const toggleFullscreen = () => {
    const container = document.querySelector('.preview--psd')
    if (!document.fullscreenElement) {
      container?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (!url) {
    return (
      <div className="preview preview--psd">
        <div className="preview__psd-loading">
          <div className="preview__spinner"></div>
          <p>{t('preview.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="preview preview--psd">
      {/* 工具栏 */}
      <div className="preview__toolbar">
        <div className="preview__toolbar-group">
          {dimensions.width > 0 && (
            <span className="preview__toolbar-text">{dimensions.width} × {dimensions.height}</span>
          )}
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

      {/* PSD 容器 */}
      <div className="preview__psd-container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px', minHeight: '400px' }}>
        {loading && (
          <div className="preview__psd-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '300px', width: '100%' }}>
            <div className="preview__spinner"></div>
            <p>{t('preview.loading')}</p>
          </div>
        )}
        {error && (
          <div className="preview__psd-error" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '300px', width: '100%' }}>
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && (
          <canvas
            ref={canvasRef}
            className="preview__psd-canvas"
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 300px)',
              objectFit: 'contain',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
          />
        )}
      </div>
    </div>
  )
}
