import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' },
  ]

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <div style={{
      position: 'absolute',
      top: '50px',
      right: '120px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-md)',
      padding: '8px 0',
      minWidth: '120px',
      zIndex: 1000
    }}>
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 16px',
            border: 'none',
            background: i18n.language === lang.code ? 'var(--bg-tertiary)' : 'transparent',
            color: i18n.language === lang.code ? 'var(--accent-color)' : 'var(--text-primary)',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          {lang.name}
        </button>
      ))}
    </div>
  )
}
