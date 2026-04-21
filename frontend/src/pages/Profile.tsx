import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Shield, Pencil, Check, X } from 'lucide-react'

const item = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export default function Profile() {
  const { user, isStaff } = useAuth()

  const [editing, setEditing]       = useState(false)
  const [fullName, setFullName]     = useState(user?.fullName ?? '')
  const [email, setEmail]           = useState(user?.email ?? '')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  // Password change
  const [changingPw, setChangingPw]       = useState(false)
  const [currentPw, setCurrentPw]         = useState('')
  const [newPw, setNewPw]                 = useState('')
  const [confirmPw, setConfirmPw]         = useState('')
  const [pwError, setPwError]             = useState('')

  function cancelEdit() {
    setFullName(user?.fullName ?? '')
    setEmail(user?.email ?? '')
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    // TODO: call PATCH /users/{id} via your API client
    await new Promise(r => setTimeout(r, 600)) // placeholder
    setSaving(false)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handlePasswordChange() {
    setPwError('')
    if (newPw !== confirmPw) { setPwError("New passwords don't match."); return }
    if (newPw.length < 8)    { setPwError("Password must be at least 8 characters."); return }
    setSaving(true)
    // TODO: call POST /users/{id}/change-password via your API client
    await new Promise(r => setTimeout(r, 600)) // placeholder
    setSaving(false)
    setChangingPw(false)
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#020617] text-white px-6 py-12 md:px-12 lg:px-20">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="mb-10">
          <p className="text-[#86efac] text-xs font-bold tracking-[0.2em] uppercase mb-2">Account</p>
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Your profile
          </h1>
        </motion.div>

        {/* Avatar + role badge */}
        <motion.div variants={item} className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#064e3b] border border-[#065f46] flex items-center justify-center text-2xl font-bold text-[#86efac]"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {user.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold">{user.fullName}</p>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${
              isStaff
                ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <Shield size={11} />
              {isStaff ? 'Staff' : 'Shopper'}
            </span>
          </div>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="ml-auto text-xs text-emerald-400 flex items-center gap-1"
            >
              <Check size={13} /> Saved
            </motion.span>
          )}
        </motion.div>

        {/* Profile card */}
        <motion.div
          variants={item}
          className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 mb-5"
        >
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm font-semibold text-slate-300">Profile info</p>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#86efac] transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={13} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-[#86efac] hover:text-white transition-colors disabled:opacity-50"
                >
                  <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <Field
              icon={<User size={15} />}
              label="Full name"
              value={fullName}
              editing={editing}
              onChange={setFullName}
            />
            <Field
              icon={<Mail size={15} />}
              label="Email"
              value={email}
              editing={editing}
              onChange={setEmail}
              type="email"
            />
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-slate-500"><Shield size={15} /></span>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">Role</p>
                <p className="text-sm text-slate-300">{isStaff ? 'Staff' : 'Shopper'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Password card */}
        <motion.div
          variants={item}
          className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-slate-300">Password</p>
            {!changingPw && (
              <button
                onClick={() => setChangingPw(true)}
                className="text-xs text-slate-400 hover:text-[#86efac] transition-colors"
              >
                Change password
              </button>
            )}
          </div>

          {!changingPw ? (
            <p className="text-sm text-slate-500">••••••••••••</p>
          ) : (
            <div className="space-y-3">
              <PwField label="Current password"  value={currentPw} onChange={setCurrentPw} />
              <PwField label="New password"       value={newPw}     onChange={setNewPw} />
              <PwField label="Confirm new password" value={confirmPw} onChange={setConfirmPw} />

              {pwError && (
                <p className="text-xs text-red-400">{pwError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setChangingPw(false); setPwError(''); setCurrentPw(''); setNewPw(''); setConfirmPw('') }}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={saving || !currentPw || !newPw || !confirmPw}
                  className="text-xs text-[#86efac] hover:text-white transition-colors disabled:opacity-40"
                >
                  {saving ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Member since */}
        <motion.p variants={item} className="text-xs text-slate-600 text-center mt-8">
          Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
        </motion.p>
      </motion.div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ icon, label, value, editing, onChange, type = 'text' }: {
  icon:     React.ReactNode
  label:    string
  value:    string
  editing:  boolean
  onChange: (v: string) => void
  type?:    string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        {editing ? (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] transition-all"
          />
        ) : (
          <p className="text-sm text-slate-300">{value}</p>
        )}
      </div>
    </div>
  )
}

function PwField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#020617] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#065f46] focus:ring-1 focus:ring-[#065f46] transition-all"
      />
    </div>
  )
}