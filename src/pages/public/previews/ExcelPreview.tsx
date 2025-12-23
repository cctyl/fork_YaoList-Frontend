import { useState, useEffect, useRef } from 'react'
import { Download, Maximize } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import Spreadsheet from 'x-data-spreadsheet'
import 'x-data-spreadsheet/dist/xspreadsheet.css'
import './previews.scss'

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface ExcelPreviewProps {
  file: FileItem
  url: string
}

// 将xlsx数据转换为x-spreadsheet格式
function xlsxToSpreadsheet(wb: XLSX.WorkBook) {
  const result: any[] = []
  
  wb.SheetNames.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName]
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
    
    const rows: any = {}
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells: any = {}
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c })
        const cell = sheet[cellRef]
        if (cell) {
          cells[c] = { text: cell.v?.toString() || '' }
        }
      }
      if (Object.keys(cells).length > 0) {
        rows[r] = { cells }
      }
    }
    
    result.push({
      name: sheetName,
      rows,
      cols: { len: range.e.c + 1 },
    })
  })
  
  return result
}

export default function ExcelPreview({ file, url }: ExcelPreviewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const spreadsheetRef = useRef<any>(null)
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
        
        const arrayBuffer = await response.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: 'array' })
        
        // 清空容器
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          
          // 创建spreadsheet实例，使用固定高度
          const data = xlsxToSpreadsheet(wb)
          spreadsheetRef.current = new Spreadsheet(containerRef.current, {
            mode: 'read',
            showToolbar: false,
            showGrid: true,
            showContextmenu: false,
            view: {
              height: () => window.innerHeight - 300,
              width: () => containerRef.current?.clientWidth || 800,
            },
          }).loadData(data)
        }
        
        setLoading(false)
      } catch (err: any) {
        setError(err.message || t('preview.excelLoadError'))
        setLoading(false)
      }
    }

    loadDocument()
    
    return () => {
      spreadsheetRef.current = null
    }
  }, [url, t])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const toggleFullscreen = () => {
    const container = document.querySelector('.preview--excel')
    if (!document.fullscreenElement) {
      container?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (!url) {
    return (
      <div className="preview preview--excel">
        <div className="preview__excel-loading">
          <div className="preview__spinner"></div>
          <p>{t('preview.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="preview preview--excel">
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

      {/* Excel 容器 */}
      <div className="preview__excel-container">
        {loading && (
          <div className="preview__excel-loading">
            <div className="preview__spinner"></div>
            <p>{t('preview.loading')}</p>
          </div>
        )}
        {error && (
          <div className="preview__excel-error">
            <p>{error}</p>
          </div>
        )}
        <div 
          ref={containerRef} 
          className="preview__excel-spreadsheet"
          style={{ display: loading || error ? 'none' : 'block', width: '100%', height: 'calc(100vh - 280px)', minHeight: '500px' }}
        />
      </div>
    </div>
  )
}
