// Audio metadata extraction module / 音频元数据提取模块

export interface AudioMetadata {
  // Basic information / 基本信息
  title?: string
  artist?: string
  album?: string
  year?: string
  genre?: string
  track?: string
  
  // Technical parameters / 技术参数
  duration?: number      // seconds
  sampleRate?: number    // Hz
  bitRate?: number       // kbps
  channels?: number      // channel count
  bitDepth?: number      // bit depth
  codec?: string         // codec format
  format?: string        // file format
  fileSize?: number      // file size bytes
}

// Extract metadata from MP3 file / 从 MP3 文件提取元数据
async function extractMP3Metadata(buffer: ArrayBuffer): Promise<AudioMetadata> {
  const data = new Uint8Array(buffer)
  const metadata: AudioMetadata = { format: 'MP3', codec: 'MPEG Audio' }
  
  // Parse ID3v2 tags / 解析 ID3v2 标签
  if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
    const tagSize = ((data[6] & 0x7f) << 21) | ((data[7] & 0x7f) << 14) | 
                    ((data[8] & 0x7f) << 7) | (data[9] & 0x7f)
    
    let pos = 10
    while (pos < Math.min(tagSize + 10, data.length - 10)) {
      const frameId = String.fromCharCode(data[pos], data[pos+1], data[pos+2], data[pos+3])
      const frameSize = (data[pos+4] << 24) | (data[pos+5] << 16) | (data[pos+6] << 8) | data[pos+7]
      
      if (frameSize <= 0 || frameSize > tagSize) break
      
      const frameData = data.slice(pos + 10, pos + 10 + frameSize)
      const encoding = frameData[0]
      let text = ''
      
      if (encoding === 0 || encoding === 3) {
        // ISO-8859-1 or UTF-8
        text = new TextDecoder(encoding === 3 ? 'utf-8' : 'iso-8859-1').decode(frameData.slice(1))
      } else if (encoding === 1) {
        // UTF-16 with BOM
        text = new TextDecoder('utf-16').decode(frameData.slice(1))
      }
      text = text.replace(/\0/g, '').trim()
      
      switch (frameId) {
        case 'TIT2': metadata.title = text; break
        case 'TPE1': metadata.artist = text; break
        case 'TALB': metadata.album = text; break
        case 'TYER': case 'TDRC': metadata.year = text; break
        case 'TCON': metadata.genre = text; break
        case 'TRCK': metadata.track = text; break
      }
      
      pos += 10 + frameSize
    }
  }
  
  // Find MP3 frame header to get technical parameters / 查找 MP3 帧头
  const mpegBitrates = [
    [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], // V1 L1
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],    // V1 L2
    [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],     // V1 L3
    [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],    // V2 L1
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],         // V2 L2/L3
  ]
  const mpegSampleRates = [
    [44100, 48000, 32000], // V1
    [22050, 24000, 16000], // V2
    [11025, 12000, 8000],  // V2.5
  ]
  
  for (let i = 0; i < Math.min(data.length - 4, 100000); i++) {
    if (data[i] === 0xff && (data[i + 1] & 0xe0) === 0xe0) {
      const version = (data[i + 1] >> 3) & 0x03
      const layer = (data[i + 1] >> 1) & 0x03
      const bitrateIndex = (data[i + 2] >> 4) & 0x0f
      const sampleRateIndex = (data[i + 2] >> 2) & 0x03
      const channelMode = (data[i + 3] >> 6) & 0x03
      
      if (version !== 1 && layer !== 0 && bitrateIndex !== 0 && bitrateIndex !== 15 && sampleRateIndex !== 3) {
        let bitrateTable: number[]
        if (version === 3) { // V1
          bitrateTable = layer === 3 ? mpegBitrates[0] : layer === 2 ? mpegBitrates[1] : mpegBitrates[2]
        } else { // V2 or V2.5
          bitrateTable = layer === 3 ? mpegBitrates[3] : mpegBitrates[4]
        }
        
        metadata.bitRate = bitrateTable[bitrateIndex]
        metadata.sampleRate = mpegSampleRates[version === 3 ? 0 : version === 2 ? 1 : 2][sampleRateIndex]
        metadata.channels = channelMode === 3 ? 1 : 2
        metadata.codec = `MPEG-${version === 3 ? '1' : '2'} Layer ${4 - layer}`
        break
      }
    }
  }
  
  return metadata
}

// Extract metadata from FLAC file / 从 FLAC 文件提取元数据
async function extractFLACMetadata(buffer: ArrayBuffer): Promise<AudioMetadata> {
  const data = new Uint8Array(buffer)
  const metadata: AudioMetadata = { format: 'FLAC', codec: 'FLAC' }
  
  if (data[0] !== 0x66 || data[1] !== 0x4C || data[2] !== 0x61 || data[3] !== 0x43) {
    return metadata
  }
  
  let pos = 4
  while (pos < data.length - 4) {
    const blockType = data[pos] & 0x7f
    const isLast = (data[pos] & 0x80) !== 0
    const blockSize = (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]
    pos += 4
    
    if (blockType === 0 && blockSize >= 34) {
      // STREAMINFO
      const minBlockSize = (data[pos] << 8) | data[pos + 1]
      const maxBlockSize = (data[pos + 2] << 8) | data[pos + 3]
      metadata.sampleRate = (data[pos + 10] << 12) | (data[pos + 11] << 4) | ((data[pos + 12] >> 4) & 0x0f)
      metadata.channels = ((data[pos + 12] >> 1) & 0x07) + 1
      metadata.bitDepth = ((data[pos + 12] & 0x01) << 4) | ((data[pos + 13] >> 4) & 0x0f) + 1
      
      const totalSamples = ((data[pos + 13] & 0x0f) * Math.pow(2, 32)) +
                           (data[pos + 14] << 24) + (data[pos + 15] << 16) +
                           (data[pos + 16] << 8) + data[pos + 17]
      if (metadata.sampleRate && totalSamples) {
        metadata.duration = totalSamples / metadata.sampleRate
      }
    } else if (blockType === 4) {
      // VORBIS_COMMENT
      let offset = pos
      const vendorLen = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
      offset += 4 + vendorLen
      
      const commentCount = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
      offset += 4
      
      for (let i = 0; i < commentCount && offset < pos + blockSize; i++) {
        const commentLen = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
        offset += 4
        
        const comment = new TextDecoder('utf-8').decode(data.slice(offset, offset + commentLen))
        const [key, value] = comment.split('=')
        
        switch (key?.toUpperCase()) {
          case 'TITLE': metadata.title = value; break
          case 'ARTIST': metadata.artist = value; break
          case 'ALBUM': metadata.album = value; break
          case 'DATE': metadata.year = value; break
          case 'GENRE': metadata.genre = value; break
          case 'TRACKNUMBER': metadata.track = value; break
        }
        offset += commentLen
      }
    }
    
    pos += blockSize
    if (isLast) break
  }
  
  // Calculate bitrate / 计算码率
  if (metadata.duration && buffer.byteLength) {
    metadata.bitRate = Math.round((buffer.byteLength * 8) / metadata.duration / 1000)
  }
  
  return metadata
}

// Extract metadata from M4A/AAC file / 从 M4A/AAC 文件提取元数据
async function extractM4AMetadata(buffer: ArrayBuffer): Promise<AudioMetadata> {
  const data = new Uint8Array(buffer)
  const metadata: AudioMetadata = { format: 'M4A', codec: 'AAC' }
  
  // Simplified parsing - find ftyp and moov atoms / 简化解析
  let pos = 0
  while (pos < data.length - 8) {
    const size = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]
    const type = String.fromCharCode(data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7])
    
    if (size <= 0 || pos + size > data.length) break
    
    if (type === 'ftyp') {
      const brand = String.fromCharCode(data[pos + 8], data[pos + 9], data[pos + 10], data[pos + 11])
      if (brand === 'M4A ') metadata.format = 'M4A'
      else if (brand === 'mp42') metadata.format = 'MP4'
    }
    
    pos += size
  }
  
  return metadata
}

// Extract metadata from WAV file / 从 WAV 文件提取元数据
async function extractWAVMetadata(buffer: ArrayBuffer): Promise<AudioMetadata> {
  const data = new Uint8Array(buffer)
  const metadata: AudioMetadata = { format: 'WAV', codec: 'PCM' }
  
  // RIFF header
  if (data[0] !== 0x52 || data[1] !== 0x49 || data[2] !== 0x46 || data[3] !== 0x46) {
    return metadata
  }
  
  let pos = 12
  while (pos < data.length - 8) {
    const chunkId = String.fromCharCode(data[pos], data[pos + 1], data[pos + 2], data[pos + 3])
    const chunkSize = data[pos + 4] | (data[pos + 5] << 8) | (data[pos + 6] << 16) | (data[pos + 7] << 24)
    
    if (chunkId === 'fmt ') {
      const audioFormat = data[pos + 8] | (data[pos + 9] << 8)
      metadata.channels = data[pos + 10] | (data[pos + 11] << 8)
      metadata.sampleRate = data[pos + 12] | (data[pos + 13] << 8) | (data[pos + 14] << 16) | (data[pos + 15] << 24)
      const byteRate = data[pos + 16] | (data[pos + 17] << 8) | (data[pos + 18] << 16) | (data[pos + 19] << 24)
      metadata.bitDepth = data[pos + 22] | (data[pos + 23] << 8)
      metadata.bitRate = Math.round(byteRate * 8 / 1000)
      
      if (audioFormat === 1) metadata.codec = 'PCM'
      else if (audioFormat === 3) metadata.codec = 'IEEE Float'
      else if (audioFormat === 6) metadata.codec = 'A-Law'
      else if (audioFormat === 7) metadata.codec = 'μ-Law'
    } else if (chunkId === 'data') {
      if (metadata.sampleRate && metadata.channels && metadata.bitDepth) {
        const samples = chunkSize / (metadata.channels * metadata.bitDepth / 8)
        metadata.duration = samples / metadata.sampleRate
      }
    }
    
    pos += 8 + chunkSize + (chunkSize % 2)
  }
  
  return metadata
}

// Extract metadata from OGG file / 从 OGG 文件提取元数据
async function extractOGGMetadata(buffer: ArrayBuffer): Promise<AudioMetadata> {
  const data = new Uint8Array(buffer)
  const metadata: AudioMetadata = { format: 'OGG', codec: 'Vorbis' }
  
  // OggS magic
  if (data[0] !== 0x4F || data[1] !== 0x67 || data[2] !== 0x67 || data[3] !== 0x53) {
    return metadata
  }
  
  // Find Vorbis identification header / 查找 Vorbis 识别头
  for (let i = 0; i < Math.min(data.length - 30, 10000); i++) {
    if (data[i] === 0x01 && data[i+1] === 0x76 && data[i+2] === 0x6F && 
        data[i+3] === 0x72 && data[i+4] === 0x62 && data[i+5] === 0x69 && data[i+6] === 0x73) {
      // Vorbis identification header
      metadata.channels = data[i + 11]
      metadata.sampleRate = data[i + 12] | (data[i + 13] << 8) | (data[i + 14] << 16) | (data[i + 15] << 24)
      const bitrateMax = data[i + 16] | (data[i + 17] << 8) | (data[i + 18] << 16) | (data[i + 19] << 24)
      const bitrateNom = data[i + 20] | (data[i + 21] << 8) | (data[i + 22] << 16) | (data[i + 23] << 24)
      if (bitrateNom > 0) metadata.bitRate = Math.round(bitrateNom / 1000)
      break
    }
  }
  
  return metadata
}

// Detect audio format and extract metadata / 检测音频格式并提取元数据
export async function extractAudioMetadata(url: string, fileSize?: number): Promise<AudioMetadata> {
  try {
    // Get first 512KB for metadata parsing / 获取前 512KB
    const response = await fetch(url, { headers: { Range: 'bytes=0-524288' } })
    const buffer = await response.arrayBuffer()
    const data = new Uint8Array(buffer)
    
    let metadata: AudioMetadata = {}
    
    // Detect format and parse / 检测格式并解析
    if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
      // ID3v2 (MP3)
      metadata = await extractMP3Metadata(buffer)
    } else if (data[0] === 0xff && (data[1] & 0xe0) === 0xe0) {
      // MP3 without ID3
      metadata = await extractMP3Metadata(buffer)
    } else if (data[0] === 0x66 && data[1] === 0x4C && data[2] === 0x61 && data[3] === 0x43) {
      // FLAC
      metadata = await extractFLACMetadata(buffer)
    } else if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
      // WAV
      metadata = await extractWAVMetadata(buffer)
    } else if (data[0] === 0x4F && data[1] === 0x67 && data[2] === 0x67 && data[3] === 0x53) {
      // OGG
      metadata = await extractOGGMetadata(buffer)
    } else if (data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) {
      // M4A/MP4
      metadata = await extractM4AMetadata(buffer)
    }
    
    if (fileSize) {
      metadata.fileSize = fileSize
    }
    
    return metadata
  } catch (e) {
    console.warn('Failed to extract audio metadata:', e)
    return {}
  }
}

// Format duration / 格式化时长
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Format sample rate / 格式化采样率
export function formatSampleRate(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)} kHz`
  }
  return `${hz} Hz`
}

// Format file size / 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
  return `${bytes} B`
}
