import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectOption {
  value: string
  label: string
  description?: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select({ value, onChange, options, placeholder = 'Select…', disabled, className }: SelectProps) {
  const selected = options.find(o => o.value === value)

  return (
    <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
      <RadixSelect.Trigger
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs',
          'bg-surface border border-border text-foreground',
          'hover:border-accent/50 focus:outline-none focus:border-accent/50',
          'data-[placeholder]:text-tertiary transition-colors',
          'disabled:opacity-40 disabled:pointer-events-none',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder}>
          {selected?.label ?? placeholder}
        </RadixSelect.Value>
        <RadixSelect.Icon>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-[200] w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-lg border border-border bg-panel shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <RadixSelect.Viewport className="p-1 max-h-60 overflow-y-auto">
            {options.map(opt => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2 rounded-md text-xs cursor-pointer select-none',
                  'text-foreground outline-none',
                  'data-[highlighted]:bg-surface data-[highlighted]:text-foreground',
                  'data-[state=checked]:text-accent',
                )}
              >
                <RadixSelect.ItemText>
                  <span className="font-medium">{opt.label}</span>
                  {opt.description && (
                    <span className="ml-1.5 text-tertiary font-normal">{opt.description}</span>
                  )}
                </RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto">
                  <Check className="w-3 h-3 text-accent" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
