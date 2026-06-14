import { MarkdownEditor } from './MarkdownEditor'
import { RichPreview } from './RichPreview'
import { EditorToolbar } from './EditorToolbar'

interface SplitViewProps {
  noteId: string
  content: string
}

export function SplitView({ noteId, content }: SplitViewProps) {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Editor half — relative so the floating toolbar anchors here */}
      <div className="w-1/2 h-full border-r border-border overflow-hidden flex flex-col relative">
        <MarkdownEditor noteId={noteId} content={content} />
        <EditorToolbar />
      </div>
      {/* Preview half */}
      <div className="w-1/2 h-full overflow-hidden">
        <RichPreview content={content} noteId={noteId} />
      </div>
    </div>
  )
}
