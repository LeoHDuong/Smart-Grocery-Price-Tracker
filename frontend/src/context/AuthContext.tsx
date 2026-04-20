import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { auth as authApi, setToken, clearToken, type TokenResponseDto, type UserResponseDto } from '../api/client'

interface AuthState {
  user: UserResponseDto | null
  accessToken: string | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadInitialState(): AuthState {
  const token = localStorage.getItem('accessToken')
  const raw   = localStorage.getItem('user')
  if (!token || !raw) return { user: null, accessToken: null }
  try { return { user: JSON.parse(raw) as UserResponseDto, accessToken: token } }
  catch { return { user: null, accessToken: null } }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadInitialState)

  const login = useCallback(async (email: string, password: string) => {
    const res: TokenResponseDto = await authApi.login({ email, password })
    setToken(res.accessToken)
    localStorage.setItem('refreshToken', res.refreshToken)
    localStorage.setItem('user', JSON.stringify(res.user))
    setState({ user: res.user, accessToken: res.accessToken })
  }, [])

  const logout = useCallback(() => {
    const rt = localStorage.getItem('refreshToken')
    if (rt) authApi.logout(rt).catch(() => {})
    clearToken()
    localStorage.removeItem('user')
    setState({ user: null, accessToken: null })
  }, [])

  const isStaff = state.user?.role === 'Staff'

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAuthenticated: !!state.accessToken, isStaff }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
