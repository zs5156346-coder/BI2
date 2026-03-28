import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import AgentChat from './pages/Agent/AgentChat'
import Metrics from './pages/Metrics/Metrics'
import Visualization from './pages/Visualization/Visualization'
import VisualizationEditor from './pages/Visualization/VisualizationEditor'
import Projects from './pages/Projects/Projects'
import Permission from './pages/Permission/Permission';
import ModelSettings from './pages/Settings/ModelSettings';
import Requirements from './pages/Requirements/Requirements';

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
          <Route path="agents" element={<AgentList />} />
          <Route path="agents/:agentId" element={<AgentChat />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="visualization" element={<Visualization />} />
          <Route path="visualization/:id" element={<VisualizationEditor />} />
          <Route path="visualization/new" element={<VisualizationEditor />} />
          <Route path="projects" element={<Projects />} />
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
  useEffect(() => {
    fetch('/api/agents', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(setAgents).catch(console.error)
  }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🧠 Agent 协作中心</h1>
          <p className="text-slate-400 mt-1">多Agent智能协作，自动化BI交付全流程</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.filter(a => a.id !== 'orchestrator').map(agent => (
          <a key={agent.id} href={`/agents/${agent.id}`} className="block group">
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
            </div>
          </a>
        ))}
      </div>
      {/* 编排 Agent 单独展示 */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-300 mb-3">🎯 编排调度</h2>
        {agents.filter(a => a.id === 'orchestrator').map(agent => (
          <a key={agent.id} href={`/agents/${agent.id}`} className="block max-w-md group">
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
        ))}
      </div>
    </div>
  )
}
