import { useState, useMemo } from 'react'
import { ScrollSync, ScrollSyncPane } from 'react-scroll-sync'
import { MarkdownEditor } from './MarkdownEditor'
import { RichPreview } from './RichPreview'
import { EditorToolbar } from './EditorToolbar'

interface SplitViewProps {
  noteId: string
  content: string
}

export function SplitView({ noteId, content }: SplitViewProps) {
  const [editorScroller, setEditorScroller] = useState<HTMLElement | null>(null)
  const [previewScroller, setPreviewScroller] = useState<HTMLElement | null>(null)
  const editorScrollerRef = useMemo(() => ({ current: editorScroller }), [editorScroller])
  const previewScrollerRef = useMemo(() => ({ current: previewScroller }), [previewScroller])

  return (
    <ScrollSync>
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Editor half — relative so the floating toolbar anchors here */}
        <div className="w-1/2 h-full border-r border-border overflow-hidden flex flex-col relative">
          <MarkdownEditor noteId={noteId} content={content} onScrollerReady={setEditorScroller} />
          <EditorToolbar />
        </div>
        {/* Preview half */}
        <div className="w-1/2 h-full overflow-hidden">
          <RichPreview content={content} noteId={noteId} onScrollerReady={setPreviewScroller} />
        </div>
        {/* Register scrollable elements with ScrollSync (attached via ref, render nothing) */}
        <ScrollSyncPane attachTo={editorScrollerRef as React.RefObject<HTMLElement>}><></></ScrollSyncPane>
        <ScrollSyncPane attachTo={previewScrollerRef as React.RefObject<HTMLElement>}><></></ScrollSyncPane>
      </div>
    </ScrollSync>
  )
}
