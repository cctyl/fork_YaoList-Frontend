import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../../utils/api'
import { useToast } from '../../components/Toast'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1) // 1: 输入邮箱/手机, 2: 输入验证码和新密码
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const [targetType, setTargetType] = useState<'email' | 'sms'>('email')
  const [target, setTarget] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaImage, setCaptchaImage] = useState('')
  const [captchaCode, setCaptchaCode] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  useEffect(() => {
    fetchCaptcha()
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const fetchCaptcha = async () => {
    try {
      const response = await api.get('/api/auth/captcha')
      setCaptchaId(response.data.captcha_id)
      setCaptchaImage(response.data.captcha_image)
      setCaptchaCode('')
    } catch {}
  }

  const handleSendCode = async () => {
    if (!target) {
      toast.error(targetType === 'email' ? t('forgot.emailRequired') : t('forgot.phoneRequired'))
      return
    }
    if (!captchaCode) {
      toast.error(t('forgot.captchaRequired'))
      return
    }

    setSendingCode(true)
    try {
      const response = await api.post('/api/auth/forgot-password', {
        target,
        target_type: targetType,
        captcha_id: captchaId,
        captcha_code: captchaCode
      })
      
      if (response.data.code === 200) {
        toast.success(t('forgot.codeSentSuccess'))
        setCountdown(60)
        setCodeSent(true)
        setStep(2)
      } else {
        toast.error(response.data.message || t('forgot.sendFailed'))
        fetchCaptcha()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('forgot.sendFailed'))
      fetchCaptcha()
    } finally {
      setSendingCode(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode) {
      toast.error(t('forgot.codeRequired'))
      return
    }
    if (!newPassword) {
      toast.error(t('forgot.newPasswordRequired'))
      return
    }
    if (newPassword.length < 6) {
      toast.error(t('forgot.passwordMinLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('forgot.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/auth/reset-password', {
        target,
        target_type: targetType,
        verification_code: verificationCode,
        new_password: newPassword
      })

      if (response.data.code === 200) {
        toast.success(t('forgot.resetSuccess'))
        navigate('/login')
      } else {
        toast.error(response.data.message || t('forgot.resetFailed'))
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('forgot.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {step === 1 ? (
        <form key="step1" className="login__form" onSubmit={(e) => { e.preventDefault(); handleSendCode() }}>
          <div className="login__toggle-tabs">
            <button
              type="button"
              className={`login__toggle-tab ${targetType === 'email' ? 'login__toggle-tab--active' : ''}`}
              onClick={() => { setTargetType('email'); setTarget('') }}
            >
              {t('forgot.emailVerify')}
            </button>
            <button
              type="button"
              className={`login__toggle-tab ${targetType === 'sms' ? 'login__toggle-tab--active' : ''}`}
              onClick={() => { setTargetType('sms'); setTarget('') }}
            >
              {t('forgot.smsVerify')}
            </button>
          </div>

          <div className="login__field">
            <input
              type={targetType === 'email' ? 'email' : 'tel'}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={targetType === 'email' ? t('forgot.emailPlaceholder') : t('forgot.phonePlaceholder')}
            />
          </div>

          <div className="login__field login__captcha">
            <input
              type="text"
              value={captchaCode}
              onChange={(e) => setCaptchaCode(e.target.value)}
              placeholder={t('forgot.captchaPlaceholder')}
              maxLength={4}
            />
            <img
              src={captchaImage}
              alt="验证码"
              onClick={fetchCaptcha}
              title={t('forgot.clickToRefresh')}
            />
          </div>

          <button type="submit" className="login__button" disabled={sendingCode}>
            {sendingCode ? t('forgot.sending') : t('forgot.sendCode')}
          </button>

          <div className="login__register">
            {t('forgot.rememberPassword')}
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login') }}>{t('forgot.goLogin')}</a>
          </div>
        </form>
      ) : (
        <form key="step2" className="login__form" onSubmit={handleResetPassword}>
          {codeSent && (
            <div className="login__success-hint">
              {t('forgot.codeSentTo')} {target}
              {countdown > 0 && <span>（{countdown}{t('forgot.resendAfter')}）</span>}
            </div>
          )}

          <div className="login__field">
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder={t('forgot.codePlaceholder')}
              maxLength={6}
            />
          </div>

          <div className="login__field">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('forgot.newPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          <div className="login__field">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('forgot.confirmPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          <div className="login__button-group">
            <button
              type="button"
              className="login__button login__button--outline"
              onClick={() => { setStep(1); setCodeSent(false) }}
            >
              {t('forgot.prevStep')}
            </button>
            <button type="submit" className="login__button" disabled={loading}>
              {loading ? t('forgot.resetting') : t('forgot.resetPassword')}
            </button>
          </div>
        </form>
      )}
    </>
  )
}
