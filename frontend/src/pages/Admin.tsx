import { useEffect, useState, useCallback, type ElementType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Loader2, AlertTriangle, PackageSearch, Users, Package, Plus } from 'lucide-react'
import { products as productsApi, type ProductResponseDto, type UserResponseDto } from '../api/client'
import { TableRowSkeleton } from '../components/Skeleton'
import Sparkline, { mockPriceHistory } from '../components/Sparkline'

type Tab = 'products' | 'users'

// ── Users ─────────────────────────────────────────────────────────────────────

function UsersTab() {
  const [userList, setUserList] = useState<UserResponseDto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL as string
    const token = localStorage.getItem('accessToken')
    setLoading(true)
    fetch(`${BASE}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: UserResponseDto[]) => { setUserList(data); setLoading(false) })
      .catch(() => { setError('Failed to load users. Requires Staff permissions.'); setLoading(false) })
  }, [])

  const roleColor = (role: string) =>
    role === 'Staff'
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
      : 'text-slate-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800'

  return (
    <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-md border border-gray-100 dark:border-slate-800/60 overflow-hidden transition-colors duration-300">
      {error && (
        <div className="flex items-center gap-3 m-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 text-sm">
          <AlertTriangle size={15} className="shrink-0" />{error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <th className="text-left px-5 py-3 font-semibold">Name</th>
            <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Email</th>
            <th className="text-left px-5 py-3 font-semibold">Role</th>
            <th className="text-right px-5 py-3 font-semibold hidden md:table-cell">Joined</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)
            : userList.length === 0
              ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-3xl">
                        <Users size={32} className="text-gray-300 dark:text-slate-600" strokeWidth={1.5} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">No users yet</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">Users appear here after they register.</p>
                    </div>
                  </td>
                </tr>
              )
              : userList.map(u => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-slate-200">{u.fullName}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColor(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-400 dark:text-slate-500 text-xs hidden md:table-cell">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Products ──────────────────────────────────────────────────────────────────

export default function Admin() {
  const [tab,         setTab]         = useState<Tab>('products')
  const [productList, setProductList] = useState<ProductResponseDto[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await productsApi.list({ pageSize: 100, sortBy: 'name' })
      setProductList(res.items)
    } catch { setError('Failed to load products.') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function confirmDelete(id: string) {
    setDeleteId(null); setDeleting(id)
    try {
      await productsApi.delete(id)
      setProductList(prev => prev.filter(p => p.id !== id))
    } catch { setError('Delete failed. Staff permissions required.') }
    finally { setDeleting(null) }
  }

  const confirmingProduct = productList.find(p => p.id === deleteId)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Admin</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage the catalog and user accounts.</p>
        </div>
        <span className="text-sm text-gray-400 dark:text-slate-500">{productList.length} products</span>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 text-sm">
          <AlertTriangle size={15} className="shrink-0" />{error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit">
        {([
          { id: 'products', label: 'Products', icon: Package },
          { id: 'users',    label: 'Users',    icon: Users   },
        ] as { id: Tab; label: string; icon: ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              tab === id
                ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteId && confirmingProduct && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 max-w-sm w-full space-y-4"
            >
              <h2 className="text-base font-bold text-gray-800 dark:text-slate-100">Delete product?</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                <span className="font-semibold text-gray-700 dark:text-slate-200">{confirmingProduct.name}</span>
                {confirmingProduct.brand && ` (${confirmingProduct.brand})`} and all its price records will be permanently removed.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                <button onClick={() => confirmDelete(deleteId)} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'users' ? (
          <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <UsersTab />
          </motion.div>
        ) : (
          <motion.div key="products" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-md border border-gray-100 dark:border-slate-800/60 overflow-hidden transition-colors duration-300">
              {loading ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Name</th>
                      <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Brand</th>
                      <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Category</th>
                      <th className="text-right px-5 py-3 font-semibold">Best Price</th>
                      <th className="text-right px-5 py-3 font-semibold hidden lg:table-cell">Trend</th>
                      <th className="px-5 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>{Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}</tbody>
                </table>
              ) : productList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-5">
                  <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-3xl">
                    <PackageSearch size={40} className="text-gray-300 dark:text-slate-600" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-700 dark:text-slate-300">No products yet</p>
                    <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Start by adding products to the catalog.</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-colors shadow-lg shadow-emerald-900/30">
                    <Plus size={15} />Add First Product
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="text-left px-5 py-3 font-semibold">Name</th>
                      <th className="text-left px-5 py-3 font-semibold hidden sm:table-cell">Brand</th>
                      <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Category</th>
                      <th className="text-right px-5 py-3 font-semibold">Best Price</th>
                      <th className="text-right px-5 py-3 font-semibold hidden lg:table-cell">Trend</th>
                      <th className="px-5 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {productList.map(p => (
                      <tr key={p.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-slate-200">{p.name}</td>
                        <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 hidden sm:table-cell">{p.brand ?? <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                        <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 hidden md:table-cell">{p.categoryName ?? <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                          {p.lowestPrice != null ? `$${p.lowestPrice.toFixed(2)}` : <span className="text-gray-300 dark:text-slate-600 font-normal">—</span>}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <div className="flex justify-end">
                            <Sparkline values={mockPriceHistory(p.id, 8)} width={56} height={22} />
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {deleting === p.id
                            ? <Loader2 size={15} className="animate-spin text-gray-400 ml-auto" />
                            : (
                              <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors" title="Delete">
                                <Trash2 size={15} />
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
