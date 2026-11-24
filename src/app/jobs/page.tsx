'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StateSelectDropdown from '@/components/ui/StateSelectDropdown'
import {
  ShieldCheck,
  MapPin,
  Wrench,
  Users,
  DollarSign,
  MessageSquare,
  Gavel,
  Search,
  UserCheck,
  Sparkles,
  PlusCircle,
} from 'lucide-react'

const styles = {
  pageWrapper: 'min-h-screen bg-slate-50 text-slate-900 pb-16',
  header: 'sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs',
  headerInner: 'max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-2',
  brandGroup: 'flex items-center gap-2.5',
  brandBadge: 'p-2 bg-blue-600 rounded-lg text-white shadow-xs shrink-0',
  brandTitle: 'font-bold text-slate-900 text-base leading-tight',
  brandSub: 'text-[11px] text-slate-500',
  navGroup: 'flex items-center gap-2',
  primaryBtn:
    'min-h-[42px] px-3.5 py-2 rounded-lg bg-blue-600 active:bg-blue-700 md:hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition',
  secondaryBtn:
    'min-h-[42px] px-3 py-2 rounded-lg bg-white border border-slate-300 active:bg-slate-100 md:hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition',
  yellowBadgeBtn:
    'min-h-[42px] px-3 py-2 rounded-lg bg-amber-400 active:bg-amber-500 md:hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition',
  heroBanner: 'bg-blue-700 text-white border-b-4 border-amber-400',
  heroInner: 'max-w-5xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-3',
  heroPill:
    'self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950',
  heroTitle: 'text-xl sm:text-2xl font-extrabold tracking-tight',
  heroSub: 'text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed',
  mainContainer: 'max-w-5xl mx-auto px-4 pt-5 space-y-5',
  filterBar:
    'bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3',
  searchInputWrap: 'relative sm:col-span-2',
  searchInput:
    'w-full min-h-[46px] pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white',
  jobList: 'flex flex-col gap-4',
  jobCard:
    'bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs flex flex-col gap-4 transition md:hover:border-blue-300',
  matchBadge:
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300',
  stateBadge:
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200',
  tagChip:
    'px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shrink-0',
  equipChip:
    'px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50/80 text-blue-800 border border-blue-200 shrink-0',
  cardFooter:
    'pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
  bidBtn:
    'w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-lg bg-blue-600 active:bg-blue-700 md:hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition',
  contactBtn:
    'w-full sm:w-auto min-h-[46px] px-4 py-2.5 rounded-lg bg-white border border-slate-300 active:bg-slate-100 md:hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition',
}

interface JobListing {
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
}

export default function PublicJobBoardPage() {
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState('ALL')
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgStates, setOrgStates] = useState<string[]>([])
  const [orgCompliant, setOrgCompliant] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [activeActionJob, setActiveActionJob] = useState<{
    job: JobListing
    type: 'bid' | 'contact'
  } | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [noteText, setNoteText] = useState('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchBoardData = async () => {
      const { data: openJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'Open')
        .order('created_at', { ascending: false })

      if (openJobs) setJobs(openJobs as JobListing[])

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, org_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserRole(profile.role)
          setOrgId(profile.org_id)
          const { data: org } = await supabase
            .from('organizations')
            .select('operating_states, is_compliant, onboarding_completed')
            .eq('id', profile.org_id)
            .single()

          if (org) {
            setOrgStates(org.operating_states || [])
            setOrgCompliant(Boolean(org.is_compliant))
            setOnboardingDone(Boolean(org.onboarding_completed))
          }
        }
      }
    }

    fetchBoardData()
  }, [supabase])

  const handleJobAction = (job: JobListing, actionType: 'bid' | 'contact') => {
    setActionMessage(null)
    if (!userId) {
      router.push(`/login?mode=signup&next=/jobs&action=${actionType}&jobId=${job.id}`)
      return
    }

    if (!onboardingDone && userRole !== 'Admin') {
      router.push('/onboarding')
      return
    }

    setActiveActionJob({ job, type: actionType })
  }

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeActionJob || !userId || !orgId) return

    if (activeActionJob.type === 'bid' && !orgCompliant && userRole !== 'Admin') {
      setActionMessage(
        'Strict Compliance Gate: Please upload your W-9, COI, and Trade License in your Compliance Vault before placing a binding bid.'
      )
      return
    }

    if (activeActionJob.type === 'bid') {
      const { error } = await supabase.from('job_bids').insert({
        job_id: activeActionJob.job.id,
        org_id: orgId,
        bid_amount: Number(bidAmount),
        notes: noteText,
        status: 'Submitted',
      })
      if (error) {
        setActionMessage(`Error saving bid: ${error.message}`)
        return
      }
    } else {
      const { error } = await supabase.from('job_messages').insert({
        job_id: activeActionJob.job.id,
        sender_id: userId,
        message_type: 'RFI',
        content: noteText,
      })
      if (error) {
        setActionMessage(`Error sending message: ${error.message}`)
        return
      }
    }

    setActionMessage(
      activeActionJob.type === 'bid'
        ? `✓ Bid of $${Number(bidAmount).toLocaleString()} saved to your profile & sent to K.S. Trencho!`
        : '✓ Question saved & sent directly to Kyle, Kathy, and Will!'
    )
    setTimeout(() => {
      setActiveActionJob(null)
      setBidAmount('')
      setNoteText('')
      setActionMessage(null)
    }, 1800)
  }

  const filteredJobs = jobs.filter((j) => {
    const matchesState = selectedState === 'ALL' || j.job_state === selectedState
    const matchesText =
      j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesState && matchesText
  })

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <div className={styles.brandBadge}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className={styles.brandTitle}>K.S. Trencho</h1>
              <p className={styles.brandSub}>Nationwide Subcontractor Network</p>
            </div>
          </div>

          <div className={styles.navGroup}>
            {!userId ? (
              <>
                <button
                  onClick={() => router.push('/login?mode=signin')}
                  className={styles.secondaryBtn}
                >
                  Sign In
                </button>
                <button
                  onClick={() => router.push('/login?mode=signup')}
                  className={styles.primaryBtn}
                >
                  Register as Sub
                </button>
              </>
            ) : (
              <>
                {userRole === 'Admin' && (
                  <button
                    onClick={() => router.push('/admin/subcontractors')}
                    className={styles.yellowBadgeBtn}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Admin Directory</span>
                  </button>
                )}
                <button
                  onClick={() => router.push('/onboarding')}
                  className={styles.secondaryBtn}
                >
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Qualification Profile</span>
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className={styles.primaryBtn}
                >
                  Compliance Vault
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className={styles.heroBanner}>
        <div className={styles.heroInner}>
          <span className={styles.heroPill}>
            <Sparkles className="w-3.5 h-3.5" /> Public Job Feed • Browse Freely
          </span>
          <h2 className={styles.heroTitle}>
            Open Utility, Boring & Excavation Contracts
          </h2>
          <p className={styles.heroSub}>
            Browse active K.S. Trencho projects across the United States. Create a qualified subcontractor profile in under 5 minutes to place bids or message project managers.
          </p>
        </div>
      </section>

      <main className={styles.mainContainer}>
        <div className={styles.filterBar}>
          <div className={styles.searchInputWrap}>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by trade, equipment, or city..."
              className={styles.searchInput}
            />
          </div>

          <StateSelectDropdown
            value={selectedState}
            onChange={setSelectedState}
            includeAllOption
            allOptionLabel="ALL States"
          />
        </div>

        <div className={styles.jobList}>
          {filteredJobs.map((job) => {
            const isStateMatch =
              orgStates.includes('ALL') || orgStates.includes(job.job_state)

            return (
              <article key={job.id} className={styles.jobCard}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={styles.stateBadge}>
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location || `${job.job_city}, ${job.job_state}`}
                    </span>
                    {userId && isStateMatch && (
                      <span className={styles.matchBadge}>
                        ★ Matches Your Service Area
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-extrabold text-blue-700 flex items-center">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    Est. ${Number(job.estimated_budget || 0).toLocaleString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {job.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                <div className="space-y-2">
                  {job.required_specialties?.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {job.required_specialties.map((spec) => (
                        <span key={spec} className={styles.tagChip}>
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {job.required_equipment?.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0 mr-1" />
                      {job.required_equipment.map((eq) => (
                        <span key={eq} className={styles.equipChip}>
                          {eq}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Min. {job.min_crews_needed || 1} Crew(s) Required</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <button
                      onClick={() => handleJobAction(job, 'contact')}
                      className={styles.contactBtn}
                    >
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span>Contact / Ask Question</span>
                    </button>
                    <button
                      onClick={() => handleJobAction(job, 'bid')}
                      className={styles.bidBtn}
                    >
                      <Gavel className="w-4 h-4 text-amber-300" />
                      <span>Place a Bid</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </main>

      {activeActionJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                  {activeActionJob.type === 'bid' ? 'Submit Official Bid' : 'Send Job RFI / Question'}
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  {activeActionJob.job.title}
                </h4>
              </div>
              <button
                onClick={() => setActiveActionJob(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 px-2 py-1"
              >
                Close ✕
              </button>
            </div>

            {actionMessage && (
              <div className="p-3.5 rounded-lg text-xs font-medium bg-amber-50 border border-amber-300 text-amber-900">
                {actionMessage}
                {!orgCompliant && activeActionJob.type === 'bid' && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-2 block w-full py-2 bg-blue-600 text-white font-semibold rounded-md text-center"
                  >
                    Go to Compliance Vault →
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="space-y-4">
              {activeActionJob.type === 'bid' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Total Bid Amount (USD)
                  </label>
                  <input
                    type="number"
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="e.g. 46500"
                    className={styles.searchInput}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeActionJob.type === 'bid'
                    ? 'Crew Availability & Scope Notes'
                    : 'Your Question for Kyle, Kathy & Will'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={
                    activeActionJob.type === 'bid'
                      ? 'We have 2 HDD rigs available to mobilize next Monday...'
                      : 'Are utility locates already completed along the Hwy 21 bore path?'
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button type="submit" className={styles.bidBtn + ' w-full'}>
                {activeActionJob.type === 'bid' ? 'Submit Binding Bid' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}