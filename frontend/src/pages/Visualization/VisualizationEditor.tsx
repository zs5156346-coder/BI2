import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { ArrowLeft, Save, Plus, Trash2, BarChart3, LineChart, PieChart } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

const chartTypes = [
  { type: 'line', icon: LineChart, label: '折线图', color: '#6366f1' },
  { type: 'bar', icon: BarChart3, label: '柱状图', color: '#f59e0b' },
  { type: 'pie', icon: PieChart, label: '饼图', color: '#10b981' },
]

export default function VisualizationEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const [title, setTitle] = useState('销售概览仪表盘')
  const [charts, setCharts] = useState<any[]>([])
  const [vizId, setVizId] = useState<string | null>(isNew ? null : id || null)
  const [activeChart, setActiveChart] = useState<number>(0)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isNew && id) {
      Promise.all([
        fetch(`${API}/visualization/${id}`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
        fetch(`${API}/visualization/${id}/data`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      ]).then(([viz, data]) => {
        setTitle(viz.title || '')
        setCharts(viz.config?.charts || [])
        setChartData(data || [])
      }).catch(console.error)
    }
  }, [id, isNew])

  const addChart = () => {
    const newChart = {
      id: `c${Date.now()}`,
      type: 'line',
      title: `图表 ${charts.length + 1}`,
      metrics: ['daily_revenue'],
      xAxis: 'dt',
    }
    setCharts(prev => [...prev, newChart])
    setActiveChart(charts.length)
    setChartData(prev => [...prev, { id: newChart.id, title: newChart.title, type: 'line', xData: [], seriesData: [] }])
  }

  const removeChart = (idx: number) => {
    setCharts(prev => prev.filter((_, i) => i !== idx))
    setChartData(prev => prev.filter((_, i) => i !== idx))
    setActiveChart(Math.max(0, activeChart - 1))
  }

  const updateChart = (idx: number, updates: any) => {
    setCharts(prev => prev.map((c, i) => i === idx ? { ...c, ...updates } : c))
  }

  const getEchartsOption = (chart: any, data: any) => {
    const color = chartTypes.find(t => t.type === chart.type)?.color || '#6366f1'
    if (chart.type === 'line') {
      return {
        backgroundColor: 'transparent',
        grid: { top: 20, right: 20, bottom: 30, left: 50 },
        tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' } },
        xAxis: { type: 'category', data: data?.xData || [], axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 11 } },
        yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#64748b' } },
        series: [{
          type: 'line', smooth: true, data: data?.seriesData?.[0]?.data || [],
          lineStyle: { color, width: 2 }, areaStyle: { color: `${color}20` }, symbol: 'circle', symbolSize: 4,
          itemStyle: { color }
        }],
      }
    } else if (chart.type === 'bar') {
      return {
        backgroundColor: 'transparent',
        grid: { top: 20, right: 20, bottom: 30, left: 50 },
        tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' } },
        xAxis: { type: 'category', data: data?.xData || [], axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 11, rotate: 30 } },
        yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#64748b' } },
        series: [{
          type: 'bar', data: data?.seriesData?.[0]?.data || [],
          barStyle: { color }, itemStyle: { color }, barWidth: '60%',
        }],
      }
    } else if (chart.type === 'pie') {
      return {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' } },
        legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#94a3b8' } },
        series: [{ type: 'pie', radius: ['35%', '65%'], data: data?.seriesData || [], label: { color: '#94a3b8' }, itemStyle: { borderRadius: 6, borderColor: '#1e293b', borderWidth: 2 } }],
      }
    }
    return {}
  }

  const handleSave = async () => {
    setLoading(true)
    const config = { layout: 'grid', charts }
    try {
      if (isNew || !vizId) {
        const res = await fetch(`${API}/visualization`, {
          method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, type: 'dashboard', config, metrics: charts.map(c => c.metrics).flat() })
        })
        const data = await res.json()
        setVizId(data.id)
        navigate(`/visualization/${data.id}`, { replace: true })
      } else {
        await fetch(`${API}/visualization/${vizId}`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, type: 'dashboard', config, metrics: charts.map(c => c.metrics).flat() })
        })
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-dark-border bg-dark-card flex items-center gap-4">
        <Link to="/visualization" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-lg font-semibold text-white focus:outline-none border-b border-transparent focus:border-primary-500 max-w-md" />
        <button onClick={handleSave} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 text-sm font-medium disabled:opacity-50">
          <Save size={16} /> {loading ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧: 图表列表 */}
        <div className="w-56 border-r border-dark-border bg-dark-card p-3 space-y-2 overflow-y-auto">
          <button onClick={addChart} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-bg border border-dashed border-dark-border hover:border-primary-500 text-slate-400 hover:text-primary-500 text-sm transition-colors">
            <Plus size={14} /> 添加图表
          </button>
          {charts.map((chart, idx) => (
            <div key={chart.id} onClick={() => setActiveChart(idx)}
              className={`p-2.5 rounded-lg cursor-pointer transition-colors ${activeChart === idx ? 'bg-primary-600/20 border border-primary-500/50' : 'hover:bg-slate-700/50 border border-transparent'}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white truncate">{chart.title}</span>
                <button onClick={e => { e.stopPropagation(); removeChart(idx) }} className="p-0.5 text-slate-500 hover:text-red-400"><Trash2 size={12} /></button>
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">{chartTypes.find(t => t.type === chart.type)?.label || chart.type}</span>
            </div>
          ))}
        </div>

        {/* 中间: 图表预览 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {charts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-slate-400 mb-2">还没有添加图表</p>
              <button onClick={addChart} className="text-primary-500 hover:text-primary-400 text-sm">添加第一个图表 →</button>
            </div>
          ) : (
            <div className="space-y-6">
              {charts.map((chart, idx) => (
                <div key={chart.id} className={`bg-dark-card border rounded-xl p-5 ${activeChart === idx ? 'border-primary-500/50' : 'border-dark-border'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">{chart.title}</h3>
                    <span className="text-xs text-slate-500">{chartTypes.find(t => t.type === chart.type)?.label}</span>
                  </div>
                  <ReactECharts option={getEchartsOption(chart, chartData[idx])} style={{ height: 280 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧: 属性配置 */}
        {charts.length > 0 && (
          <div className="w-64 border-l border-dark-border bg-dark-card p-4 overflow-y-auto space-y-4">
            <h3 className="text-sm font-semibold text-white">图表配置</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">图表标题</label>
              <input value={charts[activeChart]?.title || ''} onChange={e => updateChart(activeChart, { title: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">图表类型</label>
              <div className="grid grid-cols-3 gap-2">
                {chartTypes.map(ct => (
                  <button key={ct.type} onClick={() => updateChart(activeChart, { type: ct.type })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${charts[activeChart]?.type === ct.type ? 'border-primary-500 bg-primary-600/10' : 'border-dark-border hover:border-slate-500'}`}>
                    <ct.icon size={16} style={{ color: ct.color }} />
                    <span className="text-xs text-slate-400">{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">指标</label>
              <input value={charts[activeChart]?.metrics?.join(', ') || ''} onChange={e => updateChart(activeChart, { metrics: e.target.value.split(',').map(s => s.trim()) })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" placeholder="daily_revenue" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">X轴字段</label>
              <input value={charts[activeChart]?.xAxis || ''} onChange={e => updateChart(activeChart, { xAxis: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500" placeholder="dt" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
