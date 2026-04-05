import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send, Bot, User, Sparkles, RefreshCw, Copy, Check, X, ChevronDown } from 'lucide-react'
import SkillInstaller from '../../components/SkillInstaller'
import DashboardPreview from '../../components/DashboardPreview'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

const AVAILABLE_MODELS = [
  { id: 'modelroute', name: 'ModelRoute (GLM)' },
  { id: 'claude', name: 'Claude' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'qwen', name: 'Qwen' },
  { id: 'gemini', name: 'Gemini' },
]

interface Message { id: string; role: string; content: string; timestamp?: string; metadata?: any }

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>()
  const [agent, setAgent] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [contextData, setContextData] = useState<any>(null)
  const [installedSkillsCount, setInstalledSkillsCount] = useState(0)
  const [showSkillInstaller, setShowSkillInstaller] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [currentModel, setCurrentModel] = useState<string>('modelroute')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [switchingModel, setSwitchingModel] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 读取 URL 上下文（从项目流程传入）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ctxParam = params.get('ctx')
    if (ctxParam) {
      try {
        const ctx = JSON.parse(decodeURIComponent(ctxParam))
        setContextData(ctx.requirement || null)
        if (ctx.requirement?.description && agentId === 'analyst') {
          setInput(`请帮我分析这个需求：${ctx.requirement.title}\n\n需求描述：${ctx.requirement.description}`)
        }
      } catch {}
    }
  }, [agentId])

  useEffect(() => {
    if (!agentId) return
    fetch(`${API}/agents/${agentId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(data => {
        setAgent(data)
        setCurrentModel(data.model || 'modelroute')
        document.title = `${data.name_cn} - ClawBI`
      }).catch(console.error)
    fetch(`${API}/agents/${agentId}/messages`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(data => {
        setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content, metadata: m.metadata })))
      }).catch(console.error)
    // 加载已安装的 Skills 数量
    fetch(`${API}/skills/agent/${agentId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => setInstalledSkillsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setInstalledSkillsCount(0))
  }, [agentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    const msgText = input.trim()
    setInput('')
    setLoading(true)
    try {
      await fetch(`${API}/agents/${agentId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: msgText })
      })
      const res = await fetch(`${API}/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText, context: {} })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const assistantMsg: Message = { id: data.id || Date.now().toString(), role: 'assistant', content: data.response, timestamp: data.timestamp }
      setMessages(prev => [...prev, assistantMsg])
      await fetch(`${API}/agents/${agentId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: data.response })
      })
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `❌ 发生错误: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const switchAgentModel = async (modelId: string) => {
    if (modelId === currentModel || switchingModel) return
    setSwitchingModel(true)
    setShowModelPicker(false)
    try {
      const res = await fetch(`${API}/agents/${agentId}/model`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      })
      if (res.ok) {
        setCurrentModel(modelId)
        setAgent(prev => prev ? { ...prev, model: modelId } : prev)
      }
    } catch {}
    setSwitchingModel(false)
  }

  const copyContent = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const confirmImportRequirement = async (assistantMsg: Message) => {
    const msgIndex = messages.findIndex(m => m.id === assistantMsg.id)
    if (msgIndex < 0) return

    // 只收集当前需求相关的对话：从上一个已导入消息之后开始，到当前 assistant 消息为止
    let startIndex = 0
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (importedIds.has(messages[i].id)) {
        startIndex = i + 1
        break
      }
    }
    const conversation = messages.slice(startIndex, msgIndex + 1).map(m => ({ role: m.role, content: m.content }))

    setConfirmingId(assistantMsg.id)
    try {
      const res = await fetch(`${API}/requirements/import-from-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ conversation, agent_id: 'analyst' })
      })
      if (res.ok) {
        setImportedIds(prev => new Set(prev).add(assistantMsg.id))
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || '导入失败，请重试')
      }
    } catch {
      alert('导入失败，请重试')
    } finally {
      setConfirmingId(null)
    }
  }

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g)
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/)
        if (match) {
          const lang = match[1] || 'sql'
          const code = match[2].trim()
          return (
            <div key={i} className="relative group my-3">
              <div className="flex items-center justify-between bg-dark-bg border border-dark-border rounded-t-lg px-4 py-1.5 text-xs text-slate-400">
                <span>{lang}</span>
                <button onClick={() => copyContent(code, `code-${i}`)} className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-slate-400 hover:text-white">
                  {copiedId === `code-${i}` ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制</>}
                </button>
              </div>
              <pre className="!rounded-t-none !my-0 !bg-dark-bg"><code>{code}</code></pre>
            </div>
          )
        }
      }
      const lines = part.split('\n')
      const tableStart = lines.findIndex(l => l.includes('|') && l.trim().startsWith('|'))
      if (tableStart !== -1) {
        const tableLines: string[] = []
        const beforeLines: string[] = lines.slice(0, tableStart)
        const afterLines: string[] = []
        for (let i = tableStart; i < lines.length; i++) {
          if (lines[i].includes('|')) tableLines.push(lines[i])
          else { for (let j = i; j < lines.length; j++) afterLines.push(lines[j]); break }
        }
        return (
          <div key={i}>
            {beforeLines.map((l, j) => <p key={`b-${j}`} className="text-slate-300 my-1">{l}</p>)}
            <div className="overflow-x-auto my-3 rounded-lg border border-dark-border">
              <table><tbody>
                {tableLines.map((row, ri) => {
                  const cells = row.split('|').filter(c => c.trim() && !c.match(/^[\s-]+$/))
                  const isHeader = ri === 0 || (ri > 0 && tableLines[ri - 1]?.includes('---'))
                  return (
                    <tr key={ri}>
                      {cells.map((cell, ci) => {
                        const text = cell.replace(/\*\*/g, '')
                        return isHeader
                          ? <th key={ci} className="font-bold">{text}</th>
                          : <td key={ci}>{text}</td>
                      })}
                    </tr>
                  )
                })}
              </tbody></table>
            </div>
            {afterLines.map((l, j) => <p key={`a-${j}`} className="text-slate-300 my-1">{l}</p>)}
          </div>
        )
      }
      return <p key={i} className="text-slate-300 my-1 whitespace-pre-wrap">{part}</p>
    })
  }

  if (!agent) return <div className="flex items-center justify-center h-full"><div className="text-slate-400">加载中...</div></div>

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="px-6 py-3 border-b border-dark-border bg-dark-card flex items-center gap-4">
        <Link to="/agents" className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${agent.color}20` }}>
          {agent.icon}
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-white text-sm">{agent.name_cn}</h1>
          <p className="text-xs text-slate-400">{agent.description}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          <span className="text-xs text-slate-400">在线</span>
        </div>
        {/* Per-Agent 模型选择器 */}
        <div className="relative ml-2">
          <button
            onClick={() => setShowModelPicker(!showModelPicker)}
            disabled={switchingModel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-dark-border hover:border-primary-500/50 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {switchingModel ? <RefreshCw size={12} className="animate-spin" /> : null}
            {AVAILABLE_MODELS.find(m => m.id === currentModel)?.name || currentModel}
            <ChevronDown size={12} />
          </button>
          {showModelPicker && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 py-1">
              {AVAILABLE_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => switchAgentModel(m.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                    m.id === currentModel
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{m.name}</span>
                  {m.id === currentModel && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowSkillInstaller(true)}
          className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/20 border border-primary-600/40 text-primary-400 text-xs hover:bg-primary-600/30 transition-colors"
        >
          <Sparkles size={14} />
          Skills {installedSkillsCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-600 text-white text-xs">{installedSkillsCount}</span>}
        </button>
      </div>

      {/* Skill 安装弹窗 */}
      {showSkillInstaller && agent && (
        <SkillInstaller
          agentId={agent.id}
          agentName={agent.name}
          agentNameCn={agent.name_cn}
          onClose={() => {
            setShowSkillInstaller(false)
            fetch(`${API}/skills/agent/${agent.id}`, { headers: { Authorization: `Bearer ${token()}` } })
              .then(r => r.json())
              .then(data => setInstalledSkillsCount(Array.isArray(data) ? data.length : 0))
          }}
        />
      )}

      {/* 需求上下文提示条 */}
      {contextData && (
        <div className="px-6 py-2 bg-indigo-950/40 border-b border-indigo-800/30 flex items-center gap-3 text-sm">
          <span className="text-indigo-400 font-medium flex-shrink-0">📋 当前需求:</span>
          <span className="text-indigo-300 truncate">{contextData.title}</span>
          {contextData.metrics?.length > 0 && (
            <div className="flex gap-1 flex-shrink-0">
              {contextData.metrics.slice(0, 3).map((m: string) => (
                <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-400">{m}</span>
              ))}
            </div>
          )}
          <button onClick={() => setContextData(null)} className="ml-auto text-indigo-500 hover:text-indigo-300">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">{agent.icon}</div>
            <h2 className="text-xl font-semibold text-white mb-2">{agent.name_cn}</h2>
            <p className="text-slate-400 max-w-md mb-4">{agent.description}</p>
            <div className="grid grid-cols-2 gap-2 text-left max-w-md">
              {(agent.capabilities as string[]).map((cap: string) => (
                <div key={cap} className="flex items-center gap-2 text-sm text-slate-300 bg-dark-card px-3 py-2 rounded-lg border border-dark-border">
                  <Sparkles size={14} style={{ color: agent.color }} />
                  {cap}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-4">💬 在下方输入您的问题开始对话</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm ${msg.role === 'user' ? 'bg-primary-600' : 'bg-dark-card border border-dark-border'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`flex-1 max-w-3xl ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block px-4 py-3 rounded-2xl text-sm ${
                msg.role === 'user' ? 'bg-primary-600 text-white rounded-tr-md' : 'bg-dark-card border border-dark-border text-slate-200 rounded-tl-md'
              }`}>
                <div className="space-y-1 text-left">{renderContent(msg.content)}</div>
                {msg.metadata?.type === 'uat_document' && msg.metadata?.dashboard && (
                  <div className="mt-4 border-t border-dark-border pt-4">
                    <DashboardPreview dashboard={msg.metadata.dashboard} />
                  </div>
                )}
              </div>
              {/* 需求分析 agent 的 assistant 回复下方显示确认导入按钮（评审文档、UAT文档、非需求内容不显示） */}
              {agentId === 'analyst' && msg.role === 'assistant' && !contextData?.id && !['review_document', 'uat_document'].includes(msg.metadata?.type) && (() => {
                // 过滤闲聊/使用指南类回复，只在包含业务分析内容时才显示导入按钮
                const content = msg.content || '';
                const hasBusinessKeyword = /分析|报表|指标|看板|需求|监控|统计|数据|计算|维度|度量|公式|建议.*指标|建议.*维度|业务|转化|留存|活跃|趋势|对比|占比|同比|环比/.test(content);
                const isGuideOrChatty = /我可以帮你|请描述|请告诉我|你可以问我|我负责|我会|欢迎使用/.test(content);
                return hasBusinessKeyword && !isGuideOrChatty;
              })() && (
                <div className="mt-1.5">
                  {importedIds.has(msg.id) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <Check size={12} /> 已导入需求管理
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmImportRequirement(msg)}
                      disabled={confirmingId === msg.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 hover:bg-indigo-600/30 disabled:opacity-50 transition-colors"
                    >
                      {confirmingId === msg.id ? (
                        <><RefreshCw size={12} className="animate-spin" /> 导入中...</>
                      ) : (
                        <>📋 确认导入需求</>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-dark-card border border-dark-border flex items-center justify-center"><Bot size={16} /></div>
            <div className="bg-dark-card border border-dark-border px-4 py-3 rounded-2xl rounded-tl-md">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <RefreshCw size={14} className="animate-spin" /> 思考中...
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t border-dark-border bg-dark-card">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`向 ${agent.name_cn} 提问...`}
            rows={1}
            className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none"
            style={{ maxHeight: '120px' }}
          />
          <div className="flex flex-col gap-1.5">
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="px-5 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-medium">
              <Send size={16} /> 发送
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-600 text-center mt-2">Enter 发送，Shift+Enter 换行</p>
      </div>
    </div>
  )
}
