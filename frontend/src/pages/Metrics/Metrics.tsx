import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, BarChart3, Link2, Unlink, Sparkles, ChevronRight, Loader2, ArrowRight, X } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

const categories = ['全部', '交易', '用户', '流量', '财务', '运营']

const bindStatusConfig: Record<string, { color: string; label: string }> = {
  unbound: { color: 'bg-slate-700 text-slate-400', label: '未绑定' },
  partial: { color: 'bg-amber-900/50 text-amber-400', label: '部分绑定' },
  bound: { color: 'bg-green-900/50 text-green-400', label: '已绑定' },
}

export default function Metrics() {
  const [metrics, setMetrics] = useState<any[]>([])
  const [datasets, setDatasets] = useState<any[]>([])
  const [filter, setFilter] = useState({ category: '全部', status: '全部', search: '', bind_status: '' })
  const [editing, setEditing] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [showBindModal, setShowBindModal] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [bindingMetric, setBindingMetric] = useState<any>(null)
  const [bindForm, setBindForm] = useState({ dataset_id: '', sql_expression: '', dimension_mappings: [] as any[] })
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ name: '', name_cn: '', category: '交易', expression: '', dimensions: '', description: '' })

  const load = () => {
    fetch(`${API}/metrics`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setMetrics).catch(console.error)
    fetch(`${API}/datasets`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setDatasets).catch(console.error)
  }
  useEffect(() => { load() }, [])

  const filtered = metrics.filter(m => {
    if (filter.category !== '全部' && m.category !== filter.category) return false
    if (filter.status !== '全部' && m.status !== filter.status) return false
    if (filter.bind_status && (m.bind_status || 'unbound') !== filter.bind_status) return false
    if (filter.search && !m.name_cn.includes(filter.search) && !m.name.includes(filter.search)) return false
    return true
  })

  const handleSave = async () => {
    const dims = form.dimensions.split(',').map(d => d.trim()).filter(Boolean)
    if (editing) {
      await fetch(`${API}/metrics/${editing.id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dimensions: dims })
      })
    } else {
      await fetch(`${API}/metrics`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dimensions: dims })
      })
    }
    setShowModal(false)
    setEditing(null)
    setForm({ name: '', name_cn: '', category: '交易', expression: '', dimensions: '', description: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该指标？')) return
    await fetch(`${API}/metrics/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    load()
  }

  const handleEdit = (m: any) => {
    setEditing(m)
    setForm({ name: m.name, name_cn: m.name_cn, category: m.category || '交易', expression: m.expression || '', dimensions: (m.dimensions || []).join(', '), description: m.description || '' })
    setShowModal(true)
  }

  const handleBindClick = (m: any) => {
    setBindingMetric(m)
    setBindForm({
      dataset_id: m.dataset_id || '',
      sql_expression: m.sql_expression || '',
      dimension_mappings: m.dimension_mappings || (m.dimensions || []).map((d: string) => ({ metric_dimension: d, dataset_field: '', dataset_field_desc: '' })),
    })
    setShowBindModal(true)
  }

  const handleUnbind = async (m: any) => {
    if (!confirm('确认解除该指标与数据集的绑定？')) return
    await fetch(`${API}/metrics/${m.id}/unbind`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token()}` }
    })
    load()
  }

  const handleGenerateSQL = async () => {
    if (!bindingMetric) return
    setGenerating(true)
    try {
      const res = await fetch(`${API}/metrics/${bindingMetric.id}/generate-sql`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: bindForm.dataset_id })
      })
      const data = await res.json()
      if (data.sql_expression) {
        setBindForm(f => ({ ...f, sql_expression: data.sql_expression, dimension_mappings: data.dimension_mappings || f.dimension_mappings }))
      } else {
        alert(data.error || 'SQL 生成失败')
      }
    } catch { alert('SQL 生成请求失败') }
    finally { setGenerating(false) }
  }

  const handleBindSave = async () => {
    if (!bindingMetric) return
    await fetch(`${API}/metrics/${bindingMetric.id}/bind`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(bindForm)
    })
    setShowBindModal(false)
    setBindingMetric(null)
    load()
  }

  const getDatasetName = (id: string) => datasets.find(d => d.id === id)?.name || '未知'

  // 指标详情
  if (showDetail) {
    const m = showDetail
    const bs = m.bind_status || 'unbound'
    const bsc = bindStatusConfig[bs]
    return (
      <div className="p-6">
        <button onClick={() => setShowDetail(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ChevronRight size={16} className="rotate-180" /> 返回指标列表
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-green-600/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <BarChart3 size={24} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">{m.name_cn}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${bsc.color}`}>{bsc.label}</span>
            </div>
            <code className="text-sm text-slate-500 font-mono">{m.name}</code>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">计算公式</div>
            <code className="text-sm text-slate-300 font-mono">{m.expression || '-'}</code>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">维度</div>
            <div className="flex flex-wrap gap-1">
              {(m.dimensions || []).map((d: string) => (
                <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-dark-bg text-slate-400">{d}</span>
              ))}
              {(!m.dimensions || m.dimensions.length === 0) && <span className="text-sm text-slate-500">无维度</span>}
            </div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">分类</div>
            <span className="text-sm text-slate-300">{m.category || '未分类'}</span>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">来源系统</div>
            <span className="text-sm text-slate-300">{m.source_system || '-'}</span>
          </div>
        </div>

        {/* 血缘链路 */}
        {m.lineage && m.lineage.length > 1 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">数据血缘</h3>
            <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl p-4 overflow-x-auto">
              {m.lineage.map((node: any, i: number) => (
                <div key={i} className="flex items-center gap-2 flex-shrink-0">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    node.type === 'requirement' ? 'bg-purple-900/40 text-purple-400' :
                    node.type === 'metric' ? 'bg-emerald-900/40 text-emerald-400' :
                    node.type === 'dataset' ? 'bg-blue-900/40 text-blue-400' :
                    'bg-amber-900/40 text-amber-400'
                  }`}>
                    {node.type === 'requirement' ? '📋' : node.type === 'metric' ? '📊' : node.type === 'dataset' ? '🗂️' : '🗄️'} {node.name}
                  </div>
                  {i < m.lineage.length - 1 && <ArrowRight size={14} className="text-slate-600 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 绑定信息 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">数据绑定</h3>
          {bs === 'unbound' ? (
            <div className="bg-dark-card border border-dark-border border-dashed rounded-xl p-8 text-center">
              <Link2 size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">该指标尚未绑定数据集，无法查询实际数据</p>
              <button onClick={() => handleBindClick(m)} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-500">
                <Link2 size={14} className="inline mr-1" /> 绑定数据集
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {m.bind_info?.dataset && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">数据集</span>
                      <span className="text-sm text-white font-medium">{m.bind_info.dataset.name}</span>
                      <code className="text-xs text-slate-500 font-mono">{m.bind_info.dataset.table_name}</code>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleBindClick(m)} className="text-xs text-primary-400 hover:text-primary-300">修改绑定</button>
                      <button onClick={() => handleUnbind(m)} className="text-xs text-red-400 hover:text-red-300">解除绑定</button>
                    </div>
                  </div>
                </div>
              )}
              {m.sql_expression && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-2">SQL 表达式</div>
                  <code className="text-sm text-primary-400 font-mono whitespace-pre-wrap">{m.sql_expression}</code>
                </div>
              )}
              {m.dimension_mappings && m.dimension_mappings.length > 0 && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-2">维度映射</div>
                  <div className="space-y-1">
                    {m.dimension_mappings.map((dm: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-slate-300">{dm.metric_dimension}</span>
                        <ArrowRight size={12} className="text-slate-600" />
                        <code className="text-primary-400 font-mono">{dm.dataset_field || '未映射'}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 描述 */}
        {m.description && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">描述</h3>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{m.description}</div>
          </div>
        )}
      </div>
    )
  }

  const statusColor: Record<string, string> = { active: 'bg-green-900/50 text-green-400', draft: 'bg-slate-700 text-slate-400', deprecated: 'bg-red-900/50 text-red-400' }
  const statusLabel: Record<string, string> = { active: '已激活', draft: '草稿', deprecated: '已废弃' }

  // 统计
  const unboundCount = metrics.filter(m => (m.bind_status || 'unbound') === 'unbound').length
  const partialCount = metrics.filter(m => (m.bind_status || 'unbound') === 'partial').length
  const boundCount = metrics.filter(m => (m.bind_status || 'unbound') === 'bound').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 size={24} className="text-emerald-400" /> 指标管理</h1>
          <p className="text-slate-400 mt-1">统一管理企业指标口径，绑定数据集实现可查询</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', name_cn: '', category: '交易', expression: '', dimensions: '', description: '' }); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 text-sm font-medium">
          <Plus size={16} /> 新建指标
        </button>
      </div>

      {/* 绑定统计 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">指标总数</div>
          <span className="text-2xl font-bold text-white">{metrics.length}</span>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">未绑定</div>
          <span className="text-2xl font-bold text-slate-400">{unboundCount}</span>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">部分绑定</div>
          <span className="text-2xl font-bold text-amber-400">{partialCount}</span>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">已绑定</div>
          <span className="text-2xl font-bold text-green-400">{boundCount}</span>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="搜索指标名称或标识..." className="w-full pl-9 pr-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
        </div>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white focus:outline-none">
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filter.bind_status} onChange={e => setFilter(f => ({ ...f, bind_status: e.target.value }))}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white focus:outline-none">
          <option value="">全部绑定状态</option>
          <option value="unbound">未绑定</option>
          <option value="partial">部分绑定</option>
          <option value="bound">已绑定</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
        <table>
          <thead>
            <tr className="text-xs text-slate-400 uppercase">
              <th>指标名称</th><th>标识符</th><th>分类</th><th>计算公式</th><th>绑定状态</th><th>数据集</th><th>操作</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map(m => {
              const bs = m.bind_status || 'unbound'
              const bsc = bindStatusConfig[bs]
              return (
                <tr key={m.id} className="border-t border-dark-border hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => setShowDetail(m)}>
                  <td className="font-medium text-white">{m.name_cn}</td>
                  <td className="text-slate-400 font-mono text-xs">{m.name}</td>
                  <td><span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{m.category || '未分类'}</span></td>
                  <td className="text-slate-400 font-mono text-xs max-w-48 truncate" title={m.expression}>{m.expression || '-'}</td>
                  <td><span className={`text-xs px-2 py-0.5 rounded-full ${bsc.color}`}>{bsc.label}</span></td>
                  <td className="text-slate-500 text-xs">{m.dataset_info?.name || (m.dataset_id ? getDatasetName(m.dataset_id) : '-')}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {bs === 'unbound' ? (
                        <button onClick={() => handleBindClick(m)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-primary-400 transition-colors" title="绑定数据集">
                          <Link2 size={14} />
                        </button>
                      ) : (
                        <button onClick={() => handleUnbind(m)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors" title="解除绑定">
                          <Unlink size={14} />
                        </button>
                      )}
                      <button onClick={() => handleEdit(m)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-slate-500">暂无数据</div>}
      </div>

      {/* 编辑模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-5">{editing ? '编辑指标' : '新建指标'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">指标中文名 *</label>
                  <input value={form.name_cn} onChange={e => setForm(f => ({ ...f, name_cn: e.target.value }))}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" placeholder="日销售额" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">英文标识 *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500 font-mono" placeholder="daily_revenue" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">业务分类</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none">
                  {categories.filter(c => c !== '全部').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">计算公式</label>
                <input value={form.expression} onChange={e => setForm(f => ({ ...f, expression: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-primary-500" placeholder="SUM(order_amount)" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">维度（逗号分隔）</label>
                <input value={form.dimensions} onChange={e => setForm(f => ({ ...f, dimensions: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" placeholder="dt, city_id, category" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">描述</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500 resize-none" placeholder="指标的详细业务含义..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">取消</button>
              <button onClick={handleSave} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-500 font-medium">{editing ? '保存修改' : '创建指标'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 绑定模态框 */}
      {showBindModal && bindingMetric && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowBindModal(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">绑定数据集 — {bindingMetric.name_cn}</h2>
              <button onClick={() => setShowBindModal(false)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              {/* 指标信息 */}
              <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">计算公式：</span><code className="text-primary-400 font-mono">{bindingMetric.expression}</code></div>
                  <div><span className="text-slate-500">维度：</span><span className="text-slate-300">{(bindingMetric.dimensions || []).join(', ') || '无'}</span></div>
                </div>
              </div>

              {/* 选择数据集 */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">选择数据集 *</label>
                <select value={bindForm.dataset_id} onChange={e => setBindForm(f => ({ ...f, dataset_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none">
                  <option value="">请选择数据集</option>
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.table_name}) — {d.source_name || ''}</option>
                  ))}
                </select>
              </div>

              {/* 数据集字段预览 */}
              {bindForm.dataset_id && (() => {
                const ds = datasets.find(d => d.id === bindForm.dataset_id)
                return ds?.fields ? (
                  <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
                    <div className="text-xs text-slate-500 mb-2">数据集字段</div>
                    <div className="flex flex-wrap gap-1.5">
                      {ds.fields.map((f: any) => (
                        <span key={f.name} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {f.name} <span className="text-slate-600">({f.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* SQL 表达式 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">SQL 表达式</label>
                  <button onClick={handleGenerateSQL} disabled={generating || !bindForm.dataset_id}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-600/80 text-white rounded-lg text-xs hover:bg-purple-500 disabled:opacity-50">
                    {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI 生成
                  </button>
                </div>
                <textarea value={bindForm.sql_expression} onChange={e => setBindForm(f => ({ ...f, sql_expression: e.target.value }))}
                  rows={5} className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-primary-500 resize-none"
                  placeholder="SELECT COUNT(*) FROM table_name WHERE ..." />
              </div>

              {/* 维度映射 */}
              {bindForm.dimension_mappings.length > 0 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-2">维度映射</label>
                  <div className="space-y-2">
                    {bindForm.dimension_mappings.map((dm: any, i: number) => {
                      const ds = datasets.find(d => d.id === bindForm.dataset_id)
                      return (
                        <div key={i} className="flex items-center gap-3 bg-dark-bg border border-dark-border rounded-lg p-3">
                          <span className="text-sm text-slate-300 flex-shrink-0 w-24">{dm.metric_dimension}</span>
                          <ArrowRight size={14} className="text-slate-600 flex-shrink-0" />
                          <select value={dm.dataset_field} onChange={e => {
                            const newMappings = [...bindForm.dimension_mappings]
                            newMappings[i] = { ...newMappings[i], dataset_field: e.target.value }
                            setBindForm(f => ({ ...f, dimension_mappings: newMappings }))
                          }}
                            className="flex-1 px-3 py-1.5 bg-dark-card border border-dark-border rounded-lg text-sm text-white focus:outline-none">
                            <option value="">未映射</option>
                            {ds?.fields?.map((f: any) => <option key={f.name} value={f.name}>{f.name} ({f.description})</option>)}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBindModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">取消</button>
              <button onClick={handleBindSave} disabled={!bindForm.dataset_id}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-500 font-medium disabled:opacity-50">
                <Link2 size={14} className="inline mr-1" /> 保存绑定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
