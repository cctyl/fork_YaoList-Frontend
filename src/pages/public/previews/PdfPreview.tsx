import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Download, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import './previews.scss'

// 配置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface PdfPreviewProps {
  file: FileItem
  url: string
}

export default function PdfPreview({ file, url }: PdfPreviewProps) {
  const { t } = useTranslation()
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const filename = file.name

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }, [])

  const onDocumentLoadError = useCallback(() => {
    // 错误已通过error prop处理
  }, [])

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3.0))
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.5))
  const handlePrevPage = () => setPageNumber(p => Math.max(p - 1, 1))
  const handleNextPage = () => setPageNumber(p => Math.min(p + 1, numPages))

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const toggleFullscreen = () => {
    const container = document.querySelector('.preview--pdf')
    if (!document.fullscreenElement) {
      container?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (!url) {
    return (
      <div className="preview preview--pdf">
        <div className="preview__loading">
          <div className="preview__spinner"></div>
          <p>{t('preview.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="preview preview--pdf">
      {/* 工具栏 */}
      <div className="preview__toolbar">
        <div className="preview__toolbar-group">
          <button 
            className="preview__toolbar-btn" 
            onClick={handlePrevPage} 
            disabled={pageNumber <= 1}
            title={t('preview.prevPage')}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="preview__toolbar-text">
            {pageNumber} / {numPages || '-'}
          </span>
          <button 
            className="preview__toolbar-btn" 
            onClick={handleNextPage} 
            disabled={pageNumber >= numPages}
            title={t('preview.nextPage')}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="preview__toolbar-group">
          <button className="preview__toolbar-btn" onClick={handleZoomOut} title={t('preview.zoomOut')}>
            <ZoomOut size={18} />
          </button>
          <span className="preview__toolbar-text">{Math.round(scale * 100)}%</span>
          <button className="preview__toolbar-btn" onClick={handleZoomIn} title={t('preview.zoomIn')}>
            <ZoomIn size={18} />
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

      {/* PDF 容器 */}
      <div className="preview__pdf-container">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="preview__pdf-loading">
              <div className="preview__spinner"></div>
              <p>{t('preview.loading')}</p>
            </div>
          }
          error={
            <div className="preview__pdf-error">
              <p>{t('preview.pdfLoadError')}</p>
            </div>
          }
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={
              <div className="preview__pdf-page-loading">
                <div className="preview__spinner"></div>
              </div>
            }
          />
        </Document>
      </div>
    </div>
  )
}
