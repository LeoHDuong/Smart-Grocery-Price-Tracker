const BASE_URL = import.meta.env.VITE_API_URL as string

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserResponseDto {
  id: string
  fullName: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface TokenResponseDto {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  user: UserResponseDto
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  fullName: string
  email: string
  password: string
  role?: string
}

// ── Categories ────────────────────────────────────────────────────────────────

export interface CategoryResponseDto {
  id: string
  name: string
  slug: string
  parentId: string | null
  parentName: string | null
  productCount: number
}

export interface CategoryTreeDto {
  id: string
  name: string
  slug: string
  children: CategoryTreeDto[]
}

export interface CategoryCreateDto {
  name: string
  slug: string
  parentId?: string
}

export type CategoryUpdateDto = CategoryCreateDto

// ── Products ──────────────────────────────────────────────────────────────────

export interface ProductResponseDto {
  id: string
  name: string
  brand: string | null
  unit: string | null
  unitSize: number
  categoryId: string | null
  categoryName: string | null
  imageUrl: string | null
  lowestPrice: number | null
  lowestPriceStore: string | null
  createdAt: string
  updatedAt: string
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ProductQueryDto {
  search?: string
  categoryId?: string
  sortBy?: 'name' | 'price' | 'createdAt'
  descending?: boolean
  page?: number
  pageSize?: number
}

export interface ProductCreateDto {
  name: string
  brand?: string
  unit?: string
  unitSize: number
  categoryId?: string
  imageUrl?: string
}

export type ProductUpdateDto = ProductCreateDto

// ── Stores ────────────────────────────────────────────────────────────────────

export interface StoreResponseDto {
  id: string
  name: string
  chainName: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  websiteUrl: string | null
  priceRecordCount: number
  createdAt: string
}

export interface StoreCreateDto {
  name: string
  chainName?: string
  address?: string
  latitude?: number
  longitude?: number
  websiteUrl?: string
}

export type StoreUpdateDto = StoreCreateDto

// ── Price Records ─────────────────────────────────────────────────────────────

export interface PriceRecordResponseDto {
  id: string
  productId: string
  productName: string
  storeId: string
  storeName: string
  price: number
  originalPrice: number | null
  isOnSale: boolean
  currency: string
  source: string
  recordedAt: string
}

export interface PriceRecordQueryDto {
  productId?: string
  storeId?: string
  from?: string
  to?: string
  onSaleOnly?: boolean
  page?: number
  pageSize?: number
}

export interface PriceRecordCreateDto {
  productId: string
  storeId: string
  price: number
  originalPrice?: number
  isOnSale: boolean
  currency?: string
  source?: string
}

export interface PriceHistoryPointDto {
  storeId: string
  storeName: string
  price: number
  isOnSale: boolean
  recordedAt: string
}

export interface PriceHistoryDto {
  productId: string
  productName: string
  history: PriceHistoryPointDto[]
}

// ── Shopping Lists ────────────────────────────────────────────────────────────

export interface ShoppingListResponseDto {
  id: string
  userId: string
  name: string
  isActive: boolean
  itemCount: number
  checkedCount: number
  estimatedTotal: number | null
  createdAt: string
}

export interface ShoppingListItemResponseDto {
  id: string
  productId: string
  productName: string
  productBrand: string | null
  productImageUrl: string | null
  quantity: number
  isChecked: boolean
  targetPrice: number | null
  currentLowestPrice: number | null
  cheapestStoreName: string | null
  isBelowTarget: boolean
}

export interface ShoppingListDetailDto {
  id: string
  userId: string
  name: string
  isActive: boolean
  items: ShoppingListItemResponseDto[]
  estimatedTotal: number | null
  createdAt: string
}

// ── Price Alerts ──────────────────────────────────────────────────────────────

export interface PriceAlertResponseDto {
  id: string
  userId: string
  productId: string
  productName: string
  productBrand: string | null
  targetPrice: number
  alertType: string
  isTriggered: boolean
  triggeredAt: string | null
  currentLowestPrice: number | null
  createdAt: string
}

// ── Scraper Jobs ──────────────────────────────────────────────────────────────

export interface ScraperJobResponseDto {
  id: string
  storeId: string
  storeName: string
  status: string
  productsScraped: number
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
  duration: string | null
}

// ── Client ────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function getToken(): string | null {
  return localStorage.getItem('accessToken')
}

export function setToken(token: string): void {
  localStorage.setItem('accessToken', token)
}

export function clearToken(): void {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function toQuery(params: Record<string, unknown>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return q ? `?${q}` : ''
}

// ── OCR ───────────────────────────────────────────────────────────────────────

export interface OcrResultItem {
  productId: string
  productName: string
  brand: string | null
  storeId: string
  storeName: string
  scannedPrice: number
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const auth = {
  login: (dto: LoginDto) =>
    request<TokenResponseDto>('/auth/login', { method: 'POST', body: JSON.stringify(dto) }),
  register: (dto: RegisterDto) =>
    request<{ message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(dto) }),
  logout: (refreshToken: string) =>
    request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  refresh: (refreshToken: string) =>
    request<TokenResponseDto>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
}

// ── Products API ──────────────────────────────────────────────────────────────

export const products = {
  list: (query: ProductQueryDto = {}) =>
    request<PagedResult<ProductResponseDto>>(`/products${toQuery(query as Record<string, unknown>)}`),
  get: (id: string) => request<ProductResponseDto>(`/products/${id}`),
  lowestPrices: (ids: string[]) =>
    request<Record<string, number>>('/products/lowest-prices', { method: 'POST', body: JSON.stringify(ids) }),
  create: (dto: ProductCreateDto) =>
    request<ProductResponseDto>('/products', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: ProductUpdateDto) =>
    request<ProductResponseDto>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
}

// ── Stores API ────────────────────────────────────────────────────────────────

export const stores = {
  list: () => request<StoreResponseDto[]>('/stores'),
  get: (id: string) => request<StoreResponseDto>(`/stores/${id}`),
  create: (dto: StoreCreateDto) =>
    request<StoreResponseDto>('/stores', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: StoreUpdateDto) =>
    request<StoreResponseDto>(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/stores/${id}`, { method: 'DELETE' }),
}

// ── Categories API ────────────────────────────────────────────────────────────

export const categories = {
  list: () => request<CategoryResponseDto[]>('/categories'),
  tree: () => request<CategoryTreeDto[]>('/categories/tree'),
  get: (id: string) => request<CategoryResponseDto>(`/categories/${id}`),
  create: (dto: CategoryCreateDto) =>
    request<CategoryResponseDto>('/categories', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: CategoryUpdateDto) =>
    request<CategoryResponseDto>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
}

// ── Prices API ────────────────────────────────────────────────────────────────

export const prices = {
  list: (query: PriceRecordQueryDto = {}) =>
    request<PagedResult<PriceRecordResponseDto>>(`/prices${toQuery(query as Record<string, unknown>)}`),
  history: (productId: string) => request<PriceHistoryDto>(`/prices/history/${productId}`),
  create: (dto: PriceRecordCreateDto) =>
    request<PriceRecordResponseDto>('/prices', { method: 'POST', body: JSON.stringify(dto) }),
  bulkCreate: (dtos: PriceRecordCreateDto[]) =>
    request<{ recorded: number }>('/prices/bulk', { method: 'POST', body: JSON.stringify(dtos) }),
  ocrScan: async (file: File): Promise<OcrResultItem[]> => {
    const token = getToken()
    const form = new FormData()
    form.append('image', file)
    const res = await fetch(`${BASE_URL}/api/prices/ocr`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => res.statusText))
    return res.json()
  },
}

// ── Shopping Lists API ────────────────────────────────────────────────────────

export const shoppingLists = {
  list: () => request<ShoppingListResponseDto[]>('/lists'),
  get: (id: string) => request<ShoppingListDetailDto>(`/lists/${id}`),
  create: (name: string) =>
    request<ShoppingListDetailDto>('/lists', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, dto: { name: string; isActive: boolean }) =>
    request<ShoppingListDetailDto>(`/lists/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/lists/${id}`, { method: 'DELETE' }),
  addItem: (listId: string, dto: { productId: string; quantity?: number; targetPrice?: number }) =>
    request<ShoppingListItemResponseDto>(`/lists/${listId}/items`, { method: 'POST', body: JSON.stringify(dto) }),
  updateItem: (listId: string, itemId: string, dto: { quantity: number; isChecked: boolean; targetPrice?: number }) =>
    request<ShoppingListItemResponseDto>(`/lists/${listId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(dto) }),
  deleteItem: (listId: string, itemId: string) =>
    request<void>(`/lists/${listId}/items/${itemId}`, { method: 'DELETE' }),
  reset: (listId: string) => request<void>(`/lists/${listId}/reset`, { method: 'POST' }),
}

// ── Price Alerts API ──────────────────────────────────────────────────────────

export const alerts = {
  list: (includeTriggered = false) =>
    request<PriceAlertResponseDto[]>(`/alerts?includeTriggered=${includeTriggered}`),
  get: (id: string) => request<PriceAlertResponseDto>(`/alerts/${id}`),
  create: (dto: { productId: string; targetPrice: number; alertType?: string }) =>
    request<PriceAlertResponseDto>('/alerts', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: { targetPrice: number; alertType: string }) =>
    request<PriceAlertResponseDto>(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify(dto) }),
  delete: (id: string) => request<void>(`/alerts/${id}`, { method: 'DELETE' }),
}

// ── Scraper Jobs API ──────────────────────────────────────────────────────────

export const scraperJobs = {
  list: () => request<ScraperJobResponseDto[]>('/scraper-jobs'),
  get: (id: string) => request<ScraperJobResponseDto>(`/scraper-jobs/${id}`),
  create: (storeId: string) =>
    request<ScraperJobResponseDto>('/scraper-jobs', { method: 'POST', body: JSON.stringify({ storeId }) }),
  markRunning: (id: string) => request<ScraperJobResponseDto>(`/scraper-jobs/${id}/running`, { method: 'POST' }),
  markCompleted: (id: string, productsScraped: number) =>
    request<ScraperJobResponseDto>(`/scraper-jobs/${id}/completed?productsScraped=${productsScraped}`, { method: 'POST' }),
  markFailed: (id: string, errorMessage: string) =>
    request<ScraperJobResponseDto>(`/scraper-jobs/${id}/failed?errorMessage=${encodeURIComponent(errorMessage)}`, { method: 'POST' }),
}

export { ApiError }
