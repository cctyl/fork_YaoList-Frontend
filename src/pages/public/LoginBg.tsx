interface LoginBgProps {
  darkMode?: boolean
}

export default function LoginBg({ darkMode = false }: LoginBgProps) {
  const bgColor = darkMode ? '#0f0f1a' : '#e8f4fc'
  const wave1 = darkMode ? '#1e3a5f' : '#7ec8e3'
  const wave2 = darkMode ? '#2d5a87' : '#a3d9f5'
  const wave3 = darkMode ? '#1a4a6e' : '#5fb3d4'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: `linear-gradient(180deg, ${bgColor} 0%, ${darkMode ? '#1a1a2e' : '#d4ecf7'} 100%)`,
        overflow: 'hidden',
        zIndex: -1,
      }}
    >
      {/* 顶部波浪 */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '40%',
        }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
      >
        <path
          d="M0,160 C320,280 420,60 720,160 C1020,260 1200,80 1440,180 L1440,0 L0,0 Z"
          fill={wave1}
          opacity="0.5"
        />
        <path
          d="M0,120 C280,220 520,40 800,140 C1080,240 1280,60 1440,140 L1440,0 L0,0 Z"
          fill={wave2}
          opacity="0.3"
        />
      </svg>

      {/* 底部波浪 */}
      <svg
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '50%',
        }}
        viewBox="0 0 1440 500"
        preserveAspectRatio="none"
      >
        <path
          d="M0,300 C200,150 400,350 600,250 C800,150 1000,350 1200,250 C1350,180 1400,300 1440,280 L1440,500 L0,500 Z"
          fill={wave3}
          opacity="0.6"
        />
        <path
          d="M0,350 C240,200 480,400 720,300 C960,200 1100,380 1440,320 L1440,500 L0,500 Z"
          fill={wave1}
          opacity="0.4"
        />
        <path
          d="M0,400 C180,320 360,450 540,380 C720,310 900,420 1080,360 C1260,300 1380,400 1440,380 L1440,500 L0,500 Z"
          fill={wave2}
          opacity="0.5"
        />
      </svg>
    </div>
  )
}
