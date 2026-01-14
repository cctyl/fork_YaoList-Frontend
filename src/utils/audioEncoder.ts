// Audio encoder module - convert audio to MP3 using Web Audio API
// 音频编码模块 - 使用 Web Audio API 将音频转换为 MP3

// Simple MP3 encoder using lamejs (loaded dynamically)
// 使用 lamejs 的简单 MP3 编码器（动态加载）

let lameModule: any = null

// Dynamically load lamejs from CDN
async function loadLame(): Promise<any> {
  if (lameModule) return lameModule
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js'
    script.onload = () => {
      lameModule = (window as any).lamejs
      resolve(lameModule)
    }
    script.onerror = () => reject(new Error('Failed to load lamejs'))
    document.head.appendChild(script)
  })
}

export interface ConvertProgress {
  stage: 'decoding' | 'encoding' | 'done'
  progress: number // 0-100
}

export interface ConvertResult {
  blob: Blob
  filename: string
}

/**
 * Decode audio from URL using Web Audio API decodeAudioData
 * 使用 Web Audio API decodeAudioData 从 URL 解码音频（快速，不需要实时播放）
 */
async function decodeAudioFromUrl(
  url: string,
  onProgress?: (progress: ConvertProgress) => void
): Promise<{ leftChannel: Float32Array; rightChannel: Float32Array; sampleRate: number }> {
  onProgress?.({ stage: 'decoding', progress: 5 })
  
  // Fetch the audio file
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`)
  }
  
  onProgress?.({ stage: 'decoding', progress: 20 })
  
  const arrayBuffer = await response.arrayBuffer()
  
  onProgress?.({ stage: 'decoding', progress: 35 })
  
  // Decode using Web Audio API
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  await audioCtx.close()
  
  onProgress?.({ stage: 'decoding', progress: 50 })
  
  // Extract channel data
  const leftChannel = audioBuffer.getChannelData(0)
  const rightChannel = audioBuffer.numberOfChannels > 1 
    ? audioBuffer.getChannelData(1) 
    : audioBuffer.getChannelData(0) // Mono: duplicate left channel
  
  return {
    leftChannel,
    rightChannel,
    sampleRate: audioBuffer.sampleRate
  }
}

/**
 * Convert audio URL to MP3
 * 将音频 URL 转换为 MP3
 * 
 * Creates a new audio element to capture audio, supporting any format the browser can play
 * 创建新的 audio 元素来捕获音频，支持浏览器能播放的任何格式
 */
export async function convertToMp3(
  audioUrl: string,
  originalFilename: string,
  onProgress?: (progress: ConvertProgress) => void
): Promise<ConvertResult> {
  onProgress?.({ stage: 'decoding', progress: 0 })
  
  // Load lamejs
  const lamejs = await loadLame()
  
  // Decode audio from URL (fast, no real-time playback needed)
  const audioBuffer = await decodeAudioFromUrl(audioUrl, onProgress)
  
  onProgress?.({ stage: 'decoding', progress: 50 })
  
  // Get audio parameters from decoded data
  const { leftChannel, rightChannel, sampleRate } = audioBuffer
  const numChannels = 2 // Always stereo from our decoder
  const samples = leftChannel.length
  
  onProgress?.({ stage: 'encoding', progress: 0 })
  
  // Create MP3 encoder
  // Use 128kbps for good quality/size balance
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128)
  const mp3Data: ArrayBuffer[] = []
  
  // Process in larger chunks for better performance
  // Must be multiple of 1152 (MP3 frame size)
  const chunkSize = 1152 * 64 // Process 64 frames at a time
  let lastProgressUpdate = 0
  
  for (let i = 0; i < samples; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, samples)
    const chunkLength = chunkEnd - i
    
    // Convert float32 to int16
    const leftChunk = new Int16Array(chunkLength)
    const rightChunk = new Int16Array(chunkLength)
    
    for (let j = 0; j < chunkLength; j++) {
      // Clamp and convert to 16-bit
      leftChunk[j] = Math.max(-32768, Math.min(32767, Math.round(leftChannel[i + j] * 32767)))
      rightChunk[j] = Math.max(-32768, Math.min(32767, Math.round(rightChannel[i + j] * 32767)))
    }
    
    // Encode chunk (always stereo)
    const mp3buf: Int8Array = mp3encoder.encodeBuffer(leftChunk, rightChunk)
    
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf).buffer)
    }
    
    // Report progress less frequently to avoid UI overhead
    const progress = Math.round((i / samples) * 100)
    if (progress - lastProgressUpdate >= 5) {
      onProgress?.({ stage: 'encoding', progress })
      lastProgressUpdate = progress
    }
  }
  
  // Flush remaining data
  const mp3End = mp3encoder.flush()
  if (mp3End.length > 0) {
    mp3Data.push(new Uint8Array(mp3End).buffer)
  }
  
  onProgress?.({ stage: 'done', progress: 100 })
  
  // Create blob
  const blob = new Blob(mp3Data, { type: 'audio/mpeg' })
  
  // Generate filename
  const baseName = originalFilename.replace(/\.[^/.]+$/, '')
  const filename = `${baseName}.mp3`
  
  return { blob, filename }
}

/**
 * Check if a file needs conversion to MP3
 * 检查文件是否需要转换为 MP3
 */
export function needsConversion(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  // MP3 files don't need conversion
  if (ext === 'mp3') return false
  // These formats can be converted
  const convertibleFormats = [
    'flac', 'wav', 'ogg', 'aac', 'm4a', 'wma', 'aiff', 'ape',
    // Encrypted formats (after decryption)
    'ncm', 'qmc0', 'qmc2', 'qmc3', 'qmcflac', 'qmcogg', 'mflac', 'mflac0', 'mgg', 'mgg1', 'kgm', 'kgma', 'vpr'
  ]
  return convertibleFormats.includes(ext)
}

/**
 * Get the source format name for display
 * 获取源格式名称用于显示
 */
export function getSourceFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const formatMap: Record<string, string> = {
    'flac': 'FLAC',
    'wav': 'WAV',
    'ogg': 'OGG',
    'aac': 'AAC',
    'm4a': 'M4A',
    'wma': 'WMA',
    'aiff': 'AIFF',
    'ape': 'APE',
    'ncm': 'NCM',
    'qmc0': 'QMC',
    'qmc2': 'QMC',
    'qmc3': 'QMC',
    'qmcflac': 'QMC',
    'qmcogg': 'QMC',
    'mflac': 'MFLAC',
    'mflac0': 'MFLAC',
    'mgg': 'MGG',
    'mgg1': 'MGG',
    'kgm': 'KGM',
    'kgma': 'KGM',
    'vpr': 'VPR'
  }
  return formatMap[ext] || ext.toUpperCase()
}
