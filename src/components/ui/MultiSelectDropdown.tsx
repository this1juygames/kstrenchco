'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

// ==========================================
// STYLE TOKENS (White, Blue & Yellow Theme)
// Mobile-first: caps visible rows to 4-5 items (max-h-44)
// ==========================================
const styles = {
  wrapper: 'relative w-full',
  label: 'block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5',
  triggerBtn:
    'w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-left text-sm font-bold text-slate-800 flex items-center justify-between gap-2 focus:outline-none focus:border-blue-600 focus:bg-white transition',
  triggerBtnOpen: 'border-blue-600 bg-white ring-2 ring-blue-600/15',
  countBadge:
    'px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-950 shrink-0',
  dropdownPanel:
    'absolute left-0 right-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-40',
  searchHeader: 'p-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2',
  searchInput:
    'w-full text-sm font-medium text-slate-900 bg-transparent focus:outline-none placeholder-slate-400',
  quickActionsBar:
    'px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600',
  scrollList: 'max-h-44 overflow-y-auto divide-y divide-slate-100 overscroll-contain',
  optionRow:
    'w-full min-h-[44px] px-4 py-2.5 text-sm font-bold flex items-center justify-between text-left transition',
  optionSelected: 'bg-blue-50/90 text-blue-800',
  optionUnselected: 'bg-white text-slate-700 active:bg-slate-100 md:hover:bg-slate-50',
  checkIconBox:
    'w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0',
  checkActive: 'bg-blue-600 border-blue-600 text-white',
  checkInactive: 'border-slate-300 bg-white',
  pillTray: 'flex flex-wrap gap-1.5 mt-2 max-h-20 overflow-y-auto p-0.5',
  selectedPill:
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200',
}

interface MultiSelectDropdownProps {
  label: string
  placeholder: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (updated: string[]) => void
  searchable?: boolean
}

export default function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selected,
  onChange,
  searchable = true,
}: MultiSelectDropdownProps) {
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

  const toggleValue = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((item) => item !== val))
    } else {
      onChange([...selected, val])
    }
  }

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <label className={styles.label}>{label}</label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.triggerBtn} ${isOpen ? styles.triggerBtnOpen : ''}`}
      >
        <span className="truncate">
          {selected.length === 0
            ? placeholder
            : `${selected.length} selected (${selected.slice(0, 4).join(', ')}${
                selected.length > 4 ? '...' : ''
              })`}
        </span>

        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className={styles.countBadge}>{selected.length}</span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className={styles.dropdownPanel}>
          {searchable && (
            <div className={styles.searchHeader}>
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
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
          )}

          <div className={styles.quickActionsBar}>
            <button
              type="button"
              onClick={() => onChange(options.map((o) => o.value))}
              className="hover:underline"
            >
              Select All ({options.length})
            </button>
            <div className="flex items-center gap-3">
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-slate-500 hover:text-red-600"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded"
              >
                Done ✓
              </button>
            </div>
          </div>

          <div className={styles.scrollList}>
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const active = selected.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleValue(opt.value)}
                    className={`${styles.optionRow} ${
                      active ? styles.optionSelected : styles.optionUnselected
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`${styles.checkIconBox} ${
                        active ? styles.checkActive : styles.checkInactive
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className={styles.pillTray}>
          {selected.map((val) => {
            const itemLabel = options.find((o) => o.value === val)?.label || val
            return (
              <span key={val} className={styles.selectedPill}>
                <span>{itemLabel}</span>
                <button
                  type="button"
                  onClick={() => toggleValue(val)}
                  className="text-blue-500 hover:text-blue-900 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}