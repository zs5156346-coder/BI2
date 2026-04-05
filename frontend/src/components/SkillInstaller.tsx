import { useState, useEffect, useRef } from 'react'
import { X, Download, Upload, Trash2, Star, Search, Check, Sparkles, Package, ChevronDown, ChevronUp, FileText, Save } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

interface Skill {
  id: string
  name: string
  name_en?: string
  description?: string
  category?: string
  icon?: string
  version?: string
  downloads?: number
  rating?: number
  author?: string
  allowed_tools?: string[]
  instructions?: string
  instructions_preview?: string
}

interface InstalledSkill {
  id: string
  agent_id: string
  skill_id: string
  skill_name: string
  skill_description?: string
  category?: string
  icon?: string
  version?: string
  status?: string
  installed_at?: string
  allowed_tools?: string[]
  instructions?: string
}

interface SkillInstallerProps {
  agentId: string
  agentName: string
  agentNameCn: string
  onClose: () => void
}

export default function SkillInstaller({ agentId, agentName, agentNameCn, onClose }: SkillInstallerProps) {
  const [tab, setTab] = useState<'installed' | 'market'>('installed')
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([])
  const [marketSkills, setMarketSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('全部')
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [editingInstructions, setEditingInstructions] = useState<string>('')
  const [savingInstructions, setSavingInstructions] = useState(false)
  const [viewingMarketSkill, setViewingMarketSkill] = useState<Skill | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadInstalled()
    loadMarket()
  }, [agentId])

  const loadInstalled = async () => {
    try {
      const res = await fetch(`${API}/skills/agent/${agentId}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      setInstalledSkills(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('加载已安装技能失败:', err)
    }
  }

  const loadMarket = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/skills/market`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      setMarketSkills(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('加载技能市场失败:', err)
    }
    setLoading(false)
  }

  const handleInstall = async (skill: Skill) => {
    setInstalling(skill.id)
    try {
      const res = await fetch(`${API}/skills/install`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          skill_id: skill.id,
          skill_name: skill.name,
          skill_description: skill.description,
          category: skill.category,
          icon: skill.icon,
          version: skill.version,
          allowed_tools: skill.allowed_tools,
          instructions: skill.instructions,
        })
      })
      const data = await res.json()
      if (data.success) {
        loadInstalled()
      } else if (res.status === 409) {
        alert('该技能已安装到此 Agent')
      }
    } catch (err: any) {
      alert('安装失败: ' + err.message)
    }
    setInstalling(null)
  }

  const handleUninstall = async (skillId: string) => {
    if (!confirm('确定要卸载该技能吗？')) return
    try {
      await fetch(`${API}/skills/${skillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      loadInstalled()
    } catch (err: any) {
      alert('卸载失败: ' + err.message)
    }
  }

  const handleToggleStatus = async (skill: InstalledSkill) => {
    const newStatus = skill.status === 'active' ? 'disabled' : 'active'
    try {
      await fetch(`${API}/skills/${skill.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      loadInstalled()
    } catch (err: any) {
      alert('更新失败: ' + err.message)
    }
  }

  const handleExpandInstructions = (skill: InstalledSkill) => {
    if (expandedSkill === skill.id) {
      setExpandedSkill(null)
    } else {
      setExpandedSkill(skill.id)
      setEditingInstructions(skill.instructions || '')
    }
  }

  const handleSaveInstructions = async (skillId: string) => {
    setSavingInstructions(true)
    try {
      const res = await fetch(`${API}/skills/${skillId}/instructions`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: editingInstructions })
      })
      const data = await res.json()
      if (data.success) {
        loadInstalled()
        setExpandedSkill(null)
      }
    } catch (err: any) {
      alert('保存失败: ' + err.message)
    }
    setSavingInstructions(false)
  }

  const handleExport = async (skillId: string) => {
    try {
      const res = await fetch(`${API}/skills/${skillId}/export`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${skillId.split('__').pop() || 'skill'}.SKILL.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('导出失败: ' + err.message)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const res = await fetch(`${API}/skills/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'text/plain' },
        body: text
      })
      const data = await res.json()
      if (data.success && data.skill) {
        const s = data.skill
        // 自动安装导入的技能
        const installRes = await fetch(`${API}/skills/install`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: agentId,
            skill_id: s.skill_id || file.name.replace('.SKILL.md', '').replace('.md', ''),
            skill_name: s.skill_name || s.skill_id,
            skill_description: s.skill_description,
            category: s.category,
            icon: s.icon,
            version: s.version,
            allowed_tools: s.allowed_tools,
            instructions: s.instructions,
          })
        })
        const installData = await installRes.json()
        if (installData.success) {
          loadInstalled()
          setTab('installed')
        } else {
          alert(installData.error || '安装失败')
        }
      } else {
        alert(data.error || '导入解析失败')
      }
    } catch (err: any) {
      alert('导入失败: ' + err.message)
    }
    // 重置 file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleViewMarketSkill = async (skillId: string) => {
    try {
      const res = await fetch(`${API}/skills/market/${skillId}`, {
        headers: { Authorization: `Bearer ${token()}` }
      })
      const data = await res.json()
      setViewingMarketSkill(data)
    } catch (err) {
      console.error('加载技能详情失败:', err)
    }
  }

  const categories = ['全部', ...new Set(marketSkills.map(s => s.category || '其他'))]

  const filteredMarket = marketSkills.filter(skill => {
    const matchSearch = !search ||
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      (skill.description || '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = filterCategory === '全部' || skill.category === filterCategory
    return matchSearch && matchCategory
  })

  const installedIds = installedSkills.map(s => s.skill_id)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles size={20} className="text-yellow-400" />
              {agentNameCn} - 技能管理
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{agentName} Agent 专属技能 · 兼容 Claude SKILL.md 规范</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="px-6 pt-4 flex gap-4 border-b border-dark-border">
          <button
            onClick={() => setTab('installed')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'installed' ? 'border-primary-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Package size={14} className="inline mr-1.5" />
            已安装 ({installedSkills.length})
          </button>
          <button
            onClick={() => setTab('market')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === 'market' ? 'border-primary-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Download size={14} className="inline mr-1.5" />
            技能市场
          </button>
        </div>

        {/* 搜索框 + 导入按钮 */}
        {tab === 'market' ? (
          <div className="px-6 py-3 flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索技能..."
                className="w-full pl-10 pr-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="px-6 py-3 flex justify-end">
            <input ref={fileInputRef} type="file" accept=".md" className="hidden" onChange={handleImportFile} />
            <button
              onClick={handleImportClick}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Upload size={12} /> 导入 SKILL.md
            </button>
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'installed' ? (
            // 已安装技能列表
            installedSkills.length === 0 ? (
              <div className="text-center py-12">
                <Package size={48} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">暂无已安装技能</p>
                <p className="text-xs text-slate-500 mt-1">可从技能市场安装，或导入 Claude SKILL.md 文件</p>
                <button
                  onClick={() => setTab('market')}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-500"
                >
                  去技能市场看看
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {installedSkills.map(skill => (
                  <div key={skill.id} className="bg-dark-bg border border-dark-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{skill.icon || '🧩'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{skill.skill_name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            skill.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'
                          }`}>
                            {skill.status === 'active' ? '● 运行中' : '○ 已禁用'}
                          </span>
                          <span className="text-xs text-slate-500">v{skill.version || '1.0.0'}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{skill.skill_description}</p>
                        {skill.allowed_tools && skill.allowed_tools.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {skill.allowed_tools.map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">{t}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-500 mt-1">安装于: {new Date(skill.installed_at || '').toLocaleDateString('zh-CN')}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleExpandInstructions(skill)}
                          className="px-2 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium transition-colors flex items-center gap-1"
                          title="查看/编辑指令"
                        >
                          <FileText size={12} />
                          {expandedSkill === skill.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        <button
                          onClick={() => handleExport(skill.id)}
                          className="px-2 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-medium transition-colors"
                          title="导出 SKILL.md"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(skill)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            skill.status === 'active'
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                          }`}
                        >
                          {skill.status === 'active' ? '禁用' : '启用'}
                        </button>
                        <button
                          onClick={() => handleUninstall(skill.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} /> 卸载
                        </button>
                      </div>
                    </div>
                    {/* 指令编辑区域 */}
                    {expandedSkill === skill.id && (
                      <div className="mt-3 pt-3 border-t border-dark-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 font-medium">Skill Instructions (SKILL.md 指令体)</span>
                          <button
                            onClick={() => handleSaveInstructions(skill.id)}
                            disabled={savingInstructions}
                            className="px-3 py-1 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-500 disabled:opacity-50 flex items-center gap-1"
                          >
                            <Save size={10} /> {savingInstructions ? '保存中...' : '保存'}
                          </button>
                        </div>
                        <textarea
                          value={editingInstructions}
                          onChange={e => setEditingInstructions(e.target.value)}
                          className="w-full h-48 p-3 bg-slate-900 border border-dark-border rounded-lg text-xs text-slate-300 font-mono resize-y focus:outline-none focus:border-primary-500 placeholder-slate-600"
                          placeholder="输入技能指令内容（Markdown 格式）..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            // 技能市场
            loading ? (
              <div className="text-center py-12 text-slate-400">加载中...</div>
            ) : filteredMarket.length === 0 ? (
              <div className="text-center py-12 text-slate-400">没有找到匹配的技能</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMarket.map(skill => {
                  const isInstalled = installedIds.includes(skill.id)
                  return (
                    <div key={skill.id} className="bg-dark-bg border border-dark-border rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{skill.icon || '🧩'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">{skill.name}</h3>
                            {isInstalled && <Check size={14} className="text-green-400" />}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{skill.description}</p>
                          {skill.instructions_preview && (
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 font-mono italic">{skill.instructions_preview}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{skill.category}</span>
                            <span>v{skill.version || '1.0.0'}</span>
                            <span className="flex items-center gap-1">
                              <Star size={10} className="text-yellow-400" />
                              {skill.rating || '4.0'}
                            </span>
                            <span>{skill.downloads || 0} 次安装</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          onClick={() => handleViewMarketSkill(skill.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <FileText size={12} /> 详情
                        </button>
                        {isInstalled ? (
                          <span className="px-3 py-1.5 rounded-lg bg-green-900/30 text-green-400 text-xs flex items-center gap-1">
                            <Check size={12} /> 已安装
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInstall(skill)}
                            disabled={installing === skill.id}
                            className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-500 disabled:opacity-50 flex items-center gap-1"
                          >
                            {installing === skill.id ? '安装中...' : <><Download size={12} /> 安装</>}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>

        {/* 市场技能详情弹窗 */}
        {viewingMarketSkill && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10" onClick={() => setViewingMarketSkill(null)}>
            <div className="bg-dark-card border border-dark-border rounded-xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col m-8" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{viewingMarketSkill.icon}</span>
                  <div>
                    <h3 className="font-medium text-white text-sm">{viewingMarketSkill.name}</h3>
                    <p className="text-[10px] text-slate-500">{viewingMarketSkill.description}</p>
                  </div>
                </div>
                <button onClick={() => setViewingMarketSkill(null)} className="p-1 rounded hover:bg-slate-700 text-slate-400">
                  <X size={16} />
                </button>
              </div>
              {viewingMarketSkill.allowed_tools && viewingMarketSkill.allowed_tools.length > 0 && (
                <div className="px-5 py-2 border-b border-dark-border flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">allowed-tools:</span>
                  {viewingMarketSkill.allowed_tools.map(t => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-5">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">{viewingMarketSkill.instructions || '暂无指令内容'}</pre>
              </div>
              <div className="px-5 py-3 border-t border-dark-border flex justify-end">
                {installedIds.includes(viewingMarketSkill.id) ? (
                  <span className="px-3 py-1.5 rounded-lg bg-green-900/30 text-green-400 text-xs flex items-center gap-1">
                    <Check size={12} /> 已安装
                  </span>
                ) : (
                  <button
                    onClick={() => { handleInstall(viewingMarketSkill); setViewingMarketSkill(null); }}
                    className="px-4 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-500 flex items-center gap-1"
                  >
                    <Download size={12} /> 安装到 {agentNameCn}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
