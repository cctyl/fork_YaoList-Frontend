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

interface HeicPreviewProps {
  file: FileItem
  url: string
}

// libheif CDN 路径 - 使用更小的 wasm 版本
const LIBHEIF_CDN = 'https://cdn.jsdelivr.net/npm/libheif-js@1.18.2/libheif'

declare global {
  interface Window {
    libheif: any
  }
}

export default function HeicPreview({ file, url }: HeicPreviewProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    const loadHeic = async () => {
      setLoading(true)
      setError(null)
      setProgress(0)

      try {
        // 加载 libheif 库
        setProgress(10)
        if (!window.libheif) {
          await loadScript(`${LIBHEIF_CDN}/libheif.js`, 'libheif-script')
        }

        if (cancelled) return
        setProgress(30)

        // 下载 HEIC 文件
        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to fetch HEIC file')
        
        const buffer = await response.arrayBuffer()
        if (cancelled) return
        setProgress(60)

        // 解码 HEIC
        const decoder = new window.libheif.HeifDecoder()
        const data = decoder.decode(new Uint8Array(buffer))
        
        if (!data || data.length === 0) {
          throw new Error('No images found in HEIC file')
        }

        if (cancelled) return
        setProgress(80)

        // 获取第一张图片
        const image = data[0]
        const width = image.get_width()
        const height = image.get_height()

        // 创建 canvas 并渲染
        const canvas = canvasRef.current
        if (!canvas) throw new Error('Canvas not available')

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Cannot get canvas context')

        const imageData = ctx.createImageData(width, height)
        
        await new Promise<void>((resolve, reject) => {
          image.display(imageData, (displayData: ImageData | null) => {
            if (!displayData) {
              reject(new Error('Failed to decode image'))
              return
            }
            ctx.putImageData(displayData, 0, 0)
            resolve()
          })
        })

        if (cancelled) return
        setProgress(95)

        // 转换为 blob URL
        canvas.toBlob((blob) => {
          if (blob && !cancelled) {
            objectUrl = URL.createObjectURL(blob)
            setImageUrl(objectUrl)
            setProgress(100)
            setLoading(false)
          }
        }, 'image/jpeg', 0.95)

      } catch (err) {
        if (!cancelled) {
          console.error('HEIC preview error:', err)
          setError(err instanceof Error ? err.message : 'Failed to load HEIC file')
          setLoading(false)
        }
      }
    }

    loadHeic()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [url])

  return (
    <div className="preview preview--heic">
      <div className="preview__heic-container">
        {loading && (
          <div className="preview__loading">
            <div className="preview__loading-spinner" />
            <span>{t('preview.decodingHeic', { progress })}</span>
            <div className="preview__progress">
              <div className="preview__progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        
        {error && (
          <div className="preview__error">
            <span>{error}</span>
            <p className="preview__error-hint">
              {t('preview.heicDownloadHint')}
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

// 加载脚本
function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.id = id
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}
