import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { products, prices } from '../api/client'
import type { ProductResponseDto } from '../api/client'

interface CartItem {
  id: number
  name: string
}

interface PricePoint {
  storeId: string
  storeName: string
  price: number
  isOnSale: boolean
}

interface ProductOption {
  product: ProductResponseDto
  history: PricePoint[] | null
}

interface ItemSearch {
  cartItemName: string
  options: ProductOption[]
  selectedIdx: number
  expanded: boolean
}

interface StoreOption {
  storeId: string
  storeName: string
  total: number
  itemCount: number
  breakdown: { name: string; price: number | null }[]
}

type Phase = 'cart' | 'loading' | 'results'

let nextId = 1

function computeStoreOptions(searches: ItemSearch[], totalItems: number): StoreOption[] {
  const storeMap = new Map<string, StoreOption>()

  for (const s of searches) {
    const selected = s.options[s.selectedIdx]
    if (!selected?.history) continue
    for (const p of selected.history) {
      if (!storeMap.has(p.storeId)) {
        storeMap.set(p.storeId, { storeId: p.storeId, storeName: p.storeName, total: 0, itemCount: 0, breakdown: [] })
      }
    }
  }

  for (const [storeId, option] of storeMap) {
    for (const s of searches) {
      const selected = s.options[s.selectedIdx]
      const cheapest = selected?.history
        ?.filter(p => p.storeId === storeId)
        .sort((a, b) => a.price - b.price)[0]
      option.breakdown.push({ name: s.cartItemName, price: cheapest?.price ?? null })
      if (cheapest) {
        option.total += cheapest.price
        option.itemCount++
      }
    }
  }

  return [...storeMap.values()].sort((a, b) =>
    b.itemCount !== a.itemCount ? b.itemCount - a.itemCount : a.total - b.total
  )
}

export default function FastCart() {
  const navigate                      = useNavigate()
  const [input, setInput]             = useState('')
  const [items, setItems]             = useState<CartItem[]>([])
  const inputRef                      = useRef<HTMLInputElement>(null)
  const [phase, setPhase]             = useState<Phase>('cart')
  const [sameStore, setSameStore]     = useState(false)
  const [itemSearches, setItemSearches] = useState<ItemSearch[]>([])
  const [loadingItem, setLoadingItem] = useState('')

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setItems(prev => [...prev, { id: nextId++, name: trimmed }])
    setInput('')
    inputRef.current?.focus()
  }

  const remove = (id: number) =>
    setItems(prev => prev.filter(i => i.id !== id))

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') add()
  }

  async function findPrices() {
    setPhase('loading')
    const token = localStorage.getItem('accessToken')
    const searches: ItemSearch[] = []

    for (const item of items) {
      setLoadingItem(item.name)
      try {
        // Pull live Kroger prices into the DB
        await fetch(
          `${import.meta.env.VITE_API_URL}/kroger/search?q=${encodeURIComponent(item.name)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {})

        // Get top 5 candidates sorted by price ascending — items[0] is cheapest
        const res = await products.list({ search: item.name, pageSize: 5, sortBy: 'price', descending: false })

        if (res.items.length === 0) {
          searches.push({ cartItemName: item.name, options: [], selectedIdx: 0, expanded: false })
          continue
        }

        // Eagerly fetch price history for the cheapest (first) product for same-store calculations
        const firstHist = await prices.history(res.items[0].id).catch(() => null)
        const firstSorted: PricePoint[] = firstHist
          ? [...firstHist.history].sort((a, b) => a.price - b.price)
          : []

        const options: ProductOption[] = res.items.map((p, i) => ({
          product: p,
          // lowestPrice on the DTO is authoritative for best-overall display (same as PriceCompare)
          history: i === 0 ? firstSorted : null,
        }))

        searches.push({ cartItemName: item.name, options, selectedIdx: 0, expanded: false })
      } catch {
        searches.push({ cartItemName: item.name, options: [], selectedIdx: 0, expanded: false })
      }
    }

    setItemSearches(searches)
    setLoadingItem('')
    setPhase('results')
  }

  async function selectOption(searchIdx: number, optionIdx: number) {
    setItemSearches(prev => prev.map((s, i) =>
      i === searchIdx ? { ...s, selectedIdx: optionIdx, expanded: false } : s
    ))

    const option = itemSearches[searchIdx].options[optionIdx]
    if (option.history !== null) return

    try {
      const hist = await prices.history(option.product.id)
      const sorted = [...hist.history].sort((a, b) => a.price - b.price)
      setItemSearches(prev => prev.map((s, i) => {
        if (i !== searchIdx) return s
        return {
          ...s,
          options: s.options.map((o, j) => j === optionIdx ? { ...o, history: sorted } : o),
        }
      }))
    } catch { /* keep history as null */ }
  }

  function toggleExpand(searchIdx: number) {
    setItemSearches(prev => prev.map((s, i) =>
      i === searchIdx ? { ...s, expanded: !s.expanded } : s
    ))
  }

  // Use product.lowestPrice from DTO directly — same approach as PriceCompare's "Best Price" column
  const mixedTotal = itemSearches.reduce((sum, s) => sum + (s.options[s.selectedIdx]?.product.lowestPrice ?? 0), 0)
  const hasMissingPrices = itemSearches.some(s => s.options[s.selectedIdx]?.product.lowestPrice == null)
  const storeOptions = computeStoreOptions(itemSearches, items.length)

  return (
    <div className="min-h-screen bg-[#020617] text-white px-6 py-12 md:px-12 lg:px-20">
      <div className="max-w-2xl mx-auto">

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-[#86efac] text-sm mb-10 transition-colors duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to home
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[#86efac] text-xs font-bold tracking-[0.2em] uppercase mb-2">Fast cart</p>
          <h1
            className="text-4xl md:text-5xl font-bold mb-2 tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            What do you need?
          </h1>
          <p className="text-slate-400 mb-10">Add everything on your mind — we'll find the best prices.</p>
        </motion.div>

        {/* Input row */}
        <AnimatePresence>
          {phase === 'cart' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-3 mb-8"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="e.g. whole milk, chicken breast…"
                autoFocus
                className="flex-1 bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] transition-all duration-200"
              />
              <button
                onClick={add}
                disabled={!input.trim()}
                className="px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #065f46, #064e3b)', color: '#86efac' }}
              >
                Add
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        <AnimatePresence>
          {items.length === 0 && phase === 'cart' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 text-slate-600"
            >
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-sm">Your cart is empty — start typing above</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Item list (cart phase only) */}
        {phase === 'cart' && (
          <motion.ul className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-between bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 text-xs w-5 text-right tabular-nums">{index + 1}</span>
                    <span className="text-white text-sm">{item.name}</span>
                  </div>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors duration-150 opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${item.name}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        {/* Cart phase CTA */}
        <AnimatePresence>
          {items.length > 0 && phase === 'cart' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
              className="mt-8 pt-6 border-t border-slate-800"
            >
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <button
                  onClick={() => setSameStore(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                    !sameStore ? 'bg-[#064e3b] text-[#86efac] border-[#065f46]' : 'text-slate-500 hover:text-slate-300 border-slate-800'
                  }`}
                >
                  Best overall
                </button>
                <button
                  onClick={() => setSameStore(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                    sameStore ? 'bg-[#064e3b] text-[#86efac] border-[#065f46]' : 'text-slate-500 hover:text-slate-300 border-slate-800'
                  }`}
                >
                  Same store
                </button>
                <span className="text-slate-600 text-xs">
                  {sameStore ? 'Shop everything at one store' : 'Mix stores for lowest total'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', color: '#bbf7d0' }}
                  onClick={findPrices}
                >
                  Find best prices →
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {phase === 'loading' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-3 py-10"
          >
            <Loader2 size={24} className="animate-spin text-[#86efac]" />
            <p className="text-slate-400 text-sm">
              Fetching prices for <span className="text-white font-medium">{loadingItem}</span>…
            </p>
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 pt-6 border-t border-slate-800 space-y-5"
          >
            {/* Header + mode toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-base font-bold text-white">Price Results</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSameStore(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                    !sameStore ? 'bg-[#064e3b] text-[#86efac] border-[#065f46]' : 'text-slate-500 hover:text-slate-300 border-slate-800'
                  }`}
                >
                  Best overall
                </button>
                <button
                  onClick={() => setSameStore(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                    sameStore ? 'bg-[#064e3b] text-[#86efac] border-[#065f46]' : 'text-slate-500 hover:text-slate-300 border-slate-800'
                  }`}
                >
                  Same store
                </button>
              </div>
            </div>

            {/* Per-item product selector */}
            <div className="space-y-3">
              {itemSearches.map((s, si) => {
                const selected = s.options[s.selectedIdx]
                return (
                  <div key={si} className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
                    {/* Selected product row */}
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-500 text-xs mb-1">{s.cartItemName}</p>
                        {selected ? (
                          <>
                            <p className="text-white text-sm font-medium truncate">{selected.product.name}</p>
                            {selected.product.brand && (
                              <p className="text-slate-500 text-xs">{selected.product.brand}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-slate-600 text-sm">No match found</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {selected?.product.lowestPrice != null && (
                          <div className="text-right">
                            <p className="text-[#86efac] font-bold text-base tabular-nums">
                              ${selected.product.lowestPrice.toFixed(2)}
                            </p>
                            {selected.product.lowestPriceStore && (
                              <p className="text-slate-500 text-xs">{selected.product.lowestPriceStore}</p>
                            )}
                          </div>
                        )}
                        {s.options.length > 1 && (
                          <button
                            onClick={() => toggleExpand(si)}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                            aria-label="Show other options"
                          >
                            {s.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Other options dropdown */}
                    <AnimatePresence>
                      {s.expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden border-t border-slate-800"
                        >
                          <div className="px-4 py-2 space-y-1">
                            <p className="text-slate-600 text-xs pb-1">Choose a product match:</p>
                            {s.options.map((opt, oi) => (
                              <button
                                key={opt.product.id}
                                onClick={() => selectOption(si, oi)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                                  oi === s.selectedIdx
                                    ? 'bg-[#052e1c] border border-[#065f46] text-[#86efac]'
                                    : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                                }`}
                              >
                                <div className="text-left min-w-0">
                                  <p className="truncate font-medium">{opt.product.name}</p>
                                  {opt.product.brand && (
                                    <p className="text-xs opacity-60 truncate">{opt.product.brand}</p>
                                  )}
                                </div>
                                <span className="font-bold tabular-nums shrink-0 ml-3">
                                  {opt.product.lowestPrice != null
                                    ? `$${opt.product.lowestPrice.toFixed(2)}`
                                    : '—'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            {/* Best overall total */}
            {!sameStore && (
              <div className="bg-[#0a1628] border border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-slate-400 text-sm font-semibold">
                  Estimated total
                  {hasMissingPrices && <span className="text-amber-500 ml-1 text-xs">*partial</span>}
                </span>
                <span className="text-[#86efac] text-xl font-bold tabular-nums">${mixedTotal.toFixed(2)}</span>
              </div>
            )}

            {/* Same store rankings */}
            {sameStore && storeOptions.length > 0 && (
              <div className="space-y-3">
                <p className="text-slate-500 text-xs uppercase tracking-wide font-semibold">Stores ranked by total</p>
                {storeOptions.map((store, idx) => (
                  <motion.div
                    key={store.storeId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`bg-[#0f172a] border rounded-2xl overflow-hidden ${
                      idx === 0 ? 'border-[#065f46]' : 'border-slate-800'
                    }`}
                  >
                    <div className={`flex items-center justify-between px-4 py-3 ${idx === 0 ? 'bg-[#052e1c]' : 'bg-[#0a1628]'}`}>
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="text-[#86efac] text-sm">★</span>}
                        <span className={`font-semibold text-sm ${idx === 0 ? 'text-[#86efac]' : 'text-slate-300'}`}>
                          {store.storeName}
                        </span>
                        {store.itemCount < items.length && (
                          <span className="text-xs text-amber-500">({store.itemCount}/{items.length} items)</span>
                        )}
                      </div>
                      <span className={`font-bold text-base tabular-nums ${idx === 0 ? 'text-[#86efac]' : 'text-slate-300'}`}>
                        ${store.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="px-4 py-2 divide-y divide-slate-800/50">
                      {store.breakdown.map((b, bi) => (
                        <div key={bi} className="flex items-center justify-between text-xs py-1.5">
                          <span className="text-slate-400">{b.name}</span>
                          <span className={b.price != null ? 'text-slate-300 font-medium tabular-nums' : 'text-slate-600'}>
                            {b.price != null ? `$${b.price.toFixed(2)}` : 'Not available'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {sameStore && storeOptions.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">
                No store prices found — try fetching prices from Kroger first.
              </p>
            )}

            {/* Edit cart */}
            <button
              onClick={() => { setPhase('cart'); setItemSearches([]) }}
              className="flex items-center gap-2 text-slate-500 hover:text-[#86efac] text-sm transition-colors duration-200 pt-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit cart
            </button>
          </motion.div>
        )}

      </div>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap"
      />
    </div>
  )
}
