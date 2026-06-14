import { FileText } from 'lucide-react'
import { formatFileSize } from '../../lib/utils'
import type { Attachment } from '../../types'

interface AttachmentChipProps {
  attachment: Attachment
}

export function AttachmentChip({ attachment }: AttachmentChipProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface border border-border text-sm">
      <FileText className="w-4 h-4 text-accent" />
      <span className="text-foreground font-medium">{attachment.name}</span>
      <span className="text-muted-foreground text-xs ml-1">{formatFileSize(attachment.size)}</span>
    </div>
  )
}
