import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, Check, Folder, FolderOpen, Lock, EyeOff, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../components/Toast'
import { Select } from '../../components/Select'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import '../../styles/pages/metadata.scss'

interface Meta {
  id: number
  path: string
  password: string | null
  p_sub: boolean
  write: boolean
  w_sub: boolean
  hide: string | null
  h_sub: boolean
  readme: string | null
  r_sub: boolean
  header: string | null
  header_sub: boolean
  created_at: string
  updated_at: string
}

interface FormData {
  path: string
  password: string
  p_sub: boolean
  write: boolean
  w_sub: boolean
  hide: string
  h_sub: boolean
  readme: string
  r_sub: boolean
  header: string
  header_sub: boolean
}

const initialFormData: FormData = {
  path: '/',
  password: '',
  p_sub: false,
  write: false,
  w_sub: false,
  hide: '',
  h_sub: false,
  readme: '',
  r_sub: false,
  header: '',
  header_sub: false
}

export default function Metadata() {
  const { t } = useTranslation()
  const toast = useToast()
  const [metas, setMetas] = useState<Meta[]>([])
  const [loading, setLoading] = useState(true)
  const [showDrawer, setShowDrawer] = useState(false)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [showPathSelector, setShowPathSelector] = useState(false)
  const [dirs, setDirs] = useState<{name: string, path: string}[]>([])
  const [currentBrowsePath, setCurrentBrowsePath] = useState('/')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: number | null}>({show: false, id: null})

  useEffect(() => {
    loadMetas()
  }, [page, perPage])

  const loadMetas = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/api/metas?page=${page}&per_page=${perPage}`)
      if (response.data.code === 200) {
        setMetas(response.data.data.content || [])
        setTotal(response.data.data.total || 0)
        setTotalPages(response.data.data.total_pages || 0)
      }
    } catch (err) {
      toast.error(t('metas.loadFailed') || '加载元信息失败')
    } finally {
      setLoading(false)
    }
  }

  const loadDirs = async (path: string) => {
    try {
      // 使用管理后台专用接口，不受密码/隐藏限制
      const response = await api.post('/api/admin/fs/list', { path: path || '/' })
      if (response.data.code === 200) {
        const allFiles = response.data.data?.content || []
        const directories = allFiles.filter((f: any) => f.is_dir).map((f: any) => ({
          name: f.name,
          path: path === '/' ? `/${f.name}` : `${path}/${f.name}`
        }))
        setDirs(directories)
        setCurrentBrowsePath(path)
      }
    } catch (err) {
      console.error('加载目录失败:', err)
    }
  }

  const handleOpenDrawer = (meta?: Meta) => {
    if (meta) {
      setEditingMeta(meta)
      setFormData({
        path: meta.path,
        password: meta.password || '',
        p_sub: meta.p_sub,
        write: meta.write,
        w_sub: meta.w_sub,
        hide: meta.hide || '',
        h_sub: meta.h_sub,
        readme: meta.readme || '',
        r_sub: meta.r_sub,
        header: meta.header || '',
        header_sub: meta.header_sub
      })
    } else {
      setEditingMeta(null)
      setFormData(initialFormData)
    }
    setShowDrawer(true)
  }

  const handleCloseDrawer = () => {
    setDrawerClosing(true)
    setTimeout(() => {
      setShowDrawer(false)
      setDrawerClosing(false)
      setEditingMeta(null)
      setFormData(initialFormData)
    }, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingMeta) {
        await api.post(`/api/metas/${editingMeta.id}`, formData)
        toast.success(t('metas.updateSuccess') || '更新成功')
      } else {
        await api.post('/api/metas', formData)
        toast.success(t('metas.createSuccess') || '创建成功')
      }
      handleCloseDrawer()
      loadMetas()
    } catch (err) {
      toast.error(t('metas.saveFailed') || '保存失败')
    }
  }

  const handleDelete = (id: number) => {
    setDeleteConfirm({show: true, id})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    setDeleteConfirm({show: false, id: null})
    try {
      await api.post(`/api/metas/${deleteConfirm.id}/delete`)
      toast.success(t('metas.deleteSuccess') || '删除成功')
      loadMetas()
    } catch (err) {
      toast.error(t('metas.deleteFailed') || '删除失败')
    }
  }

  const handleSelectPath = (path: string) => {
    setFormData({ ...formData, path })
    setShowPathSelector(false)
  }

  if (loading) {
    return (
      <div className="metadata">
        <div className="metadata__loading">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="metadata">
      <div className="metadata__header">
        <div className="metadata__header-left">
          <h1>{t('metas.title') || '元信息'}</h1>
          <p className="metadata__subtitle">
            {t('metas.description') || '元信息内的配置对所有角色生效，如果想让用户有相应的权限请前往用户管理进行修改'}
          </p>
        </div>
        <button className="metadata__add-btn" onClick={() => handleOpenDrawer()}>
          <Plus size={18} />
          {t('metas.add') || '添加'}
        </button>
      </div>

      {metas.length === 0 && !loading ? (
        <div className="metadata__empty">
          <div className="metadata__empty-icon">
            <FolderOpen size={56} strokeWidth={1.2} />
          </div>
          <h3>{t('metas.noMetas') || '暂无元信息'}</h3>
          <p>{t('metas.emptyTip') || '元信息可以为特定路径设置访问密码、写入权限和隐藏规则'}</p>
          <button className="metadata__empty-btn" onClick={() => handleOpenDrawer()}>
            <Plus size={18} />
            <span>{t('metas.addFirst') || '添加第一条元信息'}</span>
          </button>
        </div>
      ) : (
        <>
          <div className="metadata__table-wrapper">
            <table className="metadata__table">
              <thead>
                <tr>
                  <th className="metadata__col-path">{t('metas.path') || '路径'}</th>
                  <th className="metadata__col-status">{t('metas.password') || '密码'}</th>
                  <th className="metadata__col-status">{t('metas.write') || '写入'}</th>
                  <th className="metadata__col-status">{t('metas.hide') || '隐藏'}</th>
                  <th className="metadata__col-preview">{t('metas.header') || '顶部说明'}</th>
                  <th className="metadata__col-preview">{t('metas.readme') || '说明'}</th>
                  <th className="metadata__col-actions">{t('common.operations') || '操作'}</th>
                </tr>
              </thead>
              <tbody>
                {metas.map(meta => (
                  <tr key={meta.id}>
                    <td>
                      <div className="metadata__path-cell">
                        <FolderOpen size={16} />
                        <span>{meta.path}</span>
                      </div>
                    </td>
                    <td>
                      {meta.password ? (
                        <span className="metadata__badge metadata__badge--warning">
                          <Lock size={12} />
                          {meta.p_sub && <span className="metadata__sub-tag">+子</span>}
                        </span>
                      ) : (
                        <span className="metadata__badge metadata__badge--muted">-</span>
                      )}
                    </td>
                    <td>
                      {meta.write ? (
                        <span className="metadata__badge metadata__badge--success">
                          <Check size={12} />
                          {meta.w_sub && <span className="metadata__sub-tag">+子</span>}
                        </span>
                      ) : (
                        <span className="metadata__badge metadata__badge--muted">-</span>
                      )}
                    </td>
                    <td>
                      {meta.hide ? (
                        <span className="metadata__badge metadata__badge--info">
                          <EyeOff size={12} />
                          {meta.h_sub && <span className="metadata__sub-tag">+子</span>}
                        </span>
                      ) : (
                        <span className="metadata__badge metadata__badge--muted">-</span>
                      )}
                    </td>
                    <td>
                      {meta.header ? (
                        <span className="metadata__text-preview" title={meta.header}>
                          {meta.header.substring(0, 20)}{meta.header.length > 20 ? '...' : ''}
                          {meta.header_sub && <span className="metadata__sub-tag">+子</span>}
                        </span>
                      ) : (
                        <span className="metadata__badge metadata__badge--muted">-</span>
                      )}
                    </td>
                    <td>
                      {meta.readme ? (
                        <span className="metadata__text-preview" title={meta.readme}>
                          {meta.readme.substring(0, 20)}{meta.readme.length > 20 ? '...' : ''}
                          {meta.r_sub && <span className="metadata__sub-tag">+子</span>}
                        </span>
                      ) : (
                        <span className="metadata__badge metadata__badge--muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="metadata__actions">
                        <button 
                          className="metadata__action-btn" 
                          onClick={() => handleOpenDrawer(meta)}
                          title={t('common.edit') || '编辑'}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="metadata__action-btn metadata__action-btn--danger" 
                          onClick={() => handleDelete(meta.id)}
                          title={t('common.delete') || '删除'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="metadata__footer">
            <div className="metadata__page-size-selector">
              <span>{t('common.total') || '共'} {total} {t('common.items') || '条'}，{t('common.perPage') || '每页'}</span>
              <Select
                value={perPage.toString()}
                options={[
                  { value: '10', label: '10' },
                  { value: '20', label: '20' },
                  { value: '50', label: '50' },
                ]}
                onChange={(value) => { setPerPage(Number(value)); setPage(1); }}
              />
            </div>
            <div className="metadata__pagination">
              <button 
                className="metadata__page-btn"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                className="metadata__page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="metadata__page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`metadata__page-number ${page === pageNum ? 'metadata__page-number--active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button 
                className="metadata__page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
              <button 
                className="metadata__page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {showDrawer && (
        <div className={`metadata__drawer-overlay ${drawerClosing ? 'metadata__drawer-overlay--closing' : ''}`} onClick={handleCloseDrawer}>
          <div className={`metadata__drawer ${drawerClosing ? 'metadata__drawer--closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="metadata__drawer-header">
              <h2>{editingMeta ? (t('metas.edit') || '编辑') : (t('metas.add') || '添加')}</h2>
              <button className="metadata__drawer-close" onClick={handleCloseDrawer}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="metadata__drawer-body">
                <div className="metadata__form-section">
                  <div className="metadata__form-field">
                  <label>{t('metas.path') || '路径'} <span className="required">*</span></label>
                  <div className="metadata__path-input">
                    <input
                      type="text"
                      value={formData.path}
                      onChange={e => setFormData({ ...formData, path: e.target.value })}
                      placeholder="/"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowPathSelector(true)
                        loadDirs('/')
                      }}
                    >
                      {t('metas.select') || '选择'}
                    </button>
                  </div>
                </div>

                <div className="metadata__form-field">
                  <label>{t('metas.password') || '密码'}</label>
                  <div className="metadata__field-with-checkbox">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t('metas.passwordPlaceholder') || '访问此路径需要的密码'}
                    />
                    <label className="metadata__checkbox">
                      <input
                        type="checkbox"
                        checked={formData.p_sub}
                        onChange={e => setFormData({ ...formData, p_sub: e.target.checked })}
                      />
                      <span>{t('metas.applySub') || '应用到子文件夹'}</span>
                    </label>
                  </div>
                </div>

                <div className="metadata__form-field">
                  <label>{t('metas.write') || '写入'}</label>
                  <div className="metadata__field-with-checkbox">
                    <label className="metadata__switch">
                      <input
                        type="checkbox"
                        checked={formData.write}
                        onChange={e => setFormData({ ...formData, write: e.target.checked })}
                      />
                      <span className="metadata__switch-slider"></span>
                    </label>
                    <label className="metadata__checkbox">
                      <input
                        type="checkbox"
                        checked={formData.w_sub}
                        onChange={e => setFormData({ ...formData, w_sub: e.target.checked })}
                      />
                      <span>{t('metas.applySub') || '应用到子文件夹'}</span>
                    </label>
                  </div>
                </div>

                <div className="metadata__form-field">
                  <label>{t('metas.hide') || '隐藏'}</label>
                  <div className="metadata__field-with-checkbox">
                    <textarea
                      value={formData.hide}
                      onChange={e => setFormData({ ...formData, hide: e.target.value })}
                      placeholder="正则表达式"
                      rows={2}
                    />
                    <label className="metadata__checkbox">
                      <input
                        type="checkbox"
                        checked={formData.h_sub}
                        onChange={e => setFormData({ ...formData, h_sub: e.target.checked })}
                      />
                      <span>{t('metas.applySub') || '应用到子文件夹'}</span>
                    </label>
                  </div>
                </div>

                <div className="metadata__form-field">
                  <label>{t('metas.header') || '顶部说明'}</label>
                  <div className="metadata__field-with-checkbox">
                    <textarea
                      value={formData.header}
                      onChange={e => setFormData({ ...formData, header: e.target.value })}
                      placeholder="Markdown"
                      rows={2}
                    />
                    <label className="metadata__checkbox">
                      <input
                        type="checkbox"
                        checked={formData.header_sub}
                        onChange={e => setFormData({ ...formData, header_sub: e.target.checked })}
                      />
                      <span>{t('metas.applySub') || '应用到子文件夹'}</span>
                    </label>
                  </div>
                </div>

                <div className="metadata__form-field">
                  <label>{t('metas.readme') || '说明'}</label>
                  <div className="metadata__field-with-checkbox">
                    <textarea
                      value={formData.readme}
                      onChange={e => setFormData({ ...formData, readme: e.target.value })}
                      placeholder="Markdown"
                      rows={2}
                    />
                    <label className="metadata__checkbox">
                      <input
                        type="checkbox"
                        checked={formData.r_sub}
                        onChange={e => setFormData({ ...formData, r_sub: e.target.checked })}
                      />
                      <span>{t('metas.applySub') || '应用到子文件夹'}</span>
                    </label>
                  </div>
                  </div>
                </div>
              </div>
              <div className="metadata__drawer-footer">
                <button type="button" className="metadata__btn-cancel" onClick={handleCloseDrawer}>
                  {t('common.cancel') || '取消'}
                </button>
                <button type="submit" className="metadata__btn-submit">
                  {editingMeta ? (t('common.save') || '保存') : (t('common.add') || '添加')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPathSelector && (
        <div className="metadata__modal-overlay" onClick={() => setShowPathSelector(false)}>
          <div className="metadata__modal" onClick={e => e.stopPropagation()}>
            <div className="metadata__modal-header">
              <h3>{t('metas.selectPath') || '选择路径'}</h3>
              <button onClick={() => setShowPathSelector(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="metadata__modal-body">
              <div className="metadata__path-breadcrumb">
                <button onClick={() => loadDirs('/')}>根目录</button>
                {currentBrowsePath !== '/' && currentBrowsePath.split('/').filter(Boolean).map((part, index, arr) => (
                  <span key={index}>
                    <span className="separator">/</span>
                    <button onClick={() => loadDirs('/' + arr.slice(0, index + 1).join('/'))}>
                      {part}
                    </button>
                  </span>
                ))}
              </div>
              <div className="metadata__dir-list">
                {dirs.map(dir => (
                  <div 
                    key={dir.path} 
                    className="metadata__dir-item"
                    onClick={() => loadDirs(dir.path)}
                  >
                    <Folder size={18} />
                    <span>{dir.name}</span>
                  </div>
                ))}
                {dirs.length === 0 && (
                  <div className="metadata__dir-empty">
                    {t('metas.noSubfolders') || '没有子文件夹'}
                  </div>
                )}
              </div>
            </div>
            <div className="metadata__modal-footer">
              <span className="metadata__current-path">{currentBrowsePath}</span>
              <button onClick={() => handleSelectPath(currentBrowsePath)}>
                {t('metas.confirmSelect') || '选择此路径'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={t('metas.deleteTitle', '删除元信息')}
        message={t('metas.confirmDelete', '确定要删除此元信息吗？')}
        confirmText={t('common.confirm', '确认')}
        cancelText={t('common.cancel', '取消')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({show: false, id: null})}
        danger
      />
    </div>
  )
}
