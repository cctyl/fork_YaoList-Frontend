import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, Search, Link2, Copy, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Folder, File } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../components/Toast'
import { Select } from '../../components/Select'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import '../../styles/pages/links.scss'

interface DirectLink {
  id: number
  user_id: string | null
  sign: string
  path: string
  filename: string
  expires_at: string | null
  max_access_count: number | null
  access_count: number
  enabled: boolean
  created_at: string
  updated_at: string
  creator_name: string | null
}

interface FormData {
  path: string
  filename: string
  expires_at: string
  max_access_count: string
  enabled: boolean
}

const initialFormData: FormData = {
  path: '',
  filename: '',
  expires_at: '',
  max_access_count: '',
  enabled: true
}

export default function Links() {
  const { t } = useTranslation()
  const toast = useToast()
  const [links, setLinks] = useState<DirectLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showDrawer, setShowDrawer] = useState(false)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const [editingLink, setEditingLink] = useState<DirectLink | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showPathSelector, setShowPathSelector] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: number | null}>({show: false, id: null})
  const [files, setFiles] = useState<{name: string, path: string, is_dir: boolean}[]>([])
  const [currentBrowsePath, setCurrentBrowsePath] = useState('/')
  // Download domain from settings / 从设置获取下载域名
  const [downloadDomain, setDownloadDomain] = useState('')

  useEffect(() => {
    loadLinks()
    loadDownloadDomain()
  }, [page, perPage, search])
  
  // Load download domain from settings / 加载下载域名配置
  const loadDownloadDomain = async () => {
    try {
      const response = await fetch('/api/settings/public')
      if (response.ok) {
        const data = await response.json()
        setDownloadDomain(data.download_domain || '')
      }
    } catch {}
  }

  const loadLinks = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/api/direct_links?page=${page}&per_page=${perPage}${search ? `&search=${encodeURIComponent(search)}` : ''}`)
      setLinks(response.data.links || [])
      setTotal(response.data.total || 0)
      setTotalPages(response.data.total_pages || 0)
    } catch (err) {
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadFiles = async (path: string) => {
    try {
      const response = await api.post('/api/admin/fs/list', { path: path || '/' })
      if (response.data.code === 200) {
        const allFiles = response.data.data?.content || []
        const fileList = allFiles.map((f: any) => ({
          name: f.name,
          path: path === '/' ? `/${f.name}` : `${path}/${f.name}`,
          is_dir: f.is_dir
        }))
        // 目录排在前面
        fileList.sort((a: any, b: any) => {
          if (a.is_dir && !b.is_dir) return -1
          if (!a.is_dir && b.is_dir) return 1
          return a.name.localeCompare(b.name)
        })
        setFiles(fileList)
        setCurrentBrowsePath(path)
      }
    } catch (err) {
      console.error('加载文件列表失败:', err)
    }
  }

  const handleSelectFile = (file: {name: string, path: string, is_dir: boolean}) => {
    if (file.is_dir) {
      loadFiles(file.path)
    } else {
      setFormData({ ...formData, path: file.path, filename: file.name })
      setShowPathSelector(false)
    }
  }

  const handleOpenDrawer = (link?: DirectLink) => {
    if (link) {
      setEditingLink(link)
      setFormData({
        path: link.path,
        filename: link.filename,
        expires_at: link.expires_at || '',
        max_access_count: link.max_access_count?.toString() || '',
        enabled: link.enabled
      })
    } else {
      setEditingLink(null)
      setFormData(initialFormData)
    }
    setShowDrawer(true)
  }

  const handleCloseDrawer = () => {
    setDrawerClosing(true)
    setTimeout(() => {
      setShowDrawer(false)
      setDrawerClosing(false)
      setEditingLink(null)
      setFormData(initialFormData)
    }, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        expires_at: formData.expires_at || null,
        max_access_count: formData.max_access_count ? parseInt(formData.max_access_count) : null
      }
      
      if (editingLink) {
        await api.post(`/api/direct_links/${editingLink.id}`, data)
        toast.success('更新成功')
      } else {
        await api.post('/api/direct_links', data)
        toast.success('创建成功')
      }
      handleCloseDrawer()
      loadLinks()
    } catch (err: any) {
      toast.error(err.response?.data?.error || '操作失败')
    }
  }

  const handleDelete = (id: number) => {
    setDeleteConfirm({show: true, id})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return
    setDeleteConfirm({show: false, id: null})
    try {
      await api.post(`/api/direct_links/${deleteConfirm.id}/delete`)
      toast.success('删除成功')
      loadLinks()
    } catch (err) {
      toast.error('删除失败')
    }
  }

  const handleToggle = async (id: number) => {
    try {
      const response = await api.post(`/api/direct_links/${id}/toggle`)
      toast.success(response.data.message)
      loadLinks()
    } catch (err) {
      toast.error('操作失败')
    }
  }

  const copyLink = (link: DirectLink) => {
    // Use configured download domain or current origin / 使用配置的下载域名或当前域名
    const base = downloadDomain 
      ? (downloadDomain.startsWith('http') ? downloadDomain : `${window.location.protocol}//${downloadDomain}`)
      : window.location.origin
    const url = `${base}/dlink/${link.sign}/${encodeURIComponent(link.filename)}`
    navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const isExpired = (link: DirectLink) => {
    if (!link.expires_at) return false
    return new Date(link.expires_at) < new Date()
  }

  const isExhausted = (link: DirectLink) => {
    if (!link.max_access_count) return false
    return link.access_count >= link.max_access_count
  }

  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  if (loading && links.length === 0) {
    return (
      <div className="links__container">
        <div className="links__loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="links__container">
      <div className="links__header">
        <h1>{t('links.title', '直链管理')}</h1>
        <div className="links__actions">
          <div className="links__search">
            <Search size={18} />
            <input
              type="text"
              placeholder={t('links.searchPlaceholder', '搜索...')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="links__add-btn" onClick={() => handleOpenDrawer()}>
            <Plus size={18} />
            {t('links.add', '新建')}
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="links__empty">
          <Link2 size={48} strokeWidth={1.5} />
          <p>{t('links.empty', '暂无直链')}</p>
          <button onClick={() => handleOpenDrawer()}>
            <Plus size={18} />
            {t('links.add', '新建')}
          </button>
        </div>
      ) : (
        <>
          <div className="links__table-container">
            <table className="links__table">
              <thead>
                <tr>
                  <th className="links__col-creator">{t('links.creator', '创建者')}</th>
                  <th className="links__col-filename">{t('links.filename', '文件名')}</th>
                  <th className="links__col-path">{t('links.path', '路径')}</th>
                  <th className="links__col-created">{t('links.createdAt', '创建时间')}</th>
                  <th className="links__col-expires">{t('links.expiresAt', '到期时间')}</th>
                  <th className="links__col-access">{t('links.count', '次数')}</th>
                  <th className="links__col-status">{t('links.status', '状态')}</th>
                  <th className="links__col-actions">{t('common.actions', '操作')}</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <span className="links__creator">{link.creator_name || t('links.guest', '游客')}</span>
                    </td>
                    <td>
                      <div className="links__filename">
                        <Link2 size={14} />
                        <span title={link.filename}>{link.filename}</span>
                      </div>
                    </td>
                    <td>
                      <span className="links__path" title={link.path}>{link.path}</span>
                    </td>
                    <td>
                      <span className="links__date">{formatDate(link.created_at)}</span>
                    </td>
                    <td>
                      <span className="links__date">{link.expires_at ? formatDate(link.expires_at) : t('links.never', '永久')}</span>
                    </td>
                    <td>
                      <span className="links__access-count">
                        {link.access_count}/{link.max_access_count ?? '∞'}
                      </span>
                    </td>
                    <td>
                      <span 
                        className={`links__badge links__badge--clickable ${
                          !link.enabled ? 'links__badge--disabled' : 
                          isExpired(link) ? 'links__badge--expired' : 
                          isExhausted(link) ? 'links__badge--exhausted' : 
                          'links__badge--active'
                        }`}
                        onClick={() => handleToggle(link.id)}
                        title={t('links.clickToToggle', '点击切换')}
                      >
                        {!link.enabled ? t('links.disabled', '禁用') : 
                         isExpired(link) ? t('links.expired', '过期') : 
                         isExhausted(link) ? t('links.exhausted', '耗尽') : 
                         t('links.active', '正常')}
                      </span>
                    </td>
                    <td>
                      <div className="links__table-actions">
                        <button
                          className="links__action-btn"
                          title="复制链接"
                          onClick={() => copyLink(link)}
                        >
                          {copiedId === link.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <button
                          className="links__action-btn"
                          title="编辑"
                          onClick={() => handleOpenDrawer(link)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="links__action-btn links__action-btn--danger"
                          title="删除"
                          onClick={() => handleDelete(link.id)}
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

          <div className="links__pagination">
            <div className="links__pagination-info">
              <span>每页</span>
              <Select
                value={perPage.toString()}
                options={[
                  { value: '10', label: '10' },
                  { value: '20', label: '20' },
                  { value: '50', label: '50' }
                ]}
                onChange={(value) => { setPerPage(Number(value)); setPage(1); }}
              />
              <span>条，共 {total} 条</span>
            </div>
            <div className="links__pagination-controls">
              <button 
                className="links__page-btn"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                className="links__page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="links__page-numbers">
                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    className={`links__page-number ${pageNum === page ? 'links__page-number--active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              <button 
                className="links__page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} />
              </button>
              <button 
                className="links__page-btn"
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
        <div className={`links__drawer-overlay ${drawerClosing ? 'links__drawer-overlay--closing' : ''}`} onClick={handleCloseDrawer}>
          <div className={`links__drawer ${drawerClosing ? 'links__drawer--closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="links__drawer-header">
              <h2>{editingLink ? '编辑直链' : '新建直链'}</h2>
              <button className="links__drawer-close" onClick={handleCloseDrawer}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="links__drawer-body">
                <div className="links__form-field">
                  <label>文件路径 <span className="required">*</span></label>
                  <div className="links__path-input">
                    <input
                      type="text"
                      value={formData.path}
                      onChange={e => setFormData({ ...formData, path: e.target.value })}
                      placeholder="/path/to/file"
                      required
                      disabled={!!editingLink}
                    />
                    {!editingLink && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowPathSelector(true)
                          loadFiles('/')
                        }}
                      >
                        选择
                      </button>
                    )}
                  </div>
                </div>

                <div className="links__form-field">
                  <label>显示文件名 <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.filename}
                    onChange={e => setFormData({ ...formData, filename: e.target.value })}
                    placeholder="下载时显示的文件名"
                    required
                    disabled={!!editingLink}
                  />
                </div>

                <div className="links__form-field">
                  <label>过期时间</label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                  <span className="links__hint">留空表示永不过期</span>
                </div>

                <div className="links__form-field">
                  <label>最大访问次数</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_access_count}
                    onChange={e => setFormData({ ...formData, max_access_count: e.target.value })}
                    placeholder="不限制"
                  />
                  <span className="links__hint">留空表示不限制访问次数</span>
                </div>

                <div className="links__form-switches">
                  <label className="links__switch-label">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={e => setFormData({ ...formData, enabled: e.target.checked })}
                    />
                    <span>启用直链</span>
                  </label>
                </div>
              </div>

              <div className="links__drawer-footer">
                <button type="button" className="links__btn-cancel" onClick={handleCloseDrawer}>
                  取消
                </button>
                <button type="submit" className="links__btn-submit">
                  {editingLink ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPathSelector && (
        <div className="links__modal-overlay" onClick={() => setShowPathSelector(false)}>
          <div className="links__modal" onClick={e => e.stopPropagation()}>
            <div className="links__modal-header">
              <h3>选择文件</h3>
              <button onClick={() => setShowPathSelector(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="links__modal-body">
              <div className="links__path-breadcrumb">
                <button onClick={() => loadFiles('/')}>根目录</button>
                {currentBrowsePath !== '/' && currentBrowsePath.split('/').filter(Boolean).map((part, index, arr) => (
                  <span key={index}>
                    <span className="separator">/</span>
                    <button onClick={() => loadFiles('/' + arr.slice(0, index + 1).join('/'))}>
                      {part}
                    </button>
                  </span>
                ))}
              </div>
              <div className="links__file-list">
                {files.map(file => (
                  <div 
                    key={file.path} 
                    className={`links__file-item ${file.is_dir ? 'links__file-item--dir' : ''}`}
                    onClick={() => handleSelectFile(file)}
                  >
                    {file.is_dir ? <Folder size={18} /> : <File size={18} />}
                    <span>{file.name}</span>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="links__file-empty">
                    此目录为空
                  </div>
                )}
              </div>
            </div>
            <div className="links__modal-footer">
              <span className="links__current-path">{currentBrowsePath}</span>
              <button onClick={() => setShowPathSelector(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={t('links.deleteTitle', '删除直链')}
        message={t('links.confirmDelete', '确定要删除此直链吗？')}
        confirmText={t('common.confirm', '确认')}
        cancelText={t('common.cancel', '取消')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({show: false, id: null})}
        danger
      />
    </div>
  )
}
