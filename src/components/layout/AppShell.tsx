import { useEffect, useRef } from 'react'
import { isDarkTheme, THEMES, loadCustomThemes } from '../../lib/themes'
import { deriveThemeVars, applyCustomThemeVars, clearCustomThemeVars } from '../../lib/themeUtils'
import { Sidebar } from './Sidebar'
import { NoteList } from './NoteList'
import { EditorPane } from './EditorPane'
import { BoardView } from '../board/BoardView'
import { CanvasView } from '../canvas/CanvasView'
import { WeeklyPlannerView } from '../planner/WeeklyPlannerView'
import { SearchOverlay } from '../shared/SearchOverlay'
import { NamePromptDialog } from '../shared/NamePromptDialog'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { VaultPicker } from '../shared/VaultPicker'
import { useAppStore } from '../../store/useAppStore'
import { confirmDeleteNote, confirmDeleteSelectedNotes, confirmDeleteFolderById } from '../../lib/deleteActions'
import { readVaultFS, writeAppData, readAppData, addRecentVault, getLastVaultPath } from '../../lib/vault'
import type { AppData } from '../../lib/vault'
import { comboMatches } from '../../lib/shortcuts'
import { cn, glassBg } from '../../lib/utils'

export function AppShell() {
  const { activeView, setSearchOpen, vaultPath, openVault, toggleSidebar, sidebarOpen, initPlanner, openExternalNote, bodyGlass, glassOpacity } = useAppStore()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('inkwell-theme')
    // Backward compat: 'dark' → 'midnight', 'light' → 'parchment'
    const resolvedId: string = saved === 'dark' ? 'midnight'
      : saved === 'light' ? 'parchment'
      : (saved && THEMES.find(t => t.id === saved)) ? saved
      : saved ?? 'midnight'   // may be a custom theme id

    const customThemes = loadCustomThemes()
    const custom = customThemes.find(t => t.id === resolvedId)
    const dark = custom ? custom.dark : isDarkTheme(resolvedId)

    document.documentElement.classList.toggle('dark', dark)
    if (custom) {
      delete document.documentElement.dataset.theme
      applyCustomThemeVars(deriveThemeVars(custom.colors, dark))
    } else {
      clearCustomThemeVars()
      document.documentElement.dataset.theme = resolvedId
    }
    useAppStore.setState({
      themeName: resolvedId,
      theme: dark ? 'dark' : 'light',
      customThemes,
    })
    // Seed per-mode keys so toggleTheme can round-trip correctly
    const modeKey = dark ? 'inkwell-last-dark-theme' : 'inkwell-last-light-theme'
    if (!localStorage.getItem(modeKey)) {
      localStorage.setItem(modeKey, resolvedId)
    }
  }, [])

  // Restore native vibrancy if it was enabled last session
  useEffect(() => {
    const glass = localStorage.getItem('inkwell-sidebar-glass') === 'true'
      || localStorage.getItem('inkwell-body-glass') === 'true'
    if (!glass) return
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('set_vibrancy', { enabled: true }).catch(console.error)
      })
    }
  }, [])

  // Load planner data from global app storage on startup (vault-independent)
  useEffect(() => {
    initPlanner()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Attempt to restore last opened vault on startup
  useEffect(() => {
    const lastPath = getLastVaultPath()
    if (!lastPath) return
    readVaultFS(lastPath).then((data) => {
      addRecentVault(lastPath)
      openVault(lastPath, data)
    }).catch(() => {
      // Silently fail — vault picker will be shown instead
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-save boards/tasks to .inkwell/app.json (notes are written inline by store actions)
  useEffect(() => {
    if (!vaultPath) return
    return useAppStore.subscribe((state) => {
      if (!state.vaultPath) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        const vp = state.vaultPath!
        // Preserve existing noteMeta — don't clobber it with {}
        const existing = await readAppData(vp)
        const appData: AppData = {
          version: 1,
          tasks: state.tasks,
          boards: state.boards,
          boardColumns: state.boardColumns,
          boardTasks: state.boardTasks,
          noteMeta: existing?.noteMeta ?? {},
        }
        writeAppData(vp, appData)
      }, 800)
    })
  }, [vaultPath])

  // Search / toggle sidebar / open external file — user-remappable, see Settings > Shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const { shortcuts, recordingShortcut } = useAppStore.getState()
      if (recordingShortcut) return
      if (comboMatches(e, shortcuts.search)) {
        e.preventDefault()
        setSearchOpen(true)
        return
      }
      if (comboMatches(e, shortcuts.toggleSidebar)) {
        e.preventDefault()
        toggleSidebar()
        return
      }
      if (comboMatches(e, shortcuts.openFile)) {
        e.preventDefault()
        openExternalNote()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen, toggleSidebar, openExternalNote])

  // Delete key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      if (useAppStore.getState().recordingShortcut) return

      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.cm-editor')
      ) {
        return
      }

      const { activeView, selectedNoteIds, selectedFolderId, notes } = useAppStore.getState()
      if (activeView !== 'notes') return

      if (selectedNoteIds.length > 0) {
        e.preventDefault()
        if (selectedNoteIds.length > 1) {
          confirmDeleteSelectedNotes()
        } else {
          const note = notes.find(n => n.id === selectedNoteIds[0])
          if (note) confirmDeleteNote(note.id, note.title)
        }
        return
      }

      if (selectedFolderId) {
        e.preventDefault()
        confirmDeleteFolderById(selectedFolderId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!vaultPath) {
    return <VaultPicker />
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {sidebarOpen && <Sidebar />}

      {activeView === 'notes' && (
        <>
          <NoteList />
          <EditorPane />
        </>
      )}

      {activeView === 'board' && <BoardView />}

      {activeView === 'canvas' && <CanvasView />}

      {activeView === 'planner' && <WeeklyPlannerView />}

      {activeView === 'trash' && (
        <div
          className={cn("flex-1 flex items-center justify-center", bodyGlass ? "backdrop-blur-2xl" : "bg-panel")}
          style={bodyGlass ? glassBg('panel', glassOpacity) : undefined}
        >
          <p className="text-muted-foreground text-sm">Trash is empty</p>
        </div>
      )}

      <SearchOverlay />
      <NamePromptDialog />
      <ConfirmDialog />
    </div>
  )
}
