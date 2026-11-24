'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X, MapPin } from 'lucide-react'

// ==========================================
// STYLE TOKENS (White, Blue & Yellow Theme)
// Mobile-first: caps visible rows to 4-5 states (max-h-44)
// ==========================================
const styles = {
  wrapper: 'relative w-full',
  label: 'block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5',
  triggerBtn:
    'w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-left text-sm font-bold text-slate-900 flex items-center justify-between gap-2 focus:outline-none focus:border-blue-600 focus:bg-white transition',
  triggerBtnOpen: 'border-blue-600 bg-white ring-2 ring-blue-600/15',
  dropdownPanel:
    'absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-40',
  searchHeader: 'p-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2',
  searchInput:
    'w-full text-sm font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400',
  scrollList: 'max-h-44 overflow-y-auto divide-y divide-slate-100 overscroll-contain',
  optionRow:
    'w-full min-h-[44px] px-4 py-2.5 text-sm font-bold flex items-center justify-between text-left transition',
  optionSelected: 'bg-blue-50 text-blue-700',
  optionUnselected: 'bg-white text-slate-800 active:bg-slate-100 md:hover:bg-slate-50',
  checkBadge:
    'w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0',
}

export const US_STATE_ABBR = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

interface StateSelectDropdownProps {
  label?: string
  value: string
  onChange: (newState: string) => void
  includeAllOption?: boolean
  allOptionLabel?: string
}

export default function StateSelectDropdown({
  label,
  value,
  onChange,
  includeAllOption = false,
  allOptionLabel = 'ALL States',
}: StateSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const filteredStates = US_STATE_ABBR.filter((st) =>
    st.toLowerCase().includes(search.trim().toLowerCase())
  )

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.triggerBtn} ${isOpen ? styles.triggerBtnOpen : ''}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{value === 'ALL' ? allOptionLabel : value}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdownPanel}>
          <div className={styles.searchHeader}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (SC, NC, TX)..."
              className={styles.searchInput}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className={styles.scrollList}>
            {includeAllOption && (!search || 'all'.includes(search.toLowerCase())) && (
              <button
                type="button"
                onClick={() => handleSelect('ALL')}
                className={`${styles.optionRow} ${
                  value === 'ALL' ? styles.optionSelected : styles.optionUnselected
                }`}
              >
                <span>{allOptionLabel}</span>
                {value === 'ALL' && (
                  <span className={styles.checkBadge}>
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            )}

            {filteredStates.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No state found
              </div>
            ) : (
              filteredStates.map((st) => {
                const active = value === st
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleSelect(st)}
                    className={`${styles.optionRow} ${
                      active ? styles.optionSelected : styles.optionUnselected
                    }`}
                  >
                    <span>{st}</span>
                    {active && (
                      <span className={styles.checkBadge}>
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}