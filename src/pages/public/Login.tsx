import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../utils/api'
import { useToast } from '../../components/Toast'
import { useAuthContext } from './AuthLayout'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { allowRegistration } = useAuthContext()
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  
  // 页面加载时读取已保存的账号
  useEffect(() => {
    const savedUsername = localStorage.getItem('remembered_username')
    if (savedUsername) {
      setUsername(savedUsername)
      setRememberMe(true)
    }
  }, [])
  const [loading, setLoading] = useState(false)
  const [needCaptcha, setNeedCaptcha] = useState(false)
  const [captchaId, setCaptchaId] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [need2FA, setNeed2FA] = useState(false)
  const [totpCode, setTotpCode] = useState('')

  useEffect(() => {
    const checkCaptchaNeeded = async () => {
      try {
        const response = await api.get('/api/auth/check-captcha')
        if (response.data.need_captcha) {
          setNeedCaptcha(true)
        }
      } catch {}
    }
    
    checkCaptchaNeeded()
    
    const params = new URLSearchParams(window.location.search)
    const msg = params.get('msg')
    if (msg === 'guest_disabled') {
      toast.error(t('login.guestDisabled'))
      window.history.replaceState({}, '', window.location.pathname)
    } else if (msg === 'login_required') {
      toast.warning(t('login.loginRequired'))
      window.history.replaceState({}, '', window.location.pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const response = await api.get('/api/auth/captcha')
      setCaptchaId(response.data.captcha_id)
      setCaptchaImage(response.data.captcha_image)
      setCaptchaCode('')
    } catch (err) {
      console.error('Failed to get captcha', err)
    }
  }

  // 当需要验证码时自动获取
  useEffect(() => {
    if (needCaptcha) {
      fetchCaptcha()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needCaptcha])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const loginData: any = { username, password }
      if (needCaptcha) {
        loginData.captcha_id = captchaId
        loginData.captcha_code = captchaCode
      }
      if (need2FA) {
        loginData.totp_code = totpCode
      }
      await api.post('/api/auth/login', loginData)
      
      // 登录成功后处理记住账号
      if (rememberMe) {
        localStorage.setItem('remembered_username', username)
      } else {
        localStorage.removeItem('remembered_username')
      }
      
      onLogin()
    } catch (err: any) {
      const data = err.response?.data
      const errorMsg = data?.error || t('login.loginFailed')
      
      // 检查是否需要2FA
      if (data?.need_2fa) {
        setNeed2FA(true)
        if (!need2FA) {
          toast.info(t('login.enter2FA'))
        } else {
          toast.error(errorMsg, 5000)
        }
        setTotpCode('')
        setLoading(false)
        return
      }
      
      // 使用toast显示错误
      toast.error(errorMsg, 5000)
      
      // 如果需要验证码，刷新验证码
      if (data?.need_captcha) {
        if (!needCaptcha) {
          setNeedCaptcha(true)
        }
        // 无论是否已经需要验证码，都刷新
        fetchCaptcha()
      } else if (needCaptcha) {
        // 即使返回没有need_captcha，已经需要验证码的情况也刷新
        fetchCaptcha()
      }
      
      setLoading(false)
    }
  }

  return (
    <>
      <form className="login__form" onSubmit={handleSubmit}>
        <div className="login__field">
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('login.username')}
            required
            autoFocus
          />
        </div>

        <div className="login__field">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.password')}
            required
          />
        </div>

        {needCaptcha && (
          <div className="login__captcha">
            <input
              type="text"
              value={captchaCode}
              onChange={(e) => setCaptchaCode(e.target.value)}
              placeholder={t('login.captchaPlaceholder')}
              maxLength={4}
              required
            />
            {captchaImage && (
              <img 
                src={captchaImage} 
                alt="captcha" 
                onClick={fetchCaptcha}
                title={t('login.clickToRefresh')}
              />
            )}
          </div>
        )}

        {need2FA && (
          <div className="login__field login__2fa">
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('login.totpPlaceholder')}
              maxLength={6}
              required
              autoFocus
            />
            <span className="login__2fa-hint">{t('login.totpHint')}</span>
          </div>
        )}

        <div className="login__options">
          <label className="login__remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="login__checkbox">
              <svg viewBox="0 0 24 24" fill="none">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>{t('login.rememberMe')}</span>
          </label>
          <a href="/forgot-password" className="login__forgot" onClick={(e) => { e.preventDefault(); navigate('/forgot-password') }}>
            {t('login.forgotPassword')}
          </a>
        </div>

        <button type="submit" className="login__button" disabled={loading}>
          {loading ? t('login.loggingIn') : t('login.loginButton')}
        </button>

        <button type="button" className="login__guest-button" onClick={onLogin}>
          {t('login.guestAccess')}
        </button>

        {allowRegistration && (
          <div className="login__register">
            {t('login.noAccount')}
            <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register') }}>
              {t('login.goRegister')}
            </a>
          </div>
        )}
      </form>
    </>
  )
}
