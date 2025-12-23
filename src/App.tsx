import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { ToastProvider } from './components/Toast'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import ForgotPassword from './pages/public/ForgotPassword'
import AuthLayout from './pages/public/AuthLayout'
import Dashboard from './pages/manage/Dashboard'
import FileRouter from './pages/public/FileRouter'
import ShareView from './pages/public/ShareView'
import { api } from './utils/api'

// Admin dashboard wrapper component: requires authentication and admin privileges / 后台管理页面包装组件
function ProtectedDashboard({ onLogout }: { onLogout: () => void }) {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'not_authenticated' | 'not_admin'>('loading')
  const hasChecked = useRef(false)

  useEffect(() => {
    if (!hasChecked.current) {
      hasChecked.current = true
      checkAuth()
    }
  }, [])

  const checkAuth = async () => {
    try {
      const res = await api.get('/api/auth/permissions')
      if (res.data.is_guest) {
        // Guests cannot access dashboard / 游客不能进入后台
        setAuthState('not_authenticated')
      } else if (!res.data.permissions?.is_admin) {
        // Non-admins cannot access dashboard / 非管理员不能进入后台
        setAuthState('not_admin')
      } else {
        setAuthState('authenticated')
      }
    } catch {
      setAuthState('not_authenticated')
    }
  }

  if (authState === 'loading') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--text-secondary)'
      }}>
        加载中...
      </div>
    )
  }

  if (authState === 'not_authenticated') {
    return <Navigate to="/login?msg=login_required" replace />
  }

  if (authState === 'not_admin') {
    return <Navigate to="/?msg=admin_required" replace />
  }

  return <Dashboard onLogout={onLogout} />
}

function App() {
  const handleLogout = () => {
    // 退出后跳转到登录页
    window.location.href = '/login'
  }

  const handleLogin = () => {
    // 登录成功后跳转到首页
    window.location.href = '/'
  }

  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route 
          path="/manage/*" 
          element={<ProtectedDashboard onLogout={handleLogout} />} 
        />
        <Route 
          path="/share/:shortId" 
          element={<ShareView />} 
        />
        <Route 
          path="/*" 
          element={<FileRouter />} 
        />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  )
}

export default App
