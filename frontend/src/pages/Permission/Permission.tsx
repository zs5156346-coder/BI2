import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Check, Users, Database, BarChart3, Eye, Edit, Bot } from 'lucide-react'

const resourceTypes = [
  { id: 'project', label: '项目', icon: Database, color: '#6366f1' },
  { id: 'metric', label: '指标', icon: BarChart3, color: '#10b981' },
  { id: 'viz', label: '可视化', icon: Eye, color: '#3b82f6' },
  { id: 'agent', label: 'Agent', icon: Bot, color: '#f59e0b' },
]

const permissions = [
  { id: 'view', label: '查看', icon: Eye, color: '#64748b' },
  { id: 'edit', label: '编辑', icon: Edit, color: '#f59e0b' },
  { id: 'admin', label: '管理', icon: Shield, color: '#ef4444' },
]

const mockUsers = [
  { id: 'u1', username: 'admin', role: 'admin', name: '系统管理员', email: 'admin@clawbi.com' },
  { id: 'u2', username: 'analyst', role: 'user', name: '数据分析师', email: 'analyst@clawbi.com' },
  { id: 'u3', username: 'engineer', role: 'user', name: '数据工程师', email: 'engineer@clawbi.com' },
  { id: 'u4', username: 'viewer', role: 'readonly', name: '访客用户', email: 'viewer@clawbi.com' },
]

const roleColors: Record<string, string> = { admin: 'bg-red-900/50 text-red-400', user: 'bg-blue-900/50 text-blue-400', readonly: 'bg-slate-700 text-slate-400' }
const roleLabels: Record<string, string> = { admin: '管理员', user: '普通用户', readonly: '只读' }

export default function Permission() {
  const [activeTab, setActiveTab] = useState('roles')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({
    u1: ['project:admin', 'metric:admin', 'viz:admin', 'agent:admin'],
    u2: ['project:view', 'metric:edit', 'viz:edit', 'agent:view'],
    u3: ['project:edit', 'metric:edit', 'viz:edit', 'agent:edit'],
    u4: ['project:view', 'metric:view', 'viz:view', 'agent:view'],
  })

  const getPermission = (userId: string, resource: string) => {
    const perms = userPermissions[userId] || []
    if (perms.includes(`${resource}:admin`)) return 'admin'
    if (perms.includes(`${resource}:edit`)) return 'edit'
    if (perms.includes(`${resource}:view`)) return 'view'
    return null
  }

  const togglePermission = (userId: string, resource: string, level: string) => {
    const key = `${resource}:${level}`
    setUserPermissions(prev => {
      const current = prev[userId] || []
      const newPerms = current.filter(p => !p.startsWith(`${resource}:`))
      if (level !== 'none') newPerms.push(key)
      return { ...prev, [userId]: newPerms }
    })
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield size={24} className="text-red-400" /> 权限管理</h1>
        <p className="text-slate-400 mt-1">管理用户角色和资源访问权限</p>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1 w-fit">
        {['roles', 'matrix'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {tab === 'roles' ? '👥 角色管理' : '🔲 权限矩阵'}
          </button>
        ))}
      </div>

      {activeTab === 'roles' && (
        <>
          {/* 用户列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockUsers.map(user => (
              <div key={user.id} onClick={() => setSelectedUser(user)}
                className={`bg-dark-card border rounded-xl p-5 cursor-pointer transition-all ${selectedUser?.id === user.id ? 'border-primary-500 ring-1 ring-primary-500/30' : 'border-dark-border hover:border-slate-500'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {user.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{user.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[user.role]}`}>{roleLabels[user.role]}</span>
                    </div>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(userPermissions[user.id] || []).map(p => {
                    const [res, level] = p.split(':')
                    const rt = resourceTypes.find(r => r.id === res)
                    return <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-dark-bg text-slate-400">{rt?.label}·{level}</span>
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 权限编辑器 */}
          {selectedUser && (
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Users size={16} /> 为「{selectedUser.name}」配置权限
              </h3>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>资源</th>
                      {permissions.map(p => <th key={p.id} className="text-center">{p.label}</th>)}
                      <th className="text-center">无权限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resourceTypes.map(rt => (
                      <tr key={rt.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <rt.icon size={14} style={{ color: rt.color }} />
                            <span className="text-white">{rt.label}</span>
                          </div>
                        </td>
                        {permissions.map(p => {
                          const current = getPermission(selectedUser.id, rt.id)
                          return (
                            <td key={p.id} className="text-center">
                              <button onClick={() => togglePermission(selectedUser.id, rt.id, p.id)}
                                className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                                  current === p.id ? 'bg-primary-600 text-white' : 'bg-dark-bg border border-dark-border text-slate-500 hover:border-slate-500'
                                }`}>
                                {current === p.id && <Check size={14} />}
                              </button>
                            </td>
                          )
                        })}
                        <td className="text-center">
                          <button onClick={() => togglePermission(selectedUser.id, rt.id, 'none')}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                              !getPermission(selectedUser.id, rt.id) ? 'bg-red-600/20 text-red-400' : 'bg-dark-bg border border-dark-border text-slate-500 hover:border-slate-500'
                            }`}>
                            {!getPermission(selectedUser.id, rt.id) ? <Check size={14} /> : <span className="w-3 h-0.5 bg-current block"></span>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'matrix' && (
        <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>资源 / 角色</th>
                  {['admin', 'user', 'readonly'].map(r => <th key={r} className="text-center">{roleLabels[r]}</th>)}
                </tr>
              </thead>
              <tbody>
                {resourceTypes.map(rt => (
                  <tr key={rt.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <rt.icon size={14} style={{ color: rt.color }} />
                        <span className="text-white">{rt.label}</span>
                      </div>
                    </td>
                    {['admin', 'user', 'readonly'].map(role => {
                      const level = role === 'admin' ? 'admin' : role === 'user' ? 'edit' : 'view'
                      return (
                        <td key={role} className="text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            level === 'admin' ? 'bg-red-900/50 text-red-400' :
                            level === 'edit' ? 'bg-blue-900/50 text-blue-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>{level}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-dark-border">
            <p className="text-xs text-slate-500">💡 基于角色的访问控制 (RBAC)。管理员拥有全部权限，普通用户可编辑分配的资源和查看公开内容，只读用户仅可查看。</p>
          </div>
        </div>
      )}
    </div>
  )
}
