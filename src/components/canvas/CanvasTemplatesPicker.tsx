import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { TEMPLATES, type DiagramTemplate } from './canvasTemplates'

// ── Mini SVG previews ─────────────────────────────────────────────────────────

function FlowchartPreview() {
  return (
    <svg viewBox="-110 -40 220 380" width="100%" height="100%" fill="none" stroke="currentColor">
      <defs>
        <marker id="fc-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
        </marker>
      </defs>
      <ellipse cx="0" cy="0" rx="72" ry="26" strokeWidth="2" />
      <text x="0" y="5" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">Start</text>
      <line x1="0" y1="28" x2="0" y2="72" strokeWidth="1.5" markerEnd="url(#fc-arr)" />
      <rect x="-82" y="74" width="164" height="48" rx="5" strokeWidth="1.5" />
      <text x="0" y="103" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none">Step 1</text>
      <line x1="0" y1="124" x2="0" y2="168" strokeWidth="1.5" markerEnd="url(#fc-arr)" />
      <rect x="-82" y="170" width="164" height="48" rx="5" strokeWidth="1.5" />
      <text x="0" y="199" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none">Step 2</text>
      <line x1="0" y1="220" x2="0" y2="264" strokeWidth="1.5" markerEnd="url(#fc-arr)" />
      <ellipse cx="0" cy="292" rx="72" ry="26" strokeWidth="2" />
      <text x="0" y="297" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">End</text>
    </svg>
  )
}

function MindMapPreview() {
  return (
    <svg viewBox="-360 -130 720 260" width="100%" height="100%" fill="none" stroke="currentColor">
      <rect x="-90" y="-28" width="180" height="56" rx="8" strokeWidth="2" />
      <text x="0" y="5" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">Main Topic</text>
      <line x1="-90" y1="-14" x2="-200" y2="-75" strokeWidth="1.5" />
      <line x1="-90" y1="0"   x2="-200" y2="0"   strokeWidth="1.5" />
      <line x1="-90" y1="14"  x2="-200" y2="75"  strokeWidth="1.5" />
      <rect x="-310" y="-92" width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="-258" y="-70" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic A</text>
      <rect x="-310" y="-17" width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="-258" y="5"   textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic B</text>
      <rect x="-310" y="58"  width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="-258" y="80"  textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic C</text>
      <line x1="90"  y1="-14" x2="200" y2="-75" strokeWidth="1.5" />
      <line x1="90"  y1="0"   x2="200" y2="0"   strokeWidth="1.5" />
      <line x1="90"  y1="14"  x2="200" y2="75"  strokeWidth="1.5" />
      <rect x="205" y="-92" width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="258" y="-70" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic D</text>
      <rect x="205" y="-17" width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="258" y="5"   textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic E</text>
      <rect x="205" y="58"  width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="258" y="80"  textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic F</text>
    </svg>
  )
}

function OrgChartPreview() {
  return (
    <svg viewBox="-280 -180 560 280" width="100%" height="100%" fill="none" stroke="currentColor">
      {/* CEO */}
      <rect x="-70" y="-170" width="140" height="44" rx="6" strokeWidth="2" />
      <text x="0" y="-142" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">CEO</text>
      {/* Connectors */}
      <line x1="0"    y1="-126" x2="0"    y2="-100" strokeWidth="1.5" />
      <line x1="-140" y1="-100" x2="140"  y2="-100" strokeWidth="1.5" />
      <line x1="-140" y1="-100" x2="-140" y2="-78"  strokeWidth="1.5" />
      <line x1="140"  y1="-100" x2="140"  y2="-78"  strokeWidth="1.5" />
      {/* Manager A */}
      <rect x="-210" y="-78" width="140" height="44" rx="5" strokeWidth="1.5" />
      <text x="-140" y="-50" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Manager A</text>
      {/* Manager B */}
      <rect x="70" y="-78" width="140" height="44" rx="5" strokeWidth="1.5" />
      <text x="140" y="-50" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Manager B</text>
      {/* Mgr A reports */}
      <line x1="-140" y1="-34" x2="-140" y2="-12" strokeWidth="1.2" />
      <line x1="-190" y1="-12" x2="-90"  y2="-12" strokeWidth="1.2" />
      <line x1="-190" y1="-12" x2="-190" y2="6"   strokeWidth="1.2" />
      <line x1="-90"  y1="-12" x2="-90"  y2="6"   strokeWidth="1.2" />
      <rect x="-240" y="6" width="100" height="36" rx="4" strokeWidth="1.2" />
      <text x="-190" y="29" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none">Report 1</text>
      <rect x="-140" y="6" width="100" height="36" rx="4" strokeWidth="1.2" />
      <text x="-90"  y="29" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none">Report 2</text>
      {/* Mgr B report */}
      <line x1="140" y1="-34" x2="140" y2="6" strokeWidth="1.2" />
      <rect x="90"  y="6" width="100" height="36" rx="4" strokeWidth="1.2" />
      <text x="140" y="29" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none">Report 3</text>
    </svg>
  )
}

function SequencePreview() {
  return (
    <svg viewBox="-260 -150 520 380" width="100%" height="100%" fill="none" stroke="currentColor">
      <defs>
        <marker id="sq-arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill="currentColor" />
        </marker>
      </defs>
      {/* Actors */}
      <rect x="-240" y="-140" width="120" height="44" rx="5" strokeWidth="2" />
      <text x="-180" y="-112" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none" fontWeight="600">Actor A</text>
      <rect x="120" y="-140" width="120" height="44" rx="5" strokeWidth="2" />
      <text x="180" y="-112" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none" fontWeight="600">Actor B</text>
      {/* Lifelines */}
      <line x1="-180" y1="-96" x2="-180" y2="210" strokeWidth="1" />
      <line x1="180"  y1="-96" x2="180"  y2="210" strokeWidth="1" />
      {/* Messages */}
      <line x1="-180" y1="-30" x2="175" y2="-30" strokeWidth="1.5" markerEnd="url(#sq-arr)" />
      <text x="-10" y="-38" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none">Request</text>
      <line x1="180" y1="50" x2="-175" y2="50" strokeWidth="1.5" markerEnd="url(#sq-arr)" />
      <text x="-10" y="42" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none">Response</text>
      <line x1="-180" y1="130" x2="175" y2="130" strokeWidth="1.5" markerEnd="url(#sq-arr)" />
      <text x="-10" y="122" textAnchor="middle" fontSize="9" fill="currentColor" stroke="none">Callback</text>
    </svg>
  )
}

function TimelinePreview() {
  const milestones = [
    { x: -200, label: 'Phase 1', above: true  },
    { x:  -65, label: 'Phase 2', above: false },
    { x:   65, label: 'Phase 3', above: true  },
    { x:  200, label: 'Phase 4', above: false },
  ]
  return (
    <svg viewBox="-260 -100 520 200" width="100%" height="100%" fill="none" stroke="currentColor">
      <defs>
        <marker id="tl-arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill="currentColor" />
        </marker>
      </defs>
      <line x1="-250" y1="0" x2="248" y2="0" strokeWidth="2" markerEnd="url(#tl-arr)" />
      {milestones.map(({ x, label, above }) => (
        <g key={x}>
          <line x1={x} y1="-10" x2={x} y2="10" strokeWidth="1.5" />
          <line x1={x} y1={above ? -10 : 10} x2={x} y2={above ? -38 : 38} strokeWidth="1.2" />
          <text x={x} y={above ? -44 : 52} textAnchor="middle" fontSize="9" fill="currentColor" stroke="none" fontWeight="600">{label}</text>
        </g>
      ))}
    </svg>
  )
}

function VennPreview() {
  return (
    <svg viewBox="-260 -150 520 300" width="100%" height="100%" fill="none" stroke="currentColor">
      <ellipse cx="-65" cy="0" rx="160" ry="120" strokeWidth="2" />
      <ellipse cx="65"  cy="0" rx="160" ry="120" strokeWidth="2" />
      <text x="-150" y="5" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">Set A</text>
      <text x="150"  y="5" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">Set B</text>
      <text x="0"    y="5" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Both</text>
    </svg>
  )
}

const PREVIEWS: Record<string, React.FC> = {
  flowchart: FlowchartPreview,
  mindmap:   MindMapPreview,
  orgchart:  OrgChartPreview,
  sequence:  SequencePreview,
  timeline:  TimelinePreview,
  venn:      VennPreview,
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onSelect }: { tpl: DiagramTemplate; onSelect: () => void }) {
  const Preview = PREVIEWS[tpl.id]
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-surface hover:bg-muted hover:border-accent/40 transition-all group text-left"
    >
      <div className="w-full aspect-[4/3] rounded-lg bg-background border border-border flex items-center justify-center text-foreground/70 group-hover:text-foreground transition-colors overflow-hidden p-2">
        {Preview && <Preview />}
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">{tpl.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{tpl.description}</p>
      </div>
    </button>
  )
}

// ── Picker ────────────────────────────────────────────────────────────────────

interface Props {
  onSelect: (tpl: DiagramTemplate) => void
  onClose:  () => void
}

export function CanvasTemplatesPicker({ onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-surface border border-border rounded-2xl shadow-2xl p-4"
      style={{ width: 520 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Templates</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Pick one to load on the canvas</p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {TEMPLATES.map(tpl => (
          <TemplateCard
            key={tpl.id}
            tpl={tpl}
            onSelect={() => { onSelect(tpl); onClose() }}
          />
        ))}
      </div>
    </div>
  )
}
