import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Paperclip, ExternalLink, Trash2, Plus } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Attachment } from '../../types'
import {
  formatFileSize,
  fileIcon,
  pickAndCopyAttachment,
  openAttachment,
  deleteAttachmentFile,
} from '../../lib/attachments'
import { cn } from '../../lib/utils'

interface AttachmentsBarProps {
  noteId: string
}

// ─── Single attachment card ───────────────────────────────────────────────────

function AttachmentCard({
  attachment,
  vaultPath,
  noteId,
}: {
  attachment: Attachment
  vaultPath: string
  noteId: string
}) {
  const { removeAttachment } = useAppStore()
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)

  const ext = attachment.name.split('.').pop()?.toLowerCase() ?? ''

  // Load image preview URL asynchronously using Tauri's convertFileSrc
  useEffect(() => {
    if (attachment.type !== 'image') return
    let cancelled = false
    ;(async () => {
      try {
        const { convertFileSrc } = await import('@tauri-apps/api/core')
        const url = convertFileSrc(`${vaultPath}/${attachment.path}`)
        if (!cancelled) setImgSrc(url)
      } catch {
        // fall back to no thumbnail
      }
    })()
    return () => { cancelled = true }
  }, [attachment.path, vaultPath])

  const handleOpen = () => openAttachment(vaultPath, attachment)
  const handleDelete = async () => {
    removeAttachment(noteId, attachment.id)
    await deleteAttachmentFile(vaultPath, attachment)
  }

  return (
    <div
      className={cn(
        'relative shrink-0 w-[120px] rounded-lg border border-border overflow-hidden',
        'bg-surface cursor-pointer transition-all duration-150',
        hovered && 'border-accent/40 shadow-md'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleOpen}
    >
      {/* Preview area */}
      <div className="h-[72px] flex items-center justify-center bg-surface/80 overflow-hidden">
        {attachment.type === 'image' && imgSrc ? (
          <img
            src={imgSrc}
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-2xl select-none" title={attachment.type}>
            {fileIcon(attachment.type, ext)}
          </span>
        )}
      </div>

      {/* File info */}
      <div className="px-2 py-1.5 border-t border-border/60">
        <p className="text-[11px] text-foreground font-medium truncate leading-tight">{attachment.name}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{formatFileSize(attachment.size)}</p>
      </div>

      {/* Hover action bar */}
      {hovered && (
        <div
          className="absolute top-1.5 right-1.5 flex gap-1"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleOpen}
            className="w-5 h-5 flex items-center justify-center rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
            title="Open"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={handleDelete}
            className="w-5 h-5 flex items-center justify-center rounded bg-black/50 text-white hover:bg-red-500/80 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── AttachmentsBar ───────────────────────────────────────────────────────────

export function AttachmentsBar({ noteId }: AttachmentsBarProps) {
  const { notes, vaultPath, addAttachment } = useAppStore()
  const note = notes.find(n => n.id === noteId)
  const attachments: Attachment[] = note?.attachments ?? []

  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  // Auto-open when the first attachment is added
  useEffect(() => {
    if (attachments.length > 0) setOpen(true)
  }, [attachments.length === 0])

  if (attachments.length === 0 && !open) {
    // Show a minimal "Add attachment" prompt only on hover
    return (
      <button
        onClick={handleAdd}
        className={cn(
          'w-full flex items-center gap-1.5 px-4 py-1',
          'text-[11px] text-tertiary hover:text-muted-foreground',
          'border-b border-transparent hover:border-border',
          'transition-colors duration-150',
        )}
      >
        <Paperclip className="w-3 h-3" />
        <span>Add attachment…</span>
      </button>
    )
  }

  async function handleAdd() {
    if (!vaultPath || adding) return
    setAdding(true)
    try {
      const att = await pickAndCopyAttachment(vaultPath)
      if (att) {
        addAttachment(noteId, att)
        setOpen(true)
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="shrink-0 border-b border-border">
      {/* Header row */}
      <button
        className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-surface/60 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {open
          ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        }
        <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="text-[11px] text-muted-foreground flex-1 text-left">
          {attachments.length} {attachments.length === 1 ? 'attachment' : 'attachments'}
        </span>
        {/* Add button */}
        <span
          role="button"
          tabIndex={0}
          onClick={e => { e.stopPropagation(); handleAdd() }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className={cn(
            'flex items-center gap-1 text-[11px] px-2 py-0.5 rounded',
            'text-muted-foreground hover:text-foreground hover:bg-active transition-colors',
            adding && 'opacity-50 pointer-events-none',
          )}
          title="Add attachment"
        >
          <Plus className="w-3 h-3" />
          {adding ? 'Adding…' : 'Add'}
        </span>
      </button>

      {/* Expanded card strip */}
      {open && (
        <div className="px-4 pb-3 pt-1 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {attachments.map(att => (
              <AttachmentCard
                key={att.id}
                attachment={att}
                vaultPath={vaultPath ?? ''}
                noteId={noteId}
              />
            ))}
            {/* Ghost "add" card */}
            <button
              onClick={handleAdd}
              disabled={adding}
              className={cn(
                'shrink-0 w-[120px] h-[104px] rounded-lg border border-dashed border-border',
                'flex flex-col items-center justify-center gap-1.5',
                'text-muted-foreground hover:text-accent hover:border-accent/50',
                'transition-colors cursor-pointer',
                adding && 'opacity-50 pointer-events-none',
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="text-[11px]">{adding ? 'Adding…' : 'Add file'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
