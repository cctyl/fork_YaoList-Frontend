import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../utils/api'
import { useToast } from '../../components/Toast'

interface RegistrationConfig {
  registration_enabled: boolean
  email_available: boolean
  sms_available: boolean
}

export default function Register() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  
  const [config, setConfig] = useState<RegistrationConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [step, setStep] = useState(1)
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationTarget, setVerificationTarget] = useState('')
  const [verificationType, setVerificationType] = useState<'email' | 'sms'>('email')
  const [verificationCode, setVerificationCode] = useState('')
  
  const [captchaId, setCaptchaId] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  useEffect(() => {
    loadRegistrationConfig()
    fetchCaptcha()
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const loadRegistrationConfig = async () => {
    try {
      const response = await api.get('/api/auth/registration-config')
      if (response.data.code === 200) {
        const cfg = response.data.data as RegistrationConfig
        setConfig(cfg)
        if (cfg.email_available) {
          setVerificationType('email')
        } else if (cfg.sms_available) {
          setVerificationType('sms')
        }
      }
    } catch {
      toast.error(t('register.configFailed'))
    }
  }

  const fetchCaptcha = async () => {
    try {
      const response = await api.get('/api/auth/captcha')
      setCaptchaId(response.data.captcha_id)
      setCaptchaImage(response.data.captcha_image)
      setCaptchaCode('')
    } catch {}
  }

  const handleNextStep = async () => {
    if (!username) {
      toast.error(t('register.usernameRequired'))
      return
    }
    if (username.length < 3) {
      toast.error(t('register.usernameMinLength'))
      return
    }
    if (!password) {
      toast.error(t('register.passwordRequired'))
      return
    }
    if (password.length < 6) {
      toast.error(t('register.passwordMinLength'))
      return
    }
    if (password !== confirmPassword) {
      toast.error(t('register.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/auth/check-unique', { username })
      if (!response.data.available) {
        toast.error(response.data.errors?.[0] || t('register.usernameUnavailable'))
        return
      }
      setStep(2)
      fetchCaptcha()
    } catch {
      toast.error(t('register.usernameFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!verificationTarget) {
      toast.error(verificationType === 'email' ? t('register.emailRequired') : t('register.phoneRequired'))
      return
    }
    if (!captchaCode) {
      toast.error(t('register.captchaRequired'))
      return
    }

    setLoading(true)
    try {
      const checkData = verificationType === 'email' 
        ? { email: verificationTarget }
        : { phone: verificationTarget }
      const checkRes = await api.post('/api/auth/check-unique', checkData)
      if (!checkRes.data.available) {
        toast.error(checkRes.data.errors?.[0] || t('register.accountUsed'))
        setLoading(false)
        return
      }
    } catch {
      toast.error(t('register.checkFailed'))
      setLoading(false)
      return
    }
    setLoading(false)

    setSendingCode(true)
    try {
      const response = await api.post('/api/notifications/send-code', {
        target: verificationTarget,
        type: verificationType,
        captcha_id: captchaId,
        captcha_code: captchaCode
      })
      
      if (response.data.code === 200) {
        toast.success(t('register.sendSuccess'))
        setCountdown(60)
        setCodeSent(true)
      } else {
        toast.error(response.data.message || t('register.sendFailed'))
        fetchCaptcha()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('register.sendFailed'))
      fetchCaptcha()
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode) {
      toast.error(t('register.codeRequired'))
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/auth/register', {
        username,
        password,
        email: verificationType === 'email' ? verificationTarget : undefined,
        phone: verificationType === 'sms' ? verificationTarget : undefined,
        verification_code: verificationCode,
        verification_type: verificationType
      })

      if (response.data.code === 200) {
        toast.success(t('register.success'))
        navigate('/login')
      } else {
        toast.error(response.data.message || t('register.failed'))
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('register.failed'))
    } finally {
      setLoading(false)
    }
  }

  // 注册未开启
  if (config && !config.registration_enabled) {
    return (
      <>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '2rem 0' }}>
          {t('register.disabled')}
        </p>
        <button
          type="button"
          className="login__button"
          onClick={() => navigate('/login')}
        >
          {t('register.backToLogin')}
        </button>
      </>
    )
  }

  // 没有可用的验证方式
  if (config && !config.email_available && !config.sms_available) {
    return (
      <>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '2rem 0' }}>
          {t('register.noVerifyMethod')}
        </p>
        <button
          type="button"
          className="login__button"
          onClick={() => navigate('/login')}
        >
          {t('register.backToLogin')}
        </button>
      </>
    )
  }

  return (
    <>
      {step === 1 ? (
        <form key="step1" className="login__form" onSubmit={(e) => { e.preventDefault(); handleNextStep() }}>
          <div className="login__field">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('register.username')}
              autoComplete="username"
            />
          </div>

          <div className="login__field">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('register.password')}
              autoComplete="new-password"
            />
          </div>

          <div className="login__field">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('register.confirmPassword')}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="login__button" disabled={loading}>
            {loading ? t('register.checking') : t('register.nextStep')}
          </button>

          <div className="login__register">
            {t('register.hasAccount')}
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }}>{t('register.goLogin')}</a>
          </div>
        </form>
      ) : (
        <form key="step2" className="login__form" onSubmit={handleSubmit}>
          {config && config.email_available && config.sms_available && (
            <div className="login__toggle-tabs">
              <button
                type="button"
                className={`login__toggle-tab ${verificationType === 'email' ? 'login__toggle-tab--active' : ''}`}
                onClick={() => { setVerificationType('email'); setVerificationTarget(''); setCodeSent(false) }}
              >
                {t('register.emailVerify')}
              </button>
              <button
                type="button"
                className={`login__toggle-tab ${verificationType === 'sms' ? 'login__toggle-tab--active' : ''}`}
                onClick={() => { setVerificationType('sms'); setVerificationTarget(''); setCodeSent(false) }}
              >
                {t('register.smsVerify')}
              </button>
            </div>
          )}

          <div className="login__field">
            <input
              type={verificationType === 'email' ? 'email' : 'tel'}
              value={verificationTarget}
              onChange={(e) => setVerificationTarget(e.target.value)}
              placeholder={verificationType === 'email' ? t('register.email') : t('register.phone')}
              disabled={codeSent}
            />
          </div>

          {!codeSent ? (
            <>
              <div className="login__field login__captcha">
                <input
                  type="text"
                  value={captchaCode}
                  onChange={(e) => setCaptchaCode(e.target.value)}
                  placeholder={t('register.captcha')}
                  maxLength={4}
                />
                <img
                  src={captchaImage}
                  alt={t('register.captcha')}
                  onClick={fetchCaptcha}
                  title={t('register.clickToRefresh')}
                />
              </div>

              <button
                type="button"
                className="login__button login__button--secondary"
                onClick={handleSendCode}
                disabled={sendingCode || loading}
              >
                {sendingCode ? t('register.sending') : t('register.sendCode')}
              </button>
            </>
          ) : (
            <div className="login__success-hint">
              {t('register.codeSent')} {verificationTarget}
              {countdown > 0 && <span>（{countdown}{t('register.resendAfter')}）</span>}
            </div>
          )}

          <div className="login__field">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder={verificationType === 'email' ? t('register.emailCode') : t('register.smsCode')}
              maxLength={6}
            />
          </div>

          <div className="login__button-group">
            <button
              type="button"
              className="login__button login__button--outline"
              onClick={() => setStep(1)}
            >
              {t('register.prevStep')}
            </button>
            <button type="submit" className="login__button" disabled={loading}>
              {loading ? t('register.registering') : t('register.complete')}
            </button>
          </div>
        </form>
      )}
    </>
  )
}
