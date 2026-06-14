import { useEffect, useState } from 'react'
import { X, Paperclip, ExternalLink, Trash2, ImageIcon, FileText, Film, File } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Attachment } from '../../types'
import {
  formatFileSize,
  pickAndCopyAttachment,
  openAttachment,
  deleteAttachmentFile,
} from '../../lib/attachments'
import { cn } from '../../lib/utils'

// ─── File-type icon (Lucide) ──────────────────────────────────────────────────

function AttachIcon({ type }: { type: Attachment['type'] }) {
  if (type === 'image') return <ImageIcon className="w-3.5 h-3.5 shrink-0" />
  if (type === 'video') return <Film className="w-3.5 h-3.5 shrink-0" />
  if (type === 'pdf') return <FileText className="w-3.5 h-3.5 shrink-0" />
  return <File className="w-3.5 h-3.5 shrink-0" />
}

// ─── Thumbnail for image attachments ─────────────────────────────────────────

function ImageThumb({ vaultPath, attachment }: { vaultPath: string; attachment: Attachment }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { convertFileSrc } = await import('@tauri-apps/api/core')
        const url = convertFileSrc(`${vaultPath}/${attachment.path}`)
        if (!cancelled) setSrc(url)
      } catch { /* no thumbnail */ }
    })()
    return () => { cancelled = true }
  }, [attachment.path, vaultPath])

  if (!src) return <ImageIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />

  return (
    <img
      src={src}
      alt={attachment.name}
      className="w-8 h-8 rounded object-cover shrink-0 border border-border/60"
    />
  )
}

// ─── Single row item ──────────────────────────────────────────────────────────

function MediaItem({
  attachment,
  vaultPath,
  noteId,
}: {
  attachment: Attachment
  vaultPath: string
  noteId: string
}) {
  const { removeAttachment } = useAppStore()
  const [hovered, setHovered] = useState(false)

  const handleOpen = () => openAttachment(vaultPath, attachment)
  const handleDelete = async () => {
    removeAttachment(noteId, attachment.id)
    await deleteAttachmentFile(vaultPath, attachment)
  }

  return (
    <div
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail / icon */}
      <div className="text-muted-foreground shrink-0">
        {attachment.type === 'image'
          ? <ImageThumb vaultPath={vaultPath} attachment={attachment} />
          : <AttachIcon type={attachment.type} />
        }
      </div>

      {/* Name + size */}
      <button
        onClick={handleOpen}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-xs text-foreground truncate leading-tight hover:text-accent transition-colors">
          {attachment.name}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(attachment.size)}</p>
      </button>

      {/* Actions */}
      <div className={cn(
        'flex items-center gap-0.5 shrink-0 transition-opacity',
        hovered ? 'opacity-100' : 'opacity-0',
      )}>
        <button
          onClick={handleOpen}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Open with system app"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
        <button
          onClick={handleDelete}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 transition-colors"
          title="Remove attachment"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-tertiary mb-1 mt-3 first:mt-0 px-2">
      {label}
    </p>
  )
}

// ─── MediaPanel ───────────────────────────────────────────────────────────────

interface MediaPanelProps {
  noteId: string
  onClose: () => void
}

export function MediaPanel({ noteId, onClose }: MediaPanelProps) {
  const { notes, vaultPath, addAttachment } = useAppStore()
  const note = notes.find(n => n.id === noteId)
  const attachments: Attachment[] = note?.attachments ?? []

  const [adding, setAdding] = useState(false)

  const images = attachments.filter(a => a.type === 'image')
  const videos = attachments.filter(a => a.type === 'video')
  const docs = attachments.filter(a => a.type === 'pdf' || a.type === 'other')

  const hasAny = attachments.length > 0

  async function handleAdd() {
    if (!vaultPath || adding) return
    setAdding(true)
    try {
      const att = await pickAndCopyAttachment(vaultPath)
      if (att) addAttachment(noteId, att)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="w-[260px] shrink-0 flex flex-col border-l border-border bg-panel overflow-hidden">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Paperclip className="w-3.5 h-3.5 text-accent" />
          Media
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          title="Close media panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add button */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <button
          onClick={handleAdd}
          disabled={adding}
          className={cn(
            'w-full flex items-center justify-center gap-2 text-xs',
            'border border-dashed border-border rounded-md px-3 py-2',
            'text-muted-foreground hover:text-accent hover:border-accent/50 transition-colors',
            adding && 'opacity-50 pointer-events-none',
          )}
        >
          <Paperclip className="w-3 h-3" />
          {adding ? 'Picking file…' : 'Add file or document'}
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {!hasAny && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Paperclip className="w-8 h-8 text-tertiary" />
            <p className="text-xs text-muted-foreground">No attachments yet.</p>
            <p className="text-[11px] text-tertiary">
              Add images, PDFs, or other files<br/>to keep them with this note.
            </p>
          </div>
        )}

        {images.length > 0 && (
          <div>
            <SectionLabel label="Images" />
            {images.map(a => (
              <MediaItem
                key={a.id}
                attachment={a}
                vaultPath={vaultPath ?? ''}
                noteId={noteId}
              />
            ))}
          </div>
        )}

        {videos.length > 0 && (
          <div>
            <SectionLabel label="Video" />
            {videos.map(a => (
              <MediaItem
                key={a.id}
                attachment={a}
                vaultPath={vaultPath ?? ''}
                noteId={noteId}
              />
            ))}
          </div>
        )}

        {docs.length > 0 && (
          <div>
            <SectionLabel label="Documents & Files" />
            {docs.map(a => (
              <MediaItem
                key={a.id}
                attachment={a}
                vaultPath={vaultPath ?? ''}
                noteId={noteId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
