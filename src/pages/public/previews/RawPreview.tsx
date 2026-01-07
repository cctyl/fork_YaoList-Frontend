import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './previews.scss'

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface RawPreviewProps {
  file: FileItem
  url: string
}

// RAW 格式到 MIME 类型映射
const RAW_FORMATS: Record<string, string> = {
  'cr2': 'Canon CR2',
  'cr3': 'Canon CR3',
  'nef': 'Nikon NEF',
  'nrw': 'Nikon NRW',
  'arw': 'Sony ARW',
  'srf': 'Sony SRF',
  'sr2': 'Sony SR2',
  'orf': 'Olympus ORF',
  'rw2': 'Panasonic RW2',
  'raf': 'Fujifilm RAF',
  'pef': 'Pentax PEF',
  'dng': 'Adobe DNG',
  'raw': 'RAW',
  '3fr': 'Hasselblad 3FR',
  'iiq': 'Phase One IIQ',
  'srw': 'Samsung SRW',
  'x3f': 'Sigma X3F',
  'kdc': 'Kodak KDC',
  'dcr': 'Kodak DCR',
  'rwl': 'Leica RWL',
  'mrw': 'Minolta MRW',
}

// 获取文件扩展名
const getExt = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export default function RawPreview({ file, url }: RawPreviewProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const ext = getExt(file.name)
  const formatName = RAW_FORMATS[ext] || 'RAW'

  useEffect(() => {
    let cancelled = false

    const loadRaw = async () => {
      setLoading(true)
      setError(null)
      setProgress(0)

      try {
        // 首先尝试 Range 请求，只下载前 8MB（嵌入的 JPEG 通常在文件头部）
        // 这可以大大加快大文件的预览速度
        const INITIAL_CHUNK_SIZE = 8 * 1024 * 1024 // 8MB
        
        setProgress(10)
        
        // 尝试 Range 请求
        let response = await fetch(url, {
          headers: { 'Range': `bytes=0-${INITIAL_CHUNK_SIZE - 1}` }
        })
        
        // 如果服务器不支持 Range 请求，回退到完整下载
        const supportsRange = response.status === 206
        
        if (!supportsRange) {
          response = await fetch(url)
        }
        
        if (!response.ok && response.status !== 206) {
          throw new Error('Failed to fetch RAW file')
        }

        setProgress(30)

        const buffer = new Uint8Array(await response.arrayBuffer())
        
        if (cancelled) return
        setProgress(60)

        // 尝试从 RAW 文件中提取嵌入的 JPEG 缩略图
        let jpegData = extractEmbeddedJpeg(buffer)
        
        // 如果在前 8MB 没找到完整的 JPEG，且支持 Range 请求，尝试下载更多
        if (!jpegData && supportsRange) {
          setProgress(70)
          // 下载完整文件
          const fullResponse = await fetch(url)
          if (fullResponse.ok) {
            const fullBuffer = new Uint8Array(await fullResponse.arrayBuffer())
            if (!cancelled) {
              jpegData = extractEmbeddedJpeg(fullBuffer)
            }
          }
        }
        
        if (jpegData && !cancelled) {
          setProgress(90)
          const blob = new Blob([new Uint8Array(jpegData)], { type: 'image/jpeg' })
          const objectUrl = URL.createObjectURL(blob)
          setImageUrl(objectUrl)
          setProgress(100)
          setLoading(false)
          return
        }

        // 如果没有找到嵌入的 JPEG
        if (!cancelled) {
          setError(t('preview.rawExtractFailed'))
          setLoading(false)
        }

      } catch (err) {
        if (!cancelled) {
          console.error('RAW preview error:', err)
          setError(err instanceof Error ? err.message : 'Failed to load RAW file')
          setLoading(false)
        }
      }
    }

    loadRaw()

    return () => {
      cancelled = true
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [url])

  // 清理 URL
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  return (
    <div className="preview preview--raw">
      <div className="preview__raw-container">
        {loading && (
          <div className="preview__loading">
            <div className="preview__loading-spinner" />
            <span>{t('preview.parsingRaw', { format: formatName, progress })}</span>
            <div className="preview__progress">
              <div className="preview__progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        
        {error && (
          <div className="preview__error">
            <span>{error}</span>
            <p className="preview__error-hint">
              {t('preview.rawDownloadHint')}
            </p>
          </div>
        )}

        {imageUrl && !loading && !error && (
          <img
            src={imageUrl}
            alt={file.name}
            className="preview__image"
            style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 200px)', objectFit: 'contain' }}
          />
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  )
}

// 从 RAW 文件中提取嵌入的 JPEG
function extractEmbeddedJpeg(data: Uint8Array): Uint8Array | null {
  // JPEG 标记: FFD8 (开始) 和 FFD9 (结束)
  const jpegStart = findSequence(data, [0xFF, 0xD8, 0xFF])
  if (jpegStart === -1) return null

  // 查找 JPEG 结束标记
  let jpegEnd = -1
  for (let i = jpegStart + 3; i < data.length - 1; i++) {
    if (data[i] === 0xFF && data[i + 1] === 0xD9) {
      jpegEnd = i + 2
      // 继续查找，因为可能有多个 JPEG（缩略图和全尺寸预览）
      // 我们想要最大的那个
    }
  }

  if (jpegEnd === -1) return null

  // 提取最大的 JPEG（通常是全尺寸预览）
  // 先找所有 JPEG 的位置
  const jpegs: { start: number; end: number; size: number }[] = []
  let searchStart = 0

  while (searchStart < data.length - 3) {
    const start = findSequence(data, [0xFF, 0xD8, 0xFF], searchStart)
    if (start === -1) break

    // 找到对应的结束标记
    let end = -1
    for (let i = start + 3; i < data.length - 1; i++) {
      if (data[i] === 0xFF && data[i + 1] === 0xD9) {
        end = i + 2
        break
      }
    }

    if (end !== -1) {
      jpegs.push({ start, end, size: end - start })
    }

    searchStart = start + 1
  }

  if (jpegs.length === 0) return null

  // 选择最大的 JPEG（通常是全尺寸预览）
  const largest = jpegs.reduce((max, curr) => curr.size > max.size ? curr : max)
  
  // 如果 JPEG 太小（< 10KB），可能只是缩略图，但仍然返回
  return data.slice(largest.start, largest.end)
}

// 在数据中查找字节序列
function findSequence(data: Uint8Array, sequence: number[], startFrom: number = 0): number {
  outer: for (let i = startFrom; i <= data.length - sequence.length; i++) {
    for (let j = 0; j < sequence.length; j++) {
      if (data[i + j] !== sequence[j]) continue outer
    }
    return i
  }
  return -1
}
