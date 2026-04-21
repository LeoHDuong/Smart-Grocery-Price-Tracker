import { useEffect, useState, type ElementType } from 'react'
import { ShoppingCart, Store, Clock, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { products, stores, prices, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { StatCardSkeleton } from '../components/Skeleton'
import Sparkline, { mockPriceHistory } from '../components/Sparkline'

interface DashboardStats {
  totalProducts: number
  totalStores: number
  lastSyncAt: string | null
}

interface CategoryAvg { category: string; avgPrice: number }

type LoadState = 'loading' | 'ok' | 'error'

function formatSync(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatCard({ icon: Icon, label, value, trend, trendLabel, sparkSeed }: {
  icon: ElementType; label: string; value: string
  trend?: 'up' | 'neutral'; trendLabel?: string; sparkSeed?: string
}) {
  return (
    <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-md dark:shadow-slate-900 border border-gray-100 dark:border-slate-800/60 p-6 flex items-start gap-4 transition-colors duration-300">
      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl shrink-0">
        <Icon size={22} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-slate-100 mt-0.5">{value}</p>
        {trendLabel && (
          <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
            {trend === 'up' && <TrendingUp size={11} />}
            {trendLabel}
          </p>
        )}
      </div>
      {sparkSeed && (
        <div className="self-end opacity-70">
          <Sparkline values={mockPriceHistory(sparkSeed, 10)} />
        </div>
      )}
    </div>
  )
}

interface TooltipPayload { value: number }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg px-4 py-2.5 text-sm">
      <p className="font-semibold text-gray-700 dark:text-slate-200">{label}</p>
      <p className="text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">${payload[0].value.toFixed(2)} avg</p>
    </div>
  )
}

const GRAD_PAIRS: [string, string][] = [
  ['#059669','#34d399'], ['#0d9488','#2dd4bf'], ['#0284c7','#38bdf8'],
  ['#7c3aed','#a78bfa'], ['#db2777','#f472b6'], ['#d97706','#fbbf24'],
  ['#16a34a','#86efac'], ['#0891b2','#67e8f9'],
]
const GRAD_IDS = GRAD_PAIRS.map((_, i) => `grad-${i}`)

// Role-specific AI insight copy
const SHOPPER_INSIGHT = "Tip: Switching your pantry staples to Costco could save you $12.40 this week based on current prices."
const STAFF_INSIGHT   = "Data: 6 products have >40% price variance across stores — consider flagging for promotional review."

export default function Dashboard() {
  const { accessToken, isStaff } = useAuth()
  const [stats,     setStats]     = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<CategoryAvg[]>([])
  const [state,     setState]     = useState<LoadState>('loading')

  useEffect(() => {
    let cancelled = false
    setState('loading'); setStats(null); setChartData([])
    async function load() {
      try {
        const [productsPage, storeList, pricesPage, allProducts] = await Promise.all([
          products.list({ pageSize: 1 }),
          stores.list(),
          prices.list({ pageSize: 1 }),
          products.list({ pageSize: 100, sortBy: 'name' }),
        ])
        if (cancelled) return
        setStats({ totalProducts: productsPage.totalCount, totalStores: storeList.length, lastSyncAt: pricesPage.items[0]?.recordedAt ?? null })
        const grouped: Record<string, number[]> = {}
        for (const p of allProducts.items) {
          if (p.lowestPrice == null) continue
          const cat = p.categoryName ?? 'Uncategorized'
          ;(grouped[cat] ??= []).push(p.lowestPrice)
        }
        setChartData(Object.entries(grouped)
          .map(([category, vals]) => ({ category, avgPrice: vals.reduce((s, v) => s + v, 0) / vals.length }))
          .sort((a, b) => b.avgPrice - a.avgPrice))
        setState('ok')
      } catch (err) {
        if (cancelled) return
        console.error(err instanceof ApiError ? `API ${err.status}: ${err.message}` : err)
        setState('error')
      }
    }
    load()
    return () => { cancelled = true }
  }, [accessToken])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
          {isStaff ? 'Management Overview' : 'Your Savings Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          {isStaff ? 'Monitor catalog health, store data, and sync status.' : 'Live grocery price tracking across all stores.'}
        </p>
      </div>

      {state === 'error' && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          Could not load data. Make sure the backend is running at <span className="font-mono">localhost:5105</span>.
        </div>
      )}

      {/* AI Insight card */}
      {state === 'ok' && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-emerald-700 dark:to-teal-800 p-5 shadow-lg shadow-emerald-900/30">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-4 w-40 h-40 rounded-full bg-white/5" />
          <div className="relative flex items-start gap-3">
            <div className="p-2 bg-white/20 rounded-2xl shrink-0 mt-0.5">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-1">GrocerAI Insight</p>
              <p className="text-sm text-white font-medium leading-relaxed">
                {isStaff ? STAFF_INSIGHT : SHOPPER_INSIGHT}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {state === 'loading' ? (
          <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></>
        ) : (
          <>
            <StatCard icon={ShoppingCart} label="Total Products Tracked"
              value={stats ? stats.totalProducts.toLocaleString() : '—'}
              trend="up" trendLabel="+2% this week" sparkSeed="products-total" />
            <StatCard icon={Store} label="Stores in System"
              value={stats ? stats.totalStores.toLocaleString() : '—'}
              trend="neutral" trendLabel="No change" sparkSeed="stores-total" />
            <StatCard icon={Clock} label="Last Data Sync"
              value={stats?.lastSyncAt ? formatSync(stats.lastSyncAt) : 'No data yet'}
              trend="up" trendLabel="Up to date" sparkSeed="sync-time" />
          </>
        )}
      </div>

      {/* Bar chart */}
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-md dark:shadow-slate-900 border border-gray-100 dark:border-slate-800/60 p-6 transition-colors duration-300">
        <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100 mb-1">Average Price by Category</h2>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-6">Based on current lowest price per product.</p>

        {state === 'loading' ? (
          <div className="space-y-3 pt-2">
            {[70, 55, 85, 45, 60].map((w, i) => (
              <div key={i} className="relative overflow-hidden bg-gray-100 dark:bg-slate-800 rounded-xl h-8 flex-1" style={{ maxWidth: `${w}%` }}>
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-gray-300 dark:text-slate-600 text-sm">No price data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barSize={38}>
              <defs>
                {GRAD_PAIRS.map(([start, end], i) => (
                  <linearGradient key={GRAD_IDS[i]} id={GRAD_IDS[i]} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={start} stopOpacity={1} />
                    <stop offset="100%" stopColor={end} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={42} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0fdf4', radius: 8 }} />
              <Bar dataKey="avgPrice" radius={[10, 10, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={`url(#${GRAD_IDS[i % GRAD_IDS.length]})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
