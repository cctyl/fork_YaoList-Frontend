import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ZoomIn, ZoomOut, RotateCw, Download, X, Play } from 'lucide-react'
import './previews.scss'

// libheif CDN 路径
const LIBHEIF_JS_CDN = 'https://cdn.jsdelivr.net/npm/libheif-js@1.19.8/libheif/libheif.js'
const LIBHEIF_WASM_CDN = 'https://cdn.jsdelivr.net/npm/libheif-js@1.19.8/libheif-wasm/libheif.wasm'

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface ImagePreviewProps {
  file: FileItem
  url: string
}

// 获取文件扩展名
const getExt = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

// 检测是否是 HEIC 格式（需要解码）
const isHeicFormat = (filename: string): boolean => {
  const ext = getExt(filename)
  return ['heic', 'heif'].includes(ext)
}

// 检测是否是不支持的 HDR 格式（.hdr, .exr 浏览器不支持）
const isUnsupportedHdrFormat = (filename: string): boolean => {
  const ext = getExt(filename)
  return ['hdr', 'exr'].includes(ext)
}

// 检测是否是 RAW 格式
const isRawFormat = (filename: string): boolean => {
  const ext = getExt(filename)
  return ['cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'orf', 'rw2', 'raf',
    'pef', 'ptx', 'dng', 'raw', '3fr', 'iiq', 'erf', 'srw', 'x3f', 'kdc', 'dcr', 'rwl', 'mos', 'mrw'].includes(ext)
}

// 检测是否需要特殊解码（HEIC 和 RAW）
const needsSpecialDecode = (filename: string): boolean => {
  return isHeicFormat(filename) || isRawFormat(filename)
}

declare global {
  interface Window {
    libheif: any
  }
}

export default function ImagePreview({ file, url }: ImagePreviewProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [decodedUrl, setDecodedUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isLivePhoto, setIsLivePhoto] = useState(false)
  const [liveVideoUrl, setLiveVideoUrl] = useState<string | null>(null)
  const [playingLive, setPlayingLive] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const isHeic = isHeicFormat(file.name)
  const isRaw = isRawFormat(file.name)
  const isUnsupportedHdr = isUnsupportedHdrFormat(file.name)
  const needsDecode = needsSpecialDecode(file.name)

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 5))
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.25))
  const handleRotate = () => setRotation(r => (r + 90) % 360)
  const handleReset = () => { setScale(1); setRotation(0) }

  // 键盘快捷键（仅全屏时）
  useEffect(() => {
    if (!fullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
      else if (e.key === '+' || e.key === '=') handleZoomIn()
      else if (e.key === '-') handleZoomOut()
      else if (e.key === 'r' || e.key === 'R') handleRotate()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fullscreen])

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (e.deltaY < 0) handleZoomIn()
      else handleZoomOut()
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
  }

  // 检测 Live Photo 并提取视频
  useEffect(() => {
    let cancelled = false
    let videoObjectUrl: string | null = null

    const detectLivePhoto = async () => {
      try {
        const response = await fetch(url)
        if (!response.ok) return
        const buffer = await response.arrayBuffer()
        if (cancelled) return

        const data = new Uint8Array(buffer)
        
        // 检测 Live Photo - 查找 MP4 标记 (ftyp)
        const mp4Data = extractLivePhotoVideo(data)
        if (mp4Data) {
          console.log('Live Photo detected, video size:', mp4Data.length)
          setIsLivePhoto(true)
          const videoBlob = new Blob([new Uint8Array(mp4Data)], { type: 'video/mp4' })
          videoObjectUrl = URL.createObjectURL(videoBlob)
          setLiveVideoUrl(videoObjectUrl)
        }
      } catch (err) {
        console.error('Live Photo detection error:', err)
      }
    }

    // 只对 JPEG 文件检测 Live Photo
    const ext = getExt(file.name)
    if (['jpg', 'jpeg'].includes(ext)) {
      detectLivePhoto()
    }

    return () => {
      cancelled = true
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl)
    }
  }, [url, file.name])

  // 处理 HEIC/RAW 解码
  useEffect(() => {
    if (!needsDecode) return

    let cancelled = false
    let objectUrl: string | null = null

    const decodeImage = async () => {
      setLoading(true)
      setError(null)
      setProgress(10)

      try {
        // 下载文件
        const response = await fetch(url)
        if (!response.ok) throw new Error(t('preview.downloadFailed'))
        const buffer = await response.arrayBuffer()
        if (cancelled) return
        setProgress(40)

        let imageBlob: Blob | null = null

        if (isHeic) {
          // HEIC 解码 - 使用 libheif.js
          try {
            imageBlob = await decodeHeicWithLibheif(buffer, canvasRef.current, setProgress)
          } catch (heicErr) {
            console.warn('libheif failed, trying native:', heicErr)
            // 如果 libheif 失败，尝试直接作为 blob 显示（某些浏览器支持）
            imageBlob = new Blob([buffer], { type: 'image/heic' })
          }
          
          // HEIC 也可能是 Live Photo
          const data = new Uint8Array(buffer)
          const mp4Data = extractLivePhotoVideo(data)
          if (mp4Data) {
            setIsLivePhoto(true)
            const videoBlob = new Blob([new Uint8Array(mp4Data)], { type: 'video/mp4' })
            setLiveVideoUrl(URL.createObjectURL(videoBlob))
          }
        } else if (isRaw) {
          // RAW 解码 - 提取嵌入的 JPEG
          setProgress(50)
          const jpegData = extractEmbeddedJpeg(new Uint8Array(buffer))
          if (jpegData) {
            const arrayBuffer = new ArrayBuffer(jpegData.length)
            new Uint8Array(arrayBuffer).set(jpegData)
            imageBlob = new Blob([arrayBuffer], { type: 'image/jpeg' })
            setProgress(90)
          }
        }

        if (cancelled) return

        if (imageBlob) {
          console.log('Image blob created, size:', imageBlob.size, 'type:', imageBlob.type)
          objectUrl = URL.createObjectURL(imageBlob)
          console.log('Object URL created:', objectUrl)
          setDecodedUrl(objectUrl)
          setProgress(100)
          setLoading(false)
        } else {
          throw new Error(t('preview.decodeError'))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('preview.decodeFailed'))
          setLoading(false)
        }
      }
    }

    decodeImage()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, needsDecode, isHeic, isRaw])

  // 清理 URL
  useEffect(() => {
    return () => {
      if (decodedUrl) URL.revokeObjectURL(decodedUrl)
    }
  }, [decodedUrl])

  const imageUrl = needsDecode ? decodedUrl : url
  const showImage = !loading && !error && imageUrl

  // Live Photo 播放/暂停切换
  const handleLiveToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isLivePhoto || !liveVideoUrl || !videoRef.current) return
    
    if (playingLive) {
      setPlayingLive(false)
      videoRef.current.pause()
    } else {
      setPlayingLive(true)
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(console.error)
    }
  }

  // 视频播放结束时重置
  const handleVideoEnded = () => {
    setPlayingLive(false)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }

  return (
    <>
      {/* 普通预览 - 点击进入全屏 */}
      <div 
        className="preview preview--image" 
        onClick={() => showImage && !isLivePhoto && setFullscreen(true)}
      >
        <div className="preview__image-container">
          {loading && (
            <div className="preview__loading">
              <div className="preview__loading-spinner" />
              <span>{needsDecode ? `${t('preview.decoding')} ${progress}%` : t('preview.loading')}</span>
              {needsDecode && (
                <div className="preview__progress">
                  <div className="preview__progress-bar" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="preview__error">
              <span>{error}</span>
              {(isHeic || isRaw) && (
                <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                  {t('preview.formatNotSupported')}
                </p>
              )}
            </div>
          )}
          {/* Live Photo 视频层 */}
          {isLivePhoto && liveVideoUrl && (
            <video
              ref={videoRef}
              src={liveVideoUrl}
              className="preview__live-video"
              style={{ 
                opacity: playingLive ? 1 : 0,
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                zIndex: 2
              }}
              muted
              playsInline
              onEnded={handleVideoEnded}
            />
          )}
          {/* Live Photo 播放按钮 */}
          {isLivePhoto && liveVideoUrl && !loading && !error && !playingLive && (
            <button
              className="preview__play-btn"
              onClick={handleLiveToggle}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s'
              }}
            >
              <Play size={28} fill="white" />
            </button>
          )}
          {!needsDecode && (
            <img
              src={url}
              alt={file.name}
              className="preview__image"
              style={{ opacity: loading || error ? 0 : (playingLive ? 0 : 1), cursor: 'zoom-in' }}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(t('preview.imageLoadFailed')) }}
              draggable={false}
            />
          )}
          {needsDecode && decodedUrl && (
            <img
              src={decodedUrl}
              alt={file.name}
              className="preview__image"
              style={{ cursor: 'zoom-in', opacity: playingLive ? 0 : 1 }}
              draggable={false}
              onError={(e) => {
                console.error('Decoded image load error:', e)
                setError(t('preview.decodedImageLoadFailed'))
              }}
            />
          )}
          {/* Live Photo 标记 */}
          {isLivePhoto && !loading && !error && (
            <div className="preview__format-badge preview__format-badge--live">
              <Play size={12} fill="currentColor" />
              <span>LIVE</span>
            </div>
          )}
          {(isHeic || isRaw || isUnsupportedHdr) && !isLivePhoto && !loading && !error && (
            <div className="preview__format-badge">
              {isUnsupportedHdr ? 'HDR' : isHeic ? 'HEIC' : 'RAW'}
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* 全屏预览 - 使用 Portal 渲染到 body */}
      {fullscreen && imageUrl && createPortal(
        <div className="preview-fullscreen" onClick={() => setFullscreen(false)}>
          {/* 工具栏 */}
          <div className="preview-fullscreen__toolbar" onClick={e => e.stopPropagation()}>
            <button className="preview-fullscreen__btn" onClick={handleZoomOut} title={t('preview.zoomOut')}>
              <ZoomOut size={20} />
            </button>
            <span className="preview-fullscreen__text">{Math.round(scale * 100)}%</span>
            <button className="preview-fullscreen__btn" onClick={handleZoomIn} title={t('preview.zoomIn')}>
              <ZoomIn size={20} />
            </button>
            <button className="preview-fullscreen__btn" onClick={handleRotate} title={t('preview.rotate')}>
              <RotateCw size={20} />
            </button>
            <div className="preview-fullscreen__divider" />
            <button className="preview-fullscreen__btn" onClick={handleDownload} title={t('preview.download')}>
              <Download size={20} />
            </button>
            <button className="preview-fullscreen__btn" onClick={() => setFullscreen(false)} title={t('preview.close')}>
              <X size={20} />
            </button>
          </div>

          {/* 图片 */}
          <div className="preview-fullscreen__content" onWheel={handleWheel} onClick={e => e.stopPropagation()}>
            <img
              src={imageUrl}
              alt={file.name}
              style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
              draggable={false}
              onDoubleClick={handleReset}
            />
          </div>

          {/* 文件名 */}
          <div className="preview-fullscreen__filename">{file.name}</div>
        </div>,
        document.body
      )}
    </>
  )
}

// 加载脚本
const loadScript = (src: string, id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.id = id
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Script load failed: ${src}`))
    document.head.appendChild(script)
  })
}

// HEIC 解码函数 - 使用 libheif.js
async function decodeHeicWithLibheif(
  buffer: ArrayBuffer,
  canvas: HTMLCanvasElement | null,
  onProgress: (p: number) => void
): Promise<Blob | null> {
  onProgress(30)
  
  try {
    // 动态加载 libheif.js
    if (!window.libheif) {
      await loadScript(LIBHEIF_JS_CDN, 'libheif-script')
    }
    onProgress(40)
    
    // 加载 WASM
    const wasmResponse = await fetch(LIBHEIF_WASM_CDN)
    if (!wasmResponse.ok) throw new Error('WASM load failed')
    const wasmBinary = await wasmResponse.arrayBuffer()
    onProgress(50)
    
    // 初始化 libheif
    const libheif = window.libheif({ wasmBinary })
    const decoder = new libheif.HeifDecoder()
    onProgress(60)
    
    // 解码
    const images = decoder.decode(buffer)
    if (!images || images.length === 0) {
      throw new Error('No decodable image')
    }
    onProgress(70)
    
    const image = images[0]
    const width = image.get_width()
    const height = image.get_height()
    
    // 使用 canvas 渲染
    if (!canvas) {
      canvas = document.createElement('canvas')
    }
    canvas.width = width
    canvas.height = height
    
    const imageData = new ImageData(width, height)
    onProgress(80)
    
    // 等待图像显示完成
    await new Promise<void>((resolve) => {
      image.display(imageData, (displayData: ImageData | null) => {
        if (displayData && canvas) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.putImageData(displayData, 0, 0)
          }
        }
        resolve()
      })
    })
    onProgress(90)
    
    // 转换为 Blob
    return new Promise((resolve) => {
      canvas!.toBlob((blob) => {
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  } catch (err) {
    console.error('libheif decode error:', err)
    throw new Error('HEIC decode failed')
  }
}

// 从 RAW 文件中提取嵌入的 JPEG - 优化版本
function extractEmbeddedJpeg(data: Uint8Array): Uint8Array | null {
  console.log('Extracting embedded JPEG from RAW, file size:', data.length)
  
  // 检查是否是 CR2 格式 (Canon RAW)
  // CR2 文件以 "II" (little-endian) 或 "MM" (big-endian) 开头，后跟 TIFF 标记
  const isCR2 = (data[0] === 0x49 && data[1] === 0x49) || (data[0] === 0x4D && data[1] === 0x4D)
  if (isCR2) {
    console.log('Detected TIFF-based RAW format (possibly CR2)')
  }
  
  const jpegs: { start: number; end: number; size: number }[] = []
  
  // 查找所有 JPEG - 使用更宽松的搜索
  let i = 0
  while (i < data.length - 4) {
    // 查找 JPEG SOI (FF D8 FF)
    if (data[i] === 0xFF && data[i + 1] === 0xD8 && data[i + 2] === 0xFF) {
      const start = i
      console.log(`Found JPEG SOI at offset ${start}`)
      
      // 查找对应的 EOI (FF D9) - 从后向前搜索可能更快
      let end = -1
      
      // 先尝试在合理范围内查找 EOI
      for (let j = start + 100; j < Math.min(start + 20000000, data.length - 1); j++) {
        if (data[j] === 0xFF && data[j + 1] === 0xD9) {
          // 验证这是一个合理的 JPEG 结束位置
          const size = j + 2 - start
          if (size > 5000) { // 至少 5KB
            end = j + 2
            break
          }
        }
      }
      
      if (end > start) {
        const size = end - start
        // CR2 的预览图通常比较大
        const minSize = isCR2 ? 50000 : 10000
        if (size > minSize) {
          jpegs.push({ start, end, size })
          console.log(`Found complete JPEG at offset ${start}, size ${size} bytes`)
        }
        i = end
      } else {
        // 如果找不到 EOI，尝试使用 TIFF IFD 信息（CR2 特殊处理）
        if (isCR2 && start < 1000) {
          // 跳过小的缩略图，继续搜索
          i = start + 1
        } else {
          i++
        }
      }
    } else {
      i++
    }
  }

  if (jpegs.length === 0) {
    console.log('No embedded JPEG found in RAW file, trying alternative method')
    
    // 备选方案：直接搜索最大的连续 JPEG 数据块
    // 对于 CR2，预览图通常在文件的前半部分
    const searchEnd = isCR2 ? Math.min(data.length, 10000000) : data.length
    
    for (let start = 0; start < searchEnd - 100; start++) {
      if (data[start] === 0xFF && data[start + 1] === 0xD8 && data[start + 2] === 0xFF) {
        // 找到 SOI，现在从文件末尾向前搜索 EOI
        for (let end = Math.min(start + 10000000, data.length - 1); end > start + 50000; end--) {
          if (data[end - 1] === 0xFF && data[end] === 0xD9) {
            const size = end + 1 - start
            if (size > 100000 && size < 15000000) { // 100KB - 15MB
              console.log(`Alternative method found JPEG: offset=${start}, size=${size}`)
              const result = new Uint8Array(size)
              result.set(data.subarray(start, end + 1))
              return result
            }
          }
        }
      }
    }
    
    return null
  }

  // 按大小排序，选择最大的（通常是主预览图）
  jpegs.sort((a, b) => b.size - a.size)
  
  // 优先选择大于 100KB 的 JPEG（主预览图通常较大）
  const selected = jpegs.find(j => j.size > 100000) || jpegs[0]
  
  console.log(`Selected JPEG: offset=${selected.start}, size=${selected.size} bytes`)
  
  // 提取并验证
  const result = new Uint8Array(selected.size)
  result.set(data.subarray(selected.start, selected.end))
  
  // 验证 JPEG 头部和尾部
  if (result[0] !== 0xFF || result[1] !== 0xD8) {
    console.error('Invalid JPEG header')
    return null
  }
  if (result[result.length - 2] !== 0xFF || result[result.length - 1] !== 0xD9) {
    console.warn('JPEG missing EOI marker, attempting to fix')
    // 尝试添加 EOI
    const fixed = new Uint8Array(result.length + 2)
    fixed.set(result)
    fixed[fixed.length - 2] = 0xFF
    fixed[fixed.length - 1] = 0xD9
    return fixed
  }
  
  return result
}

// 从 Live Photo / Motion Photo 中提取嵌入的 MP4 视频
function extractLivePhotoVideo(data: Uint8Array): Uint8Array | null {
  console.log('Searching for embedded video in file, size:', data.length)
  
  // 搜索整个文件查找 ftyp box（MP4 标记）
  // ftyp 格式：[4字节大小][ftyp][品牌]
  for (let i = 0; i < data.length - 12; i++) {
    // 检查 "ftyp" 标记 (0x66 0x74 0x79 0x70)
    if (data[i + 4] === 0x66 && data[i + 5] === 0x74 && 
        data[i + 6] === 0x79 && data[i + 7] === 0x70) {
      // 读取 box 大小
      const boxSize = (data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]
      
      // 验证 box 大小是否合理 (8-64 字节通常是 ftyp box 大小)
      if (boxSize >= 8 && boxSize <= 64) {
        // 检查是否在文件后半部分（避免误判）
        if (i > data.length * 0.3) {
          console.log('Found MP4 ftyp at offset:', i, 'box size:', boxSize)
          const mp4Data = data.slice(i)
          console.log('Extracted MP4 size:', mp4Data.length)
          return mp4Data
        }
      }
    }
  }
  
  // 备选方案：搜索 "mdat" box（媒体数据）
  for (let i = data.length - 1000000; i < data.length - 8; i++) {
    if (i < 0) continue
    if (data[i + 4] === 0x6D && data[i + 5] === 0x64 && 
        data[i + 6] === 0x61 && data[i + 7] === 0x74) {
      // 向前查找 ftyp
      for (let j = i - 1000; j < i; j++) {
        if (j < 0) continue
        if (data[j + 4] === 0x66 && data[j + 5] === 0x74 && 
            data[j + 6] === 0x79 && data[j + 7] === 0x70) {
          console.log('Found MP4 via mdat at offset:', j)
          return data.slice(j)
        }
      }
    }
  }
  
  console.log('No embedded video found')
  return null
}

