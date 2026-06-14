import { createContext, useContext, useRef } from 'react'
import type { EditorView } from '@codemirror/view'

type ViewRef = React.MutableRefObject<EditorView | null>

const EditorViewContext = createContext<ViewRef | null>(null)

export function EditorViewProvider({ children }: { children: React.ReactNode }) {
  const viewRef = useRef<EditorView | null>(null)
  return <EditorViewContext.Provider value={viewRef}>{children}</EditorViewContext.Provider>
}

export function useEditorViewRef(): ViewRef {
  const ctx = useContext(EditorViewContext)
  if (!ctx) throw new Error('useEditorViewRef must be inside EditorViewProvider')
  return ctx
}
