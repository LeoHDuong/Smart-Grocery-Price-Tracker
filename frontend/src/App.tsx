import { type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import PageTransition from './components/PageTransition'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import PriceCompare from './pages/PriceCompare'
import Admin from './pages/Admin'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login"    element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/" element={<RequireAuth><PageTransition><Dashboard /></PageTransition></RequireAuth>} />
        <Route path="/upload"        element={<RequireAuth><PageTransition><Upload /></PageTransition></RequireAuth>} />
        <Route path="/price-compare" element={<RequireAuth><PageTransition><PriceCompare /></PageTransition></RequireAuth>} />
        <Route path="/admin"         element={<RequireAuth><PageTransition><Admin /></PageTransition></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function AppShell() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isAuthPage ? '' : 'bg-gray-50 dark:bg-slate-950'}`}>
      {isAuthenticated && <Navbar />}
      <main className={`flex-1 w-full mx-auto ${isAuthPage ? '' : 'max-w-7xl'}`}>
        <AnimatedRoutes />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
