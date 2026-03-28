import { useState, useEffect } from 'react'
import { Plus, GitBranch, Clock, CheckCircle2, ChevronRight, Play, Bot, X, ArrowRight, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

const PHASES = [
  { id: 'analysis', label: '需求分析', agent: 'analyst', color: '#6366f1', bg: 'bg-indigo-500', icon: '💡', desc: 'Analyst Agent', next: 'model' },
  { id: 'model', label: '数据建模', agent: 'modeler', color: '#8b5cf6', bg: 'bg-purple-500', icon: '🏗️', desc: 'Modeler Agent', next: 'etl' },
  { id: 'etl', label: 'ETL开发', agent: 'etl', color: '#f59e0b', bg: 'bg-amber-500', icon: '⚡', desc: 'ETL Agent', next: 'viz' },
  { id: 'viz', label: '可视化', agent: 'viz', color: '#3b82f6', bg: 'bg-blue-500', icon: '📊', desc: 'Viz Agent', next: 'qa' },
  { id: 'qa', label: '质量验证', agent: 'qa', color: '#ef4444', bg: 'bg-red-500', icon: '🛡️', desc: 'QA Agent', next: 'ops' },
  { id: 'ops', label: '上线运维', agent: 'ops', color: '#6b7280', bg: 'bg-gray-500', icon: '⚙️', desc: 'Ops Agent', next: null },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: '规划中', color: 'bg-blue-900/50 text-blue-400', bg: 'border-blue-700' },
  developing: { label: '开发中', color: 'bg-amber-900/50 text-amber-400', bg: 'border-amber-700' },
  completed: { label: '已完成', color: 'bg-green-900/50 text-green-400', bg: 'border-green-700' },
}

const REQ_STATUS: Record<string, string> = {
  draft: '草稿', analyzing: '分析中', designed: '已建模',
  developing: '开发中', completed: '已完成', rejected: '已驳回',
}

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [projectDetail, setProjectDetail] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [activeRequirement, setActiveRequirement] = useState<any>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showFlowModal, setShowFlowModal] = useState(false)
  const [pendingPhase, setPendingPhase] = useState<any>(null)
  const [newForm, setNewForm] = useState({ name: '', description: '' })

  const loadProjects = () => {
    fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setProjects).catch(console.error)
  }
  useEffect(() => { loadProjects() }, [])

  const loadDetail = (p: any) => {
    setSelectedProject(p)
    setActiveRequirement(null)
    Promise.all([
      fetch(`${API}/projects/${p.id}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(`${API}/requirements`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([detail, reqs]) => {
      setProjectDetail(detail)
      // 过滤出与当前项目相关的需求（从消息中找，或全部展示）
      setRequirements(reqs)
    }).catch(console.error)
  }

  const handleSelect = (p: any) => {
    setSelectedProject(p)
    loadDetail(p)
  }

  const handleCreate = async () => {
    if (!newForm.name.trim()) return
    await fetch(`${API}/projects`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm)
    })
    setShowNewModal(false)
    setNewForm({ name: '', description: '' })
    loadProjects()
  }

  // 开始某个阶段
  const startPhase = async (phase: any) => {
    if (!selectedProject) return

    // 如果还没有选需求，弹出需求选择
    if (!activeRequirement) {
      setPendingPhase(phase)
      setShowFlowModal(true)
      return
    }

    // 直接跳转到 Agent 对话，携带需求上下文
    const context = encodeURIComponent(JSON.stringify({
      requirement: activeRequirement,
      project_id: selectedProject.id,
      project_name: selectedProject.name,
    }))
    window.open(`/agents/${phase.agent}?ctx=${context}`, '_blank')
  }

  // 确认需求后启动流程
  const confirmStart = () => {
    if (!activeRequirement || !pendingPhase) return
    setShowFlowModal(false)

    // 更新项目状态
    fetch(`${API}/projects/${selectedProject.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_phase: pendingPhase.id, progress: PHASE_PROGRESS[pendingPhase.id] })
    })

    // 记录项目消息
    fetch(`${API}/projects/${selectedProject.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: pendingPhase.agent,
        role: 'system',
        content: `启动 ${pendingPhase.label}，需求：「${activeRequirement.title}」`,
        phase: pendingPhase.id,
      })
    })

    // 跳转到 Agent
    const ctx = encodeURIComponent(JSON.stringify({
      requirement: activeRequirement,
      project_id: selectedProject.id,
      project_name: selectedProject.name,
    }))
    window.open(`/agents/${pendingPhase.agent}?ctx=${ctx}`, '_blank')

    setPendingPhase(null)
  }

  const phaseProgress = (projectPhase: string, phaseId: string) => {
    const pIdx = PHASES.findIndex(p => p.id === projectPhase)
    const cIdx = PHASES.findIndex(p => p.id === phaseId)
    if (cIdx < pIdx) return 'done'
    if (cIdx === pIdx) return 'current'
    return 'pending'
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  // 已完成 phases 中当前之前的阶段
  const currentPhaseIdx = PHASES.findIndex(p => p.id === selectedProject?.current_phase)

  return (
    <div className="flex h-full">
      {/* 左侧: 项目列表 */}
      <div className="w-80 border-r border-dark-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-dark-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white flex items-center gap-2"><GitBranch size={18} className="text-amber-400" /> 项目列表</h2>
            <button onClick={() => setShowNewModal(true)} className="p-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white"><Plus size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projects.map(p => (
            <div key={p.id} onClick={() => handleSelect(p)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedProject?.id === p.id
                  ? 'bg-primary-600/20 border border-primary-500/50'
                  : 'hover:bg-slate-700/50 border border-transparent'
              }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white truncate">{p.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_CONFIG[p.status]?.color}`}>{STATUS_CONFIG[p.status]?.label}</span>
              </div>
              <p className="text-xs text-slate-500 truncate mb-2">{p.description || '暂无描述'}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-dark-bg rounded-full h-1">
                  <div className="h-1 rounded-full bg-primary-500" style={{ width: `${p.progress || 0}%` }}></div>
                </div>
                <span className="text-xs text-slate-500">{p.progress || 0}%</span>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">暂无项目</div>
          )}
        </div>
      </div>

      {/* 右侧: 项目详情 */}
      <div className="flex-1 overflow-y-auto">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <GitBranch size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-500">选择或创建一个项目开始</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* 项目头部 */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{selectedProject.name}</h1>
                <p className="text-slate-400 mt-1">{selectedProject.description || '暂无描述'}</p>
              </div>
              <span className={`text-sm px-3 py-1.5 rounded-full ${STATUS_CONFIG[selectedProject.status]?.color}`}>
                {STATUS_CONFIG[selectedProject.status]?.label}
              </span>
            </div>

            {/* 当前选中需求 */}
            {activeRequirement && (
              <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={14} className="text-indigo-400" />
                  <span className="text-xs text-indigo-400 font-medium">当前处理需求</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium text-sm">{activeRequirement.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {REQ_STATUS[activeRequirement.status] || activeRequirement.status}
                      {activeRequirement.metrics?.length > 0 && ` · ${activeRequirement.metrics.length}个指标`}
                    </div>
                  </div>
                  <button onClick={() => setActiveRequirement(null)}
                    className="p-1 rounded hover:bg-indigo-900/50 text-slate-500 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* 阶段流程图 */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                <GitBranch size={16} className="text-indigo-400" />
                BI 交付流程
                <span className="text-xs text-slate-500 font-normal ml-2">
                  {activeRequirement ? '→ 已选需求，可直接启动各环节' : '→ 请先从下方选择一个需求'}
                </span>
              </h3>
              <div className="flex items-center overflow-x-auto pb-2">
                {PHASES.map((phase, idx) => {
                  const status = phaseProgress(selectedProject.current_phase, phase.id)
                  return (
                    <div key={phase.id} className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center w-28">
                        <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-2 transition-all ${
                          status === 'done'
                            ? 'bg-green-600/20 border-2 border-green-500'
                            : status === 'current'
                            ? `bg-opacity-20 border-2`
                            : 'bg-dark-bg border-2 border-dark-border opacity-50'
                        }`} style={status === 'current' ? { backgroundColor: `${phase.color}20`, borderColor: phase.color } : {}}>
                          {status === 'done' ? <CheckCircle2 size={24} className="text-green-400" /> : phase.icon}
                          {status === 'current' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: phase.color }}></div>
                          )}
                        </div>
                        <span className={`text-xs font-medium mb-1 ${
                          status === 'done' ? 'text-green-400' : status === 'current' ? 'text-white' : 'text-slate-500'
                        }`}>{phase.label}</span>
                        <span className="text-xs text-slate-600">{phase.desc}</span>
                        {status !== 'done' && (
                          <button
                            onClick={() => startPhase(phase)}
                            disabled={status === 'pending'}
                            className={`mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                              status === 'current'
                                ? 'bg-primary-600 text-white hover:bg-primary-500 cursor-pointer'
                                : 'bg-dark-bg text-slate-600 cursor-not-allowed'
                            }`}>
                            {status === 'current' ? <><Play size={10} /> 启动</> : '等待'}
                          </button>
                        )}
                        {status === 'done' && (
                          <button
                            onClick={() => startPhase(phase)}
                            className="mt-2 w-full py-1.5 rounded-lg text-xs bg-green-900/30 text-green-400 hover:bg-green-900/50 flex items-center justify-center gap-1 transition-colors">
                            <ArrowRight size={10} /> 重跑
                          </button>
                        )}
                      </div>
                      {idx < PHASES.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 mb-8 w-8 ${
                          phaseProgress(selectedProject.current_phase, PHASES[idx + 1].id) !== 'pending'
                            ? ''
                            : ''
                        }`}>
                          <div className={`h-full rounded ${
                            PHASES[idx + 1] && phaseProgress(selectedProject.current_phase, PHASES[idx + 1].id) !== 'pending'
                              ? ''
                              : 'bg-dark-border'
                          }`} style={{
                            backgroundColor: phaseProgress(selectedProject.current_phase, PHASES[idx + 1].id) !== 'pending' && PHASES[idx + 1]
                              ? `${phase.color}60`
                              : undefined
                          }}></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 需求选择区 */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-400" />
                  关联需求
                </h3>
                <span className="text-xs text-slate-500">{requirements.length} 个需求</span>
              </div>
              {requirements.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 mb-3">还没有需求</p>
                  <Link to="/agents/analyst"
                    className="text-xs px-4 py-2 bg-indigo-900/30 border border-indigo-700/50 rounded-lg text-indigo-400 hover:text-indigo-300 inline-block">
                    💡 去向需求分析 Agent 提问
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {requirements.map(req => (
                    <div key={req.id}
                      onClick={() => setActiveRequirement(req)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        activeRequirement?.id === req.id
                          ? 'bg-indigo-900/20 border-indigo-500/50'
                          : 'bg-dark-bg border-dark-border hover:border-slate-600'
                      }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              req.status === 'completed' ? 'bg-green-900/50 text-green-400'
                              : req.status === 'analyzing' ? 'bg-indigo-900/50 text-indigo-400'
                              : req.status === 'designed' ? 'bg-purple-900/50 text-purple-400'
                              : 'bg-slate-700 text-slate-400'
                            }`}>{REQ_STATUS[req.status] || req.status}</span>
                            {req.priority === 'high' && <span className="text-xs text-red-400">🔴</span>}
                          </div>
                          <p className="text-sm text-white font-medium truncate">{req.title}</p>
                          {req.metrics?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {req.metrics.slice(0, 2).map((m: string) => (
                                <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/20 text-emerald-400">{m}</span>
                              ))}
                              {req.metrics.length > 2 && <span className="text-xs text-slate-500">+{req.metrics.length - 2}</span>}
                            </div>
                          )}
                        </div>
                        {activeRequirement?.id === req.id && (
                          <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 最近活动 */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Clock size={16} className="text-amber-400" /> 最近活动</h3>
              <div className="space-y-3">
                {(projectDetail?.messages || []).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">暂无活动记录</p>
                )}
                {(projectDetail?.messages || []).slice(-10).reverse().map((msg: any, idx: number) => {
                  const agent = PHASES.find(p => p.id === msg.phase || p.agent === msg.agent_id)
                  return (
                    <div key={msg.id || idx} className="flex gap-3">
                      <div className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-sm flex-shrink-0">
                        {agent?.icon || '💬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white">{msg.role === 'user' ? '用户' : (agent?.label || msg.agent_id)}</span>
                          {msg.phase && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{agent?.label}</span>}
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">{msg.content}</p>
                        <span className="text-xs text-slate-600 mt-0.5 block">{formatDate(msg.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 需求选择弹窗 */}
      {showFlowModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowFlowModal(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Play size={18} className="text-primary-500" /> 启动 {pendingPhase?.label}
                </h2>
                <p className="text-xs text-slate-500 mt-1">请选择一个需求作为本次处理对象</p>
              </div>
              <button onClick={() => setShowFlowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {requirements.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm mb-3">还没有需求，请先创建</p>
                <Link to="/agents/analyst" onClick={() => setShowFlowModal(false)}
                  className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 inline-block">
                  💡 去需求分析 Agent 提问
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {requirements.map(req => (
                  <div key={req.id}
                    onClick={() => setActiveRequirement(req)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      activeRequirement?.id === req.id
                        ? 'bg-indigo-900/20 border-indigo-500/50'
                        : 'bg-dark-bg border-dark-border hover:border-slate-600'
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        req.status === 'completed' ? 'bg-green-900/50 text-green-400'
                        : req.status === 'analyzing' ? 'bg-indigo-900/50 text-indigo-400'
                        : 'bg-slate-700 text-slate-400'
                      }`}>{REQ_STATUS[req.status] || req.status}</span>
                      {req.priority === 'high' && <span className="text-xs text-red-400">🔴 高优</span>}
                    </div>
                    <p className="text-sm text-white font-medium">{req.title}</p>
                    {req.metrics?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {req.metrics.slice(0, 3).map((m: string) => (
                          <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/20 text-emerald-400">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowFlowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">取消</button>
              <button
                onClick={confirmStart}
                disabled={!activeRequirement}
                className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-500 font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                <Play size={14} />
                确认启动 → {pendingPhase?.desc}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建项目弹窗 */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNewModal(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-5">新建项目</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">项目名称 *</label>
                <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-primary-500" placeholder="例如: 销售数据分析平台" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">项目描述</label>
                <textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full px-3 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-sm text-white focus:outline-none focus:border-primary-500 resize-none" placeholder="描述项目目标和范围..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">取消</button>
              <button onClick={handleCreate} className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-500 font-medium">创建项目</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const PHASE_PROGRESS: Record<string, number> = {
  analysis: 15, model: 35, etl: 55, viz: 75, qa: 90, ops: 100,
}
