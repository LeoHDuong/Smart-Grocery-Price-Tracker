import { useEffect, useState, useCallback, useRef, type ElementType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trash2, Loader2, AlertTriangle, PackageSearch, Users, Package,
  Plus, Pencil, X, Store, Tag, Check, ShieldCheck, Search, DollarSign
} from 'lucide-react'
import {
  products as productsApi,
  stores as storesApi,
  categories as categoriesApi,
  prices as pricesApi,
  type ProductResponseDto, type ProductCreateDto,
  type UserResponseDto,
  type StoreResponseDto, type StoreCreateDto,
  type CategoryResponseDto, type CategoryCreateDto,
} from '../api/client'
import { TableRowSkeleton } from '../components/Skeleton'
import Sparkline, { mockPriceHistory } from '../components/Sparkline'

const BASE_URL = import.meta.env.VITE_API_URL as string

type Tab = 'products' | 'users' | 'stores' | 'categories'

// ── Shared helpers ────────────────────────────────────────────────────────────

function token() { return localStorage.getItem('accessToken') }

function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(options.headers ?? {}) },
  }).then(async r => {
    if (!r.ok) throw new Error(await r.text().catch(() => r.statusText))
    if (r.status === 204) return undefined as T
    return r.json()
  })
}

// ── Shared UI components ──────────────────────────────────────────────────────

function Err({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 text-sm">
      <AlertTriangle size={15} className="shrink-0" />{msg}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-colors"

function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title="Confirm delete" onClose={onCancel}>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        <span className="font-semibold text-gray-700 dark:text-slate-200">{name}</span> will be permanently deleted.
      </p>
      <div className="flex gap-3 justify-end pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">Delete</button>
      </div>
    </Modal>
  )
}

function ActionBtn({ onClick, icon: Icon, color = 'gray' }: { onClick: () => void; icon: ElementType; color?: 'gray' | 'red' }) {
  const cls = color === 'red'
    ? 'text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
    : 'text-gray-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
  return (
    <button onClick={onClick} className={`p-1.5 rounded-lg transition-colors ${cls}`}>
      <Icon size={14} />
    </button>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-md border border-gray-100 dark:border-slate-800/60 overflow-hidden">
      {children}
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-5 py-3 font-semibold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}

function Empty({ icon: Icon, label, sub, onAdd }: { icon: ElementType; label: string; sub: string; onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-3xl">
        <Icon size={40} className="text-gray-300 dark:text-slate-600" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-gray-700 dark:text-slate-300">{label}</p>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">{sub}</p>
      </div>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-colors">
          <Plus size={15} />Add first
        </button>
      )}
    </div>
  )
}

// ── Products tab ──────────────────────────────────────────────────────────────

type ProductForm = { name: string; brand: string; unit: string; unitSize: string; categoryId: string; imageUrl: string }
const emptyProduct = (): ProductForm => ({ name: '', brand: '', unit: '', unitSize: '1', categoryId: '', imageUrl: '' })

type PriceForm = { storeId: string; price: string; originalPrice: string; isOnSale: boolean }
const emptyPriceForm = (): PriceForm => ({ storeId: '', price: '', originalPrice: '', isOnSale: false })

function ProductsTab() {
  const [list,          setList]          = useState<ProductResponseDto[]>([])
  const [cats,          setCats]          = useState<CategoryResponseDto[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [saving,        setSaving]        = useState(false)
  const [deleteId,      setDeleteId]      = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [editItem,      setEditItem]      = useState<ProductResponseDto | null>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [form,          setForm]          = useState<ProductForm>(emptyProduct())
  const [searchQuery,   setSearchQuery]   = useState('')
  const [krogerLoading, setKrogerLoading] = useState(false)
  const [krogerMsg,     setKrogerMsg]     = useState('')
  const [stores,        setStores]        = useState<StoreResponseDto[]>([])
  const [priceTarget,   setPriceTarget]   = useState<ProductResponseDto | null>(null)
  const [priceForm,     setPriceForm]     = useState<PriceForm>(emptyPriceForm())
  const [priceSaving,   setPriceSaving]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (search = '') => {
    setLoading(true); setError(null)
    try {
      const [res, catRes, storeRes] = await Promise.all([
        productsApi.list({ pageSize: 100, sortBy: 'price', descending: false, ...(search ? { search } : {}) }),
        categoriesApi.list(),
        storesApi.list(),
      ])
      setList(res.items); setCats(catRes); setStores(storeRes)
    } catch { setError('Failed to load products.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function handleSearch(value: string) {
    setSearchQuery(value)
    setKrogerMsg('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(value), 350)
  }

  async function fetchKroger() {
    if (!searchQuery.trim()) return
    setKrogerLoading(true); setKrogerMsg('')
    try {
      const res = await fetch(`${BASE_URL}/kroger/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      })
      const data = await res.json()
      setKrogerMsg(`Added ${data.length} Kroger product(s) to database.`)
      await load(searchQuery)
    } catch {
      setKrogerMsg('Failed to fetch Kroger prices.')
    } finally {
      setKrogerLoading(false)
    }
  }

  function openCreate() { setEditItem(null); setForm(emptyProduct()); setShowForm(true) }
  function openEdit(p: ProductResponseDto) {
    setEditItem(p)
    setForm({ name: p.name, brand: p.brand ?? '', unit: p.unit ?? '', unitSize: String(p.unitSize), categoryId: p.categoryId ?? '', imageUrl: p.imageUrl ?? '' })
    setShowForm(true)
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const dto: ProductCreateDto = {
        name: form.name, brand: form.brand || undefined, unit: form.unit || undefined,
        unitSize: parseFloat(form.unitSize) || 1,
        categoryId: form.categoryId || undefined, imageUrl: form.imageUrl || undefined,
      }
      if (editItem) {
        const updated = await productsApi.update(editItem.id, dto)
        setList(prev => prev.map(p => p.id === updated.id ? updated : p))
      } else {
        const created = await productsApi.create(dto)
        setList(prev => [created, ...prev])
      }
      setShowForm(false)
    } catch { setError('Save failed.') }
    finally { setSaving(false) }
  }

  async function doDelete(id: string) {
    setDeleteId(null); setDeleting(id)
    try { await productsApi.delete(id); setList(prev => prev.filter(p => p.id !== id)) }
    catch { setError('Delete failed.') }
    finally { setDeleting(null) }
  }

  async function savePrice() {
    if (!priceTarget || !priceForm.storeId || !priceForm.price) return
    setPriceSaving(true); setError(null)
    try {
      await pricesApi.create({
        productId:     priceTarget.id,
        storeId:       priceForm.storeId,
        price:         parseFloat(priceForm.price),
        originalPrice: priceForm.originalPrice ? parseFloat(priceForm.originalPrice) : undefined,
        isOnSale:      priceForm.isOnSale,
      })
      setPriceTarget(null)
      await load(searchQuery)
    } catch { setError('Failed to save price.') }
    finally { setPriceSaving(false) }
  }

  const delTarget = list.find(p => p.id === deleteId)

  return (
    <>
      <AnimatePresence>
        {priceTarget && (
          <Modal title={`Set price — ${priceTarget.name}`} onClose={() => setPriceTarget(null)}>
            {error && <Err msg={error} />}
            <div className="space-y-3">
              <Field label="Store *">
                <select className={inputCls} value={priceForm.storeId} onChange={e => setPriceForm(f => ({ ...f, storeId: e.target.value }))}>
                  <option value="">Select a store…</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price *">
                  <input className={inputCls} type="number" min="0" step="0.01" placeholder="0.00"
                    value={priceForm.price} onChange={e => setPriceForm(f => ({ ...f, price: e.target.value }))} />
                </Field>
                <Field label="Original price">
                  <input className={inputCls} type="number" min="0" step="0.01" placeholder="0.00"
                    value={priceForm.originalPrice} onChange={e => setPriceForm(f => ({ ...f, originalPrice: e.target.value }))} />
                </Field>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={priceForm.isOnSale} onChange={e => setPriceForm(f => ({ ...f, isOnSale: e.target.checked }))}
                  className="w-4 h-4 rounded accent-emerald-600" />
                <span className="text-sm text-gray-600 dark:text-slate-300">On sale</span>
              </label>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setPriceTarget(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button onClick={savePrice} disabled={!priceForm.storeId || !priceForm.price || priceSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors">
                {priceSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save price
              </button>
            </div>
          </Modal>
        )}
        {showForm && (
          <Modal title={editItem ? 'Edit product' : 'Add product'} onClose={() => setShowForm(false)}>
            {error && <Err msg={error} />}
            <div className="space-y-3">
              <Field label="Name *">
                <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Whole Milk" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand">
                  <input className={inputCls} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Organic Valley" />
                </Field>
                <Field label="Category">
                  <select className={inputCls} value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">None</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit">
                  <input className={inputCls} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="g, ml, each…" />
                </Field>
                <Field label="Unit size">
                  <input className={inputCls} type="number" min="0" step="any" value={form.unitSize} onChange={e => setForm(f => ({ ...f, unitSize: e.target.value }))} />
                </Field>
              </div>
              <Field label="Image URL">
                <input className={inputCls} value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
              </Field>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button onClick={save} disabled={!form.name || saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editItem ? 'Save changes' : 'Add product'}
              </button>
            </div>
          </Modal>
        )}
        {deleteId && delTarget && (
          <ConfirmDelete name={delTarget.name} onConfirm={() => doDelete(deleteId)} onCancel={() => setDeleteId(null)} />
        )}
      </AnimatePresence>

      {/* Search + Kroger fetch */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search products…"
              className={`${inputCls} pl-8`}
            />
          </div>
          <button
            onClick={fetchKroger}
            disabled={krogerLoading || !searchQuery.trim()}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-2xl transition-colors whitespace-nowrap"
          >
            {krogerLoading ? <Loader2 size={14} className="animate-spin" /> : <span>🛒</span>}
            Fetch Kroger
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-colors whitespace-nowrap">
            <Plus size={14} />Add product
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400 dark:text-slate-500">{list.length} product{list.length !== 1 ? 's' : ''}</span>
          {krogerMsg && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{krogerMsg}</span>}
        </div>
      </div>

      {error && !showForm && <div className="mb-4"><Err msg={error} /></div>}

      <TableWrap>
        {loading ? (
          <table className="w-full text-sm"><tbody>{Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}</tbody></table>
        ) : list.length === 0 ? (
          <Empty icon={PackageSearch} label="No products yet" sub="Add your first product to the catalog." onAdd={openCreate} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <Th>Name</Th>
                <Th>Brand</Th>
                <Th>Category</Th>
                <Th right>Best price</Th>
                <Th right>Trend</Th>
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-slate-200">{p.name}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{p.brand ?? <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{p.categoryName ?? <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                    {p.lowestPrice != null ? `$${p.lowestPrice.toFixed(2)}` : <span className="text-gray-300 dark:text-slate-600 font-normal">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <Sparkline values={mockPriceHistory(p.id, 8)} width={56} height={22} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {deleting === p.id
                        ? <Loader2 size={14} className="animate-spin text-gray-400" />
                        : <>
                          <ActionBtn onClick={() => { setPriceTarget(p); setPriceForm(emptyPriceForm()) }} icon={DollarSign} />
                          <ActionBtn onClick={() => openEdit(p)} icon={Pencil} />
                          <ActionBtn onClick={() => setDeleteId(p.id)} icon={Trash2} color="red" />
                        </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableWrap>
    </>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
// Full replacement for UsersTab in Admin.tsx
// Also add to imports at top of Admin.tsx:
//   import { ShieldCheck } from 'lucide-react'

type UserForm        = { fullName: string; email: string }
type CreateStaffForm = { fullName: string; email: string; password: string }

function UsersTab() {
  const [list,       setList]       = useState<UserResponseDto[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [editItem,   setEditItem]   = useState<UserResponseDto | null>(null)
  const [form,       setForm]       = useState<UserForm>({ fullName: '', email: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateStaffForm>({ fullName: '', email: '', password: '' })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setList(await authFetch<UserResponseDto[]>('/users')) }
    catch { setError('Failed to load users.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(u: UserResponseDto) {
    setEditItem(u)
    setForm({ fullName: u.fullName, email: u.email })
  }

  async function save() {
    if (!editItem) return
    setSaving(true); setError(null)
    try {
      const updated = await authFetch<UserResponseDto>(`/users/${editItem.id}`, {
        method: 'PUT', body: JSON.stringify({ fullName: form.fullName, email: form.email }),
      })
      setList(prev => prev.map(u => u.id === updated.id ? updated : u))
      setEditItem(null)
    } catch { setError('Save failed.') }
    finally { setSaving(false) }
  }

  async function createStaff() {
    setSaving(true); setError(null)
    try {
      await authFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: createForm.fullName,
          email:    createForm.email,
          password: createForm.password,
          role:     'Staff',
        }),
      })
      setShowCreate(false)
      setCreateForm({ fullName: '', email: '', password: '' })
      await load()
    } catch (e: any) {
      setError(e.message ?? 'Failed to create staff user.')
    } finally { setSaving(false) }
  }

  async function doDelete(id: string) {
    setDeleteId(null); setDeleting(id)
    try {
      await authFetch(`/users/${id}`, { method: 'DELETE' })
      setList(prev => prev.filter(u => u.id !== id))
    } catch { setError('Delete failed.') }
    finally { setDeleting(null) }
  }

  const delTarget  = list.find(u => u.id === deleteId)
  const roleColor  = (role: string) => role === 'Staff'
    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
    : 'text-slate-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-800'

  return (
    <>
      <AnimatePresence>
        {/* Edit modal */}
        {editItem && (
          <Modal title="Edit user" onClose={() => setEditItem(null)}>
            {error && <Err msg={error} />}
            <div className="space-y-3">
              <Field label="Full name">
                <input className={inputCls} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Role">
                <div className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColor(editItem.role)}`}>{editItem.role}</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">Role changes require admin action</span>
                </div>
              </Field>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Save changes
              </button>
            </div>
          </Modal>
        )}

        {/* Create staff modal */}
        {showCreate && (
          <Modal title="Create staff account" onClose={() => { setShowCreate(false); setError(null) }}>
            {error && <Err msg={error} />}
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl px-3.5 py-3">
              <ShieldCheck size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Staff accounts have full admin access. Only create accounts for trusted team members.
              </p>
            </div>
            <div className="space-y-3">
              <Field label="Full name *">
                <input className={inputCls} value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Jane Smith" />
              </Field>
              <Field label="Email *">
                <input className={inputCls} type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@store.com" />
              </Field>
              <Field label="Temporary password *">
                <input className={inputCls} type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 characters" />
              </Field>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setShowCreate(false); setError(null) }} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button
                onClick={createStaff}
                disabled={!createForm.fullName || !createForm.email || createForm.password.length < 6 || saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create staff user
              </button>
            </div>
          </Modal>
        )}

        {/* Delete confirm */}
        {deleteId && delTarget && (
          <ConfirmDelete name={delTarget.fullName} onConfirm={() => doDelete(deleteId)} onCancel={() => setDeleteId(null)} />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400 dark:text-slate-500">{list.length} users</span>
        <button
          onClick={() => { setShowCreate(true); setError(null) }}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-colors"
        >
          <Plus size={14} />Create staff user
        </button>
      </div>

      {error && !editItem && !showCreate && <div className="mb-4"><Err msg={error} /></div>}

      <TableWrap>
        {loading ? (
          <table className="w-full text-sm"><tbody>{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}</tbody></table>
        ) : list.length === 0 ? (
          <Empty icon={Users} label="No users yet" sub="Users appear here after they register." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th right>Joined</Th>
                <th className="px-5 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {list.map(u => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-slate-200">{u.fullName}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColor(u.role)}`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-400 dark:text-slate-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {deleting === u.id
                        ? <Loader2 size={14} className="animate-spin text-gray-400" />
                        : <>
                          <ActionBtn onClick={() => openEdit(u)} icon={Pencil} />
                          <ActionBtn onClick={() => setDeleteId(u.id)} icon={Trash2} color="red" />
                        </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableWrap>
    </>
  )
}

// ── Stores tab ────────────────────────────────────────────────────────────────

type StoreForm = { name: string; chainName: string; address: string; websiteUrl: string; latitude: string; longitude: string }
const emptyStore = (): StoreForm => ({ name: '', chainName: '', address: '', websiteUrl: '', latitude: '', longitude: '' })

function StoresTab() {
  const [list,     setList]     = useState<StoreResponseDto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<StoreResponseDto | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState<StoreForm>(emptyStore())

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setList(await storesApi.list()) }
    catch { setError('Failed to load stores.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditItem(null); setForm(emptyStore()); setShowForm(true) }
  function openEdit(s: StoreResponseDto) {
    setEditItem(s)
    setForm({ name: s.name, chainName: s.chainName ?? '', address: s.address ?? '', websiteUrl: s.websiteUrl ?? '', latitude: s.latitude != null ? String(s.latitude) : '', longitude: s.longitude != null ? String(s.longitude) : '' })
    setShowForm(true)
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const dto: StoreCreateDto = {
        name: form.name, chainName: form.chainName || undefined, address: form.address || undefined,
        websiteUrl: form.websiteUrl || undefined,
        latitude:  form.latitude  ? parseFloat(form.latitude)  : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      }
      if (editItem) {
        const updated = await storesApi.update(editItem.id, dto)
        setList(prev => prev.map(s => s.id === updated.id ? updated : s))
      } else {
        const created = await storesApi.create(dto)
        setList(prev => [created, ...prev])
      }
      setShowForm(false)
    } catch { setError('Save failed.') }
    finally { setSaving(false) }
  }

  async function doDelete(id: string) {
    setDeleteId(null); setDeleting(id)
    try { await storesApi.delete(id); setList(prev => prev.filter(s => s.id !== id)) }
    catch { setError('Delete failed.') }
    finally { setDeleting(null) }
  }

  const delTarget = list.find(s => s.id === deleteId)

  return (
    <>
      <AnimatePresence>
        {showForm && (
          <Modal title={editItem ? 'Edit store' : 'Add store'} onClose={() => setShowForm(false)}>
            {error && <Err msg={error} />}
            <div className="space-y-3">
              <Field label="Name *">
                <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kroger — Main St" />
              </Field>
              <Field label="Chain name">
                <input className={inputCls} value={form.chainName} onChange={e => setForm(f => ({ ...f, chainName: e.target.value }))} placeholder="e.g. Kroger" />
              </Field>
              <Field label="Address">
                <input className={inputCls} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, City, State" />
              </Field>
              <Field label="Website URL">
                <input className={inputCls} value={form.websiteUrl} onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))} placeholder="https://..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <input className={inputCls} type="number" step="any" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="39.9612" />
                </Field>
                <Field label="Longitude">
                  <input className={inputCls} type="number" step="any" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="-82.9988" />
                </Field>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button onClick={save} disabled={!form.name || saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editItem ? 'Save changes' : 'Add store'}
              </button>
            </div>
          </Modal>
        )}
        {deleteId && delTarget && (
          <ConfirmDelete name={delTarget.name} onConfirm={() => doDelete(deleteId)} onCancel={() => setDeleteId(null)} />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400 dark:text-slate-500">{list.length} stores</span>
        <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-colors">
          <Plus size={14} />Add store
        </button>
      </div>

      {error && !showForm && <div className="mb-4"><Err msg={error} /></div>}

      <TableWrap>
        {loading ? (
          <table className="w-full text-sm"><tbody>{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}</tbody></table>
        ) : list.length === 0 ? (
          <Empty icon={Store} label="No stores yet" sub="Add the grocery stores you want to track." onAdd={openCreate} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <Th>Name</Th>
                <Th>Chain</Th>
                <Th>Address</Th>
                <Th right>Price records</Th>
                <th className="px-5 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {list.map(s => (
                <tr key={s.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-slate-200">{s.name}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{s.chainName ?? <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 max-w-[200px] truncate">{s.address ?? <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-right text-gray-500 dark:text-slate-400">{s.priceRecordCount.toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {deleting === s.id
                        ? <Loader2 size={14} className="animate-spin text-gray-400" />
                        : <>
                          <ActionBtn onClick={() => openEdit(s)} icon={Pencil} />
                          <ActionBtn onClick={() => setDeleteId(s.id)} icon={Trash2} color="red" />
                        </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableWrap>
    </>
  )
}

// ── Categories tab ────────────────────────────────────────────────────────────

type CatForm = { name: string; slug: string; parentId: string }
const emptyCat = (): CatForm => ({ name: '', slug: '', parentId: '' })

function CategoriesTab() {
  const [list,     setList]     = useState<CategoryResponseDto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editItem, setEditItem] = useState<CategoryResponseDto | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState<CatForm>(emptyCat())

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setList(await categoriesApi.list()) }
    catch { setError('Failed to load categories.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-generate slug from name
  function setName(name: string) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, name, slug: editItem ? f.slug : slug }))
  }

  function openCreate() { setEditItem(null); setForm(emptyCat()); setShowForm(true) }
  function openEdit(c: CategoryResponseDto) {
    setEditItem(c); setForm({ name: c.name, slug: c.slug, parentId: c.parentId ?? '' }); setShowForm(true)
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const dto: CategoryCreateDto = { name: form.name, slug: form.slug, parentId: form.parentId || undefined }
      if (editItem) {
        const updated = await categoriesApi.update(editItem.id, dto)
        setList(prev => prev.map(c => c.id === updated.id ? updated : c))
      } else {
        const created = await categoriesApi.create(dto)
        setList(prev => [...prev, created])
      }
      setShowForm(false)
    } catch (e: any) { setError(e.message ?? 'Save failed.') }
    finally { setSaving(false) }
  }

  async function doDelete(id: string) {
    setDeleteId(null); setDeleting(id)
    try { await categoriesApi.delete(id); setList(prev => prev.filter(c => c.id !== id)) }
    catch (e: any) { setError(e.message ?? 'Delete failed. Category may have products or sub-categories.') }
    finally { setDeleting(null) }
  }

  const delTarget = list.find(c => c.id === deleteId)
  const roots = list.filter(c => !c.parentId)

  return (
    <>
      <AnimatePresence>
        {showForm && (
          <Modal title={editItem ? 'Edit category' : 'Add category'} onClose={() => setShowForm(false)}>
            {error && <Err msg={error} />}
            <div className="space-y-3">
              <Field label="Name *">
                <input className={inputCls} value={form.name} onChange={e => setName(e.target.value)} placeholder="e.g. Dairy" />
              </Field>
              <Field label="Slug *">
                <input className={inputCls} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. dairy" />
              </Field>
              <Field label="Parent category">
                <select className={inputCls} value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                  <option value="">None (root category)</option>
                  {roots.filter(c => c.id !== editItem?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
              <button onClick={save} disabled={!form.name || !form.slug || saving} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editItem ? 'Save changes' : 'Add category'}
              </button>
            </div>
          </Modal>
        )}
        {deleteId && delTarget && (
          <ConfirmDelete name={delTarget.name} onConfirm={() => doDelete(deleteId)} onCancel={() => setDeleteId(null)} />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400 dark:text-slate-500">{list.length} categories</span>
        <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-2xl transition-colors">
          <Plus size={14} />Add category
        </button>
      </div>

      {error && !showForm && <div className="mb-4"><Err msg={error} /></div>}

      <TableWrap>
        {loading ? (
          <table className="w-full text-sm"><tbody>{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={4} />)}</tbody></table>
        ) : list.length === 0 ? (
          <Empty icon={Tag} label="No categories yet" sub="Organize your products into categories." onAdd={openCreate} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Parent</Th>
                <Th right>Products</Th>
                <th className="px-5 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-slate-200">{c.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-gray-400 dark:text-slate-500">{c.slug}</td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400">{c.parentName ?? <span className="text-gray-300 dark:text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5 text-right text-gray-500 dark:text-slate-400">{c.productCount}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {deleting === c.id
                        ? <Loader2 size={14} className="animate-spin text-gray-400" />
                        : <>
                          <ActionBtn onClick={() => openEdit(c)} icon={Pencil} />
                          <ActionBtn onClick={() => setDeleteId(c.id)} icon={Trash2} color="red" />
                        </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableWrap>
    </>
  )
}

// ── Admin page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: ElementType }[] = [
  { id: 'products',   label: 'Products',   icon: Package },
  { id: 'users',      label: 'Users',      icon: Users   },
  { id: 'stores',     label: 'Stores',     icon: Store   },
  { id: 'categories', label: 'Categories', icon: Tag     },
]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('products')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Admin</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage the catalog, stores, categories, and users.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800/60 p-1 rounded-2xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
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

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'products'   && <ProductsTab />}
          {tab === 'users'      && <UsersTab />}
          {tab === 'stores'     && <StoresTab />}
          {tab === 'categories' && <CategoriesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}