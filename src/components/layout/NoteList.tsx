import { Star, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { TagChip } from '../shared/TagChip'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'
import { useState } from 'react'
import { confirmDeleteNote, confirmDeleteNotes } from '../../lib/deleteActions'
import { handleNoteSelect } from '../../lib/noteSelection'

export function NoteList() {
  const {
    notes,
    folders,
    selectedNoteIds,
    selectedFolderId,
    pinNote,
    moveNotes,
    sidebarOpen,
  } = useAppStore()
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date')
  const [showPinned, setShowPinned] = useState(false)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  const folder = selectedFolderId
    ? (function findFolder(fs: typeof folders): typeof folders[0] | null {
        for (const f of fs) {
          if (f.id === selectedFolderId) return f
          const found = findFolder(f.children)
          if (found) return found
        }
        return null
      })(folders)
    : null

  let displayNotes = folder
    ? folder.notes
    : notes.filter(n => n.folder === null)
  if (showPinned) displayNotes = displayNotes.filter(n => n.pinned)
  displayNotes = [...displayNotes].sort((a, b) =>
    sortBy === 'date'
      ? b.updatedAt.getTime() - a.updatedAt.getTime()
      : a.title.localeCompare(b.title)
  )

  const orderedIds = displayNotes.map(n => n.id)

  const handleDeleteClick = (noteId: string, noteTitle: string) => {
    const { selectedNoteIds: ids, notes: allNotes } = useAppStore.getState()
    if (ids.includes(noteId) && ids.length > 1) {
      const selected = allNotes.filter(n => ids.includes(n.id))
      confirmDeleteNotes(selected.map(n => ({ id: n.id, title: n.title })))
    } else {
      confirmDeleteNote(noteId, noteTitle)
    }
  }

  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-background border-r border-border h-full overflow-hidden">
      {/* Spacer for macOS traffic lights when sidebar is hidden */}
      {!sidebarOpen && (
        <div className="h-8 shrink-0" data-tauri-drag-region />
      )}
      <div
        className={cn(
          'h-10 flex items-center justify-between px-3 border-b border-border shrink-0 transition-colors',
          dragOverFolderId === (selectedFolderId ?? '__root__') && 'bg-accent/10 ring-inset ring-1 ring-accent'
        )}
        onDragOver={e => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setDragOverFolderId(selectedFolderId ?? '__root__')
        }}
        onDragLeave={() => setDragOverFolderId(null)}
        onDrop={e => {
          e.preventDefault()
          setDragOverFolderId(null)
          const noteId = e.dataTransfer.getData('text/note-id')
          const bulkIds = e.dataTransfer.getData('text/note-ids')
          if (!noteId) return
          const ids = bulkIds ? JSON.parse(bulkIds) as string[] : [noteId]
          moveNotes(ids, selectedFolderId)
        }}
      >
        <span className="text-sm font-semibold text-foreground truncate">
          {selectedNoteIds.length > 1
            ? `${selectedNoteIds.length} selected`
            : (folder?.name ?? 'Unfiled')}
        </span>
        <div className="flex items-center gap-1">
          <button
            className={cn(
              'px-2.5 py-1 text-xs rounded-full transition-colors',
              sortBy === 'date'
                ? 'bg-accent text-white font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setSortBy('date')}
          >
            Date
          </button>
          <button
            className={cn(
              'px-2.5 py-1 text-xs rounded-full transition-colors',
              sortBy === 'name'
                ? 'bg-accent text-white font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setSortBy('name')}
          >
            Name
          </button>
          <button
            className={cn(
              'w-6 h-6 flex items-center justify-center rounded transition-colors',
              showPinned ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setShowPinned(!showPinned)}
            title="Show pinned only"
          >
            <Star className={cn('w-3.5 h-3.5', showPinned && 'fill-accent')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-12 px-4">No notes here yet</p>
        ) : (
          displayNotes.map(note => {
            const isSelected = selectedNoteIds.includes(note.id)
            return (
              <div
                key={note.id}
                draggable
                className={cn(
                  'group border-b border-border p-3 cursor-grab active:cursor-grabbing transition-colors hover:bg-surface',
                  isSelected
                    ? 'border-l-[3px] border-l-accent bg-active'
                    : 'border-l-[3px] border-l-transparent'
                )}
                onClick={e => handleNoteSelect(e, note.id, orderedIds)}
                onDragStart={e => {
                  const ids = selectedNoteIds.includes(note.id) ? selectedNoteIds : [note.id]
                  e.dataTransfer.setData('text/note-id', note.id)
                  e.dataTransfer.setData('text/note-ids', JSON.stringify(ids))
                  e.dataTransfer.effectAllowed = 'move'
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground leading-snug line-clamp-1 min-w-0">
                    {note.title}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {note.pinned && (
                      <button
                        className="mt-0.5"
                        onClick={e => { e.stopPropagation(); pinNote(note.id) }}
                      >
                        <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                      </button>
                    )}
                    <button
                      className={cn(
                        'w-6 h-6 flex items-center justify-center rounded transition-all',
                        'text-muted-foreground hover:text-red-500 hover:bg-red-500/10',
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                      )}
                      title="Delete note"
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteClick(note.id, note.title)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                  {note.content.replace(/^#+ /gm, '').replace(/\n/g, ' ').slice(0, 120)}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    'text-xs shrink-0',
                    isSelected ? 'text-muted-foreground' : 'text-tertiary',
                  )}>
                    {formatDate(note.updatedAt)}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {note.tags.slice(0, 2).map(tag => (
                      <TagChip key={tag} tag={tag} />
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
