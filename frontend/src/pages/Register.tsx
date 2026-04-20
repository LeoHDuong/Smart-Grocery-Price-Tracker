import { useState, type FormEvent, type ElementType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, ShieldCheck, AlertCircle, Loader2, Check } from 'lucide-react'
import { auth } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import { ColorBends } from '../components/ColorBends'

const DARK_COLORS  = ['#020617', '#0f172a', '#064e3b', '#065f46']
const LIGHT_COLORS = ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac']

type Role = 'User' | 'Staff'

interface RoleCard { id: Role; label: string; sub: string; icon: ElementType }

const ROLES: RoleCard[] = [
  { id: 'User',  label: 'Shopper',  sub: 'Track prices & compare stores',  icon: ShoppingCart },
  { id: 'Staff', label: 'Admin',    sub: 'Manage catalog & view all users', icon: ShieldCheck  },
]

export default function Register() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [role,      setRole]      = useState<Role>('User')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await auth.register({ fullName, email, password, role })
      navigate('/login', { state: { registered: true } })
    } catch {
      setError('Registration failed. This email may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ColorBends
        colors={isDark ? DARK_COLORS : LIGHT_COLORS}
        speed={0.15}
        intensity={1.2}
      />

      <div className="relative min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3.5 bg-emerald-600 rounded-3xl shadow-lg shadow-emerald-900/40 mb-4">
            <ShoppingCart size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-sm text-slate-400 mt-1">Join GrocerTrack today</p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-4 py-3 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text" required autoComplete="name"
                value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password" required autoComplete="new-password" minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50"
              />
            </div>

            {/* Role card selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2.5">Account type</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(({ id, label, sub, icon: Icon }) => {
                  const active = role === id
                  return (
                    <button
                      key={id} type="button" onClick={() => setRole(id)}
                      className={`relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-150 ${
                        active
                          ? 'bg-emerald-600/20 border-emerald-500/60 shadow-md shadow-emerald-900/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </span>
                      )}
                      <Icon size={18} className={active ? 'text-emerald-400 mb-2' : 'text-slate-500 mb-2'} />
                      <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>{label}</p>
                      <p className={`text-xs mt-0.5 ${active ? 'text-slate-300' : 'text-slate-500'}`}>{sub}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/40"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6 drop-shadow">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
      </div>
    </>
  )
}
