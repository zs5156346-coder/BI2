import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, BarChart3, Maximize2, Minimize2 } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

export default function DashboardView() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const backPath = (location.state as any)?.from || '/projects'
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [project, setProject] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!projectId) return
    fetch(`${API}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(data => {
        setProject(data)
        setDashboard(data.dashboard)
      })
      .catch(console.error)
  }, [projectId])

  // 动态加载 echarts 并渲染
  useEffect(() => {
    if (!dashboard?.charts?.length) return
    const renderCharts = async () => {
      try {
        const echarts = await import('echarts')
        dashboard.charts.forEach((chart: any) => {
          if (chart.type === 'kpi') return
          const el = chartRefs.current[chart.id]
          if (!el || !chart.option) return
          const existing = echarts.getInstanceByDom(el)
          if (existing) existing.dispose()
          const instance = echarts.init(el, 'dark')
          instance.setOption({ ...chart.option, backgroundColor: 'transparent' })
        })
        // 窗口大小变化时 resize
        const handleResize = () => {
          dashboard.charts.forEach((chart: any) => {
            if (chart.type === 'kpi') return
            const el = chartRefs.current[chart.id]
            if (!el) return
            const instance = echarts.getInstanceByDom(el)
            if (instance) instance.resize()
          })
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
      } catch (e) {
        console.warn('ECharts 加载失败:', e)
      }
    }
    renderCharts()
  }, [dashboard])

  if (!project) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    )
  }

  if (!dashboard?.charts?.length) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <div className="max-w-7xl mx-auto p-6">
          <button onClick={() => navigate(backPath)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
            <ArrowLeft size={16} /> 返回
          </button>
          <div className="text-center py-20 text-slate-500">暂无看板数据</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-dark-bg ${fullscreen ? '' : ''}`} style={fullscreen ? { position: 'fixed', inset: 0, zIndex: 9999 } : {}}>
      {/* 顶部导航栏 */}
      <div className="bg-dark-card border-b border-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!fullscreen && (
              <button onClick={() => navigate(backPath)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={16} /> 返回
              </button>
            )}
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400" />
              <h1 className="text-lg font-semibold text-white">{dashboard.dashboard_title || project.name || '看板预览'}</h1>
            </div>
            {fullscreen && (
              <span className="text-xs text-slate-500">{project.name}</span>
            )}
          </div>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-dark-bg border border-dark-border hover:border-slate-500 transition-colors"
          >
            {fullscreen ? <><Minimize2 size={12} /> 退出全屏</> : <><Maximize2 size={12} /> 全屏</>}
          </button>
        </div>
      </div>

      {/* 看板内容 */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-wrap gap-4">
          {dashboard.charts.map((chart: any) => {
            const w = chart.width || '50%'
            const widthClass = w === '100%' ? 'w-full' : w === '25%' ? 'w-[calc(25%-12px)]' : 'w-[calc(50%-8px)]'

            if (chart.type === 'kpi') {
              const trend = chart.data?.trend || 0
              return (
                <div key={chart.id} className={`${widthClass} bg-dark-card border border-dark-border rounded-xl p-5 hover:border-slate-500 transition-colors`}>
                  <div className="text-xs text-slate-400 mb-2">{chart.data?.label || chart.title}</div>
                  <div className="flex items-baseline gap-1">
                    <div className="text-3xl font-bold text-white">
                      {typeof chart.data?.value === 'number' ? chart.data.value.toLocaleString() : chart.data?.value}
                    </div>
                    {chart.data?.unit && <span className="text-sm text-slate-400">{chart.data.unit}</span>}
                  </div>
                  {trend !== 0 && (
                    <div className={`text-xs mt-2 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% <span className="text-slate-500">较上期</span>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div key={chart.id} className={`${widthClass} bg-dark-card border border-dark-border rounded-xl p-4 hover:border-slate-500 transition-colors`}>
                <div className="text-sm text-slate-300 font-medium mb-3">{chart.title}</div>
                <div ref={el => { chartRefs.current[chart.id] = el }} style={{ height: '280px', width: '100%' }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
