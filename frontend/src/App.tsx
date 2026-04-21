import { type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import PageTransition from './components/PageTransition'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import FastCart from './pages/FastCart'
import PriceCompare from './pages/PriceCompare'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

// ── Route guards ──────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

function RequireCustomer({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (user?.role === 'Staff') {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}

function RequireStaff({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (user?.role !== 'Staff') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

// ── Routes ────────────────────────────────────────────────────────────────────

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/login"    element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />

        {/* Authenticated */}
        <Route path="/" element={
          <RequireAuth><PageTransition><Home /></PageTransition></RequireAuth>
        } />
        <Route path="/overview" element={
          <RequireAuth><PageTransition><Dashboard /></PageTransition></RequireAuth>
        } />
        <Route path="/fast-cart" element={
          <RequireCustomer><PageTransition><FastCart /></PageTransition></RequireCustomer>
        } />
        <Route path="/price-compare" element={
          <RequireCustomer><PageTransition><PriceCompare /></PageTransition></RequireCustomer>
        } />
        <Route path="/profile" element={
          <RequireAuth><PageTransition><Profile /></PageTransition></RequireAuth>
        } />

        {/* Staff only */}
        <Route path="/admin" element={
          <RequireStaff><PageTransition><Admin /></PageTransition></RequireStaff>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

function AppShell() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isAuthPage ? '' : 'bg-[#020617]'}`}>
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