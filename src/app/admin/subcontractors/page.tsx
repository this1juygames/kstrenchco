'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown'
import StateSelectDropdown from '@/components/ui/StateSelectDropdown'
import {
  ShieldCheck,
  Filter,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  PlusCircle,
  Briefcase,
  FolderOpen,
  Printer,
  Mail,
  Save,
  FileText,
  Gavel,
  Receipt,
  ExternalLink,
  Trash2,
  Award,
  LogOut,
} from 'lucide-react'

const styles = {
  pageWrapper: 'min-h-screen bg-slate-50 text-slate-900 pb-16',
  header: 'bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden',
  headerInner: 'max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-2',
  primaryBtn:
    'min-h-[42px] px-4 py-2 rounded-lg bg-blue-600 active:bg-blue-700 md:hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition',
  secondaryBtn:
    'min-h-[42px] px-3.5 py-2 rounded-lg bg-white border border-slate-300 active:bg-slate-100 md:hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition',
  yellowBtn:
    'min-h-[42px] px-3.5 py-2 rounded-lg bg-amber-400 active:bg-amber-500 md:hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition',
  container: 'max-w-6xl mx-auto px-4 pt-6 space-y-6 print:hidden',
  kpiGrid: 'grid grid-cols-2 lg:grid-cols-4 gap-3.5',
  kpiCard:
    'bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between gap-1',
  tabBar: 'inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-xs gap-1',
  tabActive:
    'min-h-[40px] px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition',
  tabInactive:
    'min-h-[40px] px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold text-xs flex items-center gap-2 transition',
  filterCard:
    'bg-white border border-slate-200 border-t-4 border-t-amber-400 rounded-xl p-4 sm:p-5 shadow-xs space-y-4',
  selectInput:
    'w-full min-h-[46px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white',
  subCard:
    'bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3 transition md:hover:border-blue-300',
  badgeVerified:
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0',
  badgePending:
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0',
  dossierBtn:
    'w-full min-h-[44px] mt-1 px-4 py-2.5 rounded-xl bg-blue-50 active:bg-blue-100 md:hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-2 transition',
}

const SPECIALTY_LIST = [
  'Directional Boring / HDD',
  'Open-Cut Trenching',
  'Utility / Conduit Installation',
  'Fiber / Low-Voltage Splicing & Pulling',
  'Excavation & Site Grading',
  'Storm Drain & Water Main',
  'Concrete & Asphalt Restoration',
  'Vacuum Potholing & Hydro-Excavation',
  'Hauling & Dump Services',
  'Rock Trenching & Sawing',
]

const EQUIPMENT_LIST = [
  'Directional Drill / Boring Rig (HDD)',
  'Mini Excavator',
  'Full-Size Track Excavator',
  'Ride-On Trencher / Plow',
  'Rock Wheel / Chain Trencher',
  'Vacuum Excavator / Potholing Rig',
  'Skid Steer / Compact Track Loader',
  'Dump Truck (Single / Tandem Axle)',
  'Backhoe Loader',
  'Fiber Reel Trailer & Puller',
  'Fluid Mixing System & Mud Vac',
]

interface SubOrg {
  id: string
  name: string
  primary_phone: string
  contact_email: string
  admin_notes: string
  base_city: string
  base_state: string
  base_zip: string
  operating_states: string[]
  willing_to_travel: boolean
  specialties: string[]
  equipment_owned: string[]
  equipment_leased: string[]
  crew_count: number
  avg_crew_size: number
  min_project_value: number
  max_project_value: number
  availability_status: string
  years_experience: number
  is_compliant: boolean
}

interface JobRecord {
  id: string
  title: string
  location: string
  job_state: string
  estimated_budget: number
  status: string
  assigned_org_id: string | null
}

interface BidRecord {
  id: string
  job_id: string
  org_id: string
  bid_amount: number
  notes: string
  status: string
  created_at: string
}

interface DocRecord {
  id: string
  org_id: string
  doc_type: string
  status: string
  file_path: string
}

interface InvoiceRecord {
  id: string
  job_id: string
  org_id: string
  invoice_number: string
  amount: number
  pdf_path: string | null
  status: string
  created_at: string
}

export default function AdminSubcontractorDirectory() {
  const [activeTab, setActiveTab] = useState<'directory' | 'invoices'>('directory')
  const [subs, setSubs] = useState<SubOrg[]>([])
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [bids, setBids] = useState<BidRecord[]>([])
  const [docs, setDocs] = useState<DocRecord[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])

  const [stateFilter, setStateFilter] = useState('ALL')
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL')
  const [equipFilter, setEquipFilter] = useState('ALL')
  const [minCrews, setMinCrews] = useState(1)
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL')

  const [showPostModal, setShowPostModal] = useState(false)
  const [selectedSub, setSelectedSub] = useState<SubOrg | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [phoneDraft, setPhoneDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [assignJobId, setAssignJobId] = useState('')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const [manualInvJobId, setManualInvJobId] = useState('')
  const [manualInvNumber, setManualInvNumber] = useState('')
  const [manualInvAmount, setManualInvAmount] = useState('')
  const [manualInvFile, setManualInvFile] = useState<File | null>(null)

  const [jobTitle, setJobTitle] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [jobCity, setJobCity] = useState('')
  const [jobState, setJobState] = useState('SC')
  const [jobBudget, setJobBudget] = useState(45000)
  const [jobCrews, setJobCrews] = useState(1)
  const [jobSpecialties, setJobSpecialties] = useState<string[]>([
    'Directional Boring / HDD',
  ])
  const [jobEquipment, setJobEquipment] = useState<string[]>([
    'Directional Drill / Boring Rig (HDD)',
  ])

  const router = useRouter()
  const supabase = createClient()

  const loadAllAdminData = async () => {
    const [subsRes, jobsRes, bidsRes, docsRes, invRes] = await Promise.all([
      supabase.from('organizations').select('*').eq('company_type', 'Subcontractor'),
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('job_bids').select('*').order('created_at', { ascending: false }),
      supabase.from('compliance_docs').select('*'),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    ])

    if (subsRes.data) setSubs(subsRes.data as SubOrg[])
    if (jobsRes.data) setJobs(jobsRes.data as JobRecord[])
    if (bidsRes.data) setBids(bidsRes.data as BidRecord[])
    if (docsRes.data) setDocs(docsRes.data as DocRecord[])
    if (invRes.data) setInvoices(invRes.data as InvoiceRecord[])
  }

  useEffect(() => {
    loadAllAdminData()
  }, [])

  const openSubDossier = (sub: SubOrg) => {
    setSelectedSub(sub)
    setNotesDraft(sub.admin_notes || '')
    setPhoneDraft(sub.primary_phone || '')
    setEmailDraft(sub.contact_email || '')
    setAssignJobId('')
    const subJobs = jobs.filter((j) => j.assigned_org_id === sub.id)
    setManualInvJobId(subJobs[0]?.id || jobs[0]?.id || '')
    setManualInvNumber('')
    setManualInvAmount('')
    setManualInvFile(null)
    setStatusMsg(null)
  }

  const handleSaveAdminProfileEdits = async () => {
    if (!selectedSub) return
    const { error } = await supabase
      .from('organizations')
      .update({
        admin_notes: notesDraft,
        primary_phone: phoneDraft,
        contact_email: emailDraft,
      })
      .eq('id', selectedSub.id)

    if (!error) {
      const updated = {
        ...selectedSub,
        admin_notes: notesDraft,
        primary_phone: phoneDraft,
        contact_email: emailDraft,
      }
      setSubs((prev) => prev.map((s) => (s.id === selectedSub.id ? updated : s)))
      setSelectedSub(updated)
      setStatusMsg('✓ Contractor contact info & admin notes saved permanently to profile.')
    }
  }

  const handleToggleCompliance = async () => {
    if (!selectedSub) return
    const nextVal = !selectedSub.is_compliant
    const { error } = await supabase
      .from('organizations')
      .update({ is_compliant: nextVal, status: nextVal ? 'Approved' : 'Pending' })
      .eq('id', selectedSub.id)

    if (!error) {
      setSubs((prev) =>
        prev.map((s) => (s.id === selectedSub.id ? { ...s, is_compliant: nextVal } : s))
      )
      setSelectedSub({ ...selectedSub, is_compliant: nextVal })
      setStatusMsg(
        nextVal
          ? '✓ Contractor marked Verified & Compliant for bidding and payouts.'
          : 'Contractor set back to Compliance Pending.'
      )
    }
  }

  const handleViewStorageFile = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('compliance-files')
      .createSignedUrl(filePath, 300)
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    } else {
      alert('Unable to open file preview. Verify the file exists in storage.')
    }
  }

  const handleApproveSingleDoc = async (docId: string) => {
    await supabase
      .from('compliance_docs')
      .update({ status: 'Verified' })
      .eq('id', docId)
    await loadAllAdminData()
    setStatusMsg('✓ Document marked Verified.')
  }

  const handleAssignJobToSub = async () => {
    if (!selectedSub || !assignJobId) return
    const { error } = await supabase
      .from('jobs')
      .update({ assigned_org_id: selectedSub.id })
      .eq('id', assignJobId)

    if (!error) {
      await loadAllAdminData()
      setAssignJobId('')
      setStatusMsg(`✓ Job linked and saved directly under ${selectedSub.name}'s profile!`)
    }
  }

  const handleUnassignJob = async (jobId: string) => {
    await supabase.from('jobs').update({ assigned_org_id: null }).eq('id', jobId)
    await loadAllAdminData()
    setStatusMsg('Job unassigned from this contractor profile.')
  }

  const handleAwardBid = async (bid: BidRecord) => {
    if (!selectedSub) return
    await Promise.all([
      supabase.from('job_bids').update({ status: 'Awarded' }).eq('id', bid.id),
      supabase
        .from('jobs')
        .update({ assigned_org_id: selectedSub.id })
        .eq('id', bid.job_id),
    ])
    await loadAllAdminData()
    setStatusMsg(
      `✓ Bid awarded! Job is now linked under ${selectedSub.name}'s active jobs.`
    )
  }

  const handleUpdateInvoiceStatus = async (
    invoiceId: string,
    newStatus: 'Approved' | 'Paid' | 'Held_Compliance'
  ) => {
    await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', invoiceId)
    await loadAllAdminData()
    setStatusMsg(`✓ Invoice status updated to ${newStatus}.`)
  }

  const handleManualAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSub || !manualInvJobId || !manualInvNumber || !manualInvAmount) return

    let pdfPath: string | null = null
    if (manualInvFile) {
      const ext = manualInvFile.name.split('.').pop()
      const path = `${selectedSub.id}/INV-${manualInvNumber}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('compliance-files')
        .upload(path, manualInvFile, { upsert: true })
      if (!upErr) pdfPath = path
    }

    const { error } = await supabase.from('invoices').insert({
      job_id: manualInvJobId,
      org_id: selectedSub.id,
      invoice_number: manualInvNumber,
      amount: Number(manualInvAmount),
      pdf_path: pdfPath,
      status: 'Submitted',
    })

    if (!error) {
      setManualInvNumber('')
      setManualInvAmount('')
      setManualInvFile(null)
      await loadAllAdminData()
      setStatusMsg(`✓ Invoice #${manualInvNumber} logged under ${selectedSub.name}'s profile!`)
    }
  }

  const handleEmailDossier = (sub: SubOrg) => {
    const subJobs = jobs.filter((j) => j.assigned_org_id === sub.id)
    const subBids = bids.filter((b) => b.org_id === sub.id)
    const subInvs = invoices.filter((i) => i.org_id === sub.id)
    const totalContracted = subJobs.reduce((acc, j) => acc + Number(j.estimated_budget || 0), 0)
    const totalInvoiced = subInvs.reduce((acc, i) => acc + Number(i.amount || 0), 0)
    const totalPaid = subInvs
      .filter((i) => i.status === 'Paid')
      .reduce((acc, i) => acc + Number(i.amount || 0), 0)

    const subject = encodeURIComponent(`K.S. Trencho Contractor Dossier: ${sub.name}`)
    const body = encodeURIComponent(
      `K.S. TRENCHO SUBCONTRACTOR DOSSIER\n` +
        `====================================\n` +
        `Company: ${sub.name}\n` +
        `Phone: ${phoneDraft || sub.primary_phone || 'N/A'}\n` +
        `Email: ${emailDraft || sub.contact_email || 'N/A'}\n` +
        `Home Base: ${sub.base_city || 'N/A'}, ${sub.base_state || 'US'} ${sub.base_zip || ''}\n` +
        `Operating States: ${sub.operating_states?.join(', ') || 'Local'}\n` +
        `Compliance Status: ${sub.is_compliant ? 'VERIFIED' : 'PENDING DOCS'}\n` +
        `Crew Capacity: ${sub.crew_count || 1} Crew(s) (${sub.avg_crew_size || 3} workers/crew)\n\n` +
        `FINANCIAL LEDGER:\n` +
        `• Total Contracted Jobs: $${totalContracted.toLocaleString()}\n` +
        `• Total Invoiced: $${totalInvoiced.toLocaleString()}\n` +
        `• Total Paid Out: $${totalPaid.toLocaleString()}\n` +
        `• Remaining Contract Balance: $${Math.max(0, totalContracted - totalPaid).toLocaleString()}\n\n` +
        `ASSIGNED JOBS (${subJobs.length}):\n` +
        (subJobs
          .map(
            (j) =>
              `• ${j.title} (${j.location}) - $${Number(j.estimated_budget).toLocaleString()}`
          )
          .join('\n') || 'None assigned yet') +
        `\n\nINVOICES (${subInvs.length}):\n` +
        (subInvs
          .map(
            (i) =>
              `• #${i.invoice_number}: $${Number(i.amount).toLocaleString()} [${i.status}]`
          )
          .join('\n') || 'No invoices yet') +
        `\n\nSUBMITTED BIDS (${subBids.length}):\n` +
        (subBids
          .map((b) => `• $${Number(b.bid_amount).toLocaleString()} (${b.status}) - ${b.notes}`)
          .join('\n') || 'None submitted yet') +
        `\n\nINTERNAL ADMIN NOTES:\n${notesDraft || 'No notes.'}\n`
    )
    window.location.href = `mailto:${emailDraft || sub.contact_email || ''}?subject=${subject}&body=${body}`
  }

  const filteredSubs = subs.filter((s) => {
    const stateOk =
      stateFilter === 'ALL' ||
      s.operating_states?.includes('ALL') ||
      s.operating_states?.includes(stateFilter) ||
      s.willing_to_travel
    const specOk =
      specialtyFilter === 'ALL' || s.specialties?.includes(specialtyFilter)
    const allEquip = [...(s.equipment_owned || []), ...(s.equipment_leased || [])]
    const equipOk = equipFilter === 'ALL' || allEquip.includes(equipFilter)
    const crewOk = (s.crew_count || 1) >= minCrews
    const availOk = !onlyAvailable || s.availability_status !== 'At_Capacity'
    return stateOk && specOk && equipOk && crewOk && availOk
  })

  const filteredInvoices = invoices.filter(
    (inv) => invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter
  )

  const pendingInvoices = invoices.filter((i) => i.status !== 'Paid')
  const pendingInvoiceTotal = pendingInvoices.reduce(
    (sum, i) => sum + Number(i.amount || 0),
    0
  )
  const paidInvoiceTotal = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + Number(i.amount || 0), 0)

  const matchingSubCount = subs.filter((s) => {
    const stateOk =
      s.operating_states?.includes('ALL') ||
      s.operating_states?.includes(jobState) ||
      s.willing_to_travel
    const allEquip = [...(s.equipment_owned || []), ...(s.equipment_leased || [])]
    const equipOk =
      jobEquipment.length === 0 ||
      jobEquipment.every((reqEq) => allEquip.includes(reqEq))
    const crewOk = (s.crew_count || 1) >= jobCrews
    const budgetOk =
      jobBudget >= (s.min_project_value || 0) &&
      jobBudget <= (s.max_project_value || 9999999)
    return (
      stateOk &&
      equipOk &&
      crewOk &&
      budgetOk &&
      s.availability_status !== 'At_Capacity'
    )
  }).length

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('jobs').insert({
      title: jobTitle,
      description: jobDesc,
      location: `${jobCity}, ${jobState}`,
      job_city: jobCity,
      job_state: jobState,
      required_specialties: jobSpecialties,
      required_equipment: jobEquipment,
      min_crews_needed: jobCrews,
      estimated_budget: jobBudget,
      status: 'Open',
    })
    setShowPostModal(false)
    await loadAllAdminData()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/jobs')
  }

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base">
                K.S. Trencho Admin • One-Stop Command Center
              </h1>
              <p className="text-[11px] text-slate-500">
                Kyle, Kathy & Will • Subcontractors, Jobs, Bids, Invoices & Print
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/jobs')} className={styles.secondaryBtn}>
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Public Board</span>
            </button>
            <button onClick={() => setShowPostModal(true)} className={styles.primaryBtn}>
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>Post New Job</span>
            </button>
            <button onClick={handleSignOut} className={styles.secondaryBtn}>
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.container}>
        <section className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Registered Subcontractors
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              {subs.length} Companies
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">
              {subs.filter((s) => s.is_compliant).length} Verified Compliant
            </span>
          </div>

          <div className={styles.kpiCard}>
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Active Jobs & Bids
            </span>
            <span className="text-xl font-extrabold text-blue-700">
              {jobs.length} Open Jobs
            </span>
            <span className="text-[11px] text-slate-600 font-semibold">
              {bids.length} Total Bids Submitted
            </span>
          </div>

          <div
            onClick={() => setActiveTab('invoices')}
            className={`${styles.kpiCard} cursor-pointer border-amber-300 bg-amber-50/40`}
          >
            <span className="text-[11px] font-bold uppercase text-amber-900">
              Pending Invoices Queue
            </span>
            <span className="text-xl font-extrabold text-amber-900">
              ${pendingInvoiceTotal.toLocaleString()}
            </span>
            <span className="text-[11px] text-amber-800 font-semibold">
              {pendingInvoices.length} Invoice(s) Awaiting Action →
            </span>
          </div>

          <div className={styles.kpiCard}>
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Total Invoices Paid Out
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              ${paidInvoiceTotal.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">
              {invoices.filter((i) => i.status === 'Paid').length} Completed Payouts
            </span>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={styles.tabBar}>
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={
                activeTab === 'directory' ? styles.tabActive : styles.tabInactive
              }
            >
              <Users className="w-4 h-4" />
              <span>Subcontractor Directory ({filteredSubs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={
                activeTab === 'invoices' ? styles.tabActive : styles.tabInactive
              }
            >
              <Receipt className="w-4 h-4" />
              <span>Global Invoices & Payouts ({invoices.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'directory' && (
          <>
            <section className={styles.filterCard}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  Filter Qualified Subcontractors ({filteredSubs.length} Matches)
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <StateSelectDropdown
                  value={stateFilter}
                  onChange={setStateFilter}
                  includeAllOption
                  allOptionLabel="ALL States"
                />

                <select
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="ALL">All Trade Specialties</option>
                  {SPECIALTY_LIST.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>

                <select
                  value={equipFilter}
                  onChange={(e) => setEquipFilter(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="ALL">Any Equipment Fleet</option>
                  {EQUIPMENT_LIST.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>

                <select
                  value={minCrews}
                  onChange={(e) => setMinCrews(Number(e.target.value))}
                  className={styles.selectInput}
                >
                  <option value={1}>Min. 1+ Crew</option>
                  <option value={2}>Min. 2+ Crews</option>
                  <option value={3}>Min. 3+ Crews</option>
                  <option value={4}>Min. 4+ Crews</option>
                </select>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-300 cursor-pointer min-h-[46px]">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                  />
                  <span>Available Only</span>
                </label>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubs.map((sub) => {
                const subAssignedJobs = jobs.filter((j) => j.assigned_org_id === sub.id)
                const subBids = bids.filter((b) => b.org_id === sub.id)
                const subInvs = invoices.filter((i) => i.org_id === sub.id)
                const subInvoicedSum = subInvs.reduce(
                  (acc, i) => acc + Number(i.amount || 0),
                  0
                )

                return (
                  <div key={sub.id} className={styles.subCard}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">
                            {sub.name}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {sub.base_city || 'Base'}, {sub.base_state || 'US'} •{' '}
                            {sub.primary_phone || 'No phone'}
                          </p>
                        </div>

                        {sub.is_compliant ? (
                          <span className={styles.badgeVerified}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className={styles.badgePending}>
                            <Clock className="w-3.5 h-3.5" /> Docs Pending
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          {sub.crew_count || 1} Crew(s) ({sub.avg_crew_size || 3} men)
                        </span>
                        <span>•</span>
                        <span>
                          ${Number(sub.min_project_value || 5000).toLocaleString()} – $
                          {Number(sub.max_project_value || 100000).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span className="text-blue-700">
                          States:{' '}
                          {sub.operating_states?.join(', ') || sub.base_state || 'Local'}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                          <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-950 border border-amber-300">
                            {subAssignedJobs.length} Assigned Job(s)
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {subBids.length} Bid(s)
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                            {subInvs.length} Invoice(s) (${subInvoicedSum.toLocaleString()})
                          </span>
                        </div>

                        {subAssignedJobs.length > 0 && (
                          <div className="text-[11px] font-semibold text-blue-800 bg-blue-50/70 px-2.5 py-1.5 rounded-lg border border-blue-200">
                            Active Jobs: {subAssignedJobs.map((j) => j.title).join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openSubDossier(sub)}
                      className={styles.dossierBtn}
                    >
                      <FolderOpen className="w-4 h-4 text-blue-600" />
                      <span>Open Full Dossier (Jobs, Invoices, Docs, Email & Print)</span>
                    </button>
                  </div>
                )
              })}
            </section>
          </>
        )}

        {activeTab === 'invoices' && (
          <section className={styles.filterCard}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-600" />
                  Global Subcontractor Invoices & Payout Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Review, approve, or mark invoices paid across all K.S. Trencho projects.
                </p>
              </div>

              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="ALL">All Invoice Statuses ({invoices.length})</option>
                <option value="Submitted">Submitted / Ready for Review</option>
                <option value="Held_Compliance">Held for Compliance</option>
                <option value="Approved">Approved for Payout</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No invoices match this filter yet. You can also log an invoice directly inside any contractor’s dossier.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInvoices.map((inv) => {
                  const subOrg = subs.find((s) => s.id === inv.org_id)
                  const jobRec = jobs.find((j) => j.id === inv.job_id)

                  return (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            Invoice #{inv.invoice_number}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'Held_Compliance'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : inv.status === 'Approved'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-slate-700 font-semibold">
                          Contractor:{' '}
                          <button
                            type="button"
                            onClick={() => subOrg && openSubDossier(subOrg)}
                            className="text-blue-600 hover:underline font-extrabold"
                          >
                            {subOrg?.name || 'Subcontractor'}
                          </button>{' '}
                          • Job: {jobRec?.title || 'Assigned Project'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-extrabold text-blue-700 mr-2">
                          ${Number(inv.amount).toLocaleString()}
                        </span>

                        {inv.pdf_path && (
                          <button
                            type="button"
                            onClick={() => handleViewStorageFile(inv.pdf_path!)}
                            className={styles.secondaryBtn}
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            <span>View PDF</span>
                          </button>
                        )}

                        {inv.status !== 'Approved' && inv.status !== 'Paid' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateInvoiceStatus(inv.id, 'Approved')}
                            className={styles.primaryBtn}
                          >
                            Approve
                          </button>
                        )}

                        {inv.status !== 'Paid' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateInvoiceStatus(inv.id, 'Paid')}
                            className={styles.yellowBtn}
                          >
                            Mark Paid ✓
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 print:static print:bg-white print:p-0">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-2xl space-y-6 print:max-h-none print:shadow-none print:border-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                  K.S. Trencho Official Contractor Dossier
                </span>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {selectedSub.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedSub.base_city || 'Base'}, {selectedSub.base_state || 'US'}{' '}
                  {selectedSub.base_zip} • Phone: {phoneDraft || 'N/A'} • Email:{' '}
                  {emailDraft || 'N/A'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => handleEmailDossier(selectedSub)}
                  className={styles.secondaryBtn}
                >
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={styles.yellowBtn}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Close ✕
                </button>
              </div>
            </div>

            {statusMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 print:hidden">
                {statusMsg}
              </div>
            )}

            {(() => {
              const subJobs = jobs.filter((j) => j.assigned_org_id === selectedSub.id)
              const subInvs = invoices.filter((i) => i.org_id === selectedSub.id)
              const totalContracted = subJobs.reduce(
                (acc, j) => acc + Number(j.estimated_budget || 0),
                0
              )
              const totalInvoiced = subInvs.reduce(
                (acc, i) => acc + Number(i.amount || 0),
                0
              )
              const totalPaid = subInvs
                .filter((i) => i.status === 'Paid')
                .reduce((acc, i) => acc + Number(i.amount || 0), 0)

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-blue-900 text-white p-4 rounded-xl border-b-4 border-amber-400 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-blue-200 font-bold block">
                      Assigned Contracts
                    </span>
                    <span className="text-base font-extrabold">
                      ${totalContracted.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-blue-200 font-bold block">
                      Total Invoiced
                    </span>
                    <span className="text-base font-extrabold text-amber-300">
                      ${totalInvoiced.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-blue-200 font-bold block">
                      Total Paid Out
                    </span>
                    <span className="text-base font-extrabold text-emerald-300">
                      ${totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-blue-200 font-bold block">
                      Remaining Balance
                    </span>
                    <span className="text-base font-extrabold">
                      ${Math.max(0, totalContracted - totalPaid).toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1.5">
                <p>
                  <strong className="text-slate-900">Operating States:</strong>{' '}
                  {selectedSub.operating_states?.join(', ') || selectedSub.base_state || 'Local'}
                  {selectedSub.willing_to_travel ? ' (+ Nationwide Travel)' : ''}
                </p>
                <p>
                  <strong className="text-slate-900">Workforce Capacity:</strong>{' '}
                  {selectedSub.crew_count || 1} Crew(s) ({selectedSub.avg_crew_size || 3}{' '}
                  workers per crew)
                </p>
                <p>
                  <strong className="text-slate-900">Project Size Range:</strong> $
                  {Number(selectedSub.min_project_value || 5000).toLocaleString()} – $
                  {Number(selectedSub.max_project_value || 100000).toLocaleString()}
                </p>
                <p>
                  <strong className="text-slate-900">Availability:</strong>{' '}
                  {selectedSub.availability_status || 'Available_Now'}
                </p>
              </div>

              <div className="space-y-1.5">
                <p>
                  <strong className="text-slate-900">Specialties:</strong>{' '}
                  {selectedSub.specialties?.join(', ') || 'None listed'}
                </p>
                <p>
                  <strong className="text-slate-900">Owned Equipment:</strong>{' '}
                  {selectedSub.equipment_owned?.join(', ') || 'None listed'}
                </p>
                <p>
                  <strong className="text-slate-900">Leased Equipment:</strong>{' '}
                  {selectedSub.equipment_leased?.join(', ') || 'None listed'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  Jobs & Bids Linked to {selectedSub.name}
                </h3>

                <div className="flex items-center gap-2 print:hidden">
                  <select
                    value={assignJobId}
                    onChange={(e) => setAssignJobId(e.target.value)}
                    className="min-h-[38px] px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="">+ Assign a Job to Profile...</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.job_state})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!assignJobId}
                    onClick={handleAssignJobToSub}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 disabled:opacity-40 text-white font-bold text-xs"
                  >
                    Save to Profile
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {jobs.filter((j) => j.assigned_org_id === selectedSub.id).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                    No jobs currently assigned under this contractor profile. Use the dropdown above or award a bid below to link a job.
                  </p>
                ) : (
                  jobs
                    .filter((j) => j.assigned_org_id === selectedSub.id)
                    .map((j) => (
                      <div
                        key={j.id}
                        className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-extrabold text-slate-900">
                            {j.title}
                          </span>
                          <p className="text-slate-600">
                            {j.location} • Status: {j.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-blue-700">
                            ${Number(j.estimated_budget || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnassignJob(j.id)}
                            title="Unassign Job"
                            className="text-slate-400 hover:text-red-600 print:hidden"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {bids.filter((b) => b.org_id === selectedSub.id).length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Gavel className="w-3.5 h-3.5 text-amber-500" /> Submitted Bids Under Profile
                  </h4>
                  {bids
                    .filter((b) => b.org_id === selectedSub.id)
                    .map((b) => {
                      const bidJob = jobs.find((j) => j.id === b.job_id)
                      return (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">
                              {bidJob?.title || 'Project Bid'} ({b.status})
                            </span>
                            <p className="text-slate-600">{b.notes}</p>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className="font-extrabold text-amber-900">
                              Bid: ${Number(b.bid_amount).toLocaleString()}
                            </span>
                            {b.status !== 'Awarded' && (
                              <button
                                type="button"
                                onClick={() => handleAwardBid(b)}
                                className="px-2.5 py-1 rounded-md bg-blue-600 text-white font-bold text-[11px] flex items-center gap-1 print:hidden"
                              >
                                <Award className="w-3 h-3 text-amber-300" />
                                Award & Link Job
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-500" />
                Invoices Saved Under {selectedSub.name}
              </h4>

              {invoices.filter((inv) => inv.org_id === selectedSub.id).length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No invoices logged under this contractor yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {invoices
                    .filter((inv) => inv.org_id === selectedSub.id)
                    .map((inv) => {
                      const jobRec = jobs.find((j) => j.id === inv.job_id)
                      return (
                        <div
                          key={inv.id}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-extrabold text-slate-900">
                              #{inv.invoice_number}
                            </span>
                            <span className="text-slate-500 ml-1.5">
                              • {jobRec?.title || 'Job'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">
                              ${Number(inv.amount).toLocaleString()}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                              {inv.status}
                            </span>
                            {inv.pdf_path && (
                              <button
                                type="button"
                                onClick={() => handleViewStorageFile(inv.pdf_path!)}
                                className="text-blue-600 hover:underline font-bold flex items-center gap-0.5 print:hidden"
                              >
                                <ExternalLink className="w-3 h-3" />
                                PDF
                              </button>
                            )}
                            {inv.status !== 'Approved' && inv.status !== 'Paid' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateInvoiceStatus(inv.id, 'Approved')}
                                className="text-blue-600 hover:underline font-bold print:hidden"
                              >
                                Approve
                              </button>
                            )}
                            {inv.status !== 'Paid' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateInvoiceStatus(inv.id, 'Paid')}
                                className="text-emerald-700 hover:underline font-bold print:hidden"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              <form
                onSubmit={handleManualAddInvoice}
                className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-5 gap-2 print:hidden"
              >
                <select
                  value={manualInvJobId}
                  onChange={(e) => setManualInvJobId(e.target.value)}
                  className="min-h-[38px] px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={manualInvNumber}
                  onChange={(e) => setManualInvNumber(e.target.value)}
                  placeholder="Inv # (e.g. 105)"
                  className="min-h-[38px] px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="number"
                  required
                  value={manualInvAmount}
                  onChange={(e) => setManualInvAmount(e.target.value)}
                  placeholder="Amount ($)"
                  className="min-h-[38px] px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setManualInvFile(e.target.files?.[0] || null)}
                  className="text-[11px] text-slate-600 self-center"
                />
                <button
                  type="submit"
                  className="min-h-[38px] px-3 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs"
                >
                  + Log Invoice
                </button>
              </form>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Compliance Vault Files (W-9, COI, License)
                </h4>
                <button
                  type="button"
                  onClick={handleToggleCompliance}
                  className="text-[11px] font-bold text-blue-600 underline print:hidden"
                >
                  {selectedSub.is_compliant ? 'Revoke Approval' : 'Verify All Compliance ✓'}
                </button>
              </div>

              {docs.filter((d) => d.org_id === selectedSub.id).length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No W-9, COI, or License uploaded yet.
                </p>
              ) : (
                docs
                  .filter((d) => d.org_id === selectedSub.id)
                  .map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-none gap-2"
                    >
                      <span className="font-semibold text-slate-800">{d.doc_type}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {d.status}
                        </span>
                        {d.file_path && (
                          <button
                            type="button"
                            onClick={() => handleViewStorageFile(d.file_path)}
                            className="text-blue-600 hover:underline font-bold flex items-center gap-0.5 print:hidden"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </button>
                        )}
                        {d.status !== 'Verified' && (
                          <button
                            type="button"
                            onClick={() => handleApproveSingleDoc(d.id)}
                            className="text-emerald-700 hover:underline font-bold print:hidden"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Saved Contact Info & Permanent Admin Notes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Primary Phone
                  </label>
                  <input
                    type="text"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="(803) 555-0199"
                    className="w-full min-h-[40px] px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Primary Contact Email
                  </label>
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    placeholder="owner@contractor.com"
                    className="w-full min-h-[40px] px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Internal Notes (Visible anytime Kyle, Kathy, or Will log into the portal)
                </label>
                <textarea
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add internal notes about this subcontractor's pricing, reliability, or past jobs..."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveAdminProfileEdits}
                className={styles.primaryBtn + ' print:hidden'}
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>Save All Info to Contractor Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 print:hidden">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Post Official K.S. Trencho Job
              </h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. 6,000 LF Fiber Bore & Handholes"
                  className="w-full min-h-[46px] px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Job City
                  </label>
                  <input
                    type="text"
                    required
                    value={jobCity}
                    onChange={(e) => setJobCity(e.target.value)}
                    placeholder="Columbia"
                    className="w-full min-h-[46px] px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <StateSelectDropdown
                    label="State"
                    value={jobState}
                    onChange={setJobState}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Est. Budget ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={jobBudget}
                    onChange={(e) => setJobBudget(Number(e.target.value))}
                    className="w-full min-h-[46px] px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Min. Crews Needed
                  </label>
                  <select
                    value={jobCrews}
                    onChange={(e) => setJobCrews(Number(e.target.value))}
                    className={styles.selectInput}
                  >
                    <option value={1}>1 Crew</option>
                    <option value={2}>2 Crews</option>
                    <option value={3}>3 Crews</option>
                    <option value={4}>4+ Crews</option>
                  </select>
                </div>
              </div>

              <MultiSelectDropdown
                label="Required Trade Specialties"
                placeholder="Select required specialties..."
                options={SPECIALTY_LIST.map((s) => ({ value: s, label: s }))}
                selected={jobSpecialties}
                onChange={setJobSpecialties}
              />

              <MultiSelectDropdown
                label="Required Equipment Fleet"
                placeholder="Select required equipment..."
                options={EQUIPMENT_LIST.map((e) => ({ value: e, label: e }))}
                selected={jobEquipment}
                onChange={setJobEquipment}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scope Summary
                </label>
                <textarea
                  rows={2}
                  required
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  placeholder="Describe bore footage, soil conditions, and schedule..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-100 border border-amber-300 text-xs font-bold text-amber-950">
                ⚡ Auto-Match Preview: {matchingSubCount} qualified & available subcontractor(s) match this job and will be notified.
              </div>

              <button
                type="submit"
                className={styles.primaryBtn + ' w-full justify-center py-3'}
              >
                Publish Job & Notify Matched Subcontractors
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}