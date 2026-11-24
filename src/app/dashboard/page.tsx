'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck,
  Briefcase,
  LogOut,
  UserCheck,
  Receipt,
  PlusCircle,
} from 'lucide-react'
import ComplianceVault from '@/components/compliance/ComplianceVault'

const styles = {
  pageWrapper: 'min-h-screen bg-slate-50 text-slate-900 pb-16',
  header: 'sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur',
  headerInner: 'max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-2',
  brandGroup: 'flex items-center gap-2.5',
  brandIconBox: 'p-2 bg-blue-600 text-white rounded-lg shrink-0',
  brandTitle: 'font-bold text-slate-900 text-sm sm:text-base leading-tight',
  brandSub: 'text-[11px] text-slate-500 truncate max-w-[160px] sm:max-w-xs',
  navGroup: 'flex items-center gap-2',
  primaryNavBtn:
    'min-h-[40px] px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition',
  secondaryNavBtn:
    'min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition',
  signOutBtn:
    'min-h-[40px] px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-600 font-semibold flex items-center gap-1 transition',
  mainContainer: 'max-w-5xl mx-auto px-4 pt-5 space-y-6',
  uploadBtn:
    'cursor-pointer min-h-[44px] px-4 py-2.5 rounded-lg bg-blue-600 active:bg-blue-700 md:hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition',
  sectionCard:
    'bg-white border border-slate-200 border-t-4 border-t-amber-400 rounded-xl p-4 sm:p-6 shadow-xs space-y-4',
  input:
    'w-full min-h-[44px] px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white',
}

interface AssignedJob {
  id: string
  title: string
  location: string
  estimated_budget: number
  status: string
}

interface SubInvoice {
  id: string
  job_id: string
  invoice_number: string
  amount: number
  status: string
  pdf_path: string | null
  created_at: string
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isCompliant, setIsCompliant] = useState(false)
  const [loading, setLoading] = useState(true)

  // Assigned Jobs & Invoices State
  const [myJobs, setMyJobs] = useState<AssignedJob[]>([])
  const [myInvoices, setMyInvoices] = useState<SubInvoice[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [submittingInv, setSubmittingInv] = useState(false)
  const [invMsg, setInvMsg] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const loadPortalData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }
    setUserEmail(user.email ?? 'Subcontractor')

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    // If an Admin hits /dashboard, take them to the Admin Command Center
    if (profile?.role === 'Admin' || profile?.role === 'Internal_Admin') {
      router.push('/admin/subcontractors')
      return
    }

    if (profile?.org_id) {
      setOrgId(profile.org_id)

      const [orgRes, jobsRes, invRes] = await Promise.all([
        supabase
          .from('organizations')
          .select('is_compliant')
          .eq('id', profile.org_id)
          .single(),
        supabase
          .from('jobs')
          .select('id, title, location, estimated_budget, status')
          .eq('assigned_org_id', profile.org_id),
        supabase
          .from('invoices')
          .select('*')
          .eq('org_id', profile.org_id)
          .order('created_at', { ascending: false }),
      ])

      if (orgRes.data) setIsCompliant(Boolean(orgRes.data.is_compliant))

      if (jobsRes.data) {
        setMyJobs(jobsRes.data as AssignedJob[])
        if (jobsRes.data.length > 0 && !selectedJobId) {
          setSelectedJobId(jobsRes.data[0].id)
        }
      }

      if (invRes.data) setMyInvoices(invRes.data as SubInvoice[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPortalData()
  }, [])

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId || !selectedJobId || !invoiceNumber || !invoiceAmount) return

    setSubmittingInv(true)
    setInvMsg(null)

    let uploadedPdfPath: string | null = null
    if (invoiceFile) {
      const ext = invoiceFile.name.split('.').pop()
      const path = `${orgId}/INV-${invoiceNumber}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('compliance-files')
        .upload(path, invoiceFile, { upsert: true })

      if (!upErr) uploadedPdfPath = path
    }

    // Automated Compliance Payout Gate
    const autoStatus = isCompliant ? 'Submitted' : 'Held_Compliance'

    const { error } = await supabase.from('invoices').insert({
      job_id: selectedJobId,
      org_id: orgId,
      invoice_number: invoiceNumber,
      amount: Number(invoiceAmount),
      pdf_path: uploadedPdfPath,
      status: autoStatus,
    })

    if (error) {
      setInvMsg(`Error submitting invoice: ${error.message}`)
    } else {
      setInvMsg(
        isCompliant
          ? `✓ Invoice #${invoiceNumber} submitted to K.S. Trencho for payout review!`
          : `⚠️ Invoice #${invoiceNumber} recorded, but placed on Hold (Held_Compliance) until your W-9, COI, License & NDA are verified.`
      )
      setInvoiceNumber('')
      setInvoiceAmount('')
      setInvoiceFile(null)
      await loadPortalData()
    }
    setSubmittingInv(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/jobs')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Loading Subcontractor Portal...
      </div>
    )
  }

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <div className={styles.brandIconBox}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className={styles.brandTitle}>K.S. Trencho</h1>
              <p className={styles.brandSub}>{userEmail}</p>
            </div>
          </div>

          <div className={styles.navGroup}>
            <button
              onClick={() => router.push('/onboarding')}
              className={styles.secondaryNavBtn}
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Edit Capabilities</span>
            </button>
            <button
              onClick={() => router.push('/jobs')}
              className={styles.primaryNavBtn}
            >
              <Briefcase className="w-4 h-4 text-amber-300" />
              <span>Job Board</span>
            </button>
            <button onClick={handleSignOut} className={styles.signOutBtn}>
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.mainContainer}>
        {/* 1. COMPLIANCE HEALTH BAR + 4-CARD VAULT (W-9, COI, LICENSE, NDA) */}
        {orgId && <ComplianceVault orgId={orgId} />}

        {/* 2. SUBMIT INVOICE & BILLING LEDGER */}
        <section className={styles.sectionCard}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                Project Invoicing & Payout Status
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit progress draws or final invoices for jobs awarded to your company.
              </p>
            </div>
          </div>

          {invMsg && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-950">
              {invMsg}
            </div>
          )}

          {myJobs.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              No active jobs are assigned to your profile yet. Once K.S. Trencho awards your bid or assigns a project, you can submit invoices right here.
            </div>
          ) : (
            <form
              onSubmit={handleSubmitInvoice}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Assigned Project
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className={styles.input}
                >
                  {myJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Invoice # (or Draw #)
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-1042"
                  className={styles.input}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  required
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="e.g. 18500"
                  className={styles.input}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Invoice PDF / Photo
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
                />
              </div>

              <div className="sm:col-span-4">
                <button
                  type="submit"
                  disabled={submittingInv}
                  className={styles.uploadBtn + ' w-full sm:w-auto'}
                >
                  <PlusCircle className="w-4 h-4 text-amber-300" />
                  <span>
                    {submittingInv ? 'Uploading Invoice...' : 'Submit Invoice to K.S. Trencho'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* SUBCONTRACTOR INVOICE HISTORY */}
          {myInvoices.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Your Submitted Invoices
              </h4>
              {myInvoices.map((inv) => {
                const jobMatch = myJobs.find((j) => j.id === inv.job_id)
                return (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-extrabold text-slate-900">
                        Invoice #{inv.invoice_number}
                      </span>
                      <span className="text-slate-500 ml-2">
                        - {jobMatch?.title || 'Assigned Project'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-blue-700">
                        ${Number(inv.amount).toLocaleString()}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'Held_Compliance'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}