import { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, ChevronUp, Loader2, Tag, ScanSearch } from 'lucide-react'
import { products, prices, type ProductResponseDto, type PriceHistoryPointDto } from '../api/client'
import { TableRowSkeleton } from '../components/Skeleton'

interface RowData {
  product: ProductResponseDto
  history: PriceHistoryPointDto[] | null
  expanded: boolean
  loading: boolean
}

function useDebounce(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function PriceCompare() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<RowData[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounced = useDebounce(query, 350)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!debounced.trim()) {
      setRows([])
      setSearched(false)
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setSearching(true)
    products
      .list({ search: debounced, pageSize: 20 })
      .then(res => {
        if (ctrl.signal.aborted) return
        setRows(res.items.map(p => ({ product: p, history: null, expanded: false, loading: false })))
        setSearched(true)
      })
      .catch(() => { if (!ctrl.signal.aborted) setRows([]) })
      .finally(() => { if (!ctrl.signal.aborted) setSearching(false) })
  }, [debounced])

  async function toggleRow(idx: number) {
    const row = rows[idx]
    if (row.expanded) {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, expanded: false } : r))
      return
    }
    if (row.history) {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, expanded: true } : r))
      return
    }
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, loading: true } : r))
    try {
      const h = await prices.history(row.product.id)
      setRows(prev => prev.map((r, i) =>
        i === idx ? { ...r, history: h.history, expanded: true, loading: false } : r
      ))
    } catch {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, loading: false } : r))
    }
  }

  const showSkeleton = searching && rows.length === 0
  const showEmpty = searched && rows.length === 0 && !searching

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Price Compare</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Search products and compare prices across all stores.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by product name or brand…"
          className="w-full pl-10 pr-4 py-3.5 rounded-3xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 backdrop-blur-xl text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
        />
        {searching && (
          <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" />
        )}
      </div>

      {/* Results table */}
      {(rows.length > 0 || showSkeleton) && (
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-md border border-gray-100 dark:border-slate-800/60 overflow-x-auto transition-colors duration-300">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-semibold">Product</th>
                <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Brand</th>
                <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Category</th>
                <th className="text-right px-5 py-3 font-semibold">Best Price</th>
                <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Cheapest Store</th>
                <th className="text-right px-5 py-3 font-semibold hidden sm:table-cell">Savings Potential</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {showSkeleton
                ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                : rows.map((row, idx) => {
                  const minPrice = row.history
                    ? Math.min(...row.history.map(h => h.price))
                    : null
                  const maxPrice = row.history
                    ? Math.max(...row.history.map(h => h.price))
                    : null
                  const savings = (minPrice != null && maxPrice != null && maxPrice > minPrice)
                    ? { abs: maxPrice - minPrice, pct: ((maxPrice - minPrice) / maxPrice) * 100 }
                    : null
                  return (
                    <>
                      <tr
                        key={row.product.id}
                        onClick={() => toggleRow(idx)}
                        className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-slate-200">{row.product.name}</td>
                        <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 hidden sm:table-cell">
                          {row.product.brand ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          {row.product.categoryName
                            ? <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"><Tag size={10} />{row.product.categoryName}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-700">
                          {row.product.lowestPrice != null
                            ? `$${row.product.lowestPrice.toFixed(2)}`
                            : <span className="text-gray-300 font-normal">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell">
                          {row.product.lowestPriceStore ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                          {savings
                            ? <span className="text-emerald-600 font-semibold text-xs">
                                Save ${savings.abs.toFixed(2)}{' '}
                                <span className="text-emerald-500">({savings.pct.toFixed(0)}%)</span>
                              </span>
                            : row.history && row.history.length > 0
                              ? <span className="text-gray-300 text-xs">Same price</span>
                              : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400">
                          {row.loading
                            ? <Loader2 size={14} className="animate-spin text-emerald-500" />
                            : row.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>

                      {row.expanded && row.history && row.history.length > 0 && (
                        <tr key={`${row.product.id}-detail`} className="bg-gray-50 border-b border-gray-100">
                          <td colSpan={7} className="px-8 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 uppercase tracking-wide">
                                  <th className="text-left pb-2 font-semibold">Store</th>
                                  <th className="text-right pb-2 font-semibold">Price</th>
                                  <th className="text-right pb-2 font-semibold hidden sm:table-cell">Recorded</th>
                                  <th className="text-right pb-2 font-semibold">Sale</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...row.history]
                                  .sort((a, b) => a.price - b.price)
                                  .map(h => {
                                    const cheapest = h.price === minPrice
                                    return (
                                      <tr key={`${h.storeId}-${h.recordedAt}`} className={cheapest ? 'bg-emerald-50 rounded-xl' : ''}>
                                        <td className={`py-1.5 pl-2 rounded-l-xl font-medium ${cheapest ? 'text-emerald-800' : 'text-gray-700'}`}>
                                          {cheapest && <span className="mr-1.5 text-emerald-600">★</span>}
                                          {h.storeName}
                                        </td>
                                        <td className={`py-1.5 text-right font-bold ${cheapest ? 'text-emerald-700' : 'text-gray-700'}`}>
                                          ${h.price.toFixed(2)}
                                        </td>
                                        <td className="py-1.5 text-right text-gray-400 hidden sm:table-cell">
                                          {new Date(h.recordedAt).toLocaleDateString()}
                                        </td>
                                        <td className={`py-1.5 text-right pr-2 rounded-r-xl ${h.isOnSale ? 'text-amber-600 font-semibold' : 'text-gray-300'}`}>
                                          {h.isOnSale ? 'Sale' : '—'}
                                        </td>
                                      </tr>
                                    )
                                  })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* No results */}
      {showEmpty && (
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-slate-800/60 shadow-md px-6 py-16 flex flex-col items-center gap-4 text-center transition-colors duration-300">
          <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-3xl">
            <ScanSearch size={36} className="text-gray-300 dark:text-slate-600" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700 dark:text-slate-300">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Try a different product name or check your spelling.</p>
          </div>
        </div>
      )}

      {!query.trim() && (
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-slate-800/60 shadow-md px-6 py-16 flex flex-col items-center gap-5 text-center transition-colors duration-300">
          <div className="p-5 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl">
            <Search size={36} className="text-emerald-400 dark:text-emerald-500" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-700 dark:text-slate-300">Find the best deal on anything</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
              Search across Walmart, Costco, Whole Foods, and Farmers Market in real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Whole Milk', 'Chicken Breast', 'Olive Oil', 'Greek Yogurt'].map(s => (
              <button key={s} onClick={() => setQuery(s)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 text-xs font-medium rounded-xl transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
