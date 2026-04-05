import { useState, useEffect } from 'react'
import { Settings, Plus, Trash2, Check, RefreshCw, ExternalLink, Key, Globe, Server, ChevronDown, X, Eye, EyeOff, AlertCircle } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

interface Provider {
  id: string
  name: string
  type: string
  baseUrl: string
  apiKey: string
  model: string
  enabled: boolean
  created_at?: string
}

interface ModelConfig {
  defaultModel: string
  defaultProvider: string
  availableModels: string[]
  customProviders: Provider[]
  currentModel: string
}

const PROVIDER_PRESETS = [
  { name: 'OpenAI GPT-4o', type: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', desc: 'OpenAI 官方 API' },
  { name: 'DeepSeek V3', type: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', desc: 'DeepSeek 性价比高' },
  { name: '通义千问 Qwen', type: 'qwen', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max', desc: '阿里通义千问' },
  { name: 'Anthropic Claude', type: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022', desc: 'Anthropic Claude' },
  { name: '智谱 GLM', type: 'zhipu', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus', desc: '智谱 GLM' },
  { name: 'Google Gemini', type: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash', desc: 'Google Gemini' },
  { name: 'OpenAI 兼容', type: 'openai', baseUrl: '', model: '', desc: '自定义 OpenAI 兼容接口' },
]

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    openai: 'bg-green-900/30 text-green-400 border-green-700/30',
    anthropic: 'bg-orange-900/30 text-orange-400 border-orange-700/30',
    gemini: 'bg-blue-900/30 text-blue-400 border-blue-700/30',
    deepseek: 'bg-purple-900/30 text-purple-400 border-purple-700/30',
    qwen: 'bg-cyan-900/30 text-cyan-400 border-cyan-700/30',
    zhipu: 'bg-indigo-900/30 text-indigo-400 border-indigo-700/30',
  }
  return colors[type] || 'bg-slate-800 text-slate-400 border-slate-700'
}

export default function ModelSettings() {
  const [config, setConfig] = useState<ModelConfig | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; text: string }>>({})
  const [saving, setSaving] = useState(false)
  const [switching, setSwitching] = useState(false)

  // 表单状态
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('openai')
  const [formBaseUrl, setFormBaseUrl] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formModel, setFormModel] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    fetch(`${API}/models/config`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(setConfig)
      .catch(console.error)
  }
  useEffect(() => { load() }, [])

  const resetForm = () => {
    setFormName('')
    setFormType('openai')
    setFormBaseUrl('')
    setFormApiKey('')
    setFormModel('')
    setShowApiKey(false)
    setFormError('')
    setEditingProvider(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (provider: Provider) => {
    setFormName(provider.name)
    setFormType(provider.type)
    setFormBaseUrl(provider.baseUrl)
    setFormApiKey('') // 编辑时不回填 key，只有新输入时才更新
    setFormModel(provider.model)
    setShowApiKey(false)
    setFormError('')
    setEditingProvider(provider)
    setShowAddModal(true)
  }

  const applyPreset = (preset: typeof PROVIDER_PRESETS[number]) => {
    setFormName(preset.name)
    setFormType(preset.type)
    setFormBaseUrl(preset.baseUrl)
    setFormModel(preset.model)
    setFormError('')
  }

  const handleSave = async () => {
    if (!formName.trim()) return setFormError('请输入 Provider 名称')
    if (!formBaseUrl.trim()) return setFormError('请输入 API 地址')
    if (!formApiKey.trim() && !editingProvider) return setFormError('请输入 API Key')

    setSaving(true)
    setFormError('')
    try {
      const body: any = {
        name: formName.trim(),
        type: formType,
        baseUrl: formBaseUrl.trim(),
        model: formModel.trim(),
      }
      if (formApiKey.trim()) body.apiKey = formApiKey.trim()

      if (editingProvider) {
        const res = await fetch(`${API}/models/providers/${editingProvider.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || '更新失败')
        }
      } else {
        const res = await fetch(`${API}/models/providers`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || '添加失败')
        }
      }
      setShowAddModal(false)
      resetForm()
      load()
    } catch (err: any) {
      setFormError(err.message)
    }
    setSaving(false)
  }

  const handleDelete = async (providerId: string) => {
    if (!confirm('确定要删除此 Provider 吗？')) return
    try {
      await fetch(`${API}/models/providers/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      })
      load()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSetDefault = async (providerId: string) => {
    setSwitching(true)
    try {
      await fetch(`${API}/models/default-provider`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId })
      })
      load()
    } catch (err: any) {
      alert(err.message)
    }
    setSwitching(false)
  }

  const handleTest = async (providerId: string, model?: string) => {
    setTesting(providerId)
    setTestResults(prev => ({ ...prev, [providerId]: { success: false, text: '测试中...' } }))
    try {
      const res = await fetch(`${API}/models/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, model })
      })
      const data = await res.json()
      setTestResults(prev => ({
        ...prev,
        [providerId]: { success: data.success, text: data.success ? `✅ 连通正常: ${data.response?.slice(0, 100)}` : `❌ ${data.error}` }
      }))
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [providerId]: { success: false, text: `❌ 请求失败: ${err.message}` }
      }))
    }
    setTesting(null)
  }

  const defaultProvider = config?.defaultProvider || 'qclaw'

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={24} className="text-primary-500" /> 模型配置
        </h1>
        <p className="text-slate-400 mt-1">配置 LLM Provider 和 API Key，支持多模型切换</p>
      </div>

      {/* 当前状态卡片 */}
      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-2xl">
            {defaultProvider === 'qclaw' ? '🦞' : '🔑'}
          </div>
          <div className="flex-1">
            <div className="text-sm text-slate-400">当前使用</div>
            <div className="text-lg font-semibold text-white">
              {defaultProvider === 'qclaw'
                ? 'QClaw 内置代理 (ModelRoute)'
                : config?.customProviders?.find(p => p.id === defaultProvider)?.name || '未知'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              默认模型: {config?.defaultModel || 'modelroute'}
            </div>
          </div>
          <div className="text-right">
            {defaultProvider === 'qclaw' ? (
              <button
                onClick={() => handleTest('qclaw')}
                disabled={testing === 'qclaw'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-xs text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={12} className={testing === 'qclaw' ? 'animate-spin' : ''} />
                {testing === 'qclaw' ? '测试中...' : '测试连通性'}
              </button>
            ) : null}
          </div>
        </div>
        {testResults['qclaw'] && defaultProvider === 'qclaw' && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${testResults['qclaw'].success ? 'bg-green-900/20 text-green-400 border border-green-700/30' : 'bg-red-900/20 text-red-400 border border-red-700/30'}`}>
            {testResults['qclaw'].text}
          </div>
        )}
        {/* QClaw 不可达警告 */}
        {defaultProvider === 'qclaw' && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30 text-xs text-amber-400">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>QClaw 内置代理需要本地运行 OpenClaw 服务（端口 19000）。如果未启动，Agent 将使用内置模板响应。建议配置自定义 API Key。</span>
          </div>
        )}
      </div>

      {/* Provider 列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">API Provider 列表</h2>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs hover:bg-primary-500 transition-colors"
          >
            <Plus size={14} /> 添加 Provider
          </button>
        </div>

        {(!config?.customProviders || config.customProviders.length === 0) ? (
          <div className="bg-dark-card border border-dark-border rounded-xl p-8 text-center">
            <Key size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">尚未配置 API Provider</p>
            <p className="text-slate-500 text-xs mt-1">点击"添加 Provider"开始配置 LLM API Key</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.customProviders.map(provider => {
              const isDefault = config!.defaultProvider === provider.id
              const testResult = testResults[provider.id]

              return (
                <div key={provider.id} className={`bg-dark-card border rounded-xl p-4 transition-all ${isDefault ? 'border-primary-500/50 ring-1 ring-primary-500/20' : 'border-dark-border'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">{provider.name}</span>
                        {isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400 border border-primary-600/30">默认</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(provider.type)}`}>
                          {provider.type.toUpperCase()}
                        </span>
                        {!provider.enabled && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-500">已禁用</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Globe size={12} /> {provider.baseUrl}</span>
                        <span className="flex items-center gap-1"><Key size={12} /> {provider.apiKey || '未设置'}</span>
                        {provider.model && <span className="flex items-center gap-1"><Server size={12} /> {provider.model}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleTest(provider.id, provider.model)}
                        disabled={testing === provider.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-xs text-slate-300 hover:border-primary-500/50 disabled:opacity-50 transition-colors"
                        title="测试连通性"
                      >
                        <RefreshCw size={12} className={testing === provider.id ? 'animate-spin' : ''} />
                      </button>
                      {!isDefault && (
                        <button
                          onClick={() => handleSetDefault(provider.id)}
                          disabled={switching}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-xs text-slate-300 hover:border-primary-500/50 disabled:opacity-50 transition-colors"
                          title="设为默认"
                        >
                          <Check size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(provider)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-xs text-slate-300 hover:border-primary-500/50 transition-colors"
                        title="编辑"
                      >
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(provider.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-xs text-red-400 hover:border-red-500/50 hover:bg-red-900/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {testResult && (
                    <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs ${testResult.success ? 'bg-green-900/20 text-green-400 border border-green-700/30' : 'bg-red-900/20 text-red-400 border border-red-700/30'}`}>
                      {testResult.text}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 添加/编辑弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
              <h3 className="font-semibold text-white">{editingProvider ? '编辑 Provider' : '添加 Provider'}</h3>
              <button onClick={() => { setShowAddModal(false); resetForm() }} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 快捷预设 */}
              {!editingProvider && (
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-2 block">快速选择</label>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => applyPreset(preset)}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                          formBaseUrl === preset.baseUrl && formType === preset.type
                            ? 'border-primary-500 bg-primary-600/10 text-primary-400'
                            : 'border-dark-border text-slate-400 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Provider 名称</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="例如: 我的 GPT-4o"
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">API 类型</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="openai">OpenAI 兼容</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="qwen">通义千问 (Qwen)</option>
                  <option value="zhipu">智谱 GLM</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">API 地址 (Base URL)</label>
                <input
                  value={formBaseUrl}
                  onChange={e => setFormBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                  API Key {editingProvider && <span className="text-slate-500 font-normal">（留空则不修改）</span>}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formApiKey}
                    onChange={e => setFormApiKey(e.target.value)}
                    placeholder={editingProvider ? '输入新的 API Key（可选）' : 'sk-...'}
                    className="w-full px-3 py-2 pr-10 bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 font-mono"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">默认模型名称</label>
                <input
                  value={formModel}
                  onChange={e => setFormModel(e.target.value)}
                  placeholder="例如: gpt-4o, deepseek-chat, qwen-max"
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-700/30 text-xs text-red-400">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-dark-border">
              <button
                onClick={() => { setShowAddModal(false); resetForm() }}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500 disabled:opacity-50 transition-colors"
              >
                {saving ? <><RefreshCw size={14} className="animate-spin" /> 保存中...</> : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
