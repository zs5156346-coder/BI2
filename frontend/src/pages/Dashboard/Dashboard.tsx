import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Bot, BarChart3, GitBranch, Eye, TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [recent, setRecent] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      fetch(`${API}/dashboard/stats`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(`${API}/dashboard/activity`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
      fetch(`${API}/dashboard/recent`, { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()),
    ]).then(([s, a, r]) => { setStats(s); setActivity(a); setRecent(r); }).catch(console.error)
  }, [])

  if (!stats) return <div className="flex items-center justify-center h-full"><div className="text-slate-400">加载中...</div></div>

  const trendOption = {
    backgroundColor: 'transparent',
    grid: { top: 10, right: 10, bottom: 25, left: 40 },
    tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#f1f5f9' } },
    xAxis: { type: 'category', data: activity.map((a: any) => a.date.slice(5)), axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#64748b', fontSize: 10 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: { color: '#64748b' } },
    series: [
      { name: '消息数', type: 'line', smooth: true, data: activity.map((a: any) => a.messages), lineStyle: { color: '#6366f1', width: 2 }, areaStyle: { color: 'rgba(99,102,241,0.15)' }, symbol: 'none' },
      { name: '指标数', type: 'line', smooth: true, data: activity.map((a: any) => a.metrics * 10), lineStyle: { color: '#10b981', width: 2 }, symbol: 'none' },
    ],
  }

  const phaseLabels: Record<string, string> = { analysis: '需求分析', model: '数据建模', etl: 'ETL开发', viz: '可视化', qa: '质量验证', ops: '运维' }
  const phaseColors: Record<string, string> = { analysis: '#6366f1', model: '#8b5cf6', etl: '#f59e0b', viz: '#3b82f6', qa: '#ef4444', ops: '#6b7280' }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🖥️ BI 指挥中心</h1>
          <p className="text-slate-400 mt-1">实时掌控 BI 交付全流程</p>
        </div>
        <div className="text-sm text-slate-500">数据更新时间: {new Date().toLocaleString('zh-CN')}</div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '在线 Agent', value: stats.onlineAgents, total: stats.totalAgents, icon: Bot, color: '#6366f1', bg: 'from-indigo-900/40 to-indigo-900/10' },
          { label: '活跃指标', value: stats.activeMetrics, total: stats.totalMetrics, icon: BarChart3, color: '#10b981', bg: 'from-emerald-900/40 to-emerald-900/10' },
          { label: '进行中项目', value: stats.activeProjects, total: stats.totalProjects, icon: GitBranch, color: '#f59e0b', bg: 'from-amber-900/40 to-amber-900/10' },
          { label: '可视化报表', value: stats.totalVizs, icon: Eye, color: '#3b82f6', bg: 'from-blue-900/40 to-blue-900/10' },
        ].map((card, i) => (
          <div key={i} className={`bg-gradient-to-br ${card.bg} border border-dark-border rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{card.label}</span>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div className="text-3xl font-bold text-white">{card.value}</div>
            {card.total && <div className="text-xs text-slate-500 mt-1">共 {card.total} 个</div>}
          </div>
        ))}
      </div>

      {/* 趋势图 + 项目状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><TrendingUp size={16} style={{ color: '#6366f1' }} /> 30天活跃趋势</h2>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> 消息数</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 指标活动</span>
            </div>
          </div>
          <ReactECharts option={trendOption} style={{ height: 200 }} />
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Clock size={16} style={{ color: '#f59e0b' }} /> 项目阶段分布</h2>
          <div className="space-y-3">
            {['analysis', 'model', 'etl', 'viz', 'qa', 'ops'].map(phase => (
              <div key={phase} className="flex items-center gap-3">
                <div className="w-20 text-xs text-slate-400">{phaseLabels[phase]}</div>
                <div className="flex-1 bg-dark-bg rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.random() * 60 + 20}%`, backgroundColor: phaseColors[phase] }}></div>
                </div>
                <div className="w-8 text-xs text-slate-400 text-right">{Math.floor(Math.random() * 3 + 1)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 最近动态 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 最新指标 */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><BarChart3 size={16} style={{ color: '#10b981' }} /> 最新指标</h2>
            <button onClick={() => navigate('/metrics')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">查看全部 <ArrowRight size={12} /></button>
          </div>
          <div className="space-y-2">
            {(recent?.recentMetrics || []).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-dark-border last:border-0">
                <div>
                  <div className="text-sm text-white font-medium">{m.name_cn}</div>
                  <div className="text-xs text-slate-500">{m.name} · {m.category}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'}`}>{m.status === 'active' ? '已激活' : m.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 项目列表 */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><GitBranch size={16} style={{ color: '#f59e0b' }} /> 项目状态</h2>
            <button onClick={() => navigate('/projects')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">查看全部 <ArrowRight size={12} /></button>
          </div>
          <div className="space-y-3">
            {(recent?.recentProjects || []).map((p: any) => (
              <div key={p.id} className="p-3 bg-dark-bg rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-white">{p.name}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-green-900/50 text-green-400' : p.status === 'planning' ? 'bg-blue-900/50 text-blue-400' : 'bg-amber-900/50 text-amber-400'}`}>
                    {p.status === 'completed' ? '已完成' : p.status === 'planning' ? '规划中' : '开发中'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                  <span>阶段: {phaseLabels[p.current_phase] || p.current_phase}</span>
                  <span>进度: {p.progress}%</span>
                </div>
                <div className="w-full bg-dark-border rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${p.progress}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
