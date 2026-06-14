import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

export function NamePromptDialog() {
  const { prompt, closePrompt } = useAppStore()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (prompt) {
      setValue(prompt.defaultValue ?? '')
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [prompt])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || !prompt) return
    prompt.onConfirm(trimmed)
    closePrompt()
  }

  return (
    <Dialog.Root open={!!prompt} onOpenChange={open => !open && closePrompt()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-sm bg-panel border border-border rounded-lg shadow-lg p-5',
            'focus:outline-none'
          )}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <Dialog.Title className="text-sm font-semibold text-foreground mb-1">
            {prompt?.title}
          </Dialog.Title>
          {prompt?.description && (
            <Dialog.Description className="text-xs text-muted-foreground mb-4">
              {prompt.description}
            </Dialog.Description>
          )}

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={prompt?.placeholder ?? 'Name'}
              className={cn(
                'w-full h-9 px-3 text-sm bg-surface border border-border rounded-md',
                'text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-1 focus:ring-accent'
              )}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!value.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {prompt?.confirmLabel ?? 'Create'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
