'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown'
import StateSelectDropdown, { US_STATE_ABBR } from '@/components/ui/StateSelectDropdown'
import {
  ShieldCheck,
  MapPin,
  Wrench,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

const styles = {
  pageWrapper: 'min-h-screen bg-slate-50 text-slate-900 pb-16',
  header: 'bg-white border-b border-slate-200 sticky top-0 z-20',
  headerInner: 'max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between',
  progressTrack: 'w-full bg-slate-200 h-1.5',
  progressFill: 'bg-amber-400 h-1.5 transition-all duration-300',
  container: 'max-w-xl mx-auto px-4 pt-5',
  card: 'bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5',
  stepBadge:
    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300',
  stepTitle: 'text-lg sm:text-xl font-extrabold text-slate-900 mt-2',
  stepSub: 'text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed',
  label: 'block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5',
  input:
    'w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white',
  selectDropdown:
    'w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white',
  yellowToggleActive:
    'w-full min-h-[48px] px-4 py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-between border-2 border-amber-500 shadow-xs transition',
  yellowToggleInactive:
    'w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-between border border-slate-300 transition',
  footerNav: 'flex items-center justify-between gap-3 pt-4 border-t border-slate-100',
  backBtn:
    'min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs flex items-center gap-1.5',
  nextBtn:
    'flex-1 min-h-[48px] px-6 py-2.5 rounded-xl bg-blue-600 active:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition',
}

// Clean 2-letter state abbreviations only (SC, NC, TX, etc.)
const US_STATE_OPTIONS = US_STATE_ABBR.map((st) => ({ value: st, label: st }))

const SPECIALTY_OPTIONS = [
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
].map((s) => ({ value: s, label: s }))

const EQUIPMENT_OPTIONS = [
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
].map((e) => ({ value: e, label: e }))

export default function OnboardingWizardPage() {
  const [step, setStep] = useState(1)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [phone, setPhone] = useState('')
  const [baseCity, setBaseCity] = useState('')
  const [baseState, setBaseState] = useState('SC')
  const [baseZip, setBaseZip] = useState('')
  const [operatingStates, setOperatingStates] = useState<string[]>(['SC', 'NC'])
  const [willingToTravel, setWillingToTravel] = useState(false)
  const [availability, setAvailability] = useState('Available_Now')
  const [yearsExp, setYearsExp] = useState(5)

  const [specialties, setSpecialties] = useState<string[]>(['Directional Boring / HDD'])
  const [equipmentOwned, setEquipmentOwned] = useState<string[]>([])
  const [equipmentLeased, setEquipmentLeased] = useState<string[]>([])

  const [crewCount, setCrewCount] = useState(1)
  const [avgCrewSize, setAvgCrewSize] = useState(3)
  const [minProjectValue, setMinProjectValue] = useState(5000)
  const [maxProjectValue, setMaxProjectValue] = useState(100000)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadExistingProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?mode=signup')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (profile?.org_id) {
        setOrgId(profile.org_id)
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.org_id)
          .single()

        if (org) {
          if (org.primary_phone) setPhone(org.primary_phone)
          if (org.base_city) setBaseCity(org.base_city)
          if (org.base_state) setBaseState(org.base_state)
          if (org.base_zip) setBaseZip(org.base_zip)
          if (org.operating_states?.length)
            setOperatingStates(org.operating_states.filter((s: string) => s !== 'ALL'))
          if (org.willing_to_travel !== null) setWillingToTravel(org.willing_to_travel)
          if (org.availability_status) setAvailability(org.availability_status)
          if (org.years_experience) setYearsExp(org.years_experience)
          if (org.specialties?.length) setSpecialties(org.specialties)
          if (org.equipment_owned?.length) setEquipmentOwned(org.equipment_owned)
          if (org.equipment_leased?.length) setEquipmentLeased(org.equipment_leased)
          if (org.crew_count) setCrewCount(org.crew_count)
          if (org.avg_crew_size) setAvgCrewSize(org.avg_crew_size)
          if (org.min_project_value) setMinProjectValue(Number(org.min_project_value))
          if (org.max_project_value) setMaxProjectValue(Number(org.max_project_value))
        }
      }
      setLoading(false)
    }

    loadExistingProfile()
  }, [router, supabase])

  const handleSaveQualification = async (goToVault: boolean) => {
    if (!orgId) return
    setSaving(true)

    await supabase
      .from('organizations')
      .update({
        primary_phone: phone,
        base_city: baseCity,
        base_state: baseState,
        base_zip: baseZip,
        operating_states: willingToTravel
          ? Array.from(new Set(['ALL', ...operatingStates]))
          : operatingStates,
        willing_to_travel: willingToTravel,
        availability_status: availability,
        years_experience: yearsExp,
        specialties,
        equipment_owned: equipmentOwned,
        equipment_leased: equipmentLeased,
        crew_count: crewCount,
        avg_crew_size: avgCrewSize,
        min_project_value: minProjectValue,
        max_project_value: maxProjectValue,
        onboarding_completed: true,
      })
      .eq('id', orgId)

    setSaving(false)
    router.push(goToVault ? '/dashboard' : '/jobs')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Loading Qualification Profile...
      </div>
    )
  }

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm text-slate-900">
              Subcontractor Qualification ({step}/4)
            </span>
          </div>
          <button
            onClick={() => router.push('/jobs')}
            className="text-xs font-semibold text-blue-600"
          >
            Browse Jobs →
          </button>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${(step / 4) * 100}%` }} />
        </div>
      </header>

      <main className={styles.container}>
        <div className={styles.card}>
          {step === 1 && (
            <>
              <div>
                <span className={styles.stepBadge}>
                  <MapPin className="w-3.5 h-3.5" /> Step 1 of 4 • ~45 Seconds
                </span>
                <h1 className={styles.stepTitle}>Home Base & Service Territory</h1>
                <p className={styles.stepSub}>
                  Select your home base and use the scrollable dropdown to pick all U.S. states you cover.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={styles.label}>Base City</label>
                  <input
                    type="text"
                    value={baseCity}
                    onChange={(e) => setBaseCity(e.target.value)}
                    placeholder="e.g. Rock Hill"
                    className={styles.input}
                  />
                </div>
                <div>
                  <StateSelectDropdown
                    label="Home State"
                    value={baseState}
                    onChange={setBaseState}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={styles.label}>5-Digit ZIP Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={baseZip}
                    onChange={(e) => setBaseZip(e.target.value)}
                    placeholder="29730"
                    className={styles.input}
                  />
                </div>
                <div>
                  <label className={styles.label}>Primary Cell / Dispatch Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(803) 555-0199"
                    className={styles.input}
                  />
                </div>
              </div>

              <MultiSelectDropdown
                label="Operating States You Cover (Dropdown & Scroll)"
                placeholder="Tap to select states (SC, NC, TX...)"
                options={US_STATE_OPTIONS}
                selected={operatingStates}
                onChange={setOperatingStates}
              />

              <div>
                <label className={styles.label}>Nationwide Mobilization</label>
                <button
                  type="button"
                  onClick={() => setWillingToTravel(!willingToTravel)}
                  className={
                    willingToTravel
                      ? styles.yellowToggleActive
                      : styles.yellowToggleInactive
                  }
                >
                  <span>✈️ Willing to travel nationwide for qualifying projects</span>
                  <span>{willingToTravel ? 'YES ✓' : 'NO'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={styles.label}>Current Availability</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className={styles.selectDropdown}
                  >
                    <option value="Available_Now">🟢 Ready to Mobilize Now</option>
                    <option value="Available_Soon">🟡 Available in 2–3 Weeks</option>
                    <option value="At_Capacity">🔴 Booked / At Capacity</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>Years in Business</label>
                  <select
                    value={yearsExp}
                    onChange={(e) => setYearsExp(Number(e.target.value))}
                    className={styles.selectDropdown}
                  >
                    <option value={1}>1 – 2 Years</option>
                    <option value={3}>3 – 5 Years</option>
                    <option value={5}>5 – 10 Years</option>
                    <option value={10}>10+ Years Experience</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <span className={styles.stepBadge}>
                  <Wrench className="w-3.5 h-3.5" /> Step 2 of 4 • ~45 Seconds
                </span>
                <h1 className={styles.stepTitle}>Trades & Equipment Fleet</h1>
                <p className={styles.stepSub}>
                  Open each dropdown to search and check off your trades and heavy equipment.
                </p>
              </div>

              <MultiSelectDropdown
                label="1. Work Specialties & Services"
                placeholder="Select your trade specialties..."
                options={SPECIALTY_OPTIONS}
                selected={specialties}
                onChange={setSpecialties}
              />

              <MultiSelectDropdown
                label="2. Heavy Equipment You OWN Outright"
                placeholder="Select equipment in your owned fleet..."
                options={EQUIPMENT_OPTIONS}
                selected={equipmentOwned}
                onChange={setEquipmentOwned}
              />

              <MultiSelectDropdown
                label="3. Equipment You Can LEASE / RENT as Needed"
                placeholder="Select equipment you rent when required..."
                options={EQUIPMENT_OPTIONS}
                selected={equipmentLeased}
                onChange={setEquipmentLeased}
              />
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <span className={styles.stepBadge}>
                  <Users className="w-3.5 h-3.5" /> Step 3 of 4 • ~30 Seconds
                </span>
                <h1 className={styles.stepTitle}>Crew & Project Size Capacity</h1>
                <p className={styles.stepSub}>
                  Use the dropdowns below to set your workforce capacity and project budget range.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={styles.label}>Active Crews Available</label>
                  <select
                    value={crewCount}
                    onChange={(e) => setCrewCount(Number(e.target.value))}
                    className={styles.selectDropdown}
                  >
                    <option value={1}>1 Crew</option>
                    <option value={2}>2 Crews</option>
                    <option value={3}>3 Crews</option>
                    <option value={4}>4 Crews</option>
                    <option value={5}>5+ Crews (Large Fleet)</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>Average Crew Size</label>
                  <select
                    value={avgCrewSize}
                    onChange={(e) => setAvgCrewSize(Number(e.target.value))}
                    className={styles.selectDropdown}
                  >
                    <option value={2}>2 Workers per Crew</option>
                    <option value={3}>3 – 4 Workers per Crew</option>
                    <option value={5}>5 – 6 Workers per Crew</option>
                    <option value={8}>8+ Workers per Crew</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={styles.label}>Minimum Project Size</label>
                  <select
                    value={minProjectValue}
                    onChange={(e) => setMinProjectValue(Number(e.target.value))}
                    className={styles.selectDropdown}
                  >
                    <option value={1000}>$1,000 Minimum</option>
                    <option value={2500}>$2,500 Minimum</option>
                    <option value={5000}>$5,000 Minimum</option>
                    <option value={15000}>$15,000 Minimum</option>
                    <option value={25000}>$25,000 Minimum</option>
                    <option value={50000}>$50,000+ Minimum</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>Maximum Single Project Capacity</label>
                  <select
                    value={maxProjectValue}
                    onChange={(e) => setMaxProjectValue(Number(e.target.value))}
                    className={styles.selectDropdown}
                  >
                    <option value={25000}>Up to $25,000</option>
                    <option value={50000}>Up to $50,000</option>
                    <option value={100000}>Up to $100,000</option>
                    <option value={250000}>Up to $250,000</option>
                    <option value={500000}>Up to $500,000</option>
                    <option value={1000000}>$1,000,000+ Commercial</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <span className={styles.stepBadge}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Step 4 of 4 • Review & Finish
                </span>
                <h1 className={styles.stepTitle}>Qualification Profile Ready!</h1>
                <p className={styles.stepSub}>
                  Review your structured profile below. You can update these dropdowns anytime from your portal header.
                </p>
              </div>

              <div className="max-h-48 overflow-y-auto p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5 text-xs text-slate-700">
                <p>
                  <strong className="text-slate-900">Home Base & States:</strong>{' '}
                  {baseCity || 'Base'}, {baseState} • Covers:{' '}
                  {operatingStates.join(', ') || baseState}
                  {willingToTravel ? ' (+ Nationwide Travel)' : ''}
                </p>
                <p>
                  <strong className="text-slate-900">Specialties:</strong>{' '}
                  {specialties.join(', ') || 'None selected'}
                </p>
                <p>
                  <strong className="text-slate-900">Owned Equipment:</strong>{' '}
                  {equipmentOwned.join(', ') || 'None listed'}
                </p>
                <p>
                  <strong className="text-slate-900">Leased Equipment:</strong>{' '}
                  {equipmentLeased.join(', ') || 'None listed'}
                </p>
                <p>
                  <strong className="text-slate-900">Crew & Project Range:</strong>{' '}
                  {crewCount} Crew(s) ({avgCrewSize} workers/crew) • $
                  {minProjectValue.toLocaleString()} – ${maxProjectValue.toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                  Strict Bidding Compliance Gate
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  You can browse jobs and message Kyle, Kathy, and Will immediately. Upload your <strong>W-9</strong>, <strong>COI</strong>, and <strong>Trade License</strong> in the Compliance Vault to unlock binding bids.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveQualification(true)}
                  className={styles.nextBtn}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Save & Upload Compliance Docs Now</span>
                      <ArrowRight className="w-4 h-4 text-amber-300" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveQualification(false)}
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs"
                >
                  Save Profile & Return to Public Job Board
                </button>
              </div>
            </>
          )}

          {step < 4 && (
            <div className={styles.footerNav}>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className={styles.backBtn}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className={styles.nextBtn}
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}