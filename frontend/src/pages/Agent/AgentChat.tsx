import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Send, Bot, User, Sparkles, RefreshCw, Copy, Check, BarChart3, X } from 'lucide-react'

const API = '/api'
const token = () => localStorage.getItem('token') || ''

interface Message { id: string; role: string; content: string; timestamp?: string }

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>()
  const [agent, setAgent] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [contextData, setContextData] = useState<any>(null)
  const [reportGenerating, setReportGenerating] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [reportSaved, setReportSaved] = useState(false)
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
        document.title = `${data.name_cn} - ClawBI`
      }).catch(console.error)
    fetch(`${API}/agents/${agentId}/messages`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(data => {
        setMessages(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content })))
      }).catch(console.error)
  }, [agentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showReport])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    const msgText = input.trim()
    setInput('')
    setLoading(true)
    setReportGenerating(false)
    setShowReport(false)

    try {
      await fetch(`${API}/agents/${agentId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: msgText })
      })
      const res = await fetch(`${API}/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText, context: {}, create_requirement: agentId === 'analyst' && !contextData?.id })
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

  const copyContent = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const generateReport = async () => {
    if (messages.length < 2) { alert('请先进行对话再生成报告'); return }
    const reqId = contextData?.id
    if (!reqId) { alert('请从项目页面选择一个需求后再生成报告'); return }
    setReportGenerating(true)
    setShowReport(false)
    try {
      const res = await fetch(`${API}/requirements/report/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ requirement_id: reqId, agent_id: agentId, conversation: messages.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '生成失败')
      setReportData(data.report)
      setShowReport(true)
    } catch (err: any) {
      alert('生成报告失败: ' + err.message)
    } finally {
      setReportGenerating(false)
    }
  }

  const saveReportToRequirement = async () => {
    if (!reportData || !contextData?.id) return
    try {
      await fetch(`${API}/requirements/${contextData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ report: reportData.readableReport, status: 'analyzing' }),
      })
      setReportSaved(true)
      setTimeout(() => setReportSaved(false), 3000)
    } catch (err: any) {
      alert('保存失败: ' + err.message)
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
      </div>

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

      {/* 分析报告展示面板 */}
      {showReport && reportData && (
        <div className="border-t border-indigo-700/30 bg-indigo-950/30 max-h-80 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-indigo-300">📄 需求分析报告</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-400">
                  置信度 {((reportData.confidence || 0.8) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={saveReportToRequirement}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 text-xs hover:bg-emerald-600/30">
                  {reportSaved ? '✅ 已保存' : '💾 保存到需求'}
                </button>
                <button onClick={generateReport} disabled={reportGenerating}
                  className="px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-slate-400 text-xs hover:text-white disabled:opacity-50">
                  {reportGenerating ? '生成中...' : '🔄 重新生成'}
                </button>
                <button onClick={() => setShowReport(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-white text-xs">
                  收起
                </button>
              </div>
            </div>
            {/* 指标 */}
            {reportData.report?.metrics?.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs text-slate-400 mb-2 font-medium">📊 指标定义</h4>
                <div className="space-y-2">
                  {reportData.report.metrics.map((m: any, i: number) => (
                    <div key={i} className="bg-dark-bg rounded-lg p-3 border border-dark-border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{m.name_cn}</span>
                        <span className="text-xs text-slate-500 font-mono">({m.name})</span>
                        {m.category && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{m.category}</span>}
                        {m.priority === 'high' && <span className="text-xs text-red-400 ml-auto">🔴 高优</span>}
                      </div>
                      {m.expression && <div className="text-xs font-mono text-indigo-400 mb-1">公式: {m.expression}</div>}
                      {m.dimensions?.length > 0 && <div className="text-xs text-slate-500">维度: {m.dimensions.join(', ')}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 业务目标 */}
            {reportData.report?.business_goal && (
              <div className="mb-3">
                <h4 className="text-xs text-slate-400 mb-1 font-medium">🎯 业务目标</h4>
                <p className="text-sm text-slate-300">{reportData.report.business_goal}</p>
              </div>
            )}
            {/* 分析方案 */}
            {reportData.report?.analysis_plan && (
              <div className="mb-3">
                <h4 className="text-xs text-slate-400 mb-1 font-medium">📋 分析方案</h4>
                <p className="text-sm text-slate-300">{reportData.report.analysis_plan.approach}</p>
              </div>
            )}
            {/* 下一步 */}
            {reportData.report?.next_steps?.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-400 mb-1.5 font-medium">➡️ 下一步行动</h4>
                {reportData.report.next_steps.map((s: string, i: number) => (
                  <div key={i} className="text-sm text-slate-300 flex gap-2 mb-1">
                    <span className="text-indigo-400 flex-shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 pb-3 flex gap-2">
            <button onClick={generateReport} disabled={reportGenerating}
              className="px-4 py-2 bg-indigo-600/20 border border-indigo-600/40 text-indigo-400 rounded-lg text-xs hover:bg-indigo-600/30 disabled:opacity-50 flex items-center gap-1.5">
              {reportGenerating ? <><RefreshCw size={12} className="animate-spin" /> 生成中</> : <><RefreshCw size={12} /> 重新生成</>}
            </button>
            <button onClick={saveReportToRequirement}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-500 flex items-center gap-1.5">
              💾 保存到需求
            </button>
          </div>
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
            {agentId === 'analyst' && (
              <button onClick={generateReport} disabled={reportGenerating}
                className="mt-6 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2">
                {reportGenerating ? <><RefreshCw size={14} className="animate-spin" /> 生成中...</> : <><BarChart3 size={14} /> 生成分析报告</>}
              </button>
            )}
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
              </div>
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

        {/* 对话完成后显示报告生成按钮 */}
        {!loading && messages.length >= 3 && agentId === 'analyst' && !showReport && (
          <div className="flex justify-center pt-2">
            <button onClick={generateReport} disabled={reportGenerating}
              className="px-5 py-2.5 bg-indigo-600/20 border border-indigo-600/40 text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-600/30 disabled:opacity-50 flex items-center gap-2 transition-colors">
              {reportGenerating ? <><RefreshCw size={14} className="animate-spin" /> 生成中...</> : <><BarChart3 size={15} /> 生成结构化分析报告</>}
            </button>
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
            {agentId === 'analyst' && input.trim() && (
              <button
                onClick={async () => {
                  const token = localStorage.getItem('token')
                  const res = await fetch(`${API}/requirements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ title: input.substring(0, 80), description: input, source: 'agent', agent_id: 'analyst' })
                  })
                  if (res.ok) alert('✅ 已保存到需求清单')
                }}
                className="px-3 py-1.5 rounded-xl text-xs bg-dark-bg border border-dark-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-1">
                📋 保存需求
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600 text-center mt-2">Enter 发送，Shift+Enter 换行</p>
      </div>
    </div>
  )
}
