import React, { useEffect, useRef } from 'react'
import { BarChart3 } from 'lucide-react'

export default function DashboardPreview({ dashboard }: { dashboard: any }) {
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    // 动态加载 echarts 并渲染
    const renderCharts = async () => {
      try {
        const echarts = await import('echarts')
        dashboard.charts?.forEach((chart: any) => {
          if (chart.type === 'kpi') return // KPI 不用 echarts
          const el = chartRefs.current[chart.id]
          if (!el || !chart.option) return
          const existing = echarts.getInstanceByDom(el)
          if (existing) existing.dispose()
          const instance = echarts.init(el, 'dark')
          instance.setOption({ ...chart.option, backgroundColor: 'transparent' })
        })
      } catch (e) {
        console.warn('ECharts 加载失败:', e)
      }
    }
    renderCharts()
  }, [dashboard])

  if (!dashboard?.charts?.length) return null

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 mt-4">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <BarChart3 size={16} className="text-blue-400" />
        {dashboard.dashboard_title || '看板预览'}
      </h3>
      <div className="flex flex-wrap gap-3">
        {dashboard.charts.map((chart: any) => {
          const w = chart.width || '50%'
          const widthClass = w === '100%' ? 'w-full' : w === '25%' ? 'w-[calc(25%-9px)]' : 'w-[calc(50%-6px)]'

          if (chart.type === 'kpi') {
            const trend = chart.data?.trend || 0
            return (
              <div key={chart.id} className={`${widthClass} bg-dark-bg border border-dark-border rounded-xl p-4`}>
                <div className="text-xs text-slate-400 mb-1">{chart.data?.label || chart.title}</div>
                <div className="text-2xl font-bold text-white">
                  {typeof chart.data?.value === 'number' ? chart.data.value.toLocaleString() : chart.data?.value}
                  {chart.data?.unit && <span className="text-sm text-slate-400 ml-1">{chart.data.unit}</span>}
                </div>
                {trend !== 0 && (
                  <div className={`text-xs mt-1 ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={chart.id} className={`${widthClass} bg-dark-bg border border-dark-border rounded-xl p-3`}>
              <div className="text-xs text-slate-400 mb-2">{chart.title}</div>
              <div ref={el => { chartRefs.current[chart.id] = el }} style={{ height: '200px', width: '100%' }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
