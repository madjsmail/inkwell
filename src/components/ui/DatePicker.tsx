import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Returns 0=Mon … 6=Sun (ISO week)
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay() // 0=Sun
  return (d + 6) % 7
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

interface CalendarProps {
  value?: Date | null
  onChange: (date: Date) => void
}

function Calendar({ value, onChange }: CalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build grid: leading nulls + day numbers
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete final row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="p-3 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-tertiary py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />

          const date = new Date(viewYear, viewMonth, day)
          const isSelected = value ? isSameDay(date, value) : false
          const isToday = isSameDay(date, today)

          return (
            <button
              key={day}
              onClick={() => onChange(date)}
              className={cn(
                'w-full aspect-square flex items-center justify-center rounded text-sm transition-colors',
                isSelected
                  ? 'bg-accent text-accent-foreground font-semibold'
                  : isToday
                  ? 'border border-accent/60 text-foreground font-medium hover:bg-surface'
                  : 'text-foreground hover:bg-surface',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── DatePicker ────────────────────────────────────────────────────────────────

interface DatePickerProps {
  value?: string | null  // ISO string or null
  onChange: (iso: string | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const parsed = value ? new Date(value) : null

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (date: Date) => {
    onChange(date.toISOString())
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  const formatDisplay = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-md border transition-colors',
          'bg-surface border-border text-foreground',
          'hover:border-accent/50 focus:outline-none focus:border-accent/70',
          open && 'border-accent/60',
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className={cn('flex-1 text-left text-sm', !parsed && 'text-muted-foreground')}>
          {parsed ? formatDisplay(parsed) : placeholder}
        </span>
        {parsed && (
          <button
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground transition-colors text-xs leading-none ml-auto"
            title="Clear date"
          >
            ×
          </button>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute z-50 top-full mt-1 left-0',
          'bg-panel border border-border rounded-lg shadow-xl',
          'min-w-[240px]',
        )}>
          <Calendar value={parsed} onChange={handleSelect} />

        </div>
      )}
    </div>
  )
}
