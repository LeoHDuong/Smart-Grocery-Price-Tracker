import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export default function Home() {
  const navigate          = useNavigate()
  const { user, isStaff } = useAuth()
  const firstName         = user?.fullName?.split(' ')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-[#020617] text-white px-6 py-12 md:px-12 lg:px-20">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto"
      >
        {/* Eyebrow */}
        <motion.p
          variants={item}
          className="text-[#86efac] text-sm font-semibold tracking-[0.2em] uppercase mb-3"
        >
          Welcome back, {firstName}
        </motion.p>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-4"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          GrocerTrack
        </motion.h1>

        <motion.p
          variants={item}
          className="text-slate-400 text-lg md:text-xl max-w-xl mb-16 leading-relaxed"
        >
          Your smart grocery companion — compare prices across stores and plan your cart in seconds.
        </motion.p>

        {/* Action cards */}
        <motion.div
          variants={container}
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {isStaff ? (
            <>
              <ActionCard
                variants={item}
                onClick={() => navigate('/overview')}
                accent="#064e3b"
                accentLight="#86efac"
                icon={<PriceIcon />}
                label="Dashboard"
                description="Monitor store activity, price trends, and catalog health at a glance."
                cta="Go to dashboard →"
              />
              <ActionCard
                variants={item}
                onClick={() => navigate('/admin')}
                accent="#0f172a"
                accentLight="#bbf7d0"
                icon={<CartIcon />}
                label="Admin"
                description="Manage products, stores, categories, and user accounts."
                cta="Open admin →"
              />
            </>
          ) : (
            <>
              <ActionCard
                variants={item}
                onClick={() => navigate('/price-compare')}
                accent="#064e3b"
                accentLight="#86efac"
                icon={<PriceIcon />}
                label="Look up a price"
                description="Search any item and instantly compare prices across Kroger, Walmart, and more."
                cta="Compare prices →"
              />
              <ActionCard
                variants={item}
                onClick={() => navigate('/fast-cart')}
                accent="#0f172a"
                accentLight="#bbf7d0"
                icon={<CartIcon />}
                label="Fast cart"
                description="Jot down everything on your mind. We'll find the cheapest way to get it all."
                cta="Build my cart →"
              />
            </>
          )}
        </motion.div>

        {/* Bottom strip */}
        <motion.div
          variants={item}
          className="mt-16 flex items-center gap-3 text-slate-600 text-sm"
        >
          <span className="w-8 h-px bg-slate-700" />
          Prices updated daily from live store data
          <span className="w-8 h-px bg-slate-700" />
        </motion.div>
      </motion.div>
    </div>
  )
}

// ── ActionCard ────────────────────────────────────────────────────────────────

interface ActionCardProps {
  variants:    typeof item
  onClick:     () => void
  accent:      string
  accentLight: string
  icon:        React.ReactNode
  label:       string
  description: string
  cta:         string
}

function ActionCard({ variants: v, onClick, accent, accentLight, icon, label, description, cta }: ActionCardProps) {
  return (
    <motion.button
      variants={v}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group relative text-left rounded-2xl p-7 border border-slate-800 overflow-hidden cursor-pointer w-full"
      style={{ background: `linear-gradient(135deg, ${accent} 0%, #020617 100%)` }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: accentLight }}
      />

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-white/10"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {icon}
      </div>

      <p className="text-xs font-bold tracking-[0.18em] uppercase mb-2" style={{ color: accentLight }}>
        {label}
      </p>
      <p className="text-white text-lg font-semibold leading-snug mb-3">
        {description}
      </p>
      <p
        className="text-sm font-medium transition-all duration-200 group-hover:translate-x-1"
        style={{ color: accentLight }}
      >
        {cta}
      </p>
    </motion.button>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PriceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bbf7d0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}