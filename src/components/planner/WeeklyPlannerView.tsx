import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Check, X, Tag } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { PlannerDay, PlannerTask } from '../../types'
import { cn } from '../../lib/utils'

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(d.getDate() + n)
  return r
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
// const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function dayTitle(date: Date, today: Date): string {
  if (toISO(date) === toISO(today)) return 'Today'
  if (toISO(date) === toISO(addDays(today, -1))) return 'Yesterday'
  if (toISO(date) === toISO(addDays(today, 1))) return 'Tomorrow'
  return DAY_FULL[date.getDay()]
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: PlannerTask
  onToggle: () => void
  onRemove: () => void
}

function TaskCard({ task, onToggle, onRemove }: TaskCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3.5 group cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={cn(
          'w-5 h-5 rounded-md border-[1.5px] flex-shrink-0 mt-[1px] flex items-center justify-center transition-all',
          task.done
            ? 'bg-accent border-accent'
            : 'border-border hover:border-accent/50',
        )}
      >
        {task.done && <Check className="w-3 h-3 text-background" strokeWidth={3} />}
      </button>

      {/* Text */}
      <span
        className={cn(
          'flex-1 text-sm leading-relaxed',
          task.done ? 'line-through text-tertiary' : 'text-foreground',
        )}
      >
        {task.text}
      </span>

      {/* Delete */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-tertiary hover:text-muted-foreground mt-[1px] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ── WeeklyPlannerView ─────────────────────────────────────────────────────────

export function WeeklyPlannerView() {
  const { plannerData, updatePlannerWeek } = useAppStore()

  // Today (stable reference, no time component)
  const today = useRef((() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  })()).current

  const [selectedDate, setSelectedDate] = useState(today)
  const [weekStart, setWeekStart]       = useState(() => getMonday(today))

  // Add-task form state
  const [draft, setDraft]               = useState('')
  const [labelDraft, setLabelDraft]     = useState('')
  const [showLabel, setShowLabel]       = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const labelRef  = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Collect all unique labels used across all planner data
  const allLabels = useMemo(() => {
    const set = new Set<string>()
    for (const days of Object.values(plannerData)) {
      for (const day of days) {
        for (const task of day.tasks) {
          if (task.label) set.add(task.label)
        }
      }
    }
    return Array.from(set).sort()
  }, [plannerData])

  const filteredLabels = labelDraft
    ? allLabels.filter(l => l.startsWith(labelDraft) && l !== labelDraft)
    : allLabels

  // Build 7 day chips for the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Derive the week key (Monday of selected date's week)
  const weekKey = toISO(getMonday(selectedDate))

  // Get or initialise the week data
  const weekData: PlannerDay[] = plannerData[weekKey]
    ?? Array.from({ length: 7 }, (_, i) => ({
         date: toISO(addDays(new Date(weekKey), i)),
         tasks: [],
       }))

  // Index of the selected day within its week (0=Mon … 6=Sun)
  const dayIdx = (() => {
    const d = selectedDate.getDay()
    return d === 0 ? 6 : d - 1
  })()

  const currentDay: PlannerDay = weekData[dayIdx] ?? { date: toISO(selectedDate), tasks: [] }

  // Navigate to a date, updating the week window if necessary
  const goToDate = useCallback((date: Date) => {
    setSelectedDate(date)
    const mon = getMonday(date)
    // Only shift the chip window if the target date isn't in the current window
    setWeekStart(prev => {
      const endOfWindow = addDays(prev, 6)
      if (date >= prev && date <= endOfWindow) return prev
      return mon
    })
  }, [])

  // Scroll today's chip into view on mount
  useEffect(() => {
    scrollRef.current
      ?.querySelector('[data-today="true"]')
      ?.scrollIntoView({ inline: 'center', behavior: 'instant' })
  }, [])

  // ── Mutations ───────────────────────────────────────────────────────────────

  const saveDay = useCallback((newDay: PlannerDay) => {
    const next = [...weekData]
    next[dayIdx] = newDay
    updatePlannerWeek(weekKey, next)
  }, [weekData, dayIdx, weekKey, updatePlannerWeek])

  const addTask = useCallback(() => {
    const text = draft.trim()
    if (!text) return
    const label = labelDraft.trim().toUpperCase() || undefined
    saveDay({
      ...currentDay,
      tasks: [...currentDay.tasks, { id: uid(), text, done: false, label }],
    })
    setDraft('')
    setLabelDraft('')
    setShowLabel(false)
    inputRef.current?.focus()
  }, [draft, labelDraft, currentDay, saveDay])

  const toggleTask = useCallback((taskId: string) => {
    saveDay({
      ...currentDay,
      tasks: currentDay.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
    })
  }, [currentDay, saveDay])

  const removeTask = useCallback((taskId: string) => {
    saveDay({
      ...currentDay,
      tasks: currentDay.tasks.filter(t => t.id !== taskId),
    })
  }, [currentDay, saveDay])

  // ── Group tasks by label ─────────────────────────────────────────────────────

  const grouped: { label: string | undefined; tasks: PlannerTask[] }[] = []
  const seen = new Map<string | undefined, PlannerTask[]>()

  for (const task of currentDay.tasks) {
    const key = task.label
    if (!seen.has(key)) {
      seen.set(key, [])
      grouped.push({ label: key, tasks: seen.get(key)! })
    }
    seen.get(key)!.push(task)
  }

  const totalDone  = currentDay.tasks.filter(t => t.done).length
  const totalTasks = currentDay.tasks.length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden select-none">

      {/* Window drag region */}
      <div className="h-8 shrink-0" data-tauri-drag-region />

      {/* ── Day title ── */}
      <div className="px-8 pb-4 flex-shrink-0">
        <div className="flex items-baseline justify-between">
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            {dayTitle(selectedDate, today)}
          </h1>
          {totalTasks > 0 && (
            <span className="text-sm text-tertiary tabular-nums">
              {totalDone} of {totalTasks} done
            </span>
          )}
        </div>
      </div>

      {/* ── Day strip ── */}
      <div className="px-8 pb-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Prev week */}
          <button
            onClick={() => setWeekStart(w => addDays(w, -7))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Day chips */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
            style={{ scrollbarWidth: 'none' }}
          >
            {weekDays.map(date => {
              const iso      = toISO(date)
              const isSelected = iso === toISO(selectedDate)
              const isToday    = iso === toISO(today)
              const dayOfWeek  = date.getDay()
              const isWeekend  = dayOfWeek === 0 || dayOfWeek === 6

              // Task count badge
              const dKey = toISO(getMonday(date))
              const dIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1
              const dData = (plannerData[dKey] ?? [])[dIdx]
              const taskCount = dData?.tasks?.length ?? 0

              return (
                <button
                  key={iso}
                  data-today={isToday || undefined}
                  onClick={() => goToDate(date)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border flex-shrink-0 transition-all min-w-[68px]',
                    isSelected
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : isWeekend
                        ? 'bg-background border-border text-tertiary hover:bg-surface'
                        : 'bg-background border-border text-foreground hover:bg-surface',
                  )}
                >
                  <span className="text-[10px] font-semibold tracking-widest uppercase">
                    {DAY_SHORT[date.getDay()]}
                  </span>
                  <span className={cn(
                    'text-xl font-light leading-none',
                    isSelected && 'font-semibold',
                    isToday && !isSelected && 'text-accent',
                  )}>
                    {date.getDate()}
                  </span>
                  {/* Dot if tasks exist */}
                  {taskCount > 0 && (
                    <div className={cn(
                      'w-1 h-1 rounded-full mt-0.5',
                      isSelected ? 'bg-accent' : 'bg-accent/50',
                    )} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Next week */}
          <button
            onClick={() => setWeekStart(w => addDays(w, 7))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Task list ── */}
      <div className="flex-1 overflow-y-auto px-8 pb-4">
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-tertiary text-sm">
            <span>No tasks for {dayTitle(selectedDate, today).toLowerCase()}</span>
            <span className="text-xs mt-1 opacity-60">Add one below</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(({ label, tasks }) => (
              <div key={label ?? '__none__'} className="flex flex-col gap-2">
                {/* Label header */}
                {label && (
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-accent px-1">
                    {label}
                  </p>
                )}
                {/* Tasks */}
                {tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id)}
                    onRemove={() => removeTask(task.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add task bar ── */}
      <div className="flex-shrink-0 border-t border-border bg-panel px-6 py-4">
        {/* Label input (shown when toggled) */}
        {showLabel && (
          <div className="relative mb-2">
            <div className="flex items-center gap-2 px-1">
              <Tag className="w-3 h-3 text-accent flex-shrink-0" />
              <input
                ref={labelRef}
                value={labelDraft}
                onChange={e => {
                  setLabelDraft(e.target.value.toUpperCase())
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); inputRef.current?.focus(); setShowSuggestions(false) }
                  if (e.key === 'Escape') { setLabelDraft(''); setShowLabel(false); setShowSuggestions(false) }
                }}
                placeholder="Label (e.g. DESIGN, PERSONAL)"
                className="flex-1 bg-transparent text-xs text-accent placeholder:text-tertiary outline-none uppercase tracking-wider"
              />
              {labelDraft && (
                <button
                  onClick={() => { setLabelDraft(''); setShowLabel(false) }}
                  className="text-tertiary hover:text-muted-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Suggestions chips */}
            {showSuggestions && filteredLabels.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto mt-2 px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
                {filteredLabels.map(label => (
                  <button
                    key={label}
                    onMouseDown={e => {
                      e.preventDefault()
                      setLabelDraft(label)
                      setShowSuggestions(false)
                      inputRef.current?.focus()
                    }}
                    className="flex-shrink-0 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-[10px] font-semibold tracking-[0.1em] uppercase hover:bg-accent/20 hover:border-accent/50 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Label toggle */}
          <button
            onClick={() => {
              setShowLabel(v => !v)
              setTimeout(() => (showLabel ? inputRef : labelRef).current?.focus(), 0)
            }}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-lg border transition-colors flex-shrink-0',
              showLabel || labelDraft
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'border-border text-tertiary hover:text-muted-foreground hover:bg-surface',
            )}
            title="Set label"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>

          {/* Task input */}
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addTask() }
              if (e.key === 'Escape') { setDraft(''); setLabelDraft(''); setShowLabel(false) }
            }}
            placeholder="Write a task…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-tertiary outline-none"
          />

          {/* Add button */}
          <button
            onClick={addTask}
            disabled={!draft.trim()}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0',
              draft.trim()
                ? 'bg-foreground text-background hover:opacity-90'
                : 'bg-surface text-tertiary cursor-not-allowed',
            )}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
