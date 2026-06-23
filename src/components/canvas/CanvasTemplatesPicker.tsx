import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { TEMPLATES, type DiagramTemplate } from './canvasTemplates'

// ── Mini SVG previews ─────────────────────────────────────────────────────────

function FlowchartPreview() {
  return (
    <svg viewBox="-110 -40 220 380" width="100%" height="100%" fill="none" stroke="currentColor">
      {/* Start ellipse */}
      <ellipse cx="0" cy="0"   rx="72" ry="26" strokeWidth="2" />
      <text x="0" y="5" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">Start</text>
      {/* Arrow */}
      <line x1="0" y1="28" x2="0" y2="72" strokeWidth="1.5" markerEnd="url(#arr)" />
      {/* Step 1 */}
      <rect x="-82" y="74" width="164" height="48" rx="5" strokeWidth="1.5" />
      <text x="0" y="103" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none">Step 1</text>
      {/* Arrow */}
      <line x1="0" y1="124" x2="0" y2="168" strokeWidth="1.5" markerEnd="url(#arr)" />
      {/* Step 2 */}
      <rect x="-82" y="170" width="164" height="48" rx="5" strokeWidth="1.5" />
      <text x="0" y="199" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none">Step 2</text>
      {/* Arrow */}
      <line x1="0" y1="220" x2="0" y2="264" strokeWidth="1.5" markerEnd="url(#arr)" />
      {/* End ellipse */}
      <ellipse cx="0" cy="292" rx="72" ry="26" strokeWidth="2" />
      <text x="0" y="297" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">End</text>
      {/* Arrowhead marker */}
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
        </marker>
      </defs>
    </svg>
  )
}

function MindMapPreview() {
  return (
    <svg viewBox="-360 -130 720 260" width="100%" height="100%" fill="none" stroke="currentColor">
      {/* Center */}
      <rect x="-90" y="-28" width="180" height="56" rx="8" strokeWidth="2" />
      <text x="0" y="5" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none" fontWeight="600">Main Topic</text>
      {/* Left lines */}
      <line x1="-90" y1="-14" x2="-200" y2="-75" strokeWidth="1.5" />
      <line x1="-90" y1="0"   x2="-200" y2="0"   strokeWidth="1.5" />
      <line x1="-90" y1="14"  x2="-200" y2="75"  strokeWidth="1.5" />
      {/* Left labels */}
      <rect x="-310" y="-92" width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="-258" y="-70" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic A</text>
      <rect x="-310" y="-17" width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="-258" y="5" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic B</text>
      <rect x="-310" y="58"  width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="-258" y="80" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic C</text>
      {/* Right lines */}
      <line x1="90" y1="-14" x2="200" y2="-75" strokeWidth="1.5" />
      <line x1="90" y1="0"   x2="200" y2="0"   strokeWidth="1.5" />
      <line x1="90" y1="14"  x2="200" y2="75"  strokeWidth="1.5" />
      {/* Right labels */}
      <rect x="205" y="-92" width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="258" y="-70" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic D</text>
      <rect x="205" y="-17" width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="258" y="5" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic E</text>
      <rect x="205" y="58"  width="105" height="34" rx="5" strokeWidth="1.5" />
      <text x="258" y="80" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none">Topic F</text>
    </svg>
  )
}

const PREVIEWS: Record<string, React.FC> = {
  flowchart: FlowchartPreview,
  mindmap:   MindMapPreview,
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ tpl, onSelect }: { tpl: DiagramTemplate; onSelect: () => void }) {
  const Preview = PREVIEWS[tpl.id]
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-surface hover:bg-muted hover:border-accent/40 transition-all group text-left"
    >
      {/* Preview */}
      <div className="w-full aspect-[4/3] rounded-lg bg-background border border-border flex items-center justify-center text-foreground/70 group-hover:text-foreground transition-colors overflow-hidden p-2">
        {Preview && <Preview />}
      </div>
      {/* Label */}
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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-surface border border-border rounded-2xl shadow-2xl p-4"
      style={{ width: 380 }}
    >
      {/* Header */}
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

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2.5">
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
