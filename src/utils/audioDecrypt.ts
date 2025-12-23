// Audio decryption module - supports NCM, QQ Music and other private formats / 音频解密模块

// NCM decryption core key / NCM 解密核心密钥
const NCM_CORE_KEY = new Uint8Array([0x68, 0x7A, 0x48, 0x52, 0x41, 0x6D, 0x73, 0x6F, 0x35, 0x6B, 0x49, 0x6E, 0x62, 0x61, 0x78, 0x57])
const NCM_META_KEY = new Uint8Array([0x23, 0x31, 0x34, 0x6C, 0x6A, 0x6B, 0x5F, 0x21, 0x5C, 0x5D, 0x26, 0x30, 0x55, 0x3C, 0x27, 0x28])

// QQ Music static key mapping table / QQ 音乐静态密钥映射表
const QMC_STATIC_KEY = [
  0x77, 0x48, 0x32, 0x73, 0xDE, 0xF2, 0xC0, 0xC8,
  0x95, 0xEC, 0x30, 0xB2, 0x51, 0xC3, 0xE1, 0xA0,
  0x9E, 0xE6, 0x9D, 0xCF, 0xFA, 0x7F, 0x14, 0xD1,
  0xCE, 0xB8, 0xDC, 0xC3, 0x4A, 0x67, 0x93, 0xD6,
  0x28, 0xC2, 0x91, 0x70, 0xCA, 0x8D, 0xA2, 0xA4,
  0xF0, 0x08, 0x61, 0x90, 0x7E, 0x6F, 0xA2, 0xE0,
  0xEB, 0xAE, 0x3E, 0xB6, 0x67, 0xC7, 0x92, 0xF4,
  0x91, 0xB5, 0xF6, 0x6C, 0x5E, 0x84, 0x40, 0xF7,
  0xF3, 0x1B, 0x02, 0x7F, 0xD5, 0xAB, 0x41, 0x89,
  0x28, 0xF4, 0x25, 0xCC, 0x52, 0x11, 0xAD, 0x43,
  0x68, 0xA6, 0x41, 0x8B, 0x84, 0xB5, 0xFF, 0x2C,
  0x92, 0x4A, 0x26, 0xD8, 0x47, 0x6A, 0x7C, 0x95,
  0x61, 0xCC, 0xE6, 0xCB, 0xBB, 0x3F, 0x47, 0x58,
  0x89, 0x75, 0xC3, 0x75, 0xA1, 0xD9, 0xAF, 0xCC,
  0x08, 0x73, 0x17, 0xDC, 0xAA, 0x9A, 0xA2, 0x16,
  0x41, 0xD8, 0xA2, 0x06, 0xC6, 0x8B, 0xFC, 0x66,
  0x34, 0x9F, 0xCF, 0x18, 0x23, 0xA0, 0x0A, 0x74,
  0xE7, 0x04, 0x27, 0xE0, 0xA4, 0x42, 0x59, 0x32,
  0x3D, 0x15, 0x39, 0x26, 0x7D, 0x38, 0x62, 0xDD,
  0x4D, 0xB3, 0xA1, 0xBD, 0xE0, 0xB4, 0xA5, 0xB1,
  0x55, 0x46, 0xBD, 0xA5, 0x78, 0x0A, 0xC4, 0xA2,
  0x69, 0x48, 0xAE, 0x93, 0x39, 0x1B, 0xD9, 0x09,
  0x6B, 0xBA, 0xBB, 0x1E, 0x47, 0x78, 0xBF, 0x12,
  0x53, 0x2A, 0x7C, 0xC8, 0x16, 0x01, 0x03, 0x07,
  0x3D, 0x91, 0x74, 0x43, 0x47, 0x85, 0x16, 0xBC,
  0x78, 0xCB, 0x63, 0xE6, 0xBC, 0x2A, 0x02, 0x79,
  0x08, 0x1B, 0x83, 0xE5, 0xD5, 0xBD, 0x64, 0x86,
  0x9A, 0xFE, 0x03, 0xB2, 0x2B, 0x3B, 0x6B, 0x57,
  0x5E, 0x06, 0xC7, 0x8A, 0xAB, 0xA5, 0x6E, 0x76,
  0x61, 0xD1, 0x02, 0x72, 0xD5, 0x48, 0x66, 0x54,
  0x5E, 0x51, 0xE5, 0x90, 0x23, 0x02, 0xE9, 0xB1,
  0x7C, 0x73, 0xBE, 0x70, 0xAA, 0x51, 0x58, 0x74
]

// Decryption result interface / 解密结果接口
export interface DecryptResult {
  data: Blob
  mimeType: string
  cover?: Blob
  metadata?: {
    title?: string
    artist?: string
    album?: string
  }
}

// Detect file format / 检测文件格式
export function detectAudioFormat(filename: string): 'ncm' | 'qmc' | 'mflac' | 'mgg' | 'kgm' | 'vpr' | 'normal' {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  
  if (ext === 'ncm') return 'ncm'
  if (['qmc0', 'qmc2', 'qmc3', 'qmcflac', 'qmcogg'].includes(ext)) return 'qmc'
  if (['mflac', 'mflac0'].includes(ext)) return 'mflac'
  if (['mgg', 'mgg1'].includes(ext)) return 'mgg'
  if (['kgm', 'kgma'].includes(ext)) return 'kgm'
  if (ext === 'vpr') return 'vpr'
  
  return 'normal'
}

// AES S-Box
const AES_SBOX = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
])

// AES inverse S-Box / AES 逆 S-Box
const AES_INV_SBOX = new Uint8Array([
  0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,
  0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,
  0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,
  0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,
  0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,
  0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,
  0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,
  0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,
  0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,
  0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,
  0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,
  0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,
  0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,
  0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,
  0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,
  0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d
])

// GF(2^8) multiplication / GF(2^8) 乘法
function gmul(a: number, b: number): number {
  let p = 0
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a
    const hi = a & 0x80
    a = (a << 1) & 0xff
    if (hi) a ^= 0x1b
    b >>= 1
  }
  return p
}

// AES key expansion / AES 密钥扩展
function aesKeyExpansion(key: Uint8Array): Uint32Array {
  const Nk = 4, Nr = 10, Nb = 4
  const w = new Uint32Array(Nb * (Nr + 1))
  const rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36]
  
  for (let i = 0; i < Nk; i++) {
    w[i] = (key[4*i] << 24) | (key[4*i+1] << 16) | (key[4*i+2] << 8) | key[4*i+3]
  }
  
  for (let i = Nk; i < Nb * (Nr + 1); i++) {
    let temp = w[i - 1]
    if (i % Nk === 0) {
      temp = ((temp << 8) | (temp >>> 24)) >>> 0
      temp = (AES_SBOX[(temp >>> 24) & 0xff] << 24) |
             (AES_SBOX[(temp >>> 16) & 0xff] << 16) |
             (AES_SBOX[(temp >>> 8) & 0xff] << 8) |
             AES_SBOX[temp & 0xff]
      temp ^= rcon[i / Nk - 1] << 24
    }
    w[i] = (w[i - Nk] ^ temp) >>> 0
  }
  return w
}

// AES single block decryption / AES 单块解密
function aesDecryptBlock(block: Uint8Array, w: Uint32Array): Uint8Array {
  const state = new Uint8Array(16)
  for (let i = 0; i < 16; i++) state[i] = block[i]
  
  // AddRoundKey
  for (let c = 0; c < 4; c++) {
    const wc = w[40 + c]
    state[c*4] ^= (wc >>> 24) & 0xff
    state[c*4+1] ^= (wc >>> 16) & 0xff
    state[c*4+2] ^= (wc >>> 8) & 0xff
    state[c*4+3] ^= wc & 0xff
  }
  
  for (let round = 9; round >= 1; round--) {
    // InvShiftRows
    let t = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t
    t = state[2]; state[2] = state[10]; state[10] = t; t = state[6]; state[6] = state[14]; state[14] = t
    t = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t
    
    // InvSubBytes
    for (let i = 0; i < 16; i++) state[i] = AES_INV_SBOX[state[i]]
    
    // AddRoundKey
    for (let c = 0; c < 4; c++) {
      const wc = w[round * 4 + c]
      state[c*4] ^= (wc >>> 24) & 0xff
      state[c*4+1] ^= (wc >>> 16) & 0xff
      state[c*4+2] ^= (wc >>> 8) & 0xff
      state[c*4+3] ^= wc & 0xff
    }
    
    // InvMixColumns
    for (let c = 0; c < 4; c++) {
      const s0 = state[c*4], s1 = state[c*4+1], s2 = state[c*4+2], s3 = state[c*4+3]
      state[c*4] = gmul(s0, 0x0e) ^ gmul(s1, 0x0b) ^ gmul(s2, 0x0d) ^ gmul(s3, 0x09)
      state[c*4+1] = gmul(s0, 0x09) ^ gmul(s1, 0x0e) ^ gmul(s2, 0x0b) ^ gmul(s3, 0x0d)
      state[c*4+2] = gmul(s0, 0x0d) ^ gmul(s1, 0x09) ^ gmul(s2, 0x0e) ^ gmul(s3, 0x0b)
      state[c*4+3] = gmul(s0, 0x0b) ^ gmul(s1, 0x0d) ^ gmul(s2, 0x09) ^ gmul(s3, 0x0e)
    }
  }
  
  // Final round
  let t = state[13]; state[13] = state[9]; state[9] = state[5]; state[5] = state[1]; state[1] = t
  t = state[2]; state[2] = state[10]; state[10] = t; t = state[6]; state[6] = state[14]; state[14] = t
  t = state[3]; state[3] = state[7]; state[7] = state[11]; state[11] = state[15]; state[15] = t
  
  for (let i = 0; i < 16; i++) state[i] = AES_INV_SBOX[state[i]]
  
  for (let c = 0; c < 4; c++) {
    const wc = w[c]
    state[c*4] ^= (wc >>> 24) & 0xff
    state[c*4+1] ^= (wc >>> 16) & 0xff
    state[c*4+2] ^= (wc >>> 8) & 0xff
    state[c*4+3] ^= wc & 0xff
  }
  
  return state
}

// AES-128-ECB decryption / AES-128-ECB 解密
function aesEcbDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const w = aesKeyExpansion(key)
  const result = new Uint8Array(data.length)
  
  for (let i = 0; i < data.length; i += 16) {
    const block = data.slice(i, i + 16)
    const decrypted = aesDecryptBlock(block, w)
    result.set(decrypted, i)
  }
  
  // Remove PKCS7 padding / 移除 PKCS7 填充
  const padLen = result[result.length - 1]
  if (padLen > 0 && padLen <= 16) {
    return result.slice(0, result.length - padLen)
  }
  return result
}

// RC4 key scheduling / RC4 密钥调度
function rc4KSA(key: Uint8Array): Uint8Array {
  const s = new Uint8Array(256)
  for (let i = 0; i < 256; i++) s[i] = i
  
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xff
    ;[s[i], s[j]] = [s[j], s[i]]
  }
  return s
}

// NCM format decryption / NCM 格式解密
export async function decryptNCM(buffer: ArrayBuffer): Promise<DecryptResult | null> {
  try {
    const data = new Uint8Array(buffer)
    
    // 验证魔数 CTENFDAM
    const magic = String.fromCharCode(...data.slice(0, 8))
    if (magic !== 'CTENFDAM') {
      console.warn('Invalid NCM magic')
      return null
    }
    
    let offset = 10
    
    // Read key length / 读取密钥长度
    const keyLength = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    offset += 4
    
    // Read and decrypt RC4 key / 读取并解密 RC4 密钥
    const encryptedKey = data.slice(offset, offset + keyLength)
    offset += keyLength
    
    // XOR decrypt key / XOR 解密密钥
    const keyData = new Uint8Array(encryptedKey.length)
    for (let i = 0; i < encryptedKey.length; i++) {
      keyData[i] = encryptedKey[i] ^ 0x64
    }
    
    // AES decrypt to get actual key / AES 解密获取实际密钥
    const decryptedKey = await aesEcbDecrypt(keyData, NCM_CORE_KEY)
    const rc4Key = decryptedKey.slice(17) // 跳过 "neteasecloudmusic"
    
    // Read metadata length / 读取元数据长度
    const metaLength = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    offset += 4
    
    let metadata: DecryptResult['metadata'] = undefined
    let cover: Blob | undefined = undefined
    
    if (metaLength > 0) {
      // Read and decrypt metadata / 读取并解密元数据
      const encryptedMeta = data.slice(offset, offset + metaLength)
      offset += metaLength
      
      const metaData = new Uint8Array(encryptedMeta.length)
      for (let i = 0; i < encryptedMeta.length; i++) {
        metaData[i] = encryptedMeta[i] ^ 0x63
      }
      
      try {
        // Base64 解码（跳过 "163 key(Don't modify):"）
        const base64Data = String.fromCharCode(...metaData.slice(22))
        const metaJson = atob(base64Data)
        const decryptedMeta = await aesEcbDecrypt(
          Uint8Array.from(metaJson, c => c.charCodeAt(0)),
          NCM_META_KEY
        )
        const metaStr = new TextDecoder().decode(decryptedMeta)
        // 跳过 "music:" 前缀
        const jsonStr = metaStr.slice(6)
        const meta = JSON.parse(jsonStr)
        metadata = {
          title: meta.musicName,
          artist: meta.artist?.map((a: any) => a[0] || a).join(', '),
          album: meta.album
        }
      } catch (e) {
        console.warn('Failed to parse NCM metadata:', e)
      }
    }
    
    // 跳过 CRC 和间隔
    offset += 9
    
    // 读取封面
    const coverLength = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    offset += 4
    
    if (coverLength > 0) {
      const coverData = data.slice(offset, offset + coverLength)
      offset += coverLength
      cover = new Blob([coverData], { type: 'image/jpeg' })
    }
    
    // 解密音频数据
    const audioData = data.slice(offset)
    const keyBox = rc4KSA(rc4Key)
    const decrypted = new Uint8Array(audioData.length)
    
    for (let i = 0; i < audioData.length; i++) {
      const j = (i + 1) & 0xff
      decrypted[i] = audioData[i] ^ keyBox[(keyBox[j] + keyBox[(keyBox[j] + j) & 0xff]) & 0xff]
    }
    
    // 检测音频格式
    let mimeType = 'audio/mpeg'
    if (decrypted[0] === 0x66 && decrypted[1] === 0x4C && decrypted[2] === 0x61 && decrypted[3] === 0x43) {
      mimeType = 'audio/flac'
    }
    
    return {
      data: new Blob([decrypted], { type: mimeType }),
      mimeType,
      cover,
      metadata
    }
  } catch (e) {
    console.error('NCM decrypt failed:', e)
    return null
  }
}

// QMC 格式解密
export async function decryptQMC(buffer: ArrayBuffer, filename: string): Promise<DecryptResult | null> {
  try {
    const data = new Uint8Array(buffer)
    const decrypted = new Uint8Array(data.length)
    
    // 使用静态密钥解密
    for (let i = 0; i < data.length; i++) {
      const seed = QMC_STATIC_KEY[(i % 0x7fff) & 0xff]
      decrypted[i] = data[i] ^ seed
    }
    
    // 根据扩展名判断格式
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    let mimeType = 'audio/mpeg'
    
    if (ext.includes('flac') || (decrypted[0] === 0x66 && decrypted[1] === 0x4C)) {
      mimeType = 'audio/flac'
    } else if (ext.includes('ogg') || (decrypted[0] === 0x4F && decrypted[1] === 0x67)) {
      mimeType = 'audio/ogg'
    }
    
    return {
      data: new Blob([decrypted], { type: mimeType }),
      mimeType
    }
  } catch (e) {
    console.error('QMC decrypt failed:', e)
    return null
  }
}

// MFLAC/MGG 格式解密（QQ 音乐新格式）
export async function decryptMgg(buffer: ArrayBuffer, filename: string): Promise<DecryptResult | null> {
  try {
    const data = new Uint8Array(buffer)
    
    // MGG/MFLAC 使用更复杂的加密，这里使用简化版本
    // 实际需要解析文件头获取密钥
    const headerSize = 1024
    const decrypted = new Uint8Array(data.length)
    
    // 复制头部
    for (let i = 0; i < Math.min(headerSize, data.length); i++) {
      decrypted[i] = data[i]
    }
    
    // 解密数据部分
    for (let i = headerSize; i < data.length; i++) {
      const seed = QMC_STATIC_KEY[(i - headerSize) % 256]
      decrypted[i] = data[i] ^ seed
    }
    
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const mimeType = ext.includes('flac') ? 'audio/flac' : 'audio/ogg'
    
    return {
      data: new Blob([decrypted], { type: mimeType }),
      mimeType
    }
  } catch (e) {
    console.error('MGG decrypt failed:', e)
    return null
  }
}

// KGM 格式解密（酷狗音乐）
export async function decryptKGM(buffer: ArrayBuffer): Promise<DecryptResult | null> {
  try {
    const data = new Uint8Array(buffer)
    
    // KGM 魔数验证
    const magic = data.slice(0, 4)
    if (magic[0] !== 0x7C || magic[1] !== 0xD5 || magic[2] !== 0x32 || magic[3] !== 0xEB) {
      // 尝试 KGMA 格式
      if (magic[0] !== 0x05 || magic[1] !== 0x28 || magic[2] !== 0xBC || magic[3] !== 0x96) {
        console.warn('Invalid KGM magic')
        return null
      }
    }
    
    // KGM 头部大小
    const headerSize = 0x3C
    const audioData = data.slice(headerSize)
    const decrypted = new Uint8Array(audioData.length)
    
    // 简化的 KGM 解密
    const kgmKey = [0x4C, 0x50, 0x65, 0x6A]
    for (let i = 0; i < audioData.length; i++) {
      decrypted[i] = audioData[i] ^ kgmKey[i % 4]
    }
    
    // 检测格式
    let mimeType = 'audio/mpeg'
    if (decrypted[0] === 0x66 && decrypted[1] === 0x4C) {
      mimeType = 'audio/flac'
    }
    
    return {
      data: new Blob([decrypted], { type: mimeType }),
      mimeType
    }
  } catch (e) {
    console.error('KGM decrypt failed:', e)
    return null
  }
}

// VPR 格式解密（酷我音乐）
export async function decryptVPR(buffer: ArrayBuffer): Promise<DecryptResult | null> {
  try {
    const data = new Uint8Array(buffer)
    
    // VPR 魔数验证
    const magic = String.fromCharCode(...data.slice(0, 4))
    if (magic !== 'KWMA') {
      console.warn('Invalid VPR magic')
      return null
    }
    
    // VPR 解密密钥
    const vprKey = new Uint8Array([
      0x4D, 0x6F, 0x54, 0x43, 0x6C, 0x75, 0x62, 0x20,
      0x56, 0x50, 0x52, 0x20, 0x2D, 0x20, 0x76, 0x31
    ])
    
    const headerSize = 0x400
    const audioData = data.slice(headerSize)
    const decrypted = new Uint8Array(audioData.length)
    
    for (let i = 0; i < audioData.length; i++) {
      decrypted[i] = audioData[i] ^ vprKey[i % vprKey.length]
    }
    
    return {
      data: new Blob([decrypted], { type: 'audio/mpeg' }),
      mimeType: 'audio/mpeg'
    }
  } catch (e) {
    console.error('VPR decrypt failed:', e)
    return null
  }
}

// 统一解密入口
export async function decryptAudio(buffer: ArrayBuffer, filename: string): Promise<DecryptResult | null> {
  const format = detectAudioFormat(filename)
  
  switch (format) {
    case 'ncm':
      return decryptNCM(buffer)
    case 'qmc':
      return decryptQMC(buffer, filename)
    case 'mflac':
    case 'mgg':
      return decryptMgg(buffer, filename)
    case 'kgm':
      return decryptKGM(buffer)
    case 'vpr':
      return decryptVPR(buffer)
    default:
      return null
  }
}

// 检查是否为加密格式
export function isEncryptedAudio(filename: string): boolean {
  return detectAudioFormat(filename) !== 'normal'
}

// 加密音频元数据结果
export interface EncryptedAudioMetadata {
  title?: string
  artist?: string
  album?: string
  format?: string
  codec?: string
  sampleRate?: number
  channels?: number
  bitDepth?: number
  cover?: Blob
}

// 从加密音频文件头部提取元数据（不下载整个文件）
export async function extractEncryptedAudioMetadata(url: string, filename: string): Promise<EncryptedAudioMetadata | null> {
  const format = detectAudioFormat(filename)
  
  if (format === 'ncm') {
    return extractNCMMetadataOnly(url)
  }
  
  // 其他加密格式暂时返回基本信息
  return {
    format: format.toUpperCase()
  }
}

// 只提取 NCM 元数据（只下载头部，不下载全部音频数据）
async function extractNCMMetadataOnly(url: string): Promise<EncryptedAudioMetadata | null> {
  try {
    // 获取前 2MB 数据（包含元数据、封面和部分音频用于分析）
    const response = await fetch(url, { headers: { Range: 'bytes=0-2097152' } })
    const buffer = await response.arrayBuffer()
    const data = new Uint8Array(buffer)
    
    // 验证魔数 CTENFDAM
    const magic = String.fromCharCode(...data.slice(0, 8))
    if (magic !== 'CTENFDAM') {
      return null
    }
    
    let offset = 10
    
    // Read and decrypt RC4 key / 读取并解密 RC4 密钥
    const keyLength = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    offset += 4
    
    const encryptedKey = data.slice(offset, offset + keyLength)
    offset += keyLength
    
    // XOR decrypt key / XOR 解密密钥
    const keyData = new Uint8Array(encryptedKey.length)
    for (let i = 0; i < encryptedKey.length; i++) {
      keyData[i] = encryptedKey[i] ^ 0x64
    }
    
    // AES decrypt to get actual key / AES 解密获取实际密钥
    const decryptedKey = aesEcbDecrypt(keyData, NCM_CORE_KEY)
    const rc4Key = decryptedKey.slice(17) // 跳过 "neteasecloudmusic"
    
    // Read metadata length / 读取元数据长度
    const metaLength = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
    offset += 4
    
    let title: string | undefined
    let artist: string | undefined
    let album: string | undefined
    
    if (metaLength > 0 && offset + metaLength <= data.length) {
      // Read and decrypt metadata / 读取并解密元数据
      const encryptedMeta = data.slice(offset, offset + metaLength)
      const metaData = new Uint8Array(encryptedMeta.length)
      for (let i = 0; i < encryptedMeta.length; i++) {
        metaData[i] = encryptedMeta[i] ^ 0x63
      }
      
      try {
        // Base64 解码（跳过 "163 key(Don't modify):"）
        const base64Str = String.fromCharCode(...metaData.slice(22))
        const decoded = atob(base64Str)
        const decodedBytes = Uint8Array.from(decoded, c => c.charCodeAt(0))
        
        // AES 解密
        const decrypted = aesEcbDecrypt(decodedBytes, NCM_META_KEY)
        const metaStr = new TextDecoder().decode(decrypted)
        
        // 跳过 "music:" 前缀，找到 JSON
        const jsonStart = metaStr.indexOf('{')
        if (jsonStart >= 0) {
          const jsonStr = metaStr.slice(jsonStart)
          const meta = JSON.parse(jsonStr)
          title = meta.musicName
          artist = meta.artist?.map((a: any) => a[0] || a).join('/')
          album = meta.album
        }
      } catch (e) {
        console.warn('Failed to parse NCM metadata:', e)
      }
      
      offset += metaLength
    }
    
    // 跳过 CRC 和间隔
    offset += 9
    
    // 读取封面
    let cover: Blob | undefined
    let coverLength = 0
    if (offset + 4 <= data.length) {
      coverLength = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
      offset += 4
      
      if (coverLength > 0 && offset + coverLength <= data.length) {
        const coverData = data.slice(offset, offset + coverLength)
        cover = new Blob([coverData], { type: 'image/jpeg' })
        offset += coverLength
      }
    }
    
    // 解密部分音频数据来分析格式（只解密前 64KB）
    let codec: string | undefined
    let sampleRate: number | undefined
    let channels: number | undefined
    let bitDepth: number | undefined
    
    const audioStart = offset
    const audioSampleSize = Math.min(65536, data.length - audioStart)
    
    if (audioSampleSize > 100) {
      const audioSample = data.slice(audioStart, audioStart + audioSampleSize)
      const keyBox = rc4KSA(rc4Key)
      const decryptedAudio = new Uint8Array(audioSampleSize)
      
      for (let i = 0; i < audioSampleSize; i++) {
        const j = (i + 1) & 0xff
        decryptedAudio[i] = audioSample[i] ^ keyBox[(keyBox[j] + keyBox[(keyBox[j] + j) & 0xff]) & 0xff]
      }
      
      // 检测是 FLAC 还是 MP3
      if (decryptedAudio[0] === 0x66 && decryptedAudio[1] === 0x4C && 
          decryptedAudio[2] === 0x61 && decryptedAudio[3] === 0x43) {
        // FLAC 格式
        codec = 'FLAC'
        
        // 解析 STREAMINFO
        let pos = 4
        while (pos < decryptedAudio.length - 4) {
          const blockType = decryptedAudio[pos] & 0x7f
          const isLast = (decryptedAudio[pos] & 0x80) !== 0
          const blockSize = (decryptedAudio[pos + 1] << 16) | (decryptedAudio[pos + 2] << 8) | decryptedAudio[pos + 3]
          pos += 4
          
          if (blockType === 0 && blockSize >= 34) {
            // STREAMINFO
            sampleRate = (decryptedAudio[pos + 10] << 12) | (decryptedAudio[pos + 11] << 4) | ((decryptedAudio[pos + 12] >> 4) & 0x0f)
            channels = ((decryptedAudio[pos + 12] >> 1) & 0x07) + 1
            bitDepth = ((decryptedAudio[pos + 12] & 0x01) << 4) | ((decryptedAudio[pos + 13] >> 4) & 0x0f) + 1
            break
          }
          
          pos += blockSize
          if (isLast) break
        }
      } else if (decryptedAudio[0] === 0xff && (decryptedAudio[1] & 0xe0) === 0xe0) {
        // MP3 格式
        codec = 'MP3'
        
        const version = (decryptedAudio[1] >> 3) & 0x03
        const sampleRateIndex = (decryptedAudio[2] >> 2) & 0x03
        const channelMode = (decryptedAudio[3] >> 6) & 0x03
        
        const sampleRates = [
          [44100, 48000, 32000], // V1
          [22050, 24000, 16000], // V2
          [11025, 12000, 8000],  // V2.5
        ]
        
        if (version !== 1 && sampleRateIndex !== 3) {
          sampleRate = sampleRates[version === 3 ? 0 : version === 2 ? 1 : 2][sampleRateIndex]
          channels = channelMode === 3 ? 1 : 2
        }
      } else {
        // 尝试查找 MP3 帧头
        for (let i = 0; i < Math.min(decryptedAudio.length - 4, 2000); i++) {
          if (decryptedAudio[i] === 0xff && (decryptedAudio[i + 1] & 0xe0) === 0xe0) {
            codec = 'MP3'
            const version = (decryptedAudio[i + 1] >> 3) & 0x03
            const sampleRateIndex = (decryptedAudio[i + 2] >> 2) & 0x03
            const channelMode = (decryptedAudio[i + 3] >> 6) & 0x03
            
            const sampleRates = [
              [44100, 48000, 32000],
              [22050, 24000, 16000],
              [11025, 12000, 8000],
            ]
            
            if (version !== 1 && sampleRateIndex !== 3) {
              sampleRate = sampleRates[version === 3 ? 0 : version === 2 ? 1 : 2][sampleRateIndex]
              channels = channelMode === 3 ? 1 : 2
            }
            break
          }
        }
      }
    }
    
    return {
      title,
      artist,
      album,
      format: 'NCM',
      codec,
      sampleRate,
      channels,
      bitDepth,
      cover
    }
  } catch (e) {
    console.error('Failed to extract NCM metadata:', e)
    return null
  }
}
