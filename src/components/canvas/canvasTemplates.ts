import type { Shape } from './canvasTypes'
import { uid } from './canvasTypes'

const C  = '#1e293b'           // stroke color
const FN = 'Inter, system-ui, sans-serif'
const W2 = 2
const W1 = 1.5

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function s(fields: Record<string, any>): Shape {
  return { id: uid(), color: C, fill: 'none', width: W2, ...fields } as Shape
}
function txt(x: number, y: number, text: string, bold = false): Shape {
  return s({ type: 'text', x, y, text, size: 14, fontFamily: FN, bold, italic: false, width: 1 })
}

// ─────────────────────────────────────────────────────────────────────────────
//  FLOWCHART
//  Bounding box: roughly x ∈ [-100, 100], y ∈ [-30, 380]
// ─────────────────────────────────────────────────────────────────────────────

function makeFlowchart(): Shape[] {
  return [
    // Start (ellipse)
    s({ type: 'ellipse', cx: 0, cy: 0, rx: 80, ry: 30, width: W2 }),
    txt(-20, 6, 'Start', true),

    // Arrow ↓
    s({ type: 'arrow', x1: 0, y1: 32, x2: 0, y2: 78, width: W1 }),

    // Step 1
    s({ type: 'rect', x: -90, y: 80, w: 180, h: 56, radius: 6 }),
    txt(-28, 114, 'Step 1'),

    // Arrow ↓
    s({ type: 'arrow', x1: 0, y1: 138, x2: 0, y2: 182, width: W1 }),

    // Step 2
    s({ type: 'rect', x: -90, y: 184, w: 180, h: 56, radius: 6 }),
    txt(-28, 218, 'Step 2'),

    // Arrow ↓
    s({ type: 'arrow', x1: 0, y1: 242, x2: 0, y2: 286, width: W1 }),

    // End (ellipse)
    s({ type: 'ellipse', cx: 0, cy: 316, rx: 80, ry: 30, width: W2 }),
    txt(-14, 322, 'End', true),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
//  MIND MAP
//  Central box at (0, 0), branches radiating left & right
// ─────────────────────────────────────────────────────────────────────────────

function makeMindMap(): Shape[] {
  return [
    // Center box
    s({ type: 'rect', x: -100, y: -35, w: 200, h: 70, radius: 10, width: 2.5 }),
    txt(-55, 4, 'Main Topic', true),

    // ── Left branches ──────────────────────────────────────────────────────
    // Top-left
    s({ type: 'line', x1: -100, y1: -18, x2: -230, y2: -90, width: W1 }),
    s({ type: 'rect', x: -345, y: -107, w: 110, h: 38, radius: 6 }),
    txt(-332, -82, 'Topic A'),

    // Mid-left
    s({ type: 'line', x1: -100, y1: 0, x2: -230, y2: 0, width: W1 }),
    s({ type: 'rect', x: -345, y: -19, w: 110, h: 38, radius: 6 }),
    txt(-332, 6, 'Topic B'),

    // Bottom-left
    s({ type: 'line', x1: -100, y1: 18, x2: -230, y2: 90, width: W1 }),
    s({ type: 'rect', x: -345, y: 71, w: 110, h: 38, radius: 6 }),
    txt(-332, 96, 'Topic C'),

    // ── Right branches ─────────────────────────────────────────────────────
    // Top-right
    s({ type: 'line', x1: 100, y1: -18, x2: 230, y2: -90, width: W1 }),
    s({ type: 'rect', x: 235, y: -107, w: 110, h: 38, radius: 6 }),
    txt(248, -82, 'Topic D'),

    // Mid-right
    s({ type: 'line', x1: 100, y1: 0, x2: 230, y2: 0, width: W1 }),
    s({ type: 'rect', x: 235, y: -19, w: 110, h: 38, radius: 6 }),
    txt(248, 6, 'Topic E'),

    // Bottom-right
    s({ type: 'line', x1: 100, y1: 18, x2: 230, y2: 90, width: W1 }),
    s({ type: 'rect', x: 235, y: 71, w: 110, h: 38, radius: 6 }),
    txt(248, 96, 'Topic F'),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
//  Registry
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagramTemplate {
  id:          string
  name:        string
  description: string
  create:      () => Shape[]
}

export const TEMPLATES: DiagramTemplate[] = [
  {
    id:          'flowchart',
    name:        'Flowchart',
    description: 'Start · steps · end with arrows',
    create:      makeFlowchart,
  },
  {
    id:          'mindmap',
    name:        'Mind Map',
    description: 'Central topic with 6 branches',
    create:      makeMindMap,
  },
]
