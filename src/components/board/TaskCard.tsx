import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useAppStore } from '../../store/useAppStore'
import { TagChip } from '../shared/TagChip'
import { cn } from '../../lib/utils'
import type { BoardTask } from '../../types'

// ─── Priority dot ─────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<BoardTask['priority'], string> = {
  high:   'bg-red-400',
  medium: 'bg-amber-400',
  low:    'bg-green-400',
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDue(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: BoardTask
  columnId?: string
  isGhosted?: boolean
  isOverlay?: boolean
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

export function TaskCard({ task, columnId, isGhosted = false, isOverlay = false }: TaskCardProps) {
  const { setActiveBoardTaskId } = useAppStore()

  // Draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { type: 'task', taskId: task.id, columnId },
    disabled: isOverlay,
  })

  // Droppable (for before/after insertion detection)
  const { setNodeRef: setDropRef } = useDroppable({
    id: `task:${task.id}`,
    data: { type: 'task', taskId: task.id, columnId },
    disabled: isOverlay,
  })

  // Combine refs
  const setNodeRef = (el: HTMLDivElement | null) => {
    setDragRef(el)
    setDropRef(el)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-card border border-border rounded-lg p-3 mb-1.5 relative select-none',
        'cursor-grab active:cursor-grabbing',
        'hover:border-border/80 hover:shadow-sm transition-all',
        isDragging && 'opacity-0',
        isGhosted && 'opacity-30',
        isOverlay && 'cursor-grabbing shadow-2xl',
      )}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
      onClick={() => !isDragging && setActiveBoardTaskId(task.id)}
    >
      {/* Priority dot */}
      <div
        className={cn('absolute top-3 right-3 w-2 h-2 rounded-full', PRIORITY_DOT[task.priority])}
        title={`${task.priority} priority`}
      />

      {/* Title */}
      <p className="text-sm font-medium text-foreground pr-5 mb-1.5 leading-snug">
        {task.title}
      </p>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {task.tags.map(tag => <TagChip key={tag} tag={tag} />)}
        </div>
      )}

      {/* Bottom row */}
      {(task.assignee || task.dueDate) && (
        <div className="flex items-center gap-2 mt-1.5">
          {task.assignee && (
            <div className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[9px] font-semibold flex items-center justify-center shrink-0">
              {task.assignee.charAt(0).toUpperCase()}
            </div>
          )}
          {task.dueDate && (
            <span className="text-[11px] text-muted-foreground">
              {formatDue(task.dueDate)}
            </span>
          )}
        </div>
      )}

      {/* Subtask progress */}
      {task.subtasks.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{
                width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-tertiary">
            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
          </span>
        </div>
      )}
    </div>
  )
}
