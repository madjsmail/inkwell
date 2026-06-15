import { useEffect, useRef } from 'react'
import { isDarkTheme, THEMES, loadCustomThemes } from '../../lib/themes'
import { deriveThemeVars, applyCustomThemeVars, clearCustomThemeVars } from '../../lib/themeUtils'
import { Sidebar } from './Sidebar'
import { NoteList } from './NoteList'
import { EditorPane } from './EditorPane'
import { BoardView } from '../board/BoardView'
import { SearchOverlay } from '../shared/SearchOverlay'
import { NamePromptDialog } from '../shared/NamePromptDialog'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { VaultPicker } from '../shared/VaultPicker'
import { useAppStore } from '../../store/useAppStore'
import { confirmDeleteNote, confirmDeleteSelectedNotes, confirmDeleteFolderById } from '../../lib/deleteActions'
import { readVaultFS, writeAppData, readAppData, addRecentVault, getLastVaultPath } from '../../lib/vault'
import type { AppData } from '../../lib/vault'

export function AppShell() {
  const { activeView, setSearchOpen, vaultPath, openVault, toggleSidebar, sidebarOpen } = useAppStore()
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
  }, [])

  // Restore native vibrancy if it was enabled last session
  useEffect(() => {
    const glass = localStorage.getItem('inkwell-sidebar-glass') === 'true'
    if (!glass) return
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('set_vibrancy', { enabled: true }).catch(console.error)
      })
    }
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

  // CMD+K / Ctrl+K → search; Ctrl+B → toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen, toggleSidebar])

  // Delete key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return

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

      {activeView === 'trash' && (
        <div className="flex-1 flex items-center justify-center bg-panel">
          <p className="text-muted-foreground text-sm">Trash is empty</p>
        </div>
      )}

      <SearchOverlay />
      <NamePromptDialog />
      <ConfirmDialog />
    </div>
  )
}
