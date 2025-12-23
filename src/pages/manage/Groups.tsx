import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, X, CheckCircle, XCircle, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { api } from "../../utils/api";
import { useToast } from "../../components/Toast";
import { Select } from "../../components/Select";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import "../../styles/pages/groups.scss";
import "../../styles/components/batch-bar.scss"

interface UserGroup {
  id: number
  name: string
  description: string | null
  is_admin: boolean
  allow_direct_link: boolean
  allow_share: boolean
  show_hidden_files: boolean
  no_password_access: boolean
  add_offline_download: boolean
  create_upload: boolean
  rename_files: boolean
  move_files: boolean
  copy_files: boolean
  delete_files: boolean
  read_files: boolean
  read_compressed: boolean
  extract_files: boolean
  webdav_enabled: boolean
  ftp_enabled: boolean
  root_path: string | null
  created_at: string
  updated_at: string
  user_count?: number
}

interface PaginationData {
  groups: UserGroup[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export default function Groups() {
  const { t } = useTranslation()
  const toast = useToast()
  const [data, setData] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null)
  const [filters, setFilters] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_admin: false,
    allow_direct_link: false,
    allow_share: false,
    show_hidden_files: false,
    no_password_access: false,
    add_offline_download: false,
    create_upload: false,
    rename_files: false,
    move_files: false,
    copy_files: false,
    delete_files: false,
    read_files: true,
    read_compressed: false,
    extract_files: false,
    webdav_enabled: false,
    ftp_enabled: false,
    root_path: ''
  })
  const [selectedGroups, setSelectedGroups] = useState<number[]>([])
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const permissionInputRef = useRef<HTMLDivElement>(null)
  const permissionDropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} })

  useEffect(() => {
    loadGroups()
  }, [currentPage, search, pageSize, filters])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showPermissionsModal) {
        const isInsideInput = permissionInputRef.current?.contains(e.target as Node)
        const isInsideDropdown = permissionDropdownRef.current?.contains(e.target as Node)
        if (!isInsideInput && !isInsideDropdown) {
          setShowPermissionsModal(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPermissionsModal])

  useEffect(() => {
    if (editingGroup) {
      setFormData({
        name: editingGroup.name,
        description: editingGroup.description || '',
        is_admin: editingGroup.is_admin,
        allow_direct_link: editingGroup.allow_direct_link,
        allow_share: editingGroup.allow_share,
        show_hidden_files: editingGroup.show_hidden_files,
        no_password_access: editingGroup.no_password_access,
        add_offline_download: editingGroup.add_offline_download,
        create_upload: editingGroup.create_upload,
        rename_files: editingGroup.rename_files,
        move_files: editingGroup.move_files,
        copy_files: editingGroup.copy_files,
        delete_files: editingGroup.delete_files,
        read_files: editingGroup.read_files,
        read_compressed: editingGroup.read_compressed,
        extract_files: editingGroup.extract_files,
        webdav_enabled: editingGroup.webdav_enabled,
        ftp_enabled: editingGroup.ftp_enabled,
        root_path: editingGroup.root_path || ''
      })
    } else {
      setFormData({
        name: '',
        description: '',
        is_admin: false,
        allow_direct_link: false,
        allow_share: false,
        show_hidden_files: false,
        no_password_access: false,
        add_offline_download: false,
        create_upload: false,
        rename_files: false,
        move_files: false,
        copy_files: false,
        delete_files: false,
        read_files: true,
        read_compressed: false,
        extract_files: false,
        webdav_enabled: false,
        ftp_enabled: false,
        root_path: ''
      })
    }
  }, [editingGroup])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
      })
      if (search) {
        params.append('search', search)
      }
      const response = await api.get(`/api/groups?${params}`)
      setData(response.data)
    } catch (err) {
      toast.error(t('groups.loadFailed'))
      console.error('加载用户组失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }


  const handleDelete = (groupId: number, groupName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: t('groups.deleteConfirm'),
      message: `${t('groups.deleteConfirmMessage')} "${groupName}"?`,
      onConfirm: async () => {
        try {
          await api.post(`/api/groups/${groupId}/delete`)
          toast.success(t('groups.deleteSuccess'))
          loadGroups()
        } catch (err) {
          toast.error(t('groups.deleteFailed'))
        }
        setConfirmDialog({ ...confirmDialog, isOpen: false })
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingGroup) {
        await api.post(`/api/groups/${editingGroup.id}`, formData)
        toast.success(t('groups.updateSuccess'))
      } else {
        await api.post('/api/groups', formData)
        toast.success(t('groups.createSuccess'))
      }
      setShowEditDialog(false)
      setEditingGroup(null)
      loadGroups()
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('groups.operationFailed'))
    }
  }

  if (loading && !data) {
    return (
      <div className="groups__container">
        <div className="groups__loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="groups__container">
      <div className="groups__header">
        <h1>{t('groups.title')}</h1>
        <div className="groups__actions">
          
          <div className="groups__search">
            <Search size={18} />
            <input
              type="text"
              placeholder={t('groups.searchPlaceholder')}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <button 
            className="groups__add-btn"
            onClick={() => {
              setEditingGroup(null)
              setShowEditDialog(true)
            }}
          >
            <Plus size={18} />
            {t('groups.addGroup')}
          </button>
        </div>
      </div>

      {selectedGroups.length > 0 && (
        <div className="groups__batch-bar">
          <span className="groups__batch-count">{t('groups.batchSelected')} {selectedGroups.length}</span>
          <div className="groups__batch-actions">
            <button className="groups__batch-btn">{t('groups.batchEnable')}</button>
            <button className="groups__batch-btn">{t('groups.batchDisable')}</button>
            <button className="groups__batch-btn">{t('groups.batchEdit')}</button>
            <button className="groups__batch-btn">{t('groups.batchPermissions')}</button>
            <button className="groups__batch-btn groups__batch-btn--danger">{t('groups.batchDelete')}</button>
            <button className="groups__batch-btn" onClick={() => setSelectedGroups([])}>{t('groups.cancelSelection')}</button>
          </div>
        </div>
      )}

      <div className="groups__table-container">
        <table className="groups__table">
                    <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedGroups.length === (data?.groups.length || 0) && (data?.groups.length || 0) > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedGroups(data.groups.map(g => g.id))
                    } else {
                      setSelectedGroups([])
                    }
                  }}
                />
              </th>
              <th>{t('groups.id')}</th>
              <th>{t('groups.name')}</th>
              <th>{t('groups.description')}</th>
              <th>{t('groups.userCount')}</th>
              <th>{t('groups.permissions')}</th>
              <th>{t('groups.createdAt')}</th>
              <th>{t('groups.actions')}</th>
            </tr>
          </thead>
          <tbody>
                        {data?.groups.map((group) => (
              <tr key={group.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroups([...selectedGroups, group.id])
                      } else {
                        setSelectedGroups(selectedGroups.filter(id => id !== group.id))
                      }
                    }}
                  />
                </td>
                <td>
                  <code className="groups__unique-id">{group.id}</code>
                </td>
                <td>
                  <div className="groups__name">
                    {group.name}
                    {group.is_admin && <span className="groups__admin-badge">Admin</span>}
                  </div>
                </td>
                <td>
                  <span className="groups__description">{group.description || '-'}</span>
                </td>
                <td>
                  <span className="groups__user-count">{group.user_count || 0}</span>
                </td>
                <td>
                  <div className="groups__permissions">
                    <span className={`groups__perm-dot ${group.read_files ? 'groups__perm-dot--active' : ''}`} title={t('groups.readFiles')}></span>
                    <span className={`groups__perm-dot ${group.create_upload ? 'groups__perm-dot--active' : ''}`} title={t('groups.createUpload')}></span>
                    <span className={`groups__perm-dot ${group.rename_files ? 'groups__perm-dot--active' : ''}`} title={t('groups.renameFiles')}></span>
                    <span className={`groups__perm-dot ${group.move_files ? 'groups__perm-dot--active' : ''}`} title={t('groups.moveFiles')}></span>
                    <span className={`groups__perm-dot ${group.copy_files ? 'groups__perm-dot--active' : ''}`} title={t('groups.copyFiles')}></span>
                    <span className={`groups__perm-dot ${group.delete_files ? 'groups__perm-dot--active' : ''}`} title={t('groups.deleteFiles')}></span>
                    <span className={`groups__perm-dot ${group.allow_direct_link ? 'groups__perm-dot--active' : ''}`} title={t('groups.allowDirectLink')}></span>
                    <span className={`groups__perm-dot ${group.allow_share ? 'groups__perm-dot--active' : ''}`} title={t('groups.allowShare')}></span>
                    <span className={`groups__perm-dot ${group.webdav_enabled ? 'groups__perm-dot--active' : ''}`} title={t('groups.webdavEnabled')}></span>
                    <span className={`groups__perm-dot ${group.ftp_enabled ? 'groups__perm-dot--active' : ''}`} title={t('groups.ftpEnabled')}></span>
                  </div>
                </td>
                <td>
                  <span className="groups__timestamp">
                    {new Date(group.created_at).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}
                  </span>
                </td>
                <td>
                  <div className="groups__table-actions">
                    <button 
                      className="groups__icon-btn"
                      title={t('groups.edit')}
                      onClick={() => {
                        setEditingGroup(group)
                        setShowEditDialog(true)
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="groups__icon-btn groups__icon-btn--danger" 
                      title={t('groups.delete')}
                      onClick={() => handleDelete(group.id, group.name)}
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

      {data && (
        <div className="groups__footer">
          <div className="groups__page-size-selector">
            <span>{t('groups.perPage')}</span>
            <Select
              value={pageSize.toString()}
              onChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
              options={[
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '50', label: '50' },
                { value: '100', label: '100' }
              ]}
            />
            <span>{t('groups.items')}</span>
          </div>
          
          <div className="groups__pagination">
            <button
              className="groups__page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title={t('groups.firstPage')}
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className="groups__page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              title={t('groups.prevPage')}
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="groups__page-numbers">
              {Array.from({ length: Math.min(5, data.total_pages) }, (_, i) => {
                let pageNum;
                if (data.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= data.total_pages - 2) {
                  pageNum = data.total_pages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    className={`groups__page-number ${currentPage === pageNum ? 'users__page-number--active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              className="groups__page-btn"
              disabled={currentPage === data.total_pages}
              onClick={() => setCurrentPage(currentPage + 1)}
              title="下一页"
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="groups__page-btn"
              disabled={currentPage === data.total_pages}
              onClick={() => setCurrentPage(data.total_pages)}
              title="末页"
            >
              <ChevronsRight size={16} />
            </button>
            
            <div className="groups__page-jump">
              <span>{t('groups.jumpTo')}</span>
              <input
                type="number"
                min="1"
                max={data.total_pages}
                value={currentPage}
                onChange={(e) => {
                  const page = Number(e.target.value)
                  if (page >= 1 && page <= data.total_pages) {
                    setCurrentPage(page)
                  }
                }}
              />
              <span>{t('groups.page')}</span>
            </div>
          </div>
        </div>
      )}

      {showEditDialog && (
        <div className={`groups__drawer-overlay ${drawerClosing ? 'groups__drawer-overlay--closing' : ''}`} onClick={() => { setDrawerClosing(true); setTimeout(() => { setShowEditDialog(false); setDrawerClosing(false); }, 300); }}>
          <div className={`groups__drawer ${drawerClosing ? 'groups__drawer--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="groups__drawer-header">
              <h2>{editingGroup ? t('groups.editGroup') : t('groups.addGroup')}</h2>
              <button className="groups__drawer-close" onClick={() => { setDrawerClosing(true); setTimeout(() => { setShowEditDialog(false); setDrawerClosing(false); }, 300); }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="groups__drawer-body">
              <div className="groups__form-field">
                <label>{t('groups.nameLabel')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder={t('groups.namePlaceholder')}
                />
              </div>

              <div className="groups__form-field">
                <label>{t('groups.descriptionLabel')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder={t('groups.descriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="groups__form-field">
                <label>{t('groups.rootPath')}</label>
                <input
                  type="text"
                  value={formData.root_path}
                  onChange={(e) => setFormData({...formData, root_path: e.target.value})}
                  placeholder={t('groups.rootPathPlaceholder')}
                />
                <small className="groups__form-hint">{t('groups.rootPathHint')}</small>
              </div>

              <div className="groups__form-switches">
                <label className="groups__switch-label">
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                  />
                  <span>{t('groups.isAdmin')}</span>
                </label>
              </div>

              <div className="groups__permissions-section">
                <h3>{t('groups.filePermissions')}</h3>
                <div className="groups__permission-selector">
                  <div 
                    ref={permissionInputRef}
                    className="groups__permission-input-wrapper"
                    onClick={() => {
                      if (permissionInputRef.current) {
                        const rect = permissionInputRef.current.getBoundingClientRect()
                        setDropdownPosition({
                          top: rect.bottom,
                          left: rect.left,
                          width: rect.width
                        })
                      }
                      setShowPermissionsModal(!showPermissionsModal)
                    }}
                  >
                    {Object.keys(formData).filter(key => 
                      key !== 'name' && key !== 'description' && key !== 'is_admin' && formData[key as keyof typeof formData]
                    ).length === 0 && (
                      <span className="groups__permission-placeholder">点击选择权限...</span>
                    )}
                    <div className="groups__selected-permissions">
                      {formData.read_files && <span className="groups__perm-chip" onClick={() => setFormData({...formData, read_files: false})}>{t('groups.readFiles')} <X size={14} /></span>}
                      {formData.create_upload && <span className="groups__perm-chip" onClick={() => setFormData({...formData, create_upload: false})}>{t('groups.createUpload')} <X size={14} /></span>}
                      {formData.rename_files && <span className="groups__perm-chip" onClick={() => setFormData({...formData, rename_files: false})}>{t('groups.renameFiles')} <X size={14} /></span>}
                      {formData.move_files && <span className="groups__perm-chip" onClick={() => setFormData({...formData, move_files: false})}>{t('groups.moveFiles')} <X size={14} /></span>}
                      {formData.copy_files && <span className="groups__perm-chip" onClick={() => setFormData({...formData, copy_files: false})}>{t('groups.copyFiles')} <X size={14} /></span>}
                      {formData.delete_files && <span className="groups__perm-chip" onClick={() => setFormData({...formData, delete_files: false})}>{t('groups.deleteFiles')} <X size={14} /></span>}
                      {formData.read_compressed && <span className="groups__perm-chip" onClick={() => setFormData({...formData, read_compressed: false})}>{t('groups.readCompressed')} <X size={14} /></span>}
                      {formData.extract_files && <span className="groups__perm-chip" onClick={() => setFormData({...formData, extract_files: false})}>{t('groups.extractFiles')} <X size={14} /></span>}
                      {formData.allow_direct_link && <span className="groups__perm-chip" onClick={() => setFormData({...formData, allow_direct_link: false})}>{t('groups.allowDirectLink')} <X size={14} /></span>}
                      {formData.allow_share && <span className="groups__perm-chip" onClick={() => setFormData({...formData, allow_share: false})}>{t('groups.allowShare')} <X size={14} /></span>}
                      {formData.show_hidden_files && <span className="groups__perm-chip" onClick={() => setFormData({...formData, show_hidden_files: false})}>{t('groups.showHiddenFiles')} <X size={14} /></span>}
                      {formData.no_password_access && <span className="groups__perm-chip" onClick={() => setFormData({...formData, no_password_access: false})}>{t('groups.noPasswordAccess')} <X size={14} /></span>}
                      {formData.add_offline_download && <span className="groups__perm-chip" onClick={() => setFormData({...formData, add_offline_download: false})}>{t('groups.addOfflineDownload')} <X size={14} /></span>}
                      {formData.webdav_enabled && <span className="groups__perm-chip" onClick={() => setFormData({...formData, webdav_enabled: false})}>{t('groups.webdavEnabled')} <X size={14} /></span>}
                      {formData.ftp_enabled && <span className="groups__perm-chip" onClick={() => setFormData({...formData, ftp_enabled: false})}>{t('groups.ftpEnabled')} <X size={14} /></span>}
                    </div>
                  </div>
                  
                  {showPermissionsModal && (
                    <div 
                      ref={permissionDropdownRef}
                      className="groups__permission-dropdown"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`
                      }}
                    >
                      <div className="groups__permission-grid">
                        {!formData.read_files && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, read_files: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.readFiles')}</span>
                          </div>
                        )}
                        {!formData.create_upload && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, create_upload: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.createUpload')}</span>
                          </div>
                        )}
                        {!formData.rename_files && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, rename_files: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.renameFiles')}</span>
                          </div>
                        )}
                        {!formData.move_files && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, move_files: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.moveFiles')}</span>
                          </div>
                        )}
                        {!formData.copy_files && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, copy_files: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.copyFiles')}</span>
                          </div>
                        )}
                        {!formData.delete_files && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, delete_files: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.deleteFiles')}</span>
                          </div>
                        )}
                        {!formData.read_compressed && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, read_compressed: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.readCompressed')}</span>
                          </div>
                        )}
                        {!formData.extract_files && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, extract_files: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.extractFiles')}</span>
                          </div>
                        )}
                        {!formData.allow_direct_link && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, allow_direct_link: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.allowDirectLink')}</span>
                          </div>
                        )}
                        {!formData.allow_share && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, allow_share: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.allowShare')}</span>
                          </div>
                        )}
                        {!formData.show_hidden_files && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, show_hidden_files: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.showHiddenFiles')}</span>
                          </div>
                        )}
                        {!formData.no_password_access && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, no_password_access: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.noPasswordAccess')}</span>
                          </div>
                        )}
                        {!formData.add_offline_download && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, add_offline_download: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.addOfflineDownload')}</span>
                          </div>
                        )}
                        {!formData.webdav_enabled && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, webdav_enabled: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.webdavEnabled')}</span>
                          </div>
                        )}
                        {!formData.ftp_enabled && (
                          <div className="groups__perm-card" onClick={() => { setFormData({...formData, ftp_enabled: true}); setShowPermissionsModal(false); }}>
                            <span>{t('groups.ftpEnabled')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              </div>
              <div className="groups__drawer-footer">
                <button type="button" className="groups__btn-cancel" onClick={() => { setDrawerClosing(true); setTimeout(() => { setShowEditDialog(false); setDrawerClosing(false); }, 300); }}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="groups__btn-submit">
                  {editingGroup ? t('common.save') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        danger
      />
    </div>
  )
}
