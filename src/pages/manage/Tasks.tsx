import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  RefreshCw, 
  Trash2, 
  Pause, 
  Play, 
  X, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  FileArchive,
  Upload,
  Download,
  Copy,
  Move,
  FolderInput,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check
} from 'lucide-react'
import { api } from '../../utils/api'
import '../../styles/components/tasks.scss'

interface Task {
  id: string
  task_type: string
  status: string
  name: string
  source_path: string
  target_path: string | null
  total_size: number
  processed_size: number
  total_files: number
  processed_files: number
  progress: number
  speed: number
  eta_seconds: number | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  error: string | null
  user_id: string | null
  username: string
  current_file: string | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface Filters {
  taskType: string
  status: string
}

export default function Tasks() {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState<Filters>({ taskType: '', status: '' })
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typeDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node) &&
          statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.post('/api/tasks/list', {
        page: pagination.page,
        page_size: pagination.pageSize,
        task_type: filters.taskType || undefined,
        status: filters.status || undefined,
      })
      if (response.data.data) {
        setTasks(response.data.data.tasks || [])
        setIsAdmin(response.data.data.is_admin || false)
        setPagination(prev => ({
          ...prev,
          total: response.data.data.total || 0,
          totalPages: response.data.data.total_pages || 0
        }))
      }
    } catch (error) {
      console.error('加载任务列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // 轮询任务列表（有进行中任务时每2秒刷新，否则不轮询）
  useEffect(() => {
    const hasActiveTasks = tasks.some(t => t.status === 'running' || t.status === 'pending' || t.status === 'paused')
    
    if (hasActiveTasks) {
      pollingIntervalRef.current = setInterval(() => {
        loadTasks()
      }, 2000)
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [tasks, loadTasks])

  const cancelTask = async (taskId: string) => {
    try {
      await api.post('/api/tasks/cancel', { task_id: taskId })
    } catch (error) {
      console.error('取消任务失败:', error)
    }
  }

  const pauseTask = async (taskId: string) => {
    try {
      await api.post('/api/tasks/pause', { task_id: taskId })
    } catch (error) {
      console.error('暂停任务失败:', error)
    }
  }

  const resumeTask = async (taskId: string) => {
    try {
      await api.post('/api/tasks/resume', { task_id: taskId })
    } catch (error) {
      console.error('继续任务失败:', error)
    }
  }

  const retryTask = async (taskId: string) => {
    try {
      await api.post('/api/tasks/retry', { task_id: taskId })
    } catch (error) {
      console.error('重试任务失败:', error)
    }
  }

  const removeTask = async (taskId: string) => {
    try {
      await api.post('/api/tasks/remove', { task_id: taskId })
      loadTasks()
    } catch (error) {
      console.error('删除任务失败:', error)
    }
  }

  const clearCompleted = async () => {
    try {
      await api.post('/api/tasks/clear')
      loadTasks()
    } catch (error) {
      console.error('清除完成任务失败:', error)
    }
  }

  const clearAllCompleted = async () => {
    try {
      await api.post('/api/tasks/clear_all')
      loadTasks()
    } catch (error) {
      console.error('清除所有完成任务失败:', error)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }))
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSecond: number) => {
    return formatSize(bytesPerSecond) + '/s'
  }

  const formatEta = (seconds: number | null) => {
    if (!seconds) return '--'
    if (seconds < 60) return `${seconds}秒`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}小时${mins}分`
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--'
    return new Date(isoString).toLocaleString('zh-CN')
  }

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'extract': return <FileArchive size={16} />
      case 'upload': return <Upload size={16} />
      case 'download': return <Download size={16} />
      case 'copy': return <Copy size={16} />
      case 'move': return <Move size={16} />
      default: return <FolderInput size={16} />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} className="tasks__status-icon tasks__status-icon--pending" />
      case 'running': return <Loader2 size={14} className="tasks__status-icon tasks__status-icon--running" />
      case 'completed': return <CheckCircle size={14} className="tasks__status-icon tasks__status-icon--completed" />
      case 'failed': return <AlertCircle size={14} className="tasks__status-icon tasks__status-icon--failed" />
      case 'cancelled': return <X size={14} className="tasks__status-icon tasks__status-icon--cancelled" />
      case 'paused': return <Pause size={14} className="tasks__status-icon tasks__status-icon--paused" />
      case 'interrupted': return <AlertCircle size={14} className="tasks__status-icon tasks__status-icon--interrupted" />
      default: return null
    }
  }

  const getStatusText = (status: string) => {
    const key = status.toLowerCase()
    return t(`tasks.statuses.${key}`, status)
  }

  const getTaskTypeText = (taskType: string) => {
    const key = taskType.toLowerCase()
    return t(`tasks.types.${key}`, taskType)
  }

  return (
    <div className="tasks">
      <div className="tasks__header">
        <h1>{t('tasks.title')}</h1>
        <div className="tasks__actions">
          <button className="tasks__btn tasks__btn--secondary" onClick={() => loadTasks()}>
            <RefreshCw size={16} />
            {t('tasks.refresh')}
          </button>
          <button className="tasks__btn tasks__btn--secondary" onClick={clearCompleted}>
            <Trash2 size={16} />
            {t('tasks.clearCompleted')}
          </button>
          {isAdmin && (
            <button className="tasks__btn tasks__btn--danger" onClick={clearAllCompleted}>
              <Trash2 size={16} />
              {t('tasks.clearAllCompleted')}
            </button>
          )}
        </div>
      </div>

      {/* 筛选器 - Apple Design 风格 */}
      <div className="tasks__toolbar">
        <div className="tasks__filter-row">
          {/* 任务类型下拉 */}
          <div className="tasks__select-group" ref={typeDropdownRef}>
            <label>{t('tasks.taskType')}</label>
            <div 
              className={`tasks__dropdown ${openDropdown === 'type' ? 'tasks__dropdown--open' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
            >
              <span className="tasks__dropdown-value">
                {filters.taskType ? t(`tasks.types.${filters.taskType.toLowerCase()}`) : t('tasks.all')}
              </span>
              <ChevronDown size={16} className="tasks__dropdown-arrow" />
              {openDropdown === 'type' && (
                <div className="tasks__dropdown-menu">
                  {[
                    { value: '', label: t('tasks.all') },
                    { value: 'extract', label: t('tasks.types.extract') },
                    { value: 'upload', label: t('tasks.types.upload') },
                    { value: 'download', label: t('tasks.types.download') },
                    { value: 'copy', label: t('tasks.types.copy') },
                    { value: 'move', label: t('tasks.types.move') },
                  ].map(option => (
                    <div 
                      key={option.value}
                      className={`tasks__dropdown-item ${filters.taskType === option.value ? 'tasks__dropdown-item--selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFilterChange('taskType', option.value)
                        setOpenDropdown(null)
                      }}
                    >
                      <span>{option.label}</span>
                      {filters.taskType === option.value && <Check size={14} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 状态下拉 */}
          <div className="tasks__select-group" ref={statusDropdownRef}>
            <label>{t('tasks.status')}</label>
            <div 
              className={`tasks__dropdown ${openDropdown === 'status' ? 'tasks__dropdown--open' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            >
              <span className="tasks__dropdown-value">
                {filters.status ? t(`tasks.statuses.${filters.status.toLowerCase()}`) : t('tasks.all')}
              </span>
              <ChevronDown size={16} className="tasks__dropdown-arrow" />
              {openDropdown === 'status' && (
                <div className="tasks__dropdown-menu">
                  {[
                    { value: '', label: t('tasks.all') },
                    { value: 'pending', label: t('tasks.statuses.pending') },
                    { value: 'running', label: t('tasks.statuses.running') },
                    { value: 'completed', label: t('tasks.statuses.completed') },
                    { value: 'failed', label: t('tasks.statuses.failed') },
                    { value: 'cancelled', label: t('tasks.statuses.cancelled') },
                    { value: 'paused', label: t('tasks.statuses.paused') },
                    { value: 'interrupted', label: t('tasks.statuses.interrupted') },
                  ].map(option => (
                    <div 
                      key={option.value}
                      className={`tasks__dropdown-item ${filters.status === option.value ? 'tasks__dropdown-item--selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFilterChange('status', option.value)
                        setOpenDropdown(null)
                      }}
                    >
                      <span>{option.label}</span>
                      {filters.status === option.value && <Check size={14} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="tasks__filter-info">
            {t('tasks.totalRecords', { count: pagination.total })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="tasks__loading">
          <Loader2 size={32} className="tasks__loading-icon" />
          <span>{t('tasks.loading')}</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="tasks__empty">
          <FolderInput size={48} />
          <p>{t('tasks.noTasks')}</p>
        </div>
      ) : (
        <>
          <div className="tasks__table-wrapper">
            <table className="tasks__table">
              <thead>
                <tr>
                  <th className="tasks__th-type">{t('tasks.taskType')}</th>
                  <th className="tasks__th-status">{t('tasks.status')}</th>
                  <th className="tasks__th-name">{t('tasks.taskName')}</th>
                  <th className="tasks__th-path">{t('tasks.sourcePath')}</th>
                  <th className="tasks__th-path">{t('tasks.targetPath')}</th>
                  <th className="tasks__th-progress">{t('tasks.progress')}</th>
                  <th className="tasks__th-creator">{t('tasks.creator')}</th>
                  <th className="tasks__th-time">{t('tasks.createdAt')}</th>
                  <th className="tasks__th-actions">{t('tasks.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} className={`tasks__row tasks__row--${task.status}`}>
                    <td className="tasks__td-type">
                      <div className="tasks__cell-type">
                        {getTaskIcon(task.task_type)}
                        <span>{getTaskTypeText(task.task_type)}</span>
                      </div>
                    </td>
                    <td className="tasks__td-status">
                      <div className={`tasks__status-badge tasks__status-badge--${task.status}`}>
                        {getStatusIcon(task.status)}
                        <span>{getStatusText(task.status)}</span>
                      </div>
                    </td>
                    <td className="tasks__td-name">
                      <div className="tasks__cell-name" title={task.name}>
                        {task.name}
                        {task.error && (
                          <span className="tasks__error-hint" title={task.error}>
                            <AlertCircle size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="tasks__td-path">
                      <span className="tasks__cell-path" title={task.source_path || '--'}>
                        {task.source_path || '--'}
                      </span>
                    </td>
                    <td className="tasks__td-path">
                      <span className="tasks__cell-path" title={task.target_path || '--'}>
                        {task.target_path || '--'}
                      </span>
                    </td>
                    <td className="tasks__td-progress">
                      <div className="tasks__cell-progress">
                        <div className="tasks__mini-progress">
                          <div 
                            className={`tasks__mini-progress-fill tasks__mini-progress-fill--${task.status}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="tasks__progress-text">{task.progress.toFixed(1)}%</span>
                        {task.status === 'running' && task.speed > 0 && (
                          <span className="tasks__speed">{formatSpeed(task.speed)}</span>
                        )}
                      </div>
                    </td>
                    <td className="tasks__td-creator">
                      <span className="tasks__cell-creator">{task.username}</span>
                    </td>
                    <td className="tasks__td-time">
                      <span className="tasks__cell-time">{formatTime(task.created_at)}</span>
                    </td>
                    <td className="tasks__td-actions">
                      <div className="tasks__cell-actions">
                        {/* 暂停/继续按钮 - 始终显示 */}
                        {task.status === 'paused' ? (
                          <button 
                            className="tasks__action-btn" 
                            title={t('tasks.resume')} 
                            onClick={() => resumeTask(task.id)}
                          >
                            <Play size={14} />
                          </button>
                        ) : (
                          <button 
                            className="tasks__action-btn" 
                            title={t('tasks.pause')} 
                            onClick={() => pauseTask(task.id)}
                            disabled={task.status !== 'running'}
                          >
                            <Pause size={14} />
                          </button>
                        )}
                        {/* 取消按钮 - 任务进行中时可用 */}
                        <button 
                          className="tasks__action-btn tasks__action-btn--danger" 
                          title={t('tasks.cancel')} 
                          onClick={() => cancelTask(task.id)}
                          disabled={!['running', 'paused', 'pending'].includes(task.status)}
                        >
                          <X size={14} />
                        </button>
                        {/* 重试按钮 - 失败/中断时可用 */}
                        <button 
                          className="tasks__action-btn" 
                          title={t('tasks.retry')} 
                          onClick={() => retryTask(task.id)}
                          disabled={!['failed', 'interrupted'].includes(task.status)}
                        >
                          <RotateCcw size={14} />
                        </button>
                        {/* 删除按钮 - 始终显示 */}
                        <button 
                          className="tasks__action-btn tasks__action-btn--danger" 
                          title={t('tasks.delete')} 
                          onClick={() => removeTask(task.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="tasks__pagination">
              <button 
                className="tasks__page-btn" 
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="tasks__page-info">
                {t('tasks.page', { current: pagination.page, total: pagination.totalPages })}
              </span>
              <button 
                className="tasks__page-btn" 
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
