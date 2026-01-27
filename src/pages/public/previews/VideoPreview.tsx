import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Artplayer from 'artplayer'
import Hls from 'hls.js'
import './previews.scss'

interface FileItem {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface VideoPreviewProps {
  file: FileItem
  url: string
  siblings?: { name: string; url: string }[]
}

export default function VideoPreview({ file, url, siblings = [] }: VideoPreviewProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Artplayer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = siblings.findIndex(s => s.name === file.name)
    return idx >= 0 ? idx : 0
  })

  // 当 file 或 siblings 变化时，更新 currentIndex
  useEffect(() => {
    const idx = siblings.findIndex(s => s.name === file.name)
    if (idx >= 0) {
      setCurrentIndex(idx)
    }
  }, [file.name, siblings])
  
  // 当前播放的 URL
  const currentUrl = siblings.length > 0 && currentIndex >= 0 
    ? siblings[currentIndex].url 
    : url
  
  const currentFilename = siblings.length > 0 && currentIndex >= 0
    ? siblings[currentIndex].name
    : file.name

  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false
    
    // 销毁之前的播放器
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }

    setError(null)

    const initPlayer = async () => {
      let finalUrl = currentUrl
      let isHls = false

      // 获取文件扩展名
      const ext = currentFilename.split('.').pop()?.toLowerCase() || ''

      // 尝试通过HEAD请求检测重定向后的URL
      try {
        const response = await fetch(currentUrl, { method: 'HEAD', redirect: 'follow' })
        finalUrl = response.url
        if (finalUrl.includes('.m3u8') || finalUrl.includes('m3u8')) {
          isHls = true
        }
      } catch {
        // 如果HEAD请求失败，继续使用原URL
      }

      if (ext === 'm3u8') {
        isHls = true
      }

      if (cancelled || !containerRef.current) return

      try {
        const options: ConstructorParameters<typeof Artplayer>[0] = {
          container: containerRef.current,
          url: finalUrl,
          autoplay: true,
          theme: '#3b82f6',
          lang: navigator.language.startsWith('zh') ? 'zh-cn' : 'en',
          screenshot: true,
          hotkey: true,
          volume: 0.7,
          playbackRate: true,
          setting: true,
          pip: true,
          fullscreen: true,
          fullscreenWeb: true,
          miniProgressBar: true,
          mutex: true,
          backdrop: true,
          autoSize: false,
          autoMini: false,
          playsInline: true,
          ...(isHls ? {
            type: 'm3u8',
            customType: {
              m3u8: function (video: HTMLVideoElement, url: string) {
                if (Hls.isSupported()) {
                  const hls = new Hls()
                  hls.loadSource(url)
                  hls.attachMedia(video)
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  video.src = url
                }
              }
            }
          } : {})
        }

        playerRef.current = new Artplayer(options)

        playerRef.current.on('error', () => {
          if (!cancelled) {
            setError(t('preview.playerInitFailed'))
          }
        })
      } catch (err) {
        console.error('初始化播放器失败:', err)
        if (!cancelled) {
          setError(t('preview.playerInitFailed'))
        }
      }
    }

    initPlayer()

    return () => {
      cancelled = true
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [currentUrl, currentFilename])

  // 切换视频
  const handleEpisodeChange = (index: number) => {
    if (index !== currentIndex && index >= 0 && index < siblings.length) {
      setCurrentIndex(index)
    }
  }

  if (error) {
    return (
      <div className="preview__video-error">
        {error}
      </div>
    )
  }

  return (
    <div className="preview preview--video">
      {/* 播放器 */}
      <div ref={containerRef} className="preview__video-player" />
      
      {/* 选集列表 */}
      {siblings.length > 1 && (
        <div className="preview__video-episodes">
          <div className="preview__video-episodes-header">
            <span>{t('preview.playlist')}</span>
            <span className="preview__video-episodes-count">{currentIndex + 1}/{siblings.length}</span>
          </div>
          <div className="preview__video-episodes-list">
            {siblings.map((s, i) => (
              <button
                key={i}
                className={`preview__video-episode ${i === currentIndex ? 'active' : ''}`}
                onClick={() => handleEpisodeChange(i)}
              >
                <span className="preview__video-episode-num">{i + 1}</span>
                <span className="preview__video-episode-name">{s.name.replace(/\.[^/.]+$/, '')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
