import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Upload, BarChart2, ShieldCheck, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, logout, isStaff } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const links = [
    { to: '/',             label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/upload',       label: 'Upload',        icon: Upload          },
    { to: '/price-compare',label: 'Price Compare', icon: BarChart2       },
    ...(isStaff ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-gray-200/70 dark:border-slate-800/70 px-6 flex items-center justify-between h-14 shadow-sm transition-colors duration-300">
      <span className="text-lg font-bold text-emerald-600 tracking-tight">GrocerTrack</span>

      <ul className="flex items-center gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        {user && (
          <div className="text-right hidden sm:block mr-1">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 leading-tight">{user.fullName}</p>
            <p className={`text-xs leading-tight font-medium ${isStaff ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
              {isStaff ? 'Staff' : 'Shopper'}
            </p>
          </div>
        )}
        <button
          onClick={toggle}
          className="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-2 rounded-xl transition-colors"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </nav>
  )
}
