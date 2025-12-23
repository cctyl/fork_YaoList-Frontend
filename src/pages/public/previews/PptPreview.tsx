import { useState, useEffect, useRef } from 'react'
import { Download, Maximize, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './previews.scss'

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface PptPreviewProps {
  file: FileItem
  url: string
}

export default function PptPreview({ file, url }: PptPreviewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [totalSlides, setTotalSlides] = useState(0)
  const filename = file.name

  useEffect(() => {
    if (!url || !containerRef.current) return

    const loadDocument = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // 动态导入pptx-preview
        const pptxPreview = await import('pptx-preview')
        
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch document')
        
        const arrayBuffer = await response.arrayBuffer()
        
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          
          // 使用init方法初始化预览器
          const previewer = pptxPreview.init(containerRef.current, {
            width: 800,
            height: 600,
          })
          
          // 加载文件
          await previewer.preview(arrayBuffer)
          
          // 获取幻灯片数量
          setTimeout(() => {
            if (containerRef.current) {
              const slides = containerRef.current.querySelectorAll('[class*="slide"]')
              setTotalSlides(slides.length || 1)
              setCurrentSlide(1)
            }
          }, 500)
        }
        setLoading(false)
      } catch (err: any) {
        console.error('PPT preview error:', err)
        setError(err.message || t('preview.pptLoadError'))
        setLoading(false)
      }
    }

    loadDocument()
  }, [url, t])

  const scrollToSlide = (slideNum: number) => {
    if (!containerRef.current) return
    const slides = containerRef.current.querySelectorAll('.pptx-preview-slide')
    if (slides[slideNum - 1]) {
      slides[slideNum - 1].scrollIntoView({ behavior: 'smooth', block: 'center' })
      setCurrentSlide(slideNum)
    }
  }

  const handlePrevSlide = () => {
    if (currentSlide > 1) {
      scrollToSlide(currentSlide - 1)
    }
  }

  const handleNextSlide = () => {
    if (currentSlide < totalSlides) {
      scrollToSlide(currentSlide + 1)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const toggleFullscreen = () => {
    const container = document.querySelector('.preview--ppt')
    if (!document.fullscreenElement) {
      container?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (!url) {
    return (
      <div className="preview preview--ppt">
        <div className="preview__ppt-loading">
          <div className="preview__spinner"></div>
          <p>{t('preview.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="preview preview--ppt">
      {/* 工具栏 */}
      <div className="preview__toolbar">
        <div className="preview__toolbar-group">
          <button 
            className="preview__toolbar-btn" 
            onClick={handlePrevSlide} 
            disabled={currentSlide <= 1}
            title={t('preview.prevPage')}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="preview__toolbar-text">
            {totalSlides > 0 ? `${currentSlide} / ${totalSlides}` : '-'}
          </span>
          <button 
            className="preview__toolbar-btn" 
            onClick={handleNextSlide} 
            disabled={currentSlide >= totalSlides}
            title={t('preview.nextPage')}
          >
            <ChevronRight size={18} />
          </button>
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

      {/* PPT 容器 */}
      <div className="preview__ppt-container">
        {loading && (
          <div className="preview__ppt-loading">
            <div className="preview__spinner"></div>
            <p>{t('preview.loading')}</p>
          </div>
        )}
        {error && (
          <div className="preview__ppt-error">
            <p>{error}</p>
          </div>
        )}
        <div 
          ref={containerRef} 
          className="preview__ppt-content"
          style={{ display: loading || error ? 'none' : 'block' }}
        />
      </div>
    </div>
  )
}
