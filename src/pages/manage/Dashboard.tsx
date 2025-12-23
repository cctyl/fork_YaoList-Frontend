import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Settings as SettingsIcon, 
  Server, 
  Share2, 
  Link as LinkIcon,
  Users as UsersIcon,
  UserCog,
  FolderTree,
  Database,
  Info,
  BookOpen,
  LogOut,
  Moon,
  Sun,
  Palette,
  Eye,
  ListTodo,
  Search,
  Bell,
  Home,
  Scale
} from 'lucide-react'
import { api } from '../../utils/api'
import '../../styles/components/dashboard.scss'
import Settings from './Settings'
import Drivers from './Drivers'
import Users from './Users'
import Groups from './Groups'
import Shares from './Shares'
import Links from './Links'
import Metadata from './Metadata'
import Backup from './Backup'
import About from './About'
import Tasks from './Tasks'
import SearchManagement from './SearchManagement'
import Notifications from './Notifications'
import LoadBalance from './LoadBalance'

interface DashboardProps {
  onLogout: () => void
}

interface SubMenuItem {
  path: string
  label: string
}

interface NavItem {
  path?: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  subItems?: SubMenuItem[]
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [siteTitle, setSiteTitle] = useState('YaoList')
  const [siteIcon, setSiteIcon] = useState('/favicon.ico')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    document.body.classList.toggle('dark-mode', isDark)
    localStorage.setItem('darkMode', String(isDark))
  }, [isDark])

  useEffect(() => {
    const loadSiteSettings = async () => {
      try {
        const response = await fetch('/api/settings/public')
        if (response.ok) {
          const data = await response.json()
          if (data.site_title) setSiteTitle(data.site_title)
          if (data.site_icon) setSiteIcon(data.site_icon)
        }
      } catch {}
    }
    loadSiteSettings()
  }, [])

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout')
      // 手动清除 cookie
      document.cookie = 'yaolist_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      onLogout()
    } catch (err) {
      console.error(t('dashboard.logoutFailed'), err)
      // 即使 API 失败也清除 cookie
      document.cookie = 'yaolist_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      onLogout()
    }
  }

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  const navGroups: NavGroup[] = [
    {
      title: t('menu.siteManagement'),
      items: [
        {
          path: '/manage/settings/basic',
          label: t('menu.basicSettings'),
          icon: SettingsIcon
        },
        {
          path: '/manage/settings/style',
          label: t('menu.styleSettings'),
          icon: Palette
        },
        {
          path: '/manage/settings/preview',
          label: t('menu.previewSettings'),
          icon: Eye
        },
                {
          path: '/manage/settings/push',
          label: t('menu.pushSettings'),
          icon: Bell
        },
      ]
    },
    {
      title: t('menu.userSettings'),
      items: [
        {
          path: '/manage/users',
          label: t('menu.userManagement'),
          icon: UsersIcon
        },
        {
          path: '/manage/groups',
          label: t('menu.groupManagement'),
          icon: UserCog
        },
      ]
    },
    {
      title: t('menu.systemFeatures'),
      items: [
        {
          path: '/manage/drivers',
          label: t('menu.driverManagement'),
          icon: Server
        },
        {
          path: '/manage/shares',
          label: t('menu.shareManagement'),
          icon: Share2
        },
        {
          path: '/manage/links',
          label: t('menu.linkManagement'),
          icon: LinkIcon
        },
        {
          path: '/manage/metadata',
          label: t('menu.metadataManagement'),
          icon: FolderTree
        },
        {
          path: '/manage/tasks',
          label: t('menu.taskManagement'),
          icon: ListTodo
        },
        {
          path: '/manage/search',
          label: t('menu.searchManagement'),
          icon: Search
        },
        {
          path: '/manage/load-balance',
          label: t('menu.loadBalance'),
          icon: Scale
        },
        {
          path: '/manage/backup',
          label: t('menu.backupRestore'),
          icon: Database
        },
        {
          path: '/manage/about',
          label: t('menu.about'),
          icon: Info
        },
        {
          path: 'https://docs.ylist.org',
          label: t('menu.documentation'),
          icon: BookOpen
        },
      ]
    },
  ]

  const getPageTitle = () => {
    const currentItem = navGroups
      .flatMap(g => g.items)
      .find(item => item.path === location.pathname)
    return currentItem?.label || 'Dashboard'
  }

  return (
    <div className="dashboard__container">
      <aside className="dashboard__sidebar">
        <div className="dashboard__header">
          <img src={siteIcon} alt="Logo" className="dashboard__logo" style={{ width: '32px', height: '32px' }} />
          <h2>{siteTitle}</h2>
        </div>

        <nav className="dashboard__nav">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="dashboard__nav-group">
              <div className="dashboard__group-title">{group.title}</div>
              <div className="dashboard__group-items">
                {group.items.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    {item.subItems ? (
                      <div className="dashboard__submenu">
                        <div 
                          className="dashboard__nav-item dashboard__nav-item--parent"
                          onClick={() => toggleMenu(item.label)}
                        >
                          <item.icon size={20} className="dashboard__nav-icon" />
                          <span>{item.label}</span>
                          <svg 
                            className={`dashboard__expand-icon ${expandedMenus.includes(item.label) ? 'dashboard__expand-icon--open' : ''}`}
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                          >
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        {expandedMenus.includes(item.label) && (
                          <div className="dashboard__submenu-items">
                            {item.subItems.map((subItem) => (
                              <Link
                                key={subItem.path}
                                to={subItem.path}
                                className={`dashboard__nav-item dashboard__nav-item--sub ${location.pathname === subItem.path ? 'dashboard__nav-item--active' : ''}`}
                              >
                                <span>{subItem.label}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      item.path?.startsWith('http') ? (
                        <a
                          href={item.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dashboard__nav-item"
                        >
                          <item.icon size={20} className="dashboard__nav-icon" />
                          <span>{item.label}</span>
                        </a>
                      ) : (
                        <Link
                          to={item.path!}
                          className={`dashboard__nav-item ${location.pathname === item.path ? 'dashboard__nav-item--active' : ''}`}
                        >
                          <item.icon size={20} className="dashboard__nav-icon" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        </aside>

      <div className="dashboard__content-wrapper">
        <header className="dashboard__header-bar">
          <div className="dashboard__header-left">
            <div className="dashboard__page-title">{getPageTitle()}</div>
          </div>
          <div className="dashboard__header-right">
            <div style={{ position: 'relative' }}>
              <button 
                className="dashboard__icon-btn" 
                title={t('tooltip.languageSwitch')}
                onClick={() => setShowLangMenu(!showLangMenu)}
              >
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" width="20" height="20">
                  <path d="m42 43-2.385-6M26 43l2.384-6m11.231 0-.795-2-4.18-10h-1.28l-4.181 10-.795 2m11.231 0h-11.23M17 5l1 5M5 11h26M11 11s1.889 7.826 6.611 12.174C22.333 27.522 30 31 30 31" strokeLinecap="butt" strokeLinejoin="miter" />
                  <path d="M25 11s-1.889 7.826-6.611 12.174C13.667 27.522 6 31 6 31" strokeLinecap="butt" strokeLinejoin="miter" />
                </svg>
              </button>
              {showLangMenu && (
                <div className="dashboard__lang-menu">
                  <button
                    onClick={() => {
                      i18n.changeLanguage('zh-CN')
                      localStorage.setItem('language', 'zh-CN')
                      setShowLangMenu(false)
                    }}
                    className={i18n.language === 'zh-CN' ? 'active' : ''}
                  >
                    简体中文
                  </button>
                  <button
                    onClick={() => {
                      i18n.changeLanguage('en-US')
                      localStorage.setItem('language', 'en-US')
                      setShowLangMenu(false)
                    }}
                    className={i18n.language === 'en-US' ? 'active' : ''}
                  >
                    English
                  </button>
                </div>
              )}
            </div>
            <button 
              className="dashboard__icon-btn" 
              title={t('dashboard.themeToggle')}
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link to="/" className="dashboard__icon-btn" title={t('menu.backToHome')}>
              <Home size={20} />
            </Link>
            <button 
              className="dashboard__icon-btn dashboard__icon-btn--logout" 
              title={t('common.logout')}
              onClick={handleLogout}
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="dashboard__main-content">
          <div className="dashboard__page-wrapper" key={location.pathname}>
            <Routes>
              <Route path="/" element={<Drivers />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="/drivers" element={<Drivers />} />
              <Route path="/shares" element={<Shares />} />
              <Route path="/links" element={<Links />} />
              <Route path="/users" element={<Users />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/metadata" element={<Metadata />} />
              <Route path="/backup" element={<Backup />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/search" element={<SearchManagement />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/load-balance" element={<LoadBalance />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}
