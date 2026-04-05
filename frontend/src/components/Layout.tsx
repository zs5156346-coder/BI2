import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Bot, BarChart3, GitBranch, Shield, ChevronLeft, LogOut, Settings, ClipboardList, LayoutGrid, Database } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/portal', icon: LayoutGrid, label: '数据门户' },
  { path: '/market', icon: Database, label: '数据市场' },
  { path: '/agents', icon: Bot, label: 'Agent 协作' },
  { path: '/metrics', icon: BarChart3, label: '指标管理' },
  { path: '/visualization', icon: BarChart3, label: '可视化' },
  { path: '/projects', icon: GitBranch, label: '项目管理' },
  { path: '/permission', icon: Shield, label: '权限管理' },
  { path: '/requirements', icon: ClipboardList, label: '需求管理' },
  { path: '/settings', icon: Settings, label: '模型配置' },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-dark-card border-r border-dark-border flex flex-col transition-all duration-300 flex-shrink-0`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-dark-border">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-2xl">🦞</span>
            <span className={`font-bold text-lg text-white whitespace-nowrap transition-opacity ${collapsed ? 'opacity-0' : 'opacity-100'}`}>ClawBI</span>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span className={`whitespace-nowrap transition-opacity ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* 底部 */}
        <div className="border-t border-dark-border p-2 space-y-0.5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 w-full transition-all"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span className={`whitespace-nowrap transition-opacity ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>退出登录</span>
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 w-full transition-all"
          >
            <ChevronLeft size={18} className={`flex-shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            <span className={`whitespace-nowrap transition-opacity ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>收起</span>
          </button>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
