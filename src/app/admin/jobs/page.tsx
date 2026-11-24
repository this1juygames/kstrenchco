'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown'
import StateSelectDropdown from '@/components/ui/StateSelectDropdown'
import {
  ShieldCheck,
  PlusCircle,
  Users,
  Briefcase,
  MapPin,
  DollarSign,
  Gavel,
  MessageSquare,
  Award,
  LogOut,
  CheckCircle2,
} from 'lucide-react'

const styles = {
  pageWrapper: 'min-h-screen bg-slate-50 text-slate-900 pb-16',
  header: 'bg-white border-b border-slate-200 sticky top-0 z-20',
  headerInner: 'max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-2',
  primaryBtn:
    'min-h-[42px] px-4 py-2 rounded-lg bg-blue-600 active:bg-blue-700 md:hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition',
  secondaryBtn:
    'min-h-[42px] px-3.5 py-2 rounded-lg bg-white border border-slate-300 active:bg-slate-100 md:hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition',
  container: 'max-w-6xl mx-auto px-4 pt-6 space-y-6',
  selectInput:
    'w-full min-h-[46px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white',
  jobCard:
    'bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4 transition md:hover:border-blue-300',
  statusBadge:
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300',
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

interface JobRecord {
  id: string
  title: string
  description: string
  location: string
  job_city: string
  job_state: string
  required_specialties: string[]
  required_equipment: string[]
  min_crews_needed: number
  estimated_budget: number
  status: string
  assigned_org_id: string | null
}

interface SubOrg {
  id: string
  name: string
  base_city: string
  base_state: string
  operating_states: string[]
  willing_to_travel: boolean
  equipment_owned: string[]
  equipment_leased: string[]
  crew_count: number
  min_project_value: number
  max_project_value: number
  availability_status: string
  is_compliant: boolean
}

interface BidRecord {
  id: string
  job_id: string
  org_id: string
  bid_amount: number
  notes: string
  status: string
}

interface MessageRecord {
  id: string
  job_id: string
  sender_id: string | null
  message_type: string
  content: string
  created_at: string
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [subs, setSubs] = useState<SubOrg[]>([])
  const [bids, setBids] = useState<BidRecord[]>([])
  const [messages, setMessages] = useState<MessageRecord[]>([])
  const [stateFilter, setStateFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showPostModal, setShowPostModal] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

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

  const loadJobsData = async () => {
    const [jobsRes, subsRes, bidsRes, msgsRes] = await Promise.all([
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('organizations').select('*').eq('company_type', 'Subcontractor'),
      supabase.from('job_bids').select('*').order('created_at', { ascending: false }),
      supabase.from('job_messages').select('*').order('created_at', { ascending: false }),
    ])

    if (jobsRes.data) setJobs(jobsRes.data as JobRecord[])
    if (subsRes.data) setSubs(subsRes.data as SubOrg[])
    if (bidsRes.data) setBids(bidsRes.data as BidRecord[])
    if (msgsRes.data) setMessages(msgsRes.data as MessageRecord[])
  }

  useEffect(() => {
    loadJobsData()
  }, [])

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('jobs').insert({
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

    if (!error) {
      setJobTitle('')
      setJobDesc('')
      setJobCity('')
      setShowPostModal(false)
      setFeedback('✓ Job published to the portal.')
      await loadJobsData()
    }
  }

  const handleAssignContractor = async (jobId: string, orgId: string) => {
    await supabase
      .from('jobs')
      .update({
        assigned_org_id: orgId || null,
        status: orgId ? 'Assigned' : 'Open',
      })
      .eq('id', jobId)
    setFeedback('✓ Job assignment updated.')
    await loadJobsData()
  }

  const handleAwardBid = async (bid: BidRecord) => {
    await Promise.all([
      supabase.from('job_bids').update({ status: 'Awarded' }).eq('id', bid.id),
      supabase
        .from('jobs')
        .update({ assigned_org_id: bid.org_id, status: 'Assigned' })
        .eq('id', bid.job_id),
    ])
    setFeedback('✓ Bid awarded and subcontractor assigned to job.')
    await loadJobsData()
  }

  const handleUpdateJobStatus = async (jobId: string, nextStatus: string) => {
    await supabase.from('jobs').update({ status: nextStatus }).eq('id', jobId)
    setFeedback(`✓ Job status updated to ${nextStatus}.`)
    await loadJobsData()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/jobs')
  }

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

  const visibleJobs = jobs.filter((j) => {
    const stateOk = stateFilter === 'ALL' || j.job_state === stateFilter
    const statusOk = statusFilter === 'ALL' || j.status === statusFilter
    return stateOk && statusOk
  })

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
                K.S. Trencho Admin • Jobs, Bids & Dispatch
              </h1>
              <p className="text-[11px] text-slate-500">
                Kyle, Kathy & Will • Project Pipeline & Subcontractor Assignments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin/subcontractors')}
              className={styles.secondaryBtn}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Subcontractor Directory</span>
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
        {feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <section className="bg-white border border-slate-200 border-t-4 border-t-amber-400 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StateSelectDropdown
            label="Filter by State"
            value={stateFilter}
            onChange={setStateFilter}
            includeAllOption
            allOptionLabel="ALL States"
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Job Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.selectInput}
            >
              <option value="ALL">All Statuses ({jobs.length})</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In_Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={() => router.push('/jobs')}
              className={styles.secondaryBtn + ' w-full justify-center min-h-[46px]'}
            >
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Preview Public Job Board</span>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          {visibleJobs.map((job) => {
            const jobBids = bids.filter((b) => b.job_id === job.id)
            const jobMsgs = messages.filter((m) => m.job_id === job.id)
            const assignedSub = subs.find((s) => s.id === job.assigned_org_id)

            return (
              <article key={job.id} className={styles.jobCard}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={styles.statusBadge}>{job.status}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location || `${job.job_city || ''}, ${job.job_state || ''}`}
                    </span>
                  </div>

                  <span className="text-sm font-extrabold text-blue-700 flex items-center">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    Est. ${Number(job.estimated_budget || 0).toLocaleString()}
                  </span>
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {job.title}
                  </h2>
                  {job.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {job.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Assigned Subcontractor
                    </label>
                    <select
                      value={job.assigned_org_id || ''}
                      onChange={(e) => handleAssignContractor(job.id, e.target.value)}
                      className={styles.selectInput}
                    >
                      <option value="">Unassigned (Open for Bids)</option>
                      {subs.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.base_state || 'US'})
                          {sub.is_compliant ? ' • Verified' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Lifecycle Stage
                    </label>
                    <select
                      value={job.status || 'Open'}
                      onChange={(e) => handleUpdateJobStatus(job.id, e.target.value)}
                      className={styles.selectInput}
                    >
                      <option value="Open">Open</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In_Progress">In_Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {assignedSub && (
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex items-center justify-between">
                    <span>
                      Assigned to <strong>{assignedSub.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push('/admin/subcontractors')}
                      className="text-blue-700 font-bold hover:underline"
                    >
                      View Contractor Dossier →
                    </button>
                  </div>
                )}

                {jobBids.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Gavel className="w-3.5 h-3.5 text-amber-500" />
                      Bids Received ({jobBids.length})
                    </h3>
                    {jobBids.map((bid) => {
                      const bidder = subs.find((s) => s.id === bid.org_id)
                      return (
                        <div
                          key={bid.id}
                          className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-extrabold text-slate-900">
                              {bidder?.name || 'Subcontractor'} • $
                              {Number(bid.bid_amount).toLocaleString()}
                            </span>
                            <span className="ml-2 px-2 py-0.5 rounded bg-white border border-amber-300 text-[11px] font-bold">
                              {bid.status}
                            </span>
                            {bid.notes && (
                              <p className="text-slate-600 mt-0.5">{bid.notes}</p>
                            )}
                          </div>

                          {bid.status !== 'Awarded' && (
                            <button
                              type="button"
                              onClick={() => handleAwardBid(bid)}
                              className={styles.primaryBtn}
                            >
                              <Award className="w-3.5 h-3.5 text-amber-300" />
                              <span>Award & Assign</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {jobMsgs.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      RFIs & Field Messages ({jobMsgs.length})
                    </h3>
                    {jobMsgs.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                      >
                        <span className="font-bold text-blue-700 mr-1.5">
                          [{msg.message_type || 'RFI'}]
                        </span>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </section>
      </main>

      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">
                Post Official K.S. Trencho Job
              </h2>
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
                ⚡ Auto-Match Preview: {matchingSubCount} qualified & available subcontractor(s) match this job.
              </div>

              <button
                type="submit"
                className={styles.primaryBtn + ' w-full justify-center py-3'}
              >
                Publish Job
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}