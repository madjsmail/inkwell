# Canvas Feature Design — Inkwell Draw

## Overview

An Excalidraw-powered freehand drawing and diagramming canvas embedded directly in Inkwell. Off by default; opt-in via Settings → Features → Enable Canvas. When enabled, a **Draw** link appears in the Sidebar's Quick Access section (below Board). One canvas per vault, auto-saved to disk.

---

## Functional Requirements

- Toggle on/off in Settings (off by default)
- "Draw" entry in sidebar Quick Access, only visible when enabled
- Full Excalidraw canvas: shapes, arrows, text, freehand drawing, diagram mode
- Auto-saved to the vault on every change (debounced)
- Persists across sessions and vault switches
- Respects the active Inkwell theme (dark / light)
- Export to PNG/SVG via Excalidraw's native toolbar

---

## Architecture

### Library Choice: `@excalidraw/excalidraw`

| Option | Pros | Cons |
|---|---|---|
| `@excalidraw/excalidraw` | Exactly what user described; MIT; React-native; battle-tested; diagram library built-in | Larger bundle (~500 KB gzip) |
| `@tldraw/tldraw` | Cleaner React API; lighter | Less recognizable; fewer diagram presets |
| Custom (konva / fabric) | Full control | Months of work |

**Decision: `@excalidraw/excalidraw`** — it ships exactly the shapes/arrows/text the user wants out of the box with zero custom drawing code.

---

## Storage Model

```
{vaultPath}/
  .inkwell/
    canvas.excalidraw    ← JSON blob (ExcalidrawElement[] + AppState)
```

Format: the raw `{ elements, appState, files }` object Excalidraw provides in its `onChange` callback, serialized with `JSON.stringify`. No custom schema needed — Excalidraw can hydrate it directly.

Why `.inkwell/canvas.excalidraw` and not the vault root?
- Keeps the vault clean (hidden dot-folder, not visible in note list)
- Consistent with `.inkwell/active-vault` pattern already in place
- One canvas per vault is the right scope for v1

---

## Data Flow

```
CanvasView mounts
  → readFile(vaultPath/.inkwell/canvas.excalidraw)  [plugin-fs]
  → parse JSON → initialData prop to <Excalidraw>

User draws
  → Excalidraw onChange(elements, appState)
  → debounce 800ms
  → writeFile(vaultPath/.inkwell/canvas.excalidraw, JSON)  [plugin-fs]
```

Auto-save is fire-and-forget (no blocking UI). A subtle "Saved" flash can appear in the top bar.

---

## State Changes

### `src/types/index.ts`

```ts
// Add 'canvas' to ActiveView union
export type ActiveView = 'notes' | 'board' | 'trash' | 'canvas'
```

### `src/store/useAppStore.ts`

Add one boolean, persisted to localStorage (same pattern as `sidebarGlass`):

```ts
// State
canvasEnabled: boolean   // default: false

// Action
setCanvasEnabled: (enabled: boolean) => void
```

```ts
// Initial state
canvasEnabled: localStorage.getItem('inkwell-canvas-enabled') === 'true',

// Action
setCanvasEnabled: (enabled) => {
  localStorage.setItem('inkwell-canvas-enabled', String(enabled))
  set({ canvasEnabled: enabled })
  // If disabling and currently on canvas view, switch back to notes
  if (!enabled && get().activeView === 'canvas') set({ activeView: 'notes' })
},
```

---

## Component Tree

```
AppShell
  ├── Sidebar             ← adds "Draw" row to Quick Access (gated)
  ├── EditorPane          ← unchanged
  ├── BoardView           ← unchanged
  └── CanvasView (new)    ← shown when activeView === 'canvas'
        └── <Excalidraw>  ← @excalidraw/excalidraw
```

### `src/components/canvas/CanvasView.tsx`

```tsx
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'

export function CanvasView() {
  const { vaultPath } = useAppStore()
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load on mount
  useEffect(() => {
    if (!vaultPath) return
    const path = `${vaultPath}/.inkwell/canvas.excalidraw`
    readFile(path)
      .then(bytes => {
        const json = JSON.parse(new TextDecoder().decode(bytes))
        setInitialData(json)
      })
      .catch(() => setInitialData({ elements: [], appState: {} }))  // first launch
  }, [vaultPath])

  // Debounced save
  const handleChange = (elements, appState) => {
    if (!vaultPath) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const path = `${vaultPath}/.inkwell/canvas.excalidraw`
      const json = JSON.stringify({ elements, appState })
      await writeTextFile(path, json)
    }, 800)
  }

  if (!initialData) return <LoadingState />

  return (
    <div className="flex-1 h-full">
      <Excalidraw
        initialData={initialData}
        onChange={handleChange}
        theme={/* read from inkwell theme */}
        UIOptions={{ canvasActions: { export: true, saveToActiveFile: false } }}
      />
    </div>
  )
}
```

### Sidebar Change (minimal)

In the "Quick Access" section, add after the Board row:

```tsx
const { canvasEnabled } = useAppStore()

{canvasEnabled && (
  <div
    className={cn(treeRowClass, 'px-2 cursor-pointer hover:bg-surface', activeView === 'canvas' && 'bg-active')}
    onClick={() => setActiveView('canvas')}
  >
    <PenSquare className={cn('w-3.5 h-3.5', activeView === 'canvas' ? 'text-accent' : 'text-muted-foreground')} />
    <span className={cn(activeView === 'canvas' ? 'text-accent font-medium' : 'text-foreground')}>
      Draw
    </span>
  </div>
)}
```

### Settings Change

In `SettingsDialog.tsx`, add a **Features** section (new tab or existing section):

```tsx
<div className="flex items-center justify-between">
  <div>
    <p className="text-sm font-medium text-foreground">Canvas</p>
    <p className="text-xs text-muted-foreground mt-0.5">Freehand drawing and diagrams</p>
  </div>
  <Switch
    checked={canvasEnabled}
    onCheckedChange={setCanvasEnabled}
  />
</div>
```

### AppShell routing

```tsx
// Alongside the existing board/trash routing
{activeView === 'canvas' && <CanvasView />}
```

---

## Theme Integration

Excalidraw accepts `theme="light" | "dark"`. Map from Inkwell's theme:

```ts
const excalidrawTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
```

Or watch the `resolvedTheme` from the store. When Inkwell theme switches, pass the updated prop — Excalidraw re-renders without losing canvas state.

---

## Tauri Permissions

The `.inkwell/` folder already exists (used for `active-vault` file). `writeFile` and `readFile` via `@tauri-apps/plugin-fs` already have `home-dir` scope. No new Tauri capability changes needed as long as `canvas.excalidraw` is inside the vault path, which is already allowed.

---

## Implementation Task Breakdown

| # | Task | File |
|---|------|------|
| 1 | Add `'canvas'` to `ActiveView` type | `src/types/index.ts` |
| 2 | Add `canvasEnabled` state + `setCanvasEnabled` action to store | `src/store/useAppStore.ts` |
| 3 | Install `@excalidraw/excalidraw` | `package.json` |
| 4 | Build `CanvasView` component (load/render/save) | `src/components/canvas/CanvasView.tsx` |
| 5 | Wire `CanvasView` into `AppShell` | `src/components/layout/AppShell.tsx` |
| 6 | Add "Draw" sidebar row gated by `canvasEnabled` | `src/components/layout/Sidebar.tsx` |
| 7 | Add Canvas toggle to `SettingsDialog` | `src/components/settings/SettingsDialog.tsx` |

Total: ~7 focused changes. No new Tauri Rust code, no new file types, no migration needed.

---

## Trade-offs

**Bundle size**: `@excalidraw/excalidraw` adds ~1.5 MB to the production bundle (uncompressed). Acceptable for a desktop app where network download is a one-time thing. Could lazy-load the component to avoid paying cost until the user enables the feature.

**Single canvas**: v1 is one canvas per vault. The natural v2 is a named list of canvases (like notes), stored in `{vaultPath}/.inkwell/drawings/{id}.excalidraw`. Punting for now keeps the sidebar simple and avoids designing a drawing-list UI.

**No MCP integration**: Drawings are binary-ish (JSON arrays of shapes) — not useful to expose to the MCP server. Intentionally excluded.

**Export**: Excalidraw's built-in toolbar handles PNG/SVG export. No custom export code needed.
