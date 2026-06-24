import type { Shape } from './canvasTypes'
import { uid } from './canvasTypes'

const C  = '#f8fafc'                        // near-white — matches canvas DEFAULT_COLOR
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
// ─────────────────────────────────────────────────────────────────────────────

function makeFlowchart(): Shape[] {
  return [
    s({ type: 'ellipse', cx: 0, cy: 0, rx: 80, ry: 30, width: W2 }),
    txt(-20, 6, 'Start', true),

    s({ type: 'arrow', x1: 0, y1: 32, x2: 0, y2: 78, width: W1 }),

    s({ type: 'rect', x: -90, y: 80, w: 180, h: 56, radius: 6 }),
    txt(-28, 114, 'Step 1'),

    s({ type: 'arrow', x1: 0, y1: 138, x2: 0, y2: 182, width: W1 }),

    s({ type: 'rect', x: -90, y: 184, w: 180, h: 56, radius: 6 }),
    txt(-28, 218, 'Step 2'),

    s({ type: 'arrow', x1: 0, y1: 242, x2: 0, y2: 286, width: W1 }),

    s({ type: 'ellipse', cx: 0, cy: 316, rx: 80, ry: 30, width: W2 }),
    txt(-14, 322, 'End', true),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
//  MIND MAP
// ─────────────────────────────────────────────────────────────────────────────

function makeMindMap(): Shape[] {
  return [
    s({ type: 'rect', x: -100, y: -35, w: 200, h: 70, radius: 10, width: 2.5 }),
    txt(-55, 4, 'Main Topic', true),

    // Left branches
    s({ type: 'line', x1: -100, y1: -18, x2: -230, y2: -90, width: W1 }),
    s({ type: 'rect', x: -345, y: -107, w: 110, h: 38, radius: 6 }),
    txt(-332, -82, 'Topic A'),

    s({ type: 'line', x1: -100, y1: 0, x2: -230, y2: 0, width: W1 }),
    s({ type: 'rect', x: -345, y: -19, w: 110, h: 38, radius: 6 }),
    txt(-332, 6, 'Topic B'),

    s({ type: 'line', x1: -100, y1: 18, x2: -230, y2: 90, width: W1 }),
    s({ type: 'rect', x: -345, y: 71, w: 110, h: 38, radius: 6 }),
    txt(-332, 96, 'Topic C'),

    // Right branches
    s({ type: 'line', x1: 100, y1: -18, x2: 230, y2: -90, width: W1 }),
    s({ type: 'rect', x: 235, y: -107, w: 110, h: 38, radius: 6 }),
    txt(248, -82, 'Topic D'),

    s({ type: 'line', x1: 100, y1: 0, x2: 230, y2: 0, width: W1 }),
    s({ type: 'rect', x: 235, y: -19, w: 110, h: 38, radius: 6 }),
    txt(248, 6, 'Topic E'),

    s({ type: 'line', x1: 100, y1: 18, x2: 230, y2: 90, width: W1 }),
    s({ type: 'rect', x: 235, y: 71, w: 110, h: 38, radius: 6 }),
    txt(248, 96, 'Topic F'),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
//  ORG CHART
// ─────────────────────────────────────────────────────────────────────────────

function makeOrgChart(): Shape[] {
  return [
    // CEO
    s({ type: 'rect', x: -85, y: -160, w: 170, h: 50, radius: 8 }),
    txt(-15, -128, 'CEO', true),

    // CEO → horizontal branch
    s({ type: 'line', x1: 0,    y1: -110, x2: 0,    y2: -80, width: W1 }),
    s({ type: 'line', x1: -150, y1:  -80, x2: 150,  y2: -80, width: W1 }),
    s({ type: 'line', x1: -150, y1:  -80, x2: -150, y2: -56, width: W1 }),
    s({ type: 'line', x1:  150, y1:  -80, x2:  150, y2: -56, width: W1 }),

    // Manager A
    s({ type: 'rect', x: -235, y: -56, w: 170, h: 50, radius: 6, width: W1 }),
    txt(-196, -24, 'Manager A'),

    // Manager B
    s({ type: 'rect', x: 65, y: -56, w: 170, h: 50, radius: 6, width: W1 }),
    txt(104, -24, 'Manager B'),

    // Manager A → reports branch
    s({ type: 'line', x1: -150, y1: -6,  x2: -150, y2: 24,  width: W1 }),
    s({ type: 'line', x1: -215, y1:  24, x2:  -85, y2: 24,  width: W1 }),
    s({ type: 'line', x1: -215, y1:  24, x2: -215, y2: 44,  width: W1 }),
    s({ type: 'line', x1:  -85, y1:  24, x2:  -85, y2: 44,  width: W1 }),

    // Report 1
    s({ type: 'rect', x: -275, y: 44, w: 120, h: 44, radius: 6, width: W1 }),
    txt(-256, 72, 'Report 1'),

    // Report 2
    s({ type: 'rect', x: -145, y: 44, w: 120, h: 44, radius: 6, width: W1 }),
    txt(-126, 72, 'Report 2'),

    // Manager B → single report
    s({ type: 'line', x1: 150, y1: -6, x2: 150, y2: 44, width: W1 }),
    s({ type: 'rect', x: 90, y: 44, w: 120, h: 44, radius: 6, width: W1 }),
    txt(109, 72, 'Report 3'),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEQUENCE DIAGRAM
// ─────────────────────────────────────────────────────────────────────────────

function makeSequence(): Shape[] {
  return [
    // Actor boxes
    s({ type: 'rect', x: -280, y: -140, w: 140, h: 48, radius: 6 }),
    txt(-244, -108, 'Actor A', true),
    s({ type: 'rect', x: 140, y: -140, w: 140, h: 48, radius: 6 }),
    txt(176, -108, 'Actor B', true),

    // Lifelines
    s({ type: 'line', x1: -210, y1: -92, x2: -210, y2: 200, width: 1 }),
    s({ type: 'line', x1:  210, y1: -92, x2:  210, y2: 200, width: 1 }),

    // Message 1: A → B
    s({ type: 'arrow', x1: -210, y1: -36, x2: 210, y2: -36, width: W1 }),
    txt(-26, -46, 'Request'),

    // Message 2: B → A
    s({ type: 'arrow', x1: 210, y1: 44, x2: -210, y2: 44, width: W1 }),
    txt(-32, 34, 'Response'),

    // Message 3: A → B
    s({ type: 'arrow', x1: -210, y1: 124, x2: 210, y2: 124, width: W1 }),
    txt(-27, 114, 'Callback'),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
//  TIMELINE
// ─────────────────────────────────────────────────────────────────────────────

function makeTimeline(): Shape[] {
  const milestones: { x: number; label: string; sub: string }[] = [
    { x: -270, label: 'Phase 1', sub: 'Q1 2025' },
    { x:  -90, label: 'Phase 2', sub: 'Q2 2025' },
    { x:   90, label: 'Phase 3', sub: 'Q3 2025' },
    { x:  270, label: 'Phase 4', sub: 'Q4 2025' },
  ]

  const shapes: Shape[] = [
    s({ type: 'arrow', x1: -340, y1: 0, x2: 350, y2: 0, width: W2 }),
  ]

  milestones.forEach(({ x, label, sub }, i) => {
    const above = i % 2 === 0
    shapes.push(s({ type: 'line', x1: x, y1: -14, x2: x, y2: 14, width: W1 }))
    shapes.push(s({ type: 'line', x1: x, y1: above ? -14 : 14, x2: x, y2: above ? -52 : 52, width: W1 }))
    shapes.push(txt(x - 25, above ? -60 : 72, label, true))
    shapes.push(txt(x - 28, above ? -80 : 92, sub))
  })

  return shapes
}

// ─────────────────────────────────────────────────────────────────────────────
//  VENN DIAGRAM
// ─────────────────────────────────────────────────────────────────────────────

function makeVenn(): Shape[] {
  return [
    s({ type: 'ellipse', cx: -75, cy: 0, rx: 175, ry: 130, width: W2 }),
    s({ type: 'ellipse', cx:  75, cy: 0, rx: 175, ry: 130, width: W2 }),
    txt(-196, 6, 'Set A', true),
    txt( 148, 6, 'Set B', true),
    txt( -16, 6, 'Both'),
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
  { id: 'flowchart', name: 'Flowchart',       description: 'Start · steps · end with arrows',      create: makeFlowchart },
  { id: 'mindmap',   name: 'Mind Map',         description: 'Central topic with 6 branches',        create: makeMindMap   },
  { id: 'orgchart',  name: 'Org Chart',        description: '3-level hierarchy with reports',       create: makeOrgChart  },
  { id: 'sequence',  name: 'Sequence',         description: '2 actors with request / response',     create: makeSequence  },
  { id: 'timeline',  name: 'Timeline',         description: '4 milestones on a horizontal axis',    create: makeTimeline  },
  { id: 'venn',      name: 'Venn Diagram',     description: '2 overlapping sets with labels',       create: makeVenn      },
]
