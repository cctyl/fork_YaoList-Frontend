// Video metadata parsing utility - simplified version / 视频元数据解析工具

export interface VideoMetadata {
  videoCodec: string
  audioCodec: string
  audioChannels?: number
  audioSampleRate?: number
  width?: number
  height?: number
  container: string
  duration?: number
}

// Video codec mapping / 视频编码映射
const VIDEO_CODEC_MAP: Record<string, string> = {
  'avc1': 'H.264/AVC', 'avc3': 'H.264/AVC',
  'hvc1': 'H.265/HEVC', 'hev1': 'H.265/HEVC',
  'vp09': 'VP9', 'av01': 'AV1',
  'V_MPEG4/ISO/AVC': 'H.264/AVC',
  'V_MPEGH/ISO/HEVC': 'H.265/HEVC',
  'V_VP9': 'VP9', 'V_AV1': 'AV1',
}

// Audio codec mapping / 音频编码映射
const AUDIO_CODEC_MAP: Record<string, string> = {
  'mp4a': 'AAC',
  'ac-3': 'AC3 (Dolby Digital)',
  'ec-3': 'E-AC3 (Dolby Digital Plus)',
  'dtsc': 'DTS', 'dtsh': 'DTS-HD', 'dtsl': 'DTS-HD MA',
  'mlpa': 'Dolby TrueHD',
  'opus': 'Opus', 'fLaC': 'FLAC',
  'A_AAC': 'AAC',
  'A_AC3': 'AC3 (Dolby Digital)',
  'A_EAC3': 'E-AC3 (Dolby Digital Plus)',
  'A_DTS': 'DTS',
  'A_DTS/EXPRESS': 'DTS Express',
  'A_DTS/LOSSLESS': 'DTS-HD MA',
  'A_TRUEHD': 'Dolby TrueHD',
  'A_FLAC': 'FLAC', 'A_OPUS': 'Opus',
}

// Main entry: parse video metadata / 主入口
export async function parseVideoMetadata(url: string, filename: string): Promise<VideoMetadata> {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  
  const result: VideoMetadata = {
    videoCodec: '',
    audioCodec: '',
    container: ext.toUpperCase(),
  }

  try {
    // Download file header (max 512KB, using 206 Range request) / 下载文件头部
    const data = await fetchVideoHeader(url)
    if (!data) return result
    
    if (['mp4', 'mov', 'm4v'].includes(ext)) {
      parseMP4(data, result)
    } else if (['mkv', 'webm'].includes(ext)) {
      parseMKV(data, result)
    }
  } catch (e) {
    console.error('Error parsing video metadata:', e)
  }

  return result
}

// Safely download file header / 安全下载文件头部
async function fetchVideoHeader(url: string): Promise<Uint8Array | null> {
  const MAX_BYTES = 2 * 1024 * 1024 // 2MB
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  
  try {
    const response = await fetch(url, {
      headers: { Range: `bytes=0-${MAX_BYTES - 1}` },
      signal: controller.signal
    })
    clearTimeout(timeout)
    
    // Accept 206 or 200 status codes / 接受状态码
    if (response.status !== 206 && response.status !== 200) {
      console.warn('Request failed, status:', response.status)
      return null
    }
    
    // If 200 and file too large, check content-length / 检查文件大小
    if (response.status === 200) {
      const contentLength = response.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > MAX_BYTES * 2) {
        console.warn('File too large and Range not supported')
        return null
      }
    }
    
    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  } catch (e) {
    clearTimeout(timeout)
    return null
  }
}

// Parse MP4/MOV / 解析 MP4
function parseMP4(data: Uint8Array, result: VideoMetadata) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  
  // const findAtom = (start: number, end: number, target: string): number => {
  //   let offset = start
  //   while (offset < end - 8) {
  //     const size = view.getUint32(offset)
  //     if (size < 8 || offset + size > end) break
  //     const type = String.fromCharCode(data[offset+4], data[offset+5], data[offset+6], data[offset+7])
  //     if (type === target) return offset
  //     offset += size
  //   }
  //   return -1
  // }
  
  const parseAtoms = (start: number, end: number) => {
    let offset = start
    while (offset < end - 8) {
      const size = view.getUint32(offset)
      if (size < 8 || offset + size > end) break
      const type = String.fromCharCode(data[offset+4], data[offset+5], data[offset+6], data[offset+7])
      
      if (type === 'ftyp') {
        const brand = String.fromCharCode(data[offset+8], data[offset+9], data[offset+10], data[offset+11])
        if (brand === 'qt  ') result.container = 'MOV'
      }
      
      if (type === 'moov' || type === 'trak' || type === 'mdia' || type === 'minf' || type === 'stbl') {
        parseAtoms(offset + 8, offset + size)
      }
      
      if (type === 'stsd' && offset + 24 < end) {
        // Parse sample description / 解析样本描述
        let sOffset = offset + 16
        const sSize = view.getUint32(sOffset)
        if (sSize > 8 && sOffset + sSize <= end) {
          const codec = String.fromCharCode(data[sOffset+4], data[sOffset+5], data[sOffset+6], data[sOffset+7])
          
          // Video codec / 视频编码
          if (VIDEO_CODEC_MAP[codec]) {
            result.videoCodec = VIDEO_CODEC_MAP[codec]
            if (sOffset + 34 < end) {
              result.width = view.getUint16(sOffset + 32)
              result.height = view.getUint16(sOffset + 34)
            }
          }
          // Audio codec / 音频编码
          if (AUDIO_CODEC_MAP[codec]) {
            result.audioCodec = AUDIO_CODEC_MAP[codec]
            if (sOffset + 24 < end) {
              result.audioChannels = view.getUint16(sOffset + 24)
            }
          }
        }
      }
      
      offset += size
    }
  }
  
  parseAtoms(0, data.length)
}

// Format channel count / 格式化声道数
export function formatChannels(channels: number): string {
  switch (channels) {
    case 1: return '单声道'
    case 2: return '立体声'
    case 6: return '5.1 声道'
    case 8: return '7.1 声道'
    default: return `${channels} 声道`
  }
}

// Parse MKV - scan entire downloaded data / 解析 MKV
function parseMKV(data: Uint8Array, result: VideoMetadata) {
  // Validate EBML header / 验证 EBML 头
  if (data[0] !== 0x1A || data[1] !== 0x45 || data[2] !== 0xDF || data[3] !== 0xA3) {
    return
  }
  
  // Scan entire buffer / 扫描缓冲区
  const searchLimit = data.length
  
  for (let i = 0; i < searchLimit - 20; i++) {
    // Find CodecID element (0x86) / 查找 CodecID 元素
    if (data[i] === 0x86) {
      // Read EBML vint length / 读取 EBML vint 长度
      const lenByte = data[i + 1]
      let strLen = 0
      let lenSize = 1
      
      // EBML vint: leading 1 bits in first byte determine length / EBML vint 长度
      if (lenByte & 0x80) { // 1xxxxxxx - 1 byte
        strLen = lenByte & 0x7F
        lenSize = 1
      } else if (lenByte & 0x40) { // 01xxxxxx - 2 bytes
        strLen = ((lenByte & 0x3F) << 8) | data[i + 2]
        lenSize = 2
      } else {
        continue // Don't support longer lengths
      }
      
      if (strLen > 0 && strLen < 100 && i + 1 + lenSize + strLen <= searchLimit) {
        // Try to read codec string / 尝试读取 codec 字符串
        let codecStr = ''
        let valid = true
        const strStart = i + 1 + lenSize
        for (let j = 0; j < strLen; j++) {
          const c = data[strStart + j]
          if (c === 0) break
          if (c < 32 || c > 126) { valid = false; break }
          codecStr += String.fromCharCode(c)
        }
        
        if (valid && codecStr.length > 2) {
          if (codecStr.startsWith('V_') && !result.videoCodec) {
            result.videoCodec = VIDEO_CODEC_MAP[codecStr] || codecStr.replace('V_', '').replace('MPEG4/ISO/', '').replace('MPEGH/ISO/', '')
          } else if (codecStr.startsWith('A_') && !result.audioCodec) {
            result.audioCodec = AUDIO_CODEC_MAP[codecStr] || codecStr.replace('A_', '')
          }
        }
      }
    }
    
    // 查找 Channels (0x9F) - 支持不同长度格式
    if (data[i] === 0x9F && !result.audioChannels) {
      const lenByte = data[i + 1]
      if (lenByte === 0x81) {
        const ch = data[i + 2]
        if (ch > 0 && ch <= 16) result.audioChannels = ch
      } else if (lenByte >= 1 && lenByte <= 8) {
        const ch = data[i + 2]
        if (ch > 0 && ch <= 16) result.audioChannels = ch
      }
    }
    
    // 查找 SamplingFrequency (0xB5) - float
    if (data[i] === 0xB5 && data[i+1] === 0x84 && !result.audioSampleRate) {
      try {
        const floatView = new DataView(data.buffer, data.byteOffset + i + 2, 4)
        const rate = floatView.getFloat32(0)
        if (rate > 1000 && rate < 200000) result.audioSampleRate = Math.round(rate)
      } catch {}
    }
    
    // 查找 PixelWidth (0xB0) 和 PixelHeight (0xBA)
    if (data[i] === 0xB0 && data[i+1] === 0x82 && !result.width) {
      result.width = (data[i+2] << 8) | data[i+3]
    }
    if (data[i] === 0xBA && data[i+1] === 0x82 && !result.height) {
      result.height = (data[i+2] << 8) | data[i+3]
    }
  }
}

// 检测音频编码是否被浏览器支持
export function isAudioCodecSupported(codec: string): { supported: boolean; warning?: string } {
  const unsupportedCodecs: Record<string, string> = {
    'DTS': '浏览器不支持 DTS 音频，在线播放将没有声音',
    'DTS-HD': '浏览器不支持 DTS-HD 音频，在线播放将没有声音',
    'DTS-HD MA': '浏览器不支持 DTS-HD MA 音频，在线播放将没有声音',
    'Dolby TrueHD': '浏览器不支持 TrueHD 音频，在线播放将没有声音',
  }

  for (const [key, warning] of Object.entries(unsupportedCodecs)) {
    if (codec.includes(key)) {
      return { supported: false, warning }
    }
  }

  return { supported: true }
}
