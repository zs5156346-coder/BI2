import { useState, useEffect } from 'react'
import { Plus, Search, Table2, Trash2, Eye, RefreshCw, ChevronRight, Database, X, Loader2 } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

export default function Dataset() {
  const [datasets, setDatasets] = useState<any[]>([])
  const [datasources, setDatasources] = useState<any[]>([])
  const [filterSource, setFilterSource] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [preview, setPreview] = useState<any>(null)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({ source_id: '', name: '', mode: 'table', table_name: '', query: '', description: '', fields: [] })
  const [availableTables, setAvailableTables] = useState<any[]>([])
  const [loadingTables, setLoadingTables] = useState(false)

  const load = () => {
    fetch(`${API}/datasets`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setDatasets).catch(console.error)
    fetch(`${API}/datasources`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setDatasources).catch(console.error)
  }
  useEffect(() => { load() }, [])

  const filtered = datasets.filter(d => {
    if (filterSource && d.source_id !== filterSource) return false
    if (search && !d.name.includes(search) && !d.table_name.includes(search)) return false
    return true
  })

  const getSourceName = (id: string) => datasources.find(s => s.id === id)?.name || '未知'

  const handleBrowseTables = async (sourceId: string) => {
    if (!sourceId) return
    setLoadingTables(true)
    try {
      const res = await fetch(`${API}/datasources/${sourceId}/tables`, { headers: { Authorization: `Bearer ${token()}` } })
      setAvailableTables(await res.json())
    } catch { setAvailableTables([]) }
    finally { setLoadingTables(false) }
  }

  const handleSave = async () => {
    if (editing) {
      await fetch(`${API}/datasets/${editing.id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    } else {
      await fetch(`${API}/datasets`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    }
    setShowModal(false)
    setEditing(null)
    setForm({ source_id: '', name: '', mode: 'table', table_name: '', query: '', description: '', fields: [] })
    setAvailableTables([])
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该数据集？')) return
    const res = await fetch(`${API}/datasets/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    if (res.ok) load()
    else { const e = await res.json(); alert(e.error) }
  }

  const handlePreview = async (ds: any) => {
    const res = await fetch(`${API}/datasets/${ds.id}/preview`, { headers: { Authorization: `Bearer ${token()}` } })
    setPreview(await res.json())
  }

  // 详情侧边栏
  if (showDetail) {
    const ds = showDetail
    const source = datasources.find(s => s.id === ds.source_id)
    return (
      <div className="p-6">
        <button onClick={() => { setShowDetail(null); setPreview(null) }} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ChevronRight size={16} className="rotate-180" /> 返回数据集列表
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-green-600/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Table2 size={24} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1">{ds.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <code className="font-mono text-xs">{ds.table_name}</code>
              <span>·</span>
              <span>{source?.name || '未知'}</span>
              <span>·</span>
              <span>{ds.fields?.length || 0} 字段</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => handlePreview(ds)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-500">
            <Eye size={14} /> 预览数据
          </button>
          <button onClick={async () => { await fetch(`${API}/datasets/${ds.id}/refresh-fields`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } }); load() }}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border text-slate-300 rounded-xl text-sm hover:text-white hover:border-slate-500">
            <RefreshCw size={14} /> 刷新字段
          </button>
        </div>

        {/* 字段列表 */}
        <h3 className="text-sm font-semibold text-slate-300 mb-3">字段定义</h3>
        <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden mb-6">
          <div className="grid grid-cols-12 gap-0 px-4 py-2.5 bg-slate-800/50 text-xs font-medium text-slate-400 border-b border-dark-border">
            <div className="col-span-3">字段名</div><div className="col-span-2">类型</div><div className="col-span-5">说明</div><div className="col-span-2">示例</div>
          </div>
          {(ds.fields || []).map((f: any, i: number) => (
            <div key={f.name} className={`grid grid-cols-12 gap-0 px-4 py-2.5 text-sm hover:bg-slate-800/30 ${i < (ds.fields || []).length - 1 ? 'border-b border-dark-border/50' : ''}`}>
              <div className="col-span-3"><code className="text-primary-400 font-mono text-xs">{f.name}</code></div>
              <div className="col-span-2">
                <span className={`text-xs px-1.5 py-0.5 rounded ${f.type === 'string' ? 'bg-green-900/30 text-green-400' : f.type === 'int' || f.type === 'float' || f.type === 'decimal' ? 'bg-blue-900/30 text-blue-400' : f.type === 'date' || f.type === 'datetime' ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>
                  {f.type}
                </span>
              </div>
              <div className="col-span-5 text-slate-300 text-xs">{f.description}</div>
              <div className="col-span-2 text-slate-500 font-mono text-xs">{f.example || '-'}</div>
            </div>
          ))}
        </div>

        {/* 数据预览 */}
        {preview && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3">数据预览 <span className="text-xs text-slate-500 font-normal">（前5行 / 共 {preview.total?.toLocaleString()} 行）</span></h3>
            <div className="bg-dark-card border border-dark-border rounded-xl overflow-x-auto">
              <table>
                <thead>
                  <tr className="text-xs text-slate-400 uppercase">
                    {preview.fields?.map((f: any) => <th key={f.name}>{f.name}</th>)}
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {preview.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-t border-dark-border/50">
                      {preview.fields?.map((f: any) => <td key={f.name} className="font-mono text-slate-400">{row[f.name]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 关联指标 */}
        {ds.metrics && ds.metrics.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">关联指标</h3>
            <div className="space-y-2">
              {ds.metrics.map((m: any) => (
                <div key={m.id} className="bg-dark-card border border-dark-border rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">指标</span>
                  <span className="text-sm text-white">{m.name_cn}</span>
                  <code className="text-xs text-slate-500 font-mono">{m.expression}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Table2 size={24} className="text-emerald-400" /> 数据集管理</h1>
          <p className="text-slate-400 mt-1">基于数据源创建数据集，定义字段映射</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ source_id: '', name: '', mode: 'table', table_name: '', query: '', description: '', fields: [] }); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 text-sm font-medium">
          <Plus size={16} /> 新增数据集
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索数据集名称或表名..." className="w-full pl-9 pr-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
        </div>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="px-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white focus:outline-none">
          <option value="">全部数据源</option>
          {datasources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* 数据集表格 */}
      <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
        <table>
          <thead>
            <tr className="text-xs text-slate-400 uppercase">
              <th>名称</th><th>表名</th><th>所属数据源</th><th>字段数</th><th>关联指标</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map(d => (
              <tr key={d.id} className="border-t border-dark-border hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => setShowDetail(d)}>
                <td className="font-medium text-white">{d.name}</td>
                <td className="text-slate-400 font-mono text-xs">{d.table_name}</td>
                <td><span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{d.source_name || getSourceName(d.source_id)}</span></td>
                <td className="text-slate-400">{d.fields?.length || 0}</td>
                <td className="text-slate-400">{d.metric_count ?? 0}</td>
                <td><span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'}`}>{d.status === 'active' ? '活跃' : d.status}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePreview(d)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="预览"><Eye size={14} /></button>
                    <button onClick={() => handleDelete(d.id)} className="p-1 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors" title="删除"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-slate-500">暂无数据集</div>}
      </div>

      {/* 新增弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-5">{editing ? '编辑数据集' : '新增数据集'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">所属数据源 *</label>
                <select value={form.source_id} onChange={e => { setForm(f => ({ ...f, source_id: e.target.value, table_name: '' })); handleBrowseTables(e.target.value) }}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none">
                  <option value="">请选择数据源</option>
                  {datasources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">数据集名称 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" placeholder="车辆生产明细表" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">创建模式</label>
                <div className="flex gap-2">
                  <button onClick={() => setForm(f => ({ ...f, mode: 'table' }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${form.mode === 'table' ? 'bg-primary-600 text-white' : 'bg-dark-bg border border-dark-border text-slate-400'}`}>
                    选择表
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, mode: 'sql' }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${form.mode === 'sql' ? 'bg-primary-600 text-white' : 'bg-dark-bg border border-dark-border text-slate-400'}`}>
                    SQL 查询
                  </button>
                </div>
              </div>
              {form.mode === 'table' ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">选择表</label>
                  {loadingTables ? (
                    <div className="flex items-center gap-2 py-3 text-slate-500 text-sm"><Loader2 size={14} className="animate-spin" /> 加载表列表...</div>
                  ) : availableTables.length > 0 ? (
                    <select value={form.table_name} onChange={e => setForm(f => ({ ...f, table_name: e.target.value }))}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none">
                      <option value="">请选择表</option>
                      {availableTables.map(t => <option key={t.name} value={t.name}>{t.name} ({t.comment})</option>)}
                    </select>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">{form.source_id ? '该数据源暂无可用表' : '请先选择数据源'}</div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SQL 查询语句</label>
                  <textarea value={form.query} onChange={e => setForm(f => ({ ...f, query: e.target.value }))}
                    rows={4} className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-primary-500 resize-none"
                    placeholder="SELECT * FROM table_name WHERE ..." />
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-400 mb-1">描述</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500 resize-none" placeholder="数据集用途说明..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">取消</button>
              <button onClick={handleSave} disabled={!form.source_id || !form.name || (form.mode === 'table' && !form.table_name)}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-500 font-medium disabled:opacity-50">{editing ? '保存修改' : '创建数据集'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 数据预览弹窗 */}
      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">数据预览</h2>
              <button onClick={() => setPreview(null)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="text-xs text-slate-500 mb-3">共 {preview.total?.toLocaleString()} 行，展示前 5 行</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase">
                    {preview.fields?.map((f: any) => <th key={f.name} className="px-3 py-2 text-left whitespace-nowrap">{f.name}</th>)}
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {preview.rows?.map((row: any, i: number) => (
                    <tr key={i} className="border-t border-dark-border/50">
                      {preview.fields?.map((f: any) => <td key={f.name} className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">{String(row[f.name] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
