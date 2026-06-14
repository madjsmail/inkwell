import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore()

  return (
    <button
      onClick={toggleTheme}
      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
