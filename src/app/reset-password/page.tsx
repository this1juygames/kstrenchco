'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Lock, ArrowRight, Loader2 } from 'lucide-react'

const styles = {
  pageWrapper: 'min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8',
  card: 'w-full max-w-md bg-white border border-slate-200 border-t-4 border-t-amber-400 rounded-2xl shadow-lg p-5 sm:p-8',
  brandRow: 'flex items-center gap-3 mb-6',
  brandIconBox: 'p-2.5 bg-blue-600 text-white rounded-xl shrink-0',
  title: 'text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight',
  subtitle: 'text-xs text-slate-500',
  label: 'block text-xs font-semibold text-slate-700 mb-1.5',
  inputWrapper: 'relative',
  inputIcon: 'w-4 h-4 text-slate-400 absolute left-3.5 top-3.5',
  input:
    'w-full min-h-[46px] pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white',
  submitBtn:
    'w-full min-h-[48px] py-3 px-4 bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition flex items-center justify-center gap-2',
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
    } else {
      setMessage({ type: 'success', text: 'Password updated! Redirecting to job board...' })
      setTimeout(() => router.push('/jobs'), 1500)
    }
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <div className={styles.brandIconBox}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className={styles.title}>Set New Password</h1>
            <p className={styles.subtitle}>K.S. Trencho Subcontractor Portal</p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-5 p-3.5 rounded-lg text-xs font-medium border ${
              message.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className={styles.label}>New Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={styles.input}
              />
            </div>
          </div>

          <div>
            <label className={styles.label}>Confirm New Password</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={styles.input}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Save New Password</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}