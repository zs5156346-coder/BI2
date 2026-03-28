import { useState, useEffect } from 'react'
import { Bot, Check, RefreshCw, Settings } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

const DEFAULT_MODELS = [
  { id: 'modelroute', name: 'ModelRoute (GLM)', desc: '智谱 GLM 模型，综合能力强' },
  { id: 'claude', name: 'Claude', desc: 'Anthropic Claude，逻辑分析强' },
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'OpenAI GPT-4o，全能型' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek V3，性价比高' },
  { id: 'qwen', name: 'Qwen', desc: '阿里通义千问，中文能力强' },
  { id: 'gemini', name: 'Gemini', desc: 'Google Gemini，多模态' },
]

export default function ModelSettings() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{success: boolean; text: string} | null>(null)
  const [customModel, setCustomModel] = useState('')

  const load = () => {
    fetch(`${API}/models/config`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(setConfig)
      .catch(console.error)
  }
  useEffect(() => { load() }, [])

  const handleSwitch = async (modelId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/models/config`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultModel: modelId })
      })
      const data = await res.json()
      if (data.currentModel) { load(); setTestResult({ success: true, text: `已切换到 ${modelId}` }) }
    } catch (err: any) { setTestResult({ success: false, text: err.message }) }
    setLoading(false)
  }

  const handleTest = async () => {
    const model = customModel.trim() || config?.currentModel
    if (!model) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`${API}/models/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      })
      const data = await res.json()
      setTestResult({ success: data.success, text: data.response || data.error })
    } catch (err: any) { setTestResult({ success: false, text: err.message }) }
    setTesting(false)
  }

  const currentModel = config?.currentModel || 'modelroute'

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={24} className="text-primary-500" /> 模型配置
        </h1>
        <p className="text-slate-400 mt-1">选择 Agent 使用的大语言模型</p>
      </div>

      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <div className="text-sm text-slate-400">当前使用模型</div>
            <div className="text-lg font-semibold text-white">
              {DEFAULT_MODELS.find(m => m.id === currentModel)?.name || currentModel}
            </div>
          </div>
          <div className="ml-auto">
            <span className="text-xs px-2 py-1 rounded-full bg-green-900/50 text-green-400">● 正常运行</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">选择模型</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DEFAULT_MODELS.map(model => {
            const isActive = currentModel === model.id
            return (
              <button
                key={model.id}
                onClick={() => handleSwitch(model.id)}
                disabled={loading}
                className={`p-4 rounded-xl border text-left transition-all ${isActive ? 'border-primary-500 bg-primary-600/10 ring-1 ring-primary-500/30' : 'border-dark-border bg-dark-card hover:border-slate-500'} disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">{model.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{model.desc}</div>
                  </div>
                  {isActive && <Check size={18} className="text-primary-500 flex-shrink-0" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">自定义模型</h2>
        <div className="flex gap-3">
          <input
            value={customModel}
            onChange={e => setCustomModel(e.target.value)}
            placeholder="输入自定义模型名称..."
            className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleTest}
            disabled={testing || !customModel.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white hover:border-primary-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? '测试中...' : '测试'}
          </button>
        </div>
        {testResult && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${testResult.success ? 'bg-green-900/20 text-green-400 border border-green-700/30' : 'bg-red-900/20 text-red-400 border border-red-700/30'}`}>
            {testResult.text?.substring(0, 200)}
          </div>
        )}
      </div>

      <div className="bg-dark-card border border-dark-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">🔗 LLM 连接信息</h2>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex gap-2">
            <span className="text-slate-500 w-20">接口地址</span>
            <span className="text-slate-300">http://127.0.0.1:19000/proxy/llm</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 w-20">认证方式</span>
            <span className="text-slate-300">Bearer Token (QClaw Gateway)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500 w-20">代理模式</span>
            <span className="text-slate-300">OpenClaw LLM Proxy (v1/chat/completions)</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-3">
          💡 通过 OpenClaw Gateway 内置的 LLM 代理，ClawBI 的 8 个专业 Agent 共享同一个大模型能力。每个 Agent 拥有专属的 System Prompt，实现分工协作。
        </p>
      </div>
    </div>
  )
}
