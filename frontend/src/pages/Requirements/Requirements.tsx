import { useState, useEffect } from 'react'
import { Plus, Search, ChevronRight, Tag, Clock, CheckCircle2, X, Edit2, Trash2, BarChart3, Bot, ArrowRight, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-slate-700 text-slate-300' },
  analyzing: { label: '分析中', color: 'bg-indigo-900/50 text-indigo-400' },
  designed: { label: '已建模', color: 'bg-purple-900/50 text-purple-400' },
  developing: { label: '开发中', color: 'bg-amber-900/50 text-amber-400' },
  completed: { label: '已完成', color: 'bg-green-900/50 text-green-400' },
  rejected: { label: '已驳回', color: 'bg-red-900/50 text-red-400' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: '🔴 高', color: 'text-red-400' },
  medium: { label: '🟡 中', color: 'text-amber-400' },
  low: { label: '⚪ 低', color: 'text-slate-400' },
}

export default function Requirements() {
  const [requirements, setRequirements] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [filter, setFilter] = useState({ status: '', priority: '', search: '' })
  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [detailTab, setDetailTab] = useState<'info' | 'report'>('info')
  const [reportContent, setReportContent] = useState<any>(null)
  const [newForm, setNewForm] = useState({ title: '', description: '', priority: 'medium' })

  const load = () => {
    const params = new URLSearchParams()
    if (filter.status) params.set('status', filter.status)
    if (filter.priority) params.set('priority', filter.priority)
    if (filter.search) params.set('search', filter.search)

    Promise.all([
      fetch(`${API}/requirements?${params}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(`${API}/requirements/stats/overview`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([reqs, st]) => { setRequirements(reqs); setStats(st); }).catch(console.error)
  }
  useEffect(() => { load() }, [filter])

  const handleCreate = async () => {
    if (!newForm.title.trim()) return
    await fetch(`${API}/requirements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm })
    })
    setShowNew(false)
    setNewForm({ title: '', description: '', priority: 'medium' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该需求？')) return
    await fetch(`${API}/requirements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    if (selectedReq?.id === id) { setSelectedReq(null); setShowDetail(false) }
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`${API}/requirements/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (selectedReq?.id === id) setSelectedReq(r => ({ ...r, status }))
    load()
  }

  const loadReport = async (req: any) => {
    const res = await fetch(`${API}/requirements/${req.id}/report`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    setReportContent(data)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex h-full overflow-hidden">
      {/* 左侧列表 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">📋 需求管理</h1>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 text-sm font-medium">
              <Plus size={16} /> 新建需求
            </button>
          </div>

          {stats && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'rejected').map(([k, v]) => (
                <button key={k} onClick={() => setFilter(f => ({ ...f, status: f.status === k ? '' : k }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter.status === k ? v.color : 'bg-dark-bg text-slate-400 hover:text-white border border-dark-border'}`}>
                  {v.label}: <span className="text-white">{stats[k] || 0}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
                placeholder="搜索需求..."
                className="w-full pl-9 pr-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
            </div>
            <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
              className="px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-sm text-white focus:outline-none">
              <option value="">全部优先级</option>
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {requirements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-400 mb-2">暂无需求</p>
              <div className="flex gap-2">
                <Link to="/agents/analyst" className="text-xs px-3 py-1.5 bg-indigo-900/30 border border-indigo-700/50 rounded-lg text-indigo-400 hover:text-indigo-300">
                  💡 向分析 Agent 提问
                </Link>
                <button onClick={() => setShowNew(true)} className="text-xs px-3 py-1.5 bg-dark-card border border-dark-border rounded-lg text-slate-400 hover:text-white">
                  + 手动创建
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {requirements.map(req => (
                <div key={req.id}
                  onClick={() => { setSelectedReq(req); setShowDetail(true); setDetailTab('info'); setReportContent(null); }}
                  className={`p-4 hover:bg-slate-800/40 cursor-pointer transition-colors border-l-2 ${
                    selectedReq?.id === req.id ? 'border-l-primary-500 bg-slate-800/30' : 'border-l-transparent'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[req.status]?.color}`}>
                          {STATUS_CONFIG[req.status]?.label}
                        </span>
                        {req.priority === 'high' && <span className="text-xs text-red-400">🔴</span>}
                        {req.report && <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/30 text-indigo-400">📄报告</span>}
                      </div>
                      <h3 className="text-sm font-medium text-white truncate">{req.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{req.description?.substring(0, 80) || '暂无描述'}</p>
                      {req.metrics?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {req.metrics.slice(0, 3).map((m: string) => (
                            <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/20 text-emerald-400 border border-emerald-800/30">{m}</span>
                          ))}
                          {req.metrics.length > 3 && <span className="text-xs text-slate-500">+{req.metrics.length - 3}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-500">{formatDate(req.created_at)}</div>
                      <ChevronRight size={14} className="text-slate-600 mt-1 ml-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧详情面板 */}
      {showDetail && selectedReq && (
        <div className="w-96 border-l border-dark-border bg-dark-card flex flex-col flex-shrink-0">
          {/* 面板头部 */}
          <div className="p-4 border-b border-dark-border flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">需求详情</h2>
            <div className="flex gap-1">
              <button onClick={() => handleDelete(selectedReq.id)}
                className="p-1.5 rounded-lg hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setShowDetail(false)}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-dark-border">
            <button onClick={() => setDetailTab('info')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${detailTab === 'info' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              📋 基本信息
            </button>
            <button onClick={async () => {
              if (!reportContent) await loadReport(selectedReq)
              setDetailTab('report')
            }}
              className={`flex-1 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${detailTab === 'report' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              📄 分析报告{selectedReq.report ? ' ✓' : ''}
            </button>
          </div>

          {/* 面板内容 */}
          <div className="flex-1 overflow-y-auto p-4">
            {detailTab === 'info' && <InfoTab req={selectedReq} onStatusChange={handleStatusChange} />}
            {detailTab === 'report' && <ReportTab req={selectedReq} report={reportContent} onLoad={loadReport} />}
          </div>

          {/* 底部操作 */}
          <div className="p-4 border-t border-dark-border space-y-2">
            {selectedReq.agent_id && (
              <Link to={`/agents/${selectedReq.agent_id}?req=${selectedReq.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-900/30 border border-indigo-700/50 rounded-xl text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                <Bot size={14} /> 继续分析 <ArrowRight size={12} />
              </Link>
            )}
            <button onClick={() => handleStatusChange(selectedReq.id, 'analyzing')}
              className="flex items-center justify-center gap-2 w-full py-2 bg-dark-bg border border-dark-border rounded-xl text-slate-400 hover:text-white text-sm transition-colors">
              📋 转为分析中
            </button>
          </div>
        </div>
      )}

      {/* 新建需求弹窗 */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><Plus size={18} /> 新建需求</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">需求标题 *</label>
                <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-primary-500"
                  placeholder="例如：门店销售分析需求" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">需求描述</label>
                <textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-primary-500 resize-none"
                  placeholder="详细描述业务需求..." />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-2">优先级</label>
                <div className="flex gap-2">
                  {[['high', '🔴 高'], ['medium', '🟡 中'], ['low', '⚪ 低']].map(([v, label]) => (
                    <button key={v} onClick={() => setNewForm(f => ({ ...f, priority: v }))}
                      className={`flex-1 py-2 rounded-xl text-sm transition-colors ${newForm.priority === v ? 'bg-primary-600 text-white' : 'bg-dark-bg border border-dark-border text-slate-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">取消</button>
              <button onClick={handleCreate} className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-500 font-medium">创建需求</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 基本信息 Tab
function InfoTab({ req, onStatusChange }: { req: any; onStatusChange: (id: string, s: string) => void }) {
  return (
    <div className="space-y-4">
      {/* 状态 */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block">状态</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => onStatusChange(req.id, k)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${req.status === k ? v.color : 'bg-dark-bg text-slate-400 hover:text-white border border-dark-border'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* 标题 */}
      <div>
        <label className="text-xs text-slate-400 mb-1 block">需求标题</label>
        <p className="text-sm text-white font-medium">{req.title}</p>
      </div>

      {/* 描述 */}
      <div>
        <label className="text-xs text-slate-400 mb-1 block">描述</label>
        <p className="text-sm text-slate-300 leading-relaxed">{req.description || '暂无描述'}</p>
      </div>

      {/* 指标 */}
      {req.metrics?.length > 0 && (
        <div>
          <label className="text-xs text-slate-400 mb-2 block flex items-center gap-1">
            <BarChart3 size={12} /> 关联指标
          </label>
          <div className="flex flex-wrap gap-1.5">
            {req.metrics.map((m: string) => (
              <span key={m} className="text-xs px-2 py-1 rounded-lg bg-emerald-900/20 text-emerald-400 border border-emerald-800/30">{m}</span>
            ))}
          </div>
        </div>
      )}

      {/* 维度 */}
      {req.dimensions?.length > 0 && (
        <div>
          <label className="text-xs text-slate-400 mb-2 block">分析维度</label>
          <div className="flex flex-wrap gap-1.5">
            {req.dimensions.map((d: string) => (
              <span key={d} className="text-xs px-2 py-1 rounded-lg bg-blue-900/20 text-blue-400 border border-blue-800/30">{d}</span>
            ))}
          </div>
        </div>
      )}

      {/* 元信息 */}
      <div className="space-y-1.5 pt-2 border-t border-dark-border">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">优先级</span>
          <span className={PRIORITY_CONFIG[req.priority]?.color}>{PRIORITY_CONFIG[req.priority]?.label}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">来源</span>
          <span className="text-slate-300">{req.source === 'agent' ? '🤖 Agent 创建' : '📝 手动创建'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">创建时间</span>
          <span className="text-slate-300">{new Date(req.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
      </div>
    </div>
  )
}

// 分析报告 Tab
function ReportTab({ req, report, onLoad }: { req: any; report: any; onLoad: (r: any) => Promise<void> }) {
  if (!report) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-slate-400 text-sm mb-3">尚未生成分析报告</p>
        <p className="text-xs text-slate-600 mb-4">请先向需求分析 Agent 提问并生成报告</p>
        <Link to={`/agents/analyst?req=${req.id}`}
          className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 inline-block">
          去需求分析 Agent 生成报告
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 置信度 */}
      {report.report_confidence && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">置信度</span>
          <div className="flex-1 bg-dark-bg rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(report.report_confidence * 100)}%` }}></div>
          </div>
          <span className="text-indigo-400">{((report.report_confidence || 0.8) * 100).toFixed(0)}%</span>
        </div>
      )}

      {/* 总结 */}
      {report.summary && (
        <div>
          <label className="text-xs text-slate-400 mb-1 block">📋 需求总结</label>
          <p className="text-sm text-white">{report.summary}</p>
        </div>
      )}

      {/* 业务目标 */}
      {report.business_goal && (
        <div>
          <label className="text-xs text-slate-400 mb-1 block">🎯 业务目标</label>
          <p className="text-sm text-slate-300">{report.business_goal}</p>
        </div>
      )}

      {/* 指标定义 */}
      {report.metrics?.length > 0 && (
        <div>
          <label className="text-xs text-slate-400 mb-2 block">📊 指标定义</label>
          <div className="space-y-2">
            {report.metrics.map((m: any, i: number) => (
              <div key={i} className="bg-dark-bg rounded-lg p-3 border border-dark-border">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">{m.name_cn || m.name}</span>
                  {m.priority === 'high' && <span className="text-xs text-red-400">🔴</span>}
                </div>
                {m.expression && <div className="text-xs font-mono text-indigo-400 mb-1">{m.expression}</div>}
                {m.dimensions?.length > 0 && <div className="text-xs text-slate-500">维度: {m.dimensions.join(', ')}</div>}
                {m.description && <div className="text-xs text-slate-600 mt-1">{m.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分析方案 */}
      {report.analysis_plan && (
        <div>
          <label className="text-xs text-slate-400 mb-1 block">📋 分析方案</label>
          <p className="text-sm text-slate-300">{report.analysis_plan.approach}</p>
        </div>
      )}

      {/* 下一步 */}
      {report.next_steps?.length > 0 && (
        <div>
          <label className="text-xs text-slate-400 mb-2 block">➡️ 下一步行动</label>
          <div className="space-y-1">
            {report.next_steps.map((s: string, i: number) => (
              <div key={i} className="text-sm text-slate-300 flex gap-2">
                <span className="text-indigo-400 flex-shrink-0">{i + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!report.summary && !report.metrics?.length && (
        <div className="text-center py-8 text-slate-500 text-sm">报告内容为空</div>
      )}
    </div>
  )
}
