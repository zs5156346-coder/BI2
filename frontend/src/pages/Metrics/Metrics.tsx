import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, ChevronDown, BarChart3, Check, X } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

const categories = ['全部', '交易', '用户', '流量', '财务', '运营']

export default function Metrics() {
  const [metrics, setMetrics] = useState<any[]>([])
  const [filter, setFilter] = useState({ category: '全部', status: '全部', search: '' })
  const [editing, setEditing] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', name_cn: '', category: '交易', expression: '', dimensions: '', description: '' })

  const load = () => {
    fetch(`${API}/metrics`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setMetrics).catch(console.error)
  }
  useEffect(() => { load() }, [])

  const filtered = metrics.filter(m => {
    if (filter.category !== '全部' && m.category !== filter.category) return false
    if (filter.status !== '全部' && m.status !== filter.status) return false
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

  const statusColor: Record<string, string> = { active: 'bg-green-900/50 text-green-400', draft: 'bg-slate-700 text-slate-400', deprecated: 'bg-red-900/50 text-red-400' }
  const statusLabel: Record<string, string> = { active: '已激活', draft: '草稿', deprecated: '已废弃' }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 size={24} className="text-emerald-400" /> 指标管理</h1>
          <p className="text-slate-400 mt-1">统一管理企业指标口径，确保数据一致性</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', name_cn: '', category: '交易', expression: '', dimensions: '', description: '' }); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 text-sm font-medium">
          <Plus size={16} /> 新建指标
        </button>
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
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white focus:outline-none">
          {['全部', 'active', 'draft'].map(s => <option key={s}>{s === '全部' ? '全部状态' : statusLabel[s] || s}</option>)}
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
        <table>
          <thead>
            <tr className="text-xs text-slate-400 uppercase">
              <th>指标名称</th><th>标识符</th><th>分类</th><th>计算公式</th><th>维度</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map(m => (
              <tr key={m.id} className="border-t border-dark-border hover:bg-slate-800/30 transition-colors">
                <td className="font-medium text-white">{m.name_cn}</td>
                <td className="text-slate-400 font-mono text-xs">{m.name}</td>
                <td><span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{m.category || '未分类'}</span></td>
                <td className="text-slate-400 font-mono text-xs max-w-48 truncate" title={m.expression}>{m.expression || '-'}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {(m.dimensions || []).slice(0, 2).map((d: string) => <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-dark-bg text-slate-400">{d}</span>)}
                    {(m.dimensions || []).length > 2 && <span className="text-xs text-slate-500">+{m.dimensions.length - 2}</span>}
                  </div>
                </td>
                <td><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[m.status] || statusColor.draft}`}>{statusLabel[m.status] || m.status}</span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(m)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-slate-500">暂无数据</div>}
      </div>

      {/* 模态框 */}
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
    </div>
  )
}
