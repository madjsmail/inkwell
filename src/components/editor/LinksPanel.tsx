import { useState, useRef, useEffect } from 'react'
import { X, FileText, LayoutGrid, Search, Link2Off, ChevronRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { LinkedItem } from '../../types'

// ─── LinksPanel ───────────────────────────────────────────────────────────────

interface LinksPanelProps {
  noteId: string
  onClose: () => void
}

export function LinksPanel({ noteId, onClose }: LinksPanelProps) {
  const {
    notes,
    boards,
    addNoteLink,
    removeNoteLink,
    selectNote,
    setActiveView,
    setActiveBoardId,
  } = useAppStore()

  const note = notes.find(n => n.id === noteId)
  const linkedItems: LinkedItem[] = note?.linkedItems ?? []

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searching) searchRef.current?.focus()
  }, [searching])

  // ── Search results ─────────────────────────────────────────────────────────
  const q = query.toLowerCase().trim()

  const matchingNotes = q
    ? notes.filter(n =>
        n.id !== noteId &&
        !linkedItems.some(l => l.id === n.id && l.type === 'note') &&
        n.title.toLowerCase().includes(q)
      ).slice(0, 6)
    : []

  const matchingBoards = q
    ? boards.filter(b =>
        !linkedItems.some(l => l.id === b.id && l.type === 'board') &&
        b.name.toLowerCase().includes(q)
      ).slice(0, 4)
    : []

  const hasResults = matchingNotes.length > 0 || matchingBoards.length > 0

  // ── Linked item resolution ─────────────────────────────────────────────────
  const linkedNotes = linkedItems
    .filter(l => l.type === 'note')
    .map(l => notes.find(n => n.id === l.id))
    .filter(Boolean) as typeof notes

  const linkedBoards = linkedItems
    .filter(l => l.type === 'board')
    .map(l => boards.find(b => b.id === l.id))
    .filter(Boolean) as typeof boards

  const handleAddLink = (item: LinkedItem) => {
    addNoteLink(noteId, item)
    setQuery('')
    setSearching(false)
  }

  const handleOpenNote = (id: string) => {
    selectNote(id)
    setActiveView('notes')
  }

  const handleOpenBoard = (id: string) => {
    setActiveBoardId(id)
    setActiveView('board')
  }

  return (
    <div className="w-[260px] shrink-0 flex flex-col border-l border-border bg-panel overflow-hidden">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Link2Off className="w-3.5 h-3.5 text-accent" />
          Links
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          title="Close links panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">

        {/* ── Add link ──────────────────────────────────────────────────────── */}
        <div>
          {searching ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') { setSearching(false); setQuery('') }
                }}
                placeholder="Search notes and boards…"
                className="w-full text-xs bg-surface border border-border rounded-md pl-7 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          ) : (
            <button
              onClick={() => setSearching(true)}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-2 hover:text-accent hover:border-accent/50 transition-colors"
            >
              <Search className="w-3 h-3" />
              Add link…
            </button>
          )}

          {/* Search results */}
          {searching && q && (
            <div className="mt-2 bg-surface border border-border rounded-md overflow-hidden">
              {!hasResults && (
                <p className="text-xs text-muted-foreground px-3 py-2 italic">No results</p>
              )}
              {matchingNotes.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-tertiary px-3 py-1.5 border-b border-border/50">Notes</p>
                  {matchingNotes.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleAddLink({ type: 'note', id: n.id })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-active transition-colors text-left"
                    >
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{n.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {matchingBoards.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-tertiary px-3 py-1.5 border-b border-border/50">Boards</p>
                  {matchingBoards.map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleAddLink({ type: 'board', id: b.id })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-active transition-colors text-left"
                    >
                      <LayoutGrid className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{b.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Linked notes ──────────────────────────────────────────────────── */}
        {linkedNotes.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-tertiary mb-2">Notes</p>
            <div className="space-y-1">
              {linkedNotes.map(n => (
                <div
                  key={n.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface transition-colors"
                >
                  <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => handleOpenNote(n.id)}
                    className="flex-1 text-xs text-foreground text-left truncate hover:text-accent transition-colors"
                  >
                    {n.title}
                  </button>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleOpenNote(n.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Open note"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeNoteLink(noteId, n.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 transition-colors"
                      title="Remove link"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Linked boards ─────────────────────────────────────────────────── */}
        {linkedBoards.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-tertiary mb-2">Boards</p>
            <div className="space-y-1">
              {linkedBoards.map(b => (
                <div
                  key={b.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface transition-colors"
                >
                  <LayoutGrid className="w-3 h-3 text-muted-foreground shrink-0" />
                  <button
                    onClick={() => handleOpenBoard(b.id)}
                    className="flex-1 text-xs text-foreground text-left truncate hover:text-accent transition-colors"
                  >
                    {b.name}
                  </button>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleOpenBoard(b.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Open board"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeNoteLink(noteId, b.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 transition-colors"
                      title="Remove link"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {linkedItems.length === 0 && !searching && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Link2Off className="w-8 h-8 text-tertiary" />
            <p className="text-xs text-muted-foreground">No links yet.</p>
            <p className="text-[11px] text-tertiary">Connect this note to other notes or boards.</p>
          </div>
        )}
      </div>
    </div>
  )
}
