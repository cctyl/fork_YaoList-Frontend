import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  Download, Repeat, Shuffle, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react'
import { decryptAudio, isEncryptedAudio, DecryptResult } from '../../../utils/audioDecrypt'
import './previews.scss'

// 从音频文件提取封面
const extractCoverFromAudio = async (url: string): Promise<string | null> => {
  try {
    // 获取更多数据以支持 FLAC
    const response = await fetch(url, { headers: { Range: 'bytes=0-2097152' } })
    const buffer = await response.arrayBuffer()
    const uint8 = new Uint8Array(buffer)
    
    // 检查 FLAC 格式 (fLaC)
    if (uint8[0] === 0x66 && uint8[1] === 0x4C && uint8[2] === 0x61 && uint8[3] === 0x43) {
      let pos = 4
      while (pos < uint8.length - 4) {
        const blockType = uint8[pos] & 0x7f
        const isLast = (uint8[pos] & 0x80) !== 0
        const blockSize = (uint8[pos + 1] << 16) | (uint8[pos + 2] << 8) | uint8[pos + 3]
        pos += 4
        
        // PICTURE block type = 6
        if (blockType === 6 && blockSize > 0) {
          let offset = pos
          const pictureType = (uint8[offset] << 24) | (uint8[offset + 1] << 16) | (uint8[offset + 2] << 8) | uint8[offset + 3]
          offset += 4
          
          const mimeLen = (uint8[offset] << 24) | (uint8[offset + 1] << 16) | (uint8[offset + 2] << 8) | uint8[offset + 3]
          offset += 4
          const mime = String.fromCharCode(...uint8.slice(offset, offset + mimeLen))
          offset += mimeLen
          
          const descLen = (uint8[offset] << 24) | (uint8[offset + 1] << 16) | (uint8[offset + 2] << 8) | uint8[offset + 3]
          offset += 4 + descLen
          
          offset += 16 // width, height, depth, colors
          
          const dataLen = (uint8[offset] << 24) | (uint8[offset + 1] << 16) | (uint8[offset + 2] << 8) | uint8[offset + 3]
          offset += 4
          
          if (dataLen > 0 && offset + dataLen <= uint8.length) {
            const imageData = uint8.slice(offset, offset + dataLen)
            const blob = new Blob([imageData], { type: mime || 'image/jpeg' })
            return URL.createObjectURL(blob)
          }
        }
        
        pos += blockSize
        if (isLast) break
      }
      return null
    }
    
    // 检查 ID3v2 标签 (MP3)
    if (uint8[0] === 0x49 && uint8[1] === 0x44 && uint8[2] === 0x33) {
      const tagSize = ((uint8[6] & 0x7f) << 21) | ((uint8[7] & 0x7f) << 14) | 
                      ((uint8[8] & 0x7f) << 7) | (uint8[9] & 0x7f)
      
      let pos = 10
      while (pos < Math.min(tagSize + 10, uint8.length - 10)) {
        const frameId = String.fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2], uint8[pos+3])
        const frameSize = (uint8[pos+4] << 24) | (uint8[pos+5] << 16) | (uint8[pos+6] << 8) | uint8[pos+7]
        
        if (frameId === 'APIC' && frameSize > 0) {
          let dataPos = pos + 10
          dataPos++ // encoding
          while (uint8[dataPos] !== 0 && dataPos < pos + 10 + frameSize) dataPos++ // MIME
          const mimeEnd = dataPos
          const mime = String.fromCharCode(...uint8.slice(pos + 11, mimeEnd))
          dataPos++ // null
          dataPos++ // picture type
          while (uint8[dataPos] !== 0 && dataPos < pos + 10 + frameSize) dataPos++ // description
          dataPos++ // null
          
          const imageData = uint8.slice(dataPos, pos + 10 + frameSize)
          const blob = new Blob([imageData], { type: mime || 'image/jpeg' })
          return URL.createObjectURL(blob)
        }
        
        if (frameSize <= 0) break
        pos += 10 + frameSize
      }
    }
  } catch (e) {
    console.warn('Failed to extract cover:', e)
  }
  return null
}

interface FileInfo {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: string
}

interface AudioPreviewProps {
  url: string
  file: FileInfo
  onClose?: () => void
  siblings?: { name: string; url: string }[]
  onNavigate?: (filename: string) => void
}

export default function AudioPreview({ url, file, siblings = [], onNavigate }: AudioPreviewProps) {
  const { t } = useTranslation()
  const filename = file?.name || ''
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [siteIcon, setSiteIcon] = useState('/favicon.ico')
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null)
  const [decrypting, setDecrypting] = useState(false)
  const [decryptError, setDecryptError] = useState<string | null>(null)
  const [audioMetadata, setAudioMetadata] = useState<DecryptResult['metadata']>(undefined)
  const [currentIndex, setCurrentIndex] = useState(() => {
    return siblings.findIndex(s => s.name === filename)
  })

  const rawUrl = siblings.length > 0 && currentIndex >= 0 
    ? siblings[currentIndex].url 
    : url

  const currentFilename = siblings.length > 0 && currentIndex >= 0
    ? siblings[currentIndex].name
    : filename

  // 实际播放的 URL（解密后的或原始的）
  const currentUrl = decryptedUrl || rawUrl

  // 解密加密音频
  useEffect(() => {
    if (!rawUrl || !currentFilename) return
    
    if (isEncryptedAudio(currentFilename)) {
      setDecrypting(true)
      setDecryptError(null)
      setDecryptedUrl(null)
      setCoverUrl(null)
      setAudioMetadata(undefined)
      
      fetch(rawUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => decryptAudio(buffer, currentFilename))
        .then(result => {
          if (result) {
            const blobUrl = URL.createObjectURL(result.data)
            setDecryptedUrl(blobUrl)
            
            if (result.cover) {
              setCoverUrl(URL.createObjectURL(result.cover))
            }
            if (result.metadata) {
              setAudioMetadata(result.metadata)
            }
          } else {
            setDecryptError(t('preview.decryptFailed'))
          }
        })
        .catch(err => {
          console.error('Decrypt error:', err)
          setDecryptError(t('preview.decryptError') + ': ' + err.message)
        })
        .finally(() => setDecrypting(false))
    } else {
      setDecryptedUrl(null)
      setDecryptError(null)
    }
    
    return () => {
      if (decryptedUrl) URL.revokeObjectURL(decryptedUrl)
    }
  }, [rawUrl, currentFilename])

  // 加载站点图标
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        if (data.site_icon) setSiteIcon(data.site_icon)
      })
      .catch(() => {})
  }, [])

  // 提取普通音频封面（非加密格式）
  useEffect(() => {
    if (currentUrl && !isEncryptedAudio(currentFilename) && !coverUrl) {
      extractCoverFromAudio(currentUrl).then(cover => {
        if (cover) setCoverUrl(cover)
      })
    }
  }, [currentUrl, currentFilename])

  // 同步音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.muted = isMuted
    }
  }, [volume, isMuted])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          skip(-10)
          break
        case 'ArrowRight':
          skip(10)
          break
        case 'm':
          toggleMute()
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => setIsMuted(!isMuted)

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    setIsMuted(vol === 0)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handlePrev = () => {
    if (siblings.length > 0 && currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      setIsPlaying(false)
      setCurrentTime(0)
      onNavigate?.(siblings[newIndex].name)
      // 自动播放
      setTimeout(() => {
        audioRef.current?.play()
        setIsPlaying(true)
      }, 100)
    }
  }

  const handleNext = () => {
    if (siblings.length > 0) {
      let newIndex: number
      if (isShuffle) {
        // 随机播放
        newIndex = Math.floor(Math.random() * siblings.length)
      } else if (currentIndex < siblings.length - 1) {
        newIndex = currentIndex + 1
      } else if (isRepeat) {
        newIndex = 0
      } else {
        return
      }
      setCurrentIndex(newIndex)
      setIsPlaying(false)
      setCurrentTime(0)
      onNavigate?.(siblings[newIndex].name)
      // 自动播放
      setTimeout(() => {
        audioRef.current?.play()
        setIsPlaying(true)
      }, 100)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    if (isRepeat && siblings.length <= 1) {
      // 单曲循环
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
        setIsPlaying(true)
      }
    } else {
      handleNext()
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = currentUrl
    link.download = currentFilename
    link.click()
  }

  // 显示名称（优先使用元数据）
  const displayName = audioMetadata?.title || currentFilename.replace(/\.[^/.]+$/, '')
  const artistName = audioMetadata?.artist

  return (
    <div className="preview preview--audio">
      <audio
        ref={audioRef}
        src={currentUrl}
        autoPlay
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
      />

      {/* 封面区域 */}
      <div className="preview__audio-cover">
        <div className={`preview__audio-disc ${isPlaying ? 'preview__audio-disc--playing' : ''}`}>
          <img 
            src={coverUrl || siteIcon} 
            alt="cover" 
            className="preview__audio-cover-img"
            onError={(e) => {
              (e.target as HTMLImageElement).src = siteIcon
            }}
          />
        </div>
      </div>

      {/* 解密状态 */}
      {decrypting && (
        <div className="preview__audio-decrypting">
          <Loader2 size={20} className="preview__audio-spinner" />
          <span>{t('preview.decrypting')}</span>
        </div>
      )}
      
      {decryptError && (
        <div className="preview__audio-error">{decryptError}</div>
      )}

      {/* 歌曲信息 */}
      <div className="preview__audio-info">
        <div className="preview__audio-title-wrapper">
          <h3 className={`preview__audio-title ${displayName.length > 25 ? 'preview__audio-title--scroll' : ''}`}>
            <span className="preview__audio-title-text" data-text={displayName}>{displayName}</span>
          </h3>
        </div>
        {artistName && <p className="preview__audio-artist">{artistName}</p>}
        {siblings.length > 1 && (
          <span className="preview__audio-count">{currentIndex + 1} / {siblings.length}</span>
        )}
      </div>

      {/* 进度条 */}
      <div className="preview__audio-progress">
        <span className="preview__audio-time">{formatTime(currentTime)}</span>
        <div className="preview__audio-progress-bar">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="preview__audio-progress-input"
          />
          <div 
            className="preview__audio-progress-current"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <span className="preview__audio-time">{formatTime(duration)}</span>
      </div>

      {/* 控制按钮 */}
      <div className="preview__audio-controls">
        {/* 随机播放 */}
        <button 
          className={`preview__audio-btn preview__audio-btn--small ${isShuffle ? 'active' : ''}`}
          onClick={() => setIsShuffle(!isShuffle)}
          title={t('preview.shuffle')}
        >
          <Shuffle size={18} />
        </button>

        {/* 上一首 */}
        <button 
          className="preview__audio-btn"
          onClick={handlePrev}
          disabled={siblings.length <= 1 || currentIndex <= 0}
          title={t('preview.previousTrack')}
        >
          <ChevronLeft size={24} />
        </button>

        {/* 后退 */}
        <button className="preview__audio-btn" onClick={() => skip(-10)} title={t('preview.rewind10s')}>
          <SkipBack size={20} />
        </button>

        {/* 播放/暂停 */}
        <button className="preview__audio-btn preview__audio-btn--play" onClick={togglePlay}>
          {isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
        </button>

        {/* 前进 */}
        <button className="preview__audio-btn" onClick={() => skip(10)} title={t('preview.forward10s')}>
          <SkipForward size={20} />
        </button>

        {/* 下一首 */}
        <button 
          className="preview__audio-btn"
          onClick={handleNext}
          disabled={siblings.length <= 1 || (!isRepeat && !isShuffle && currentIndex >= siblings.length - 1)}
          title={t('preview.nextTrack')}
        >
          <ChevronRight size={24} />
        </button>

        {/* 循环播放 */}
        <button 
          className={`preview__audio-btn preview__audio-btn--small ${isRepeat ? 'active' : ''}`}
          onClick={() => setIsRepeat(!isRepeat)}
          title={t('preview.repeat')}
        >
          <Repeat size={18} />
        </button>
      </div>

      {/* 底部工具栏 */}
      <div className="preview__audio-toolbar">
        {/* 音量 */}
        <div className="preview__audio-volume">
          <button className="preview__audio-btn preview__audio-btn--small" onClick={toggleMute}>
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="preview__audio-volume-input"
          />
        </div>

        {/* 下载 */}
        <button className="preview__audio-btn preview__audio-btn--small" onClick={handleDownload} title={t('preview.download')}>
          <Download size={18} />
        </button>
      </div>
    </div>
  )
}
