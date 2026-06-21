import { useRef, useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Share2,
  X,
  FileText,
  Code2,
  Printer,
  Copy,
  Check,
  Download,
  Loader2,
} from 'lucide-react'
import { RichPreview, PreloadContext } from './RichPreview'
import { cn, uint8ToBase64 } from '../../lib/utils'
import {
  captureThemeVars,
  buildHtmlDocument,
  saveAsFile,
  printAsHtml,
} from '../../lib/export'
import type { Note } from '../../types'

// ─── Format options ───────────────────────────────────────────────────────────

type Format = 'markdown' | 'html' | 'pdf'

const FORMATS: Array<{
  id: Format
  label: string
  ext: string
  Icon: React.ComponentType<{ className?: string }>
  tagline: string
  tip: string
}> = [
  {
    id: 'markdown',
    label: 'Markdown',
    ext: 'md',
    Icon: FileText,
    tagline: 'Plain text',
    tip: 'Raw .md file. Opens in Obsidian, Bear, Notion, and any text editor.',
  },
  {
    id: 'html',
    label: 'HTML',
    ext: 'html',
    Icon: Code2,
    tagline: 'Web page',
    tip: 'Self-contained .html file with embedded styles. Share by email or open in any browser.',
  },
  {
    id: 'pdf',
    label: 'PDF',
    ext: 'pdf',
    Icon: Printer,
    tagline: 'Print-ready',
    tip: 'Opens the system print dialog. Choose "Save as PDF" to export a PDF file.',
  },
]

// ─── Asset preloading ─────────────────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  avif: 'image/avif', bmp: 'image/bmp',
  pdf: 'application/pdf',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
}

function mimeFor(ext: string): string {
  return MIME_MAP[ext.toLowerCase()] ?? 'application/octet-stream'
}

/**
 * Parse all local file references from note content:
 *   ![[relative/path.ext]]  — file embeds
 *   ![alt](relative/path.ext) — markdown images (not http/https)
 * Returns an array of relative paths (deduped).
 */
function parseLocalPaths(content: string): string[] {
  const paths = new Set<string>()
  // Obsidian-style embeds: ![[path]]
  for (const m of content.matchAll(/!\[\[([^\]]+)]]/g)) {
    const p = m[1].trim()
    if (p) paths.add(p)
  }
  // Standard markdown images: ![alt](path) — skip http/https/data URLs
  for (const m of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    const p = m[1].trim()
    if (p && !p.startsWith('http') && !p.startsWith('data:')) paths.add(p)
  }
  return [...paths]
}

/**
 * Read all local media files referenced in the note and return a Map of
 * { absolutePath → data:mime;base64,... }. Skips unsupported or missing files.
 */
async function preloadAssets(
  content: string,
  vaultPath: string | undefined,
): Promise<Map<string, string>> {
  const cache = new Map<string, string>()
  if (!vaultPath) return cache

  const { readFile } = await import('@tauri-apps/plugin-fs')
  const relativePaths = parseLocalPaths(content)

  await Promise.all(
    relativePaths.map(async (rel) => {
      try {
        const absPath = `${vaultPath}/${rel}`
        const ext = rel.split('.').pop()?.toLowerCase() ?? ''
        const mime = mimeFor(ext)
        // Skip unsupported or non-media types
        if (!mime.startsWith('image/') && !mime.startsWith('video/') && mime !== 'application/pdf') return
        const bytes = await readFile(absPath)
        const b64 = uint8ToBase64(new Uint8Array(bytes))
        cache.set(absPath, `data:${mime};base64,${b64}`)
      } catch {
        // Missing file — leave it out; component will show a fallback
      }
    })
  )

  return cache
}

// ─── ShareDialog ──────────────────────────────────────────────────────────────

interface ShareDialogProps {
  note: Note
  vaultPath?: string
}

export function ShareDialog({ note, vaultPath }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<Format>('markdown')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  // Preloaded base64 data for all local assets in this note
  const [preloadCache, setPreloadCache] = useState<ReadonlyMap<string, string>>(new Map())
  const [preparingExport, setPreparingExport] = useState(false)

  // Points to the RichPreview wrapper — its innerHTML is captured for HTML/PDF export
  const innerRef = useRef<HTMLDivElement>(null)

  const slug =
    note.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'note'

  // When the dialog opens and format requires a rendered preview, preload all assets
  useEffect(() => {
    if (!open || format === 'markdown') return
    let cancelled = false
    setPreparingExport(true)
    preloadAssets(note.content, vaultPath)
      .then(cache => {
        if (!cancelled) {
          setPreloadCache(cache)
          setPreparingExport(false)
        }
      })
      .catch(() => {
        if (!cancelled) setPreparingExport(false)
      })
    return () => { cancelled = true }
  }, [open, format, note.content, vaultPath])

  const captureHtml = (): string => {
    const container = innerRef.current
    if (!container) return ''
    return container.innerHTML
  }

  const getMarkdown = () => note.content

  const handleCopy = async () => {
    const text = format === 'markdown'
      ? getMarkdown()
      : buildHtmlDocument(note.title, captureHtml(), captureThemeVars())
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fmt = FORMATS.find(f => f.id === format)!
      const content = format === 'markdown'
        ? getMarkdown()
        : buildHtmlDocument(note.title, captureHtml(), captureThemeVars())
      await saveAsFile(content, `${slug}.${fmt.ext}`, fmt.ext)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = async () => {
    const html = buildHtmlDocument(note.title, captureHtml(), captureThemeVars())
    printAsHtml(html)
  }

  const current = FORMATS.find(f => f.id === format)!
  const exportBusy = saving || preparingExport

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Share note (export)"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[820px] h-[560px] flex flex-col',
            'bg-background border border-border rounded-xl shadow-2xl overflow-hidden',
          )}
          aria-describedby={undefined}
        >
          {/* ── Header ── */}
          <div className="h-11 shrink-0 flex items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Share2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Dialog.Title className="text-sm font-medium text-foreground">Share</Dialog.Title>
              <span className="text-sm text-muted-foreground truncate">
                "{note.title}"
              </span>
            </div>
            <Dialog.Close asChild>
              <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-1 min-h-0">
            {/* Left: format selector */}
            <div className="w-[196px] shrink-0 border-r border-border flex flex-col p-3 gap-0.5">
              <p className="text-[10px] font-medium text-tertiary uppercase tracking-wider px-2 mb-2 mt-1">
                Export as
              </p>

              {FORMATS.map(({ id, label, tagline, Icon }) => {
                const active = format === id
                return (
                  <button
                    key={id}
                    onClick={() => setFormat(id)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left w-full transition-colors',
                      active
                        ? 'bg-active text-foreground'
                        : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', active && 'text-accent')} />
                    <div>
                      <p className={cn('text-xs font-medium leading-none', active ? 'text-foreground' : '')}>{label}</p>
                      <p className="text-[10px] text-tertiary mt-1">{tagline}</p>
                    </div>
                  </button>
                )
              })}

              {/* Format tip */}
              <div className="mt-auto pt-3 border-t border-border">
                <p className="text-[10px] text-tertiary leading-relaxed px-1">
                  {current.tip}
                </p>
              </div>
            </div>

            {/* Right: preview */}
            <div className="flex-1 min-w-0 overflow-hidden bg-background/50 relative">
              {format === 'markdown' ? (
                /* Raw markdown code view */
                <div className="absolute inset-0 overflow-auto p-6">
                  <pre className="text-[12.5px] font-mono text-foreground/75 leading-relaxed whitespace-pre-wrap break-words">
                    {note.content}
                  </pre>
                </div>
              ) : (
                /* Rendered preview (used for both HTML + PDF exports).
                   forExport=true auto-expands all embeds and encodes media as
                   base64 so the saved file is fully self-contained.
                   PreloadContext provides synchronously-available base64 data
                   so components don't need async effects during capture. */
                <div ref={innerRef} className="absolute inset-0 overflow-auto">
                  <PreloadContext.Provider value={preloadCache}>
                    <RichPreview content={note.content} forExport />
                  </PreloadContext.Provider>
                </div>
              )}

              {/* Format badge */}
              <div className="absolute top-3 right-3 pointer-events-none">
                <span className="text-[10px] font-medium text-tertiary bg-surface/80 backdrop-blur-sm border border-border/50 rounded px-2 py-1">
                  {preparingExport ? 'Loading media…' : `${current.label} preview`}
                </span>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="h-13 shrink-0 border-t border-border flex items-center justify-between px-4 py-3">
            <span className="text-xs text-tertiary">
              {note.wordCount.toLocaleString()} words
              <span className="mx-1.5 opacity-50">·</span>
              {note.content.length.toLocaleString()} characters
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={exportBusy}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors border',
                  copied
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-surface border-border text-muted-foreground hover:text-foreground hover:bg-active',
                  exportBusy && 'opacity-50 cursor-not-allowed',
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : format === 'pdf' ? 'Copy HTML' : 'Copy'}
              </button>

              {format === 'pdf' ? (
                <button
                  onClick={handlePrint}
                  disabled={exportBusy}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-accent text-accent-foreground transition-opacity',
                    exportBusy ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90',
                  )}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print…
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={exportBusy}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-opacity',
                    'bg-accent text-accent-foreground',
                    exportBusy ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90',
                  )}
                >
                  {preparingExport
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />
                  }
                  {preparingExport ? 'Loading…' : saving ? 'Saving…' : `Save as .${current.ext}`}
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
