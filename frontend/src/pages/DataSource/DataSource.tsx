import { useState, useEffect } from 'react'
import { Plus, Search, Server, Trash2, RefreshCw, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Database, ChevronRight } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

const dsTypes = [
  { value: 'mysql', label: 'MySQL', color: 'bg-blue-900/40 text-blue-400 border-blue-700/30' },
  { value: 'postgresql', label: 'PostgreSQL', color: 'bg-indigo-900/40 text-indigo-400 border-indigo-700/30' },
  { value: 'hive', label: 'Hive', color: 'bg-amber-900/40 text-amber-400 border-amber-700/30' },
  { value: 'api', label: 'REST API', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/30' },
  { value: 'excel', label: 'Excel', color: 'bg-green-900/40 text-green-400 border-green-700/30' },
]

export default function DataSource() {
  const [datasources, setDatasources] = useState<any[]>([])
  const [datasets, setDatasets] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [showTables, setShowTables] = useState<any>(null)
  const [tables, setTables] = useState<any[]>([])
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [editing, setEditing] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'mysql', host: '', port: 3306, database: '', username: '', password: '', description: '' })

  const load = () => {
    fetch(`${API}/datasources`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setDatasources).catch(console.error)
    fetch(`${API}/datasets`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setDatasets).catch(console.error)
  }
  useEffect(() => { load() }, [])

  const filtered = datasources.filter(d => !search || d.name.includes(search) || (d.description || '').includes(search))

  const totalOnline = datasources.filter(d => d.status === 'online').length
  const totalOffline = datasources.filter(d => d.status !== 'online').length

  const getDsType = (type: string) => dsTypes.find(t => t.value === type) || dsTypes[0]

  const getDatasetCount = (dsId: string) => datasets.filter(d => d.source_id === dsId).length

  const handleSave = async () => {
    if (editing) {
      await fetch(`${API}/datasources/${editing.id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    } else {
      await fetch(`${API}/datasources`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    }
    setShowModal(false)
    setEditing(null)
    setForm({ name: '', type: 'mysql', host: '', port: 3306, database: '', username: '', password: '', description: '' })
    load()
  }

  const handleEdit = (ds: any) => {
    setEditing(ds)
    setForm({ name: ds.name, type: ds.type, host: ds.host, port: ds.port, database: ds.database || '', username: ds.username || '', password: '', description: ds.description || '' })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该数据源？')) return
    const res = await fetch(`${API}/datasources/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    if (res.ok) load()
    else { const e = await res.json(); alert(e.error) }
  }

  const handleTest = async (id: string) => {
    setTesting(id)
    setTestResult(null)
    try {
      const res = await fetch(`${API}/datasources/${id}/test`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } })
      const data = await res.json()
      setTestResult(data)
      load()
    } catch { setTestResult({ result: 'error', message: '请求失败' }) }
    finally { setTesting(null) }
  }

  const handleBrowseTables = async (ds: any) => {
    const res = await fetch(`${API}/datasources/${ds.id}/tables`, { headers: { Authorization: `Bearer ${token()}` } })
    const data = await res.json()
    setTables(data)
    setShowTables(ds)
  }

  // 详情侧边栏
  if (showDetail) {
    const ds = showDetail
    const dsType = getDsType(ds.type)
    const dsDatasets = datasets.filter(d => d.source_id === ds.id)
    return (
      <div className="p-6">
        <button onClick={() => setShowDetail(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ChevronRight size={16} className="rotate-180" /> 返回数据源列表
        </button>
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 ${dsType.color}`}>
            <Server size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">{ds.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${dsType.color}`}>{dsType.label}</span>
              <span className={`w-2 h-2 rounded-full ${ds.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
            </div>
            <p className="text-slate-400 text-sm">{ds.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">连接地址</div>
            <code className="text-sm text-slate-300 font-mono">{ds.host}:{ds.port}</code>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">数据库</div>
            <code className="text-sm text-slate-300 font-mono">{ds.database || '-'}</code>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">关联数据集</div>
            <span className="text-lg font-bold text-white">{dsDatasets.length}</span>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="text-xs text-slate-500 mb-1">最近测试</div>
            <span className="text-sm text-slate-300">{ds.last_test_at ? new Date(ds.last_test_at).toLocaleString('zh-CN') : '从未测试'}</span>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => handleTest(ds.id)} disabled={testing === ds.id}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-500 disabled:opacity-50">
            {testing === ds.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 测试连接
          </button>
          <button onClick={() => handleBrowseTables(ds)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border text-slate-300 rounded-xl text-sm hover:text-white hover:border-slate-500">
            <Database size={14} /> 浏览表结构
          </button>
          <button onClick={() => handleEdit(ds)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-dark-border text-slate-300 rounded-xl text-sm hover:text-white hover:border-slate-500">
            编辑
          </button>
        </div>

        {testResult && (
          <div className={`mb-6 p-4 rounded-xl border ${testResult.result === 'success' ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
            <div className="flex items-center gap-2">
              {testResult.result === 'success' ? <CheckCircle2 size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
              <span className={`text-sm font-medium ${testResult.result === 'success' ? 'text-green-400' : 'text-red-400'}`}>{testResult.message}</span>
              {testResult.latency_ms && <span className="text-xs text-slate-500 ml-2">延迟 {testResult.latency_ms}ms</span>}
            </div>
          </div>
        )}

        {/* 关联数据集 */}
        <h3 className="text-sm font-semibold text-slate-300 mb-3">关联数据集</h3>
        {dsDatasets.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">暂无关联数据集</div>
        ) : (
          <div className="space-y-2">
            {dsDatasets.map(d => (
              <div key={d.id} className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database size={16} className="text-primary-400" />
                  <div>
                    <div className="text-sm text-white font-medium">{d.name}</div>
                    <code className="text-xs text-slate-500 font-mono">{d.table_name}</code>
                  </div>
                </div>
                <span className="text-xs text-slate-500">{d.fields?.length || 0} 字段</span>
              </div>
            ))}
          </div>
        )}

        {/* 表结构浏览 */}
        {showTables && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">表结构浏览</h3>
            <div className="space-y-2">
              {tables.map(t => (
                <div key={t.name} className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <code className="text-sm text-primary-400 font-mono">{t.name}</code>
                    <span className="text-xs text-slate-500">{t.row_count?.toLocaleString()} 行</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{t.comment}</div>
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Server size={24} className="text-blue-400" /> 数据源管理</h1>
          <p className="text-slate-400 mt-1">注册和管理数据库连接，建立数据访问通道</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', type: 'mysql', host: '', port: 3306, database: '', username: '', password: '', description: '' }); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 text-sm font-medium">
          <Plus size={16} /> 新增数据源
        </button>
      </div>

      {/* 状态概览 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">数据源总数</div>
          <span className="text-2xl font-bold text-white">{datasources.length}</span>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">在线</div>
          <span className="text-2xl font-bold text-green-400">{totalOnline}</span>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">离线</div>
          <span className="text-2xl font-bold text-red-400">{totalOffline}</span>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">数据集总数</div>
          <span className="text-2xl font-bold text-primary-400">{datasets.length}</span>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜索数据源名称..." className="w-full pl-9 pr-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500" />
      </div>

      {/* 数据源卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(ds => {
          const dsType = getDsType(ds.type)
          const dsCount = getDatasetCount(ds.id)
          return (
            <div key={ds.id} className="group bg-dark-card border border-dark-border rounded-xl p-5 hover:border-slate-500 transition-all cursor-pointer" onClick={() => setShowDetail(ds)}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${dsType.color}`}>
                  <Server size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{ds.name}</h3>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ds.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${dsType.color}`}>{dsType.label}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{ds.description || '暂无描述'}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{dsCount} 数据集</span>
                  <span>{ds.host}:{ds.port}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleTest(ds.id)} disabled={testing === ds.id}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="测试连接">
                    {testing === ds.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  </button>
                  <button onClick={() => handleEdit(ds)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="编辑">
                    <Database size={12} />
                  </button>
                  <button onClick={() => handleDelete(ds.id)}
                    className="p-1.5 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors" title="删除">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && <div className="text-center py-12 text-slate-500">暂无数据源</div>}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-5">{editing ? '编辑数据源' : '新增数据源'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">名称 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" placeholder="MES 制造执行系统" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">类型</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, port: e.target.value === 'postgresql' ? 5432 : 3306 }))}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none">
                    {dsTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">端口</label>
                  <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 3306 }))}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">主机地址 *</label>
                <input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-primary-500" placeholder="192.168.1.10" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">数据库名</label>
                <input value={form.database} onChange={e => setForm(f => ({ ...f, database: e.target.value }))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-primary-500" placeholder="mes_production" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">用户名</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" placeholder="readonly" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">密码</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-9 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" placeholder={editing ? '留空则不修改' : '输入密码'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">描述</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500 resize-none" placeholder="数据源用途说明..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">取消</button>
              <button onClick={handleSave} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-500 font-medium">{editing ? '保存修改' : '创建数据源'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
