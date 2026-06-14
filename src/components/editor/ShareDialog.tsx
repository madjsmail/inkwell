import { useRef, useState, useCallback } from 'react'
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
} from 'lucide-react'
import { RichPreview } from './RichPreview'
import { cn } from '../../lib/utils'
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

// ─── ShareDialog ──────────────────────────────────────────────────────────────

interface ShareDialogProps {
  note: Note
}

export function ShareDialog({ note }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<Format>('markdown')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  // Points to the RichPreview wrapper — its innerHTML is captured for HTML/PDF export
  const innerRef = useRef<HTMLDivElement>(null)

  const getContent = useCallback((): string => {
    if (format === 'markdown') return note.content
    const inner = innerRef.current?.innerHTML ?? ''
    return buildHtmlDocument(note.title, inner, captureThemeVars())
  }, [format, note.content, note.title])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getContent())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    const fmt = FORMATS.find(f => f.id === format)!
    const slug =
      note.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'note'
    await saveAsFile(getContent(), `${slug}.${fmt.ext}`, fmt.ext)
    setSaving(false)
  }

  const handlePrint = () => {
    printAsHtml(getContent())
  }

  const current = FORMATS.find(f => f.id === format)!

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
                /* Rendered preview (used for both HTML + PDF exports) */
                <div ref={innerRef} className="absolute inset-0 overflow-auto">
                  <RichPreview content={note.content} />
                </div>
              )}

              {/* Format badge */}
              <div className="absolute top-3 right-3 pointer-events-none">
                <span className="text-[10px] font-medium text-tertiary bg-surface/80 backdrop-blur-sm border border-border/50 rounded px-2 py-1">
                  {current.label} preview
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
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors border',
                  copied
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-surface border-border text-muted-foreground hover:text-foreground hover:bg-active',
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : format === 'pdf' ? 'Copy HTML' : 'Copy'}
              </button>

              {format === 'pdf' ? (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print…
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-opacity',
                    'bg-accent text-accent-foreground',
                    saving ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90',
                  )}
                >
                  <Download className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : `Save as .${current.ext}`}
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
