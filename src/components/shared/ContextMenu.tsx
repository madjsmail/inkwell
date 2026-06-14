import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'

export interface ContextMenuItem {
  label: string
  destructive?: boolean
  onClick: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[140px] py-1 bg-panel border border-border rounded-md shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          className={cn(
            'w-full text-left px-3 py-1.5 text-xs transition-colors',
            item.destructive
              ? 'text-red-500 hover:bg-red-500/10'
              : 'text-foreground hover:bg-surface',
          )}
          onClick={() => {
            item.onClick()
            onClose()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
