import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ExternalLink, Clock, TrendingUp, LayoutGrid, Search } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

interface DeployedProject {
  id: string
  name: string
  description: string
  dashboard_title?: string
  updated_at: string
  chart_count?: number
}

export default function DataPortal() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<DeployedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`${API}/projects`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(data => {
        // 过滤已上线且有 dashboard 数据的项目
        const deployed = data
          .filter((p: any) => p.status === 'completed' && p.current_phase === 'ops' && p.dashboard)
          .map((p: any) => {
            let dashboardData: any = null
            try {
              dashboardData = typeof p.dashboard === 'string' ? JSON.parse(p.dashboard) : p.dashboard
            } catch { /* ignore */ }
            return {
              id: p.id,
              name: p.name.replace(/ - 交付任务$/, ''),
              description: p.description?.split('\n')[0] || '',
              dashboard_title: dashboardData?.dashboard_title || '',
              updated_at: p.updated_at,
              chart_count: dashboardData?.charts?.length || 0,
            }
          })
          .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        setProjects(deployed)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = projects.filter(p =>
    !search || p.name.includes(search) || (p.dashboard_title && p.dashboard_title.includes(search))
  )

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // 为每个项目生成不同的颜色
  const colorPalette = [
    'from-blue-600/20 to-blue-800/10 border-blue-500/30 hover:border-blue-400/60',
    'from-emerald-600/20 to-emerald-800/10 border-emerald-500/30 hover:border-emerald-400/60',
    'from-purple-600/20 to-purple-800/10 border-purple-500/30 hover:border-purple-400/60',
    'from-amber-600/20 to-amber-800/10 border-amber-500/30 hover:border-amber-400/60',
    'from-rose-600/20 to-rose-800/10 border-rose-500/30 hover:border-rose-400/60',
  ]

  const iconColors = ['text-blue-400', 'text-emerald-400', 'text-purple-400', 'text-amber-400', 'text-rose-400']

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <LayoutGrid size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">数据门户</h1>
            <p className="text-slate-400 text-sm mt-0.5">已上线的 BI 看板集中展示</p>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="搜索看板..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2.5 rounded-xl bg-dark-card border border-dark-border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-400">加载中...</div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <BarChart3 size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">
            {search ? '没有找到匹配的看板' : '暂无已上线的看板'}
          </p>
          {!search && (
            <p className="text-slate-600 text-sm mt-2">在项目管理中完成看板交付后，将自动出现在这里</p>
          )}
        </div>
      )}

      {/* 看板卡片网格 */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project, idx) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}/dashboard`, { state: { from: '/portal' } })}
              className={`group relative cursor-pointer bg-gradient-to-br ${colorPalette[idx % colorPalette.length]} border rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
            >
              {/* 图标和标题 */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center`}>
                  <BarChart3 size={20} className={iconColors[idx % iconColors.length]} />
                </div>
                <ExternalLink size={16} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* 看板标题 */}
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-300 transition-colors">
                {project.dashboard_title || project.name}
              </h3>

              {/* 描述 */}
              <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                {project.description}
              </p>

              {/* 底部信息 */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <TrendingUp size={12} />
                  <span>{project.chart_count} 个图表</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{formatDate(project.updated_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
