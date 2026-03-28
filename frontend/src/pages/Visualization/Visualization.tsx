import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Edit2, Trash2, BarChart3 } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

export default function Visualization() {
  const [vizs, setVizs] = useState<any[]>([])
  const navigate = useNavigate()
  useEffect(() => {
    fetch(`${API}/visualization`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setVizs).catch(console.error)
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该可视化？')) return
    await fetch(`${API}/visualization/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    setVizs(prev => prev.filter(v => v.id !== id))
  }

  const typeIcon: Record<string, string> = { dashboard: '📊', chart: '📈', table: '📋' }
  const typeColor: Record<string, string> = { dashboard: 'from-blue-900/40 to-blue-900/10 border-blue-500/30', chart: 'from-emerald-900/40 to-emerald-900/10 border-emerald-500/30', table: 'from-amber-900/40 to-amber-900/10 border-amber-500/30' }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 size={24} className="text-blue-400" /> 可视化中心</h1>
          <p className="text-slate-400 mt-1">创建和管理 BI 仪表盘与图表</p>
        </div>
        <button onClick={() => navigate('/visualization/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 text-sm font-medium">
          <Plus size={16} /> 新建仪表盘
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vizs.map(viz => (
          <div key={viz.id} className={`bg-gradient-to-br ${typeColor[viz.type] || typeColor.chart} border rounded-xl overflow-hidden`}>
            {/* 预览区 */}
            <div className="h-36 bg-dark-bg/50 flex items-center justify-center">
              <span className="text-5xl">{typeIcon[viz.type] || '📊'}</span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-white">{viz.title}</h3>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/visualization/${viz.id}`)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"><Eye size={14} /></button>
                  <button onClick={() => navigate(`/visualization/${viz.id}`)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(viz.id)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-900/30 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
                <span className="text-xs text-slate-500">{new Date(viz.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {vizs.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-4">📊</div>
          <p>还没有可视化报表</p>
          <button onClick={() => navigate('/visualization/new')} className="mt-4 text-primary-500 hover:text-primary-400">创建第一个仪表盘 →</button>
        </div>
      )}
    </div>
  )
}
