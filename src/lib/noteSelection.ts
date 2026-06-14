import type { MouseEvent } from 'react'
import { useAppStore } from '../store/useAppStore'

export interface SelectNoteOptions {
  additive?: boolean
  range?: boolean
  orderedIds?: string[]
}

export function handleNoteSelect(
  e: MouseEvent,
  noteId: string,
  orderedIds: string[],
) {
  const store = useAppStore.getState()
  store.selectNote(noteId, {
    additive: e.metaKey || e.ctrlKey,
    range: e.shiftKey,
    orderedIds,
  })
  // Always return to notes view when a note is clicked
  if (store.activeView !== 'notes') {
    store.setActiveView('notes')
  }
}

export function isNoteSelected(noteId: string): boolean {
  return useAppStore.getState().selectedNoteIds.includes(noteId)
}

export function getPrimaryNoteId(): string | null {
  const { lastSelectedNoteId, selectedNoteIds } = useAppStore.getState()
  return lastSelectedNoteId ?? selectedNoteIds[0] ?? null
}
