import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudUpload, ImageIcon, X, CheckCircle, AlertCircle,
  Loader2, ScanLine, ShoppingCart, Check,
} from 'lucide-react'
import { prices, type OcrResultItem, type PriceRecordCreateDto } from '../api/client'

type Stage = 'idle' | 'scanning' | 'verify' | 'saving' | 'done' | 'error'

interface Toast { type: 'success' | 'error'; message: string }

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [stage, setStage] = useState<Stage>('idle')
  const [results, setResults] = useState<OcrResultItem[]>([])
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<Toast | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function showToast(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 5000)
  }

  function acceptFile(f: File) {
    if (!f.type.startsWith('image/')) {
      showToast({ type: 'error', message: 'Please upload an image file (JPG, PNG, WebP).' })
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStage('idle')
    setResults([])
  }

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }, [])

  const onDragOver  = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
    e.target.value = ''
  }

  function clearFile() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setStage('idle')
    setResults([])
    setEditedPrices({})
  }

  async function handleScan() {
    if (!file) return
    setStage('scanning')
    try {
      const data = await prices.ocrScan(file)
      const initial: Record<string, string> = {}
      data.forEach(r => { initial[r.productId] = r.scannedPrice.toFixed(2) })
      setEditedPrices(initial)
      setResults(data)
      setStage('verify')
    } catch {
      setStage('error')
      showToast({ type: 'error', message: 'Scan failed. Ensure the backend is running.' })
    }
  }

  async function handleConfirm() {
    setStage('saving')
    const dtos: PriceRecordCreateDto[] = results.map(r => ({
      productId: r.productId,
      storeId:   r.storeId,
      price:     parseFloat(editedPrices[r.productId] ?? r.scannedPrice.toString()),
      isOnSale:  false,
      currency:  'USD',
      source:    'ocr',
    }))
    try {
      const res = await prices.bulkCreate(dtos)
      setStage('done')
      showToast({ type: 'success', message: `${res.recorded} price record${res.recorded !== 1 ? 's' : ''} saved successfully.` })
      clearFile()
    } catch {
      setStage('error')
      showToast({ type: 'error', message: 'Failed to save records. Check Staff permissions.' })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Upload</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a receipt or product photo to extract prices via OCR.
        </p>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm border ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </motion.div>
      )}

      <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-8 space-y-6">

        {/* Drop zone */}
        <div
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          onClick={() => !file && inputRef.current?.click()}
          className={`relative rounded-3xl border-2 border-dashed transition-colors overflow-hidden ${
            file ? 'border-emerald-300 cursor-default' : 'cursor-pointer border-gray-200 hover:border-emerald-400 hover:bg-gray-50'
          } ${dragging ? 'border-emerald-500 bg-emerald-50' : ''}`}
        >
          <AnimatePresence mode="wait">
            {/* Scanning overlay */}
            {stage === 'scanning' && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-black/60 flex flex-col items-center justify-center gap-4 rounded-3xl"
              >
                <motion.div
                  animate={{ y: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_12px_3px_rgba(52,211,153,0.8)]"
                  style={{ top: '10%' }}
                />
                <ScanLine size={40} className="text-emerald-400" />
                <p className="text-white text-sm font-semibold tracking-wide">Scanning receipt…</p>
                <div className="flex gap-1.5 mt-1">
                  {[0, 0.2, 0.4].map(d => (
                    <motion.div
                      key={d}
                      className="w-2 h-2 bg-emerald-400 rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Preview image */}
            {preview ? (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                <img src={preview} alt="Receipt" className="w-full max-h-72 object-contain rounded-2xl" />
                {stage === 'idle' && (
                  <button
                    onClick={e => { e.stopPropagation(); clearFile() }}
                    className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-white rounded-xl shadow-md text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="flex flex-col items-center justify-center py-14 px-6 text-center"
              >
                <CloudUpload
                  size={48} strokeWidth={1.5}
                  className={`mb-4 transition-colors ${dragging ? 'text-emerald-500' : 'text-gray-300'}`}
                />
                <p className="text-sm font-semibold text-gray-700">Drag &amp; drop a receipt image</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · or click to browse</p>
              </motion.div>
            )}
          </AnimatePresence>

          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onFileChange} />
        </div>

        {/* File info row */}
        {file && stage !== 'scanning' && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3">
            <ImageIcon size={18} className="text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        )}

        {/* Verification list */}
        <AnimatePresence>
          {stage === 'verify' && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ShoppingCart size={15} className="text-emerald-600" />
                Verify extracted prices
              </p>
              {results.map(r => (
                <div key={r.productId} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.productName}</p>
                    <p className="text-xs text-gray-400">{r.storeName}{r.brand ? ` · ${r.brand}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedPrices[r.productId] ?? r.scannedPrice.toFixed(2)}
                      onChange={e => setEditedPrices(prev => ({ ...prev, [r.productId]: e.target.value }))}
                      className="w-20 text-right text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-xl px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button */}
        {stage === 'idle' && file && (
          <button
            onClick={handleScan}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3 rounded-2xl transition-colors"
          >
            <ScanLine size={16} />
            Scan Receipt
          </button>
        )}

        {stage === 'verify' && (
          <button
            onClick={handleConfirm}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3 rounded-2xl transition-colors"
          >
            <Check size={16} />
            Confirm &amp; Save
          </button>
        )}

        {stage === 'saving' && (
          <button disabled className="w-full flex items-center justify-center gap-2 bg-emerald-600 opacity-60 text-white text-sm font-semibold py-3 rounded-2xl">
            <Loader2 size={16} className="animate-spin" />
            Saving…
          </button>
        )}

        {stage === 'error' && file && (
          <button
            onClick={() => setStage('idle')}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-3 rounded-2xl transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
