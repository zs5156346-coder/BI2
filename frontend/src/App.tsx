import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login/Login'
import AgentChat from './pages/Agent/AgentChat'
import Metrics from './pages/Metrics/Metrics'
import Visualization from './pages/Visualization/Visualization'
import VisualizationEditor from './pages/Visualization/VisualizationEditor'
import Projects from './pages/Projects/Projects'
import DashboardView from './pages/Projects/DashboardView'
import Permission from './pages/Permission/Permission';
import ModelSettings from './pages/Settings/ModelSettings';
import Requirements from './pages/Requirements/Requirements';
import Dashboard from './pages/Dashboard/Dashboard';
import DataPortal from './pages/DataPortal/DataPortal';
import DataMarket from './pages/DataMarket/DataMarket';
import SkillInstaller from './components/SkillInstaller';
import { Sparkles } from 'lucide-react';

const API = '/api'

export { API }

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    setToken(localStorage.getItem('token'))
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="portal" element={<DataPortal />} />
          <Route path="market" element={<DataMarket />} />
          <Route path="agents" element={<AgentList />} />
          <Route path="agents/:agentId" element={<AgentChat />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="visualization" element={<Visualization />} />
          <Route path="visualization/:id" element={<VisualizationEditor />} />
          <Route path="visualization/new" element={<VisualizationEditor />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId/dashboard" element={<DashboardView />} />
          <Route path="permission" element={<Permission />} />
          <Route path="settings" element={<ModelSettings />} />
          <Route path="requirements" element={<Requirements />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function AgentList() {
  const [agents, setAgents] = useState<any[]>([])
  const [installingAgent, setInstallingAgent] = useState<any>(null)

  useEffect(() => {
    fetch('/api/agents', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(setAgents).catch(console.error)
  }, [])

  return (
    <div className="p-6">
      {/* Skill 安装弹窗 */}
      {installingAgent && (
        <SkillInstaller
          agentId={installingAgent.id}
          agentName={installingAgent.name}
          agentNameCn={installingAgent.name_cn}
          onClose={() => setInstallingAgent(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🧠 Agent 协作中心</h1>
          <p className="text-slate-400 mt-1">多Agent智能协作，自动化BI交付全流程</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Sparkles size={14} className="text-yellow-400" />
          <span>支持为每个 Agent 安装专属 Skills</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.filter(a => a.id !== 'orchestrator').map(agent => (
          <div key={agent.id} className="group relative">
            <a href={`/agents/${agent.id}`} className="block group">
              <div className="bg-dark-card border border-dark-border rounded-xl p-5 hover:border-slate-500 transition-all duration-200">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{agent.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-primary-500 transition-colors">{agent.name_cn}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{agent.name}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400 mt-2"></div>
                </div>
                <p className="text-sm text-slate-400 mt-3 line-clamp-2">{agent.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(agent.capabilities as string[]).slice(0, 3).map((cap: string) => (
                    <span key={cap} className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{cap}</span>
                  ))}
                </div>
                <div className="mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-700/30">
                    🤖 {agent.model || 'modelroute'}
                  </span>
                </div>
              </div>
            </a>
            {/* 安装 Skill 按钮 */}
            <button
              onClick={(e) => { e.preventDefault(); setInstallingAgent(agent) }}
              className="absolute top-3 right-3 p-2 rounded-lg bg-primary-600/80 text-white opacity-0 group-hover:opacity-100 hover:bg-primary-500 transition-all duration-200"
              title="安装 Skill"
            >
              <Sparkles size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 编排 Agent 单独展示 */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-300 mb-3">🎯 编排调度</h2>
        {agents.filter(a => a.id === 'orchestrator').map(agent => (
          <div key={agent.id} className="relative max-w-md group">
            <a href={`/agents/${agent.id}`} className="block group">
              <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-xl p-5 hover:border-pink-500/60 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{agent.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{agent.name_cn}</h3>
                    <p className="text-sm text-slate-400">{agent.description}</p>
                  </div>
                </div>
              </div>
            </a>
            <button
              onClick={(e) => { e.preventDefault(); setInstallingAgent(agent) }}
              className="absolute top-3 right-3 p-2 rounded-lg bg-pink-600/80 text-white opacity-0 group-hover:opacity-100 hover:bg-pink-500 transition-all duration-200"
              title="安装 Skill"
            >
              <Sparkles size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}


