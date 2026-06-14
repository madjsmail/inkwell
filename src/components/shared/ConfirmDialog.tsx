import * as Dialog from '@radix-ui/react-dialog'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

export function ConfirmDialog() {
  const { confirm, closeConfirm } = useAppStore()

  const handleConfirm = () => {
    if (!confirm) return
    confirm.onConfirm()
    closeConfirm()
  }

  return (
    <Dialog.Root open={!!confirm} onOpenChange={open => !open && closeConfirm()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-full max-w-sm bg-panel border border-border rounded-lg shadow-lg p-5',
            'focus:outline-none',
          )}
        >
          <Dialog.Title className="text-sm font-semibold text-foreground mb-1">
            {confirm?.title}
          </Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground mb-5 leading-relaxed">
            {confirm?.description}
          </Dialog.Description>

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {confirm?.cancelLabel ?? 'Cancel'}
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-opacity hover:opacity-90',
                confirm?.destructive
                  ? 'bg-red-600 text-white'
                  : 'bg-accent text-accent-foreground',
              )}
            >
              {confirm?.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
