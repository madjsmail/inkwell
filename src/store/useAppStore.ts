import { create } from "zustand";
import type {
  Note,
  Folder,
  Task,
  Subtask,
  ViewMode,
  ActiveView,
  Board,
  BoardColumn,
  BoardTask,
  BoardComment,
  LinkedItem,
  Attachment,
} from "../types";
import {
  extractTitleFromContent,
  setContentTitle,
  slugifyTitle,
} from "../lib/utils";
import {
  writeNoteFile,
  deleteNoteFile,
  createFolderDir,
  deleteFolderDir,
  renameItem,
  writeNoteMeta,
} from "../lib/vault";

// ─── First-run welcome content ────────────────────────────────────────────────

const WELCOME_CONTENT = `# Welcome to inkwell ✒️

Your notes live here as plain Markdown files — no cloud sync, no lock-in, no noise.

---

## What you can do

**Write** in a distraction-free editor that gets out of your way.

**Organize** your notes into folders. Drag and drop to restructure anytime.

**View your way** — switch between Edit, Split, and Preview modes from the top bar.

**Attach files** — drop PDFs, images, and documents inline using the paperclip button. They preview right inside the note.

---

## Markdown basics

- **Bold**, _italic_, ~~strikethrough~~, \`inline code\`
- # Headings up to ### H3
- > Blockquotes for things worth remembering
- ==Highlighted== text for the things that really matter

Tables render with subtle row striping:

| Feature     | Status |
|-------------|--------|
| Editor      | ✅     |
| Board view  | ✅     |
| Attachments | ✅     |
| Themes      | ✅     |

---

## Keyboard shortcuts

- **⌘K** — search across all notes
- **⌘B** — toggle the sidebar
- **⌘F** — search inside the current note

Open **Settings** (bottom of the sidebar) to choose a theme, adjust the editor font, or switch vaults.

---

*Everything you write is saved automatically to your vault folder as \`.md\` files. Open them in any text editor, back them up however you like — they're yours.*
`;
import type { VaultData } from "../lib/vault";
// VaultData is used by openVault — note it no longer includes 'version'
import {
  isDarkTheme,
  loadCustomThemes,
  persistCustomThemes,
  type CustomTheme,
} from "../lib/themes";
import {
  deriveThemeVars,
  applyCustomThemeVars,
  clearCustomThemeVars,
} from "../lib/themeUtils";

export interface NamePromptConfig {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (name: string) => void;
}

export interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface AppState {
  vaultPath: string | null;
  folders: Folder[];
  notes: Note[];
  tasks: Task[];
  activeView: ActiveView;
  selectedNoteIds: string[];
  lastSelectedNoteId: string | null;
  selectedFolderId: string | null;
  viewMode: ViewMode;
  theme: "dark" | "light";
  themeName: string;
  customThemes: CustomTheme[];
  setTheme: (name: string) => void;
  saveCustomTheme: (theme: CustomTheme) => void;
  deleteCustomTheme: (id: string) => void;
  editorFontSize: string;
  editorFontFamily: string;
  editorLineHeight: string;
  setEditorSettings: (
    settings: Partial<{
      editorFontSize: string;
      editorFontFamily: string;
      editorLineHeight: string;
    }>,
  ) => void;
  sidebarGlass: boolean;
  setSidebarGlass: (enabled: boolean) => void;
  searchOpen: boolean;
  searchQuery: string;
  activeTaskId: string | null;
  saveStatus: "saved" | "saving" | "idle";
  prompt: NamePromptConfig | null;
  confirm: ConfirmConfig | null;

  openVault: (path: string, data: VaultData | null) => void;
  closeVault: () => void;
  openPrompt: (config: NamePromptConfig) => void;
  closePrompt: () => void;
  openConfirm: (config: ConfirmConfig) => void;
  closeConfirm: () => void;
  selectNote: (
    id: string,
    options?: { additive?: boolean; range?: boolean; orderedIds?: string[] },
  ) => void;
  clearNoteSelection: () => void;
  clearFolderSelection: () => void;
  selectFolder: (id: string) => void;
  toggleFolder: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleTheme: () => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  pinNote: (id: string) => void;
  createNote: (folderId: string | null) => void;
  renameNote: (id: string, title: string) => void;
  createFolder: (name: string, parentId?: string | null) => void;
  deleteNote: (id: string) => void;
  deleteNotes: (ids: string[]) => void;
  deleteFolder: (id: string) => void;
  moveNote: (noteId: string, targetFolderId: string | null) => void;
  moveNotes: (noteIds: string[], targetFolderId: string | null) => void;
  reorderNote: (
    noteId: string,
    targetFolderId: string | null,
    insertBeforeNoteId: string | null,
  ) => void;
  moveFolder: (
    folderId: string,
    targetParentId: string | null,
    insertBeforeFolderId: string | null,
  ) => void;
  updateNote: (id: string, content: string) => void;
  setActiveTask: (id: string | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setActiveView: (view: ActiveView) => void;
  setSaveStatus: (status: "saved" | "saving" | "idle") => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  addNoteLink: (noteId: string, item: LinkedItem) => void;
  removeNoteLink: (noteId: string, itemId: string) => void;
  addAttachment: (noteId: string, attachment: Attachment) => void;
  removeAttachment: (noteId: string, attachmentId: string) => void;

  // ─── Board system ───────────────────────────────────────────────────────────
  boards: Board[];
  boardColumns: BoardColumn[];
  boardTasks: BoardTask[];
  activeBoardId: string | null;
  activeBoardTaskId: string | null;

  createBoard: (name: string) => void;
  deleteBoard: (id: string) => void;
  setActiveBoardId: (id: string | null) => void;
  setActiveBoardTaskId: (id: string | null) => void;
  addBoardColumn: (boardId: string, name: string) => void;
  renameBoardColumn: (columnId: string, name: string) => void;
  deleteBoardColumn: (columnId: string) => void;
  reorderBoardColumns: (boardId: string, columnIds: string[]) => void;
  createBoardTask: (
    columnId: string,
    title: string,
    priority?: BoardTask["priority"],
  ) => void;
  updateBoardTask: (
    taskId: string,
    updates: Partial<Omit<BoardTask, "id" | "boardId">>,
  ) => void;
  deleteBoardTask: (taskId: string) => void;
  moveBoardTask: (
    taskId: string,
    toColumnId: string,
    beforeTaskId?: string | null,
  ) => void;
  addBoardTaskSubtask: (taskId: string, title: string) => void;
  toggleBoardTaskSubtask: (taskId: string, subtaskId: string) => void;
  deleteBoardTaskSubtask: (taskId: string, subtaskId: string) => void;
  addBoardTaskComment: (taskId: string, content: string) => void;
}

function updateFolderNotes(
  folders: Folder[],
  noteId: string,
  updater: (n: Note) => Note,
): Folder[] {
  return folders.map((f) => ({
    ...f,
    notes: f.notes.map((n) => (n.id === noteId ? updater(n) : n)),
    children: updateFolderNotes(f.children, noteId, updater),
  }));
}

function findFolderById(folders: Folder[], id: string): Folder | null {
  for (const f of folders) {
    if (f.id === id) return f;
    const found = findFolderById(f.children, id);
    if (found) return found;
  }
  return null;
}

function toggleFolderById(folders: Folder[], id: string): Folder[] {
  return folders.map((f) => {
    if (f.id === id) return { ...f, expanded: !f.expanded };
    return { ...f, children: toggleFolderById(f.children, id) };
  });
}

function insertFolderIntoTree(
  folders: Folder[],
  parentId: string | null,
  newFolder: Folder,
): Folder[] {
  if (parentId === null) return [...folders, newFolder];
  return folders.map((f) => {
    if (f.id === parentId) {
      return { ...f, expanded: true, children: [...f.children, newFolder] };
    }
    return {
      ...f,
      children: insertFolderIntoTree(f.children, parentId, newFolder),
    };
  });
}

function addNoteToFolderTree(
  folders: Folder[],
  folderId: string,
  note: Note,
): Folder[] {
  return folders.map((f) => {
    if (f.id === folderId) {
      return {
        ...f,
        notes: [note, ...f.notes.filter((n) => n.id !== note.id)],
      };
    }
    return { ...f, children: addNoteToFolderTree(f.children, folderId, note) };
  });
}

function removeNoteFromFolderTree(folders: Folder[], noteId: string): Folder[] {
  return folders.map((f) => ({
    ...f,
    notes: f.notes.filter((n) => n.id !== noteId),
    children: removeNoteFromFolderTree(f.children, noteId),
  }));
}

function insertNoteIntoFolderAt(
  folders: Folder[],
  folderId: string,
  note: Note,
  insertBeforeId: string | null,
): Folder[] {
  return folders.map((f) => {
    if (f.id === folderId) {
      const rest = f.notes.filter((n) => n.id !== note.id);
      if (insertBeforeId === null) return { ...f, notes: [...rest, note] };
      const idx = rest.findIndex((n) => n.id === insertBeforeId);
      return {
        ...f,
        notes:
          idx === -1
            ? [...rest, note]
            : [...rest.slice(0, idx), note, ...rest.slice(idx)],
      };
    }
    return {
      ...f,
      children: insertNoteIntoFolderAt(
        f.children,
        folderId,
        note,
        insertBeforeId,
      ),
    };
  });
}

function insertFolderAt(
  folders: Folder[],
  parentId: string | null,
  folder: Folder,
  insertBeforeId: string | null,
): Folder[] {
  if (parentId === null) {
    const rest = folders.filter((f) => f.id !== folder.id);
    if (insertBeforeId === null) return [...rest, folder];
    const idx = rest.findIndex((f) => f.id === insertBeforeId);
    return idx === -1
      ? [...rest, folder]
      : [...rest.slice(0, idx), folder, ...rest.slice(idx)];
  }
  return folders.map((f) => {
    if (f.id === parentId) {
      const rest = f.children.filter((c) => c.id !== folder.id);
      if (insertBeforeId === null)
        return { ...f, children: [...rest, folder], expanded: true };
      const idx = rest.findIndex((c) => c.id === insertBeforeId);
      return {
        ...f,
        expanded: true,
        children:
          idx === -1
            ? [...rest, folder]
            : [...rest.slice(0, idx), folder, ...rest.slice(idx)],
      };
    }
    return {
      ...f,
      children: insertFolderAt(f.children, parentId, folder, insertBeforeId),
    };
  });
}

/**
 * Returns the absolute disk path for a folder.
 * Folder IDs are now vault-relative paths (e.g. "Projects/Research"),
 * so we just join vaultPath + folderId.
 */
function buildFolderPath(vaultPath: string | null, folderId: string): string {
  if (!vaultPath) return folderId;
  return `${vaultPath}/${folderId}`;
}

function removeFolderFromTree(folders: Folder[], folderId: string): Folder[] {
  return folders
    .filter((f) => f.id !== folderId)
    .map((f) => ({
      ...f,
      children: removeFolderFromTree(f.children, folderId),
    }));
}

function collectNoteIdsFromFolder(folder: Folder): string[] {
  const ids = folder.notes.map((n) => n.id);
  for (const child of folder.children) {
    ids.push(...collectNoteIdsFromFolder(child));
  }
  return ids;
}

function removeNotesFromFolderTree(
  folders: Folder[],
  noteIds: Set<string>,
): Folder[] {
  return folders.map((f) => ({
    ...f,
    notes: f.notes.filter((n) => !noteIds.has(n.id)),
    children: removeNotesFromFolderTree(f.children, noteIds),
  }));
}

function findFolderPath(
  folders: Folder[],
  id: string,
  path: string[] = [],
): string[] | null {
  for (const f of folders) {
    if (f.id === id) return [...path, f.id];
    const found = findFolderPath(f.children, id, [...path, f.id]);
    if (found) return found;
  }
  return null;
}

function isFolderInsideDeleted(
  folders: Folder[],
  deletedId: string,
  folderId: string | null,
): boolean {
  if (!folderId) return false;
  if (folderId === deletedId) return true;
  const path = findFolderPath(folders, folderId);
  return path?.includes(deletedId) ?? false;
}

export const useAppStore = create<AppState>((set, get) => ({
  vaultPath: null,
  folders: [],
  notes: [],
  tasks: [],
  activeView: "notes",
  selectedNoteIds: [],
  lastSelectedNoteId: null,
  selectedFolderId: null,
  viewMode: "edit",
  theme: "dark",
  themeName: "midnight",
  customThemes: loadCustomThemes(),
  editorFontSize: localStorage.getItem("inkwell-editor-fontSize") ?? "15px",
  editorFontFamily:
    localStorage.getItem("inkwell-editor-fontFamily") ??
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  editorLineHeight: localStorage.getItem("inkwell-editor-lineHeight") ?? "1.7",
  sidebarGlass: localStorage.getItem("inkwell-sidebar-glass") === "true",
  searchOpen: false,
  searchQuery: "",
  activeTaskId: null,
  saveStatus: "saved",
  sidebarOpen: true,
  prompt: null,
  confirm: null,
  boards: [],
  boardColumns: [],
  boardTasks: [],
  activeBoardId: null,
  activeBoardTaskId: null,

  openVault: (path, data) => {
    let folders = data?.folders ?? [];
    // Back-fill linkedItems for notes from older vault files
    let notes = (data?.notes ?? []).map((n) => ({
      ...n,
      linkedItems: n.linkedItems ?? [],
    }));
    const tasks = data?.tasks ?? [];
    const boards = data?.boards ?? [];
    const boardColumns = data?.boardColumns ?? [];
    const boardTasks = data?.boardTasks ?? [];

    // First-run: seed a welcome note so the vault isn't empty
    if (!data) {
      const folderId = `folder-${Date.now()}`;
      const noteId = `note-${Date.now() + 1}`;
      const folderPath = `${path}/getting-started`;
      const welcomeNote: Note = {
        id: noteId,
        title: "Welcome to inkwell",
        content: WELCOME_CONTENT,
        path: `${folderPath}/welcome-to-inkwell.md`,
        folder: folderId,
        tags: [],
        pinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: WELCOME_CONTENT.split(/\s+/).filter(Boolean).length,
        attachments: [],
        linkedItems: [],
      };
      const welcomeFolder: Folder = {
        id: folderId,
        name: "Getting Started",
        path: folderPath,
        parentId: null,
        children: [],
        notes: [welcomeNote],
        expanded: true,
      };
      folders = [welcomeFolder];
      notes = [welcomeNote];
    }

    set({
      vaultPath: path,
      folders,
      notes,
      tasks,
      boards,
      boardColumns,
      boardTasks,
      activeBoardId: boards[0]?.id ?? null,
      selectedNoteIds: notes.length > 0 ? [notes[0].id] : [],
      lastSelectedNoteId: notes[0]?.id ?? null,
      selectedFolderId: folders[0]?.id ?? null,
      activeView: "notes",
    });
  },

  closeVault: () =>
    set({
      vaultPath: null,
      folders: [],
      notes: [],
      tasks: [],
      selectedNoteIds: [],
      lastSelectedNoteId: null,
      selectedFolderId: null,
    }),

  openPrompt: (config) => set({ prompt: config }),
  closePrompt: () => set({ prompt: null }),
  openConfirm: (config) => set({ confirm: config }),
  closeConfirm: () => set({ confirm: null }),

  selectNote: (id, options) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;

    const { additive = false, range = false, orderedIds = [] } = options ?? {};
    const { selectedNoteIds, lastSelectedNoteId } = get();

    let nextIds: string[];

    if (range && lastSelectedNoteId && orderedIds.length > 0) {
      const start = orderedIds.indexOf(lastSelectedNoteId);
      const end = orderedIds.indexOf(id);
      if (start !== -1 && end !== -1) {
        const lo = Math.min(start, end);
        const hi = Math.max(start, end);
        nextIds = orderedIds.slice(lo, hi + 1);
      } else {
        nextIds = [id];
      }
    } else if (additive) {
      nextIds = selectedNoteIds.includes(id)
        ? selectedNoteIds.filter((x) => x !== id)
        : [...selectedNoteIds, id];
    } else {
      nextIds = [id];
    }

    set({
      selectedNoteIds: nextIds,
      lastSelectedNoteId: id,
      selectedFolderId: note.folder,
    });
  },

  clearNoteSelection: () =>
    set({ selectedNoteIds: [], lastSelectedNoteId: null }),
  clearFolderSelection: () =>
    set({
      selectedFolderId: null,
      selectedNoteIds: [],
      lastSelectedNoteId: null,
    }),

  selectFolder: (id) => {
    const folder = findFolderById(get().folders, id);
    if (folder) {
      const firstNoteId = folder.notes[0]?.id ?? null;
      set({
        selectedFolderId: id,
        selectedNoteIds: firstNoteId ? [firstNoteId] : [],
        lastSelectedNoteId: firstNoteId,
      });
    }
  },

  toggleFolder: (id) =>
    set((s) => ({ folders: toggleFolderById(s.folders, id) })),

  setViewMode: (mode) => set({ viewMode: mode }),

  setTheme: (name: string) => {
    const custom = get().customThemes.find((t) => t.id === name);
    const dark = custom ? custom.dark : isDarkTheme(name);
    document.documentElement.classList.toggle("dark", dark);
    if (custom) {
      delete document.documentElement.dataset.theme;
      applyCustomThemeVars(deriveThemeVars(custom.colors, dark));
    } else {
      clearCustomThemeVars();
      document.documentElement.dataset.theme = name;
    }
    localStorage.setItem("inkwell-theme", name);
    set({ themeName: name, theme: dark ? "dark" : "light" });
  },

  toggleTheme: () => {
    const { themeName, customThemes } = get();
    const custom = customThemes.find((t) => t.id === themeName);
    const dark = custom ? custom.dark : isDarkTheme(themeName);
    const next = dark ? "parchment" : "midnight";
    clearCustomThemeVars();
    document.documentElement.classList.toggle("dark", false);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("inkwell-theme", next);
    set({ themeName: next, theme: isDarkTheme(next) ? "dark" : "light" });
  },

  saveCustomTheme: (theme) => {
    set((s) => {
      const idx = s.customThemes.findIndex((t) => t.id === theme.id);
      const next =
        idx >= 0
          ? s.customThemes.map((t, i) => (i === idx ? theme : t))
          : [...s.customThemes, theme];
      persistCustomThemes(next);
      return { customThemes: next };
    });
  },

  deleteCustomTheme: (id) => {
    set((s) => {
      const next = s.customThemes.filter((t) => t.id !== id);
      persistCustomThemes(next);
      if (s.themeName === id) {
        clearCustomThemeVars();
        document.documentElement.classList.add("dark");
        document.documentElement.dataset.theme = "midnight";
        localStorage.setItem("inkwell-theme", "midnight");
        return { customThemes: next, themeName: "midnight", theme: "dark" };
      }
      return { customThemes: next };
    });
  },

  setEditorSettings: (settings) => {
    if (settings.editorFontSize)
      localStorage.setItem("inkwell-editor-fontSize", settings.editorFontSize);
    if (settings.editorFontFamily)
      localStorage.setItem(
        "inkwell-editor-fontFamily",
        settings.editorFontFamily,
      );
    if (settings.editorLineHeight)
      localStorage.setItem(
        "inkwell-editor-lineHeight",
        settings.editorLineHeight,
      );
    set(settings);
  },

  setSidebarGlass: (enabled) => {
    localStorage.setItem("inkwell-sidebar-glass", String(enabled));
    set({ sidebarGlass: enabled });
    // Drive native NSVisualEffectView in Tauri
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("set_vibrancy", { enabled }).catch(console.error);
      });
    }
  },

  setSearchOpen: (open) => set({ searchOpen: open }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  pinNote: (id) => {
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned } : n,
      ),
      folders: updateFolderNotes(s.folders, id, (n) => ({
        ...n,
        pinned: !n.pinned,
      })),
    }));
  },

  createFolder: (name, parentId = null) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { vaultPath } = get();

    // Folder ID = vault-relative path (e.g. "Projects" or "Projects/Research")
    const parentFolder = parentId
      ? findFolderById(get().folders, parentId)
      : null;
    const id = parentFolder ? `${parentFolder.id}/${trimmed}` : trimmed;
    const absolutePath = vaultPath ? `${vaultPath}/${id}` : id;

    const newFolder: Folder = {
      id,
      name: trimmed,
      path: absolutePath,
      parentId: parentId ?? null,
      expanded: true,
      children: [],
      notes: [],
    };

    // Create directory on disk
    createFolderDir(absolutePath).catch(console.error);

    set((s) => ({
      folders: insertFolderIntoTree(s.folders, parentId ?? null, newFolder),
      selectedFolderId: id,
      selectedNoteIds: [],
      lastSelectedNoteId: null,
      activeView: "notes",
    }));
  },

  createNote: (folderId) => {
    const id = `note-${Date.now()}`;
    const { vaultPath } = get();
    const folderAbsPath = folderId
      ? buildFolderPath(vaultPath, folderId)
      : (vaultPath ?? ".");
    const newNote: Note = {
      id,
      title: "Untitled",
      content: "",
      path: `${folderAbsPath}/untitled-${Date.now()}.md`,
      folder: folderId,
      tags: [],
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 0,
      attachments: [],
      linkedItems: [],
    };
    // Write .md file to disk immediately
    writeNoteFile(newNote).catch(console.error);

    set((s) => ({
      notes: [newNote, ...s.notes],
      selectedNoteIds: [id],
      lastSelectedNoteId: id,
      selectedFolderId: folderId,
      folders: folderId
        ? addNoteToFolderTree(s.folders, folderId, newNote)
        : s.folders,
      activeView: "notes",
    }));
  },

  moveNotes: (noteIds, targetFolderId) => {
    const uniqueIds = [...new Set(noteIds)];
    for (const noteId of uniqueIds) {
      get().moveNote(noteId, targetFolderId);
    }
  },

  moveNote: (noteId, targetFolderId) => {
    const { notes, vaultPath } = get();
    const note = notes.find((n) => n.id === noteId);
    if (!note || note.folder === targetFolderId) return;

    const folderAbsPath = targetFolderId
      ? buildFolderPath(vaultPath, targetFolderId)
      : (vaultPath ?? ".");
    const filename = note.path.split("/").pop() ?? `note-${Date.now()}.md`;
    const newAbsPath = `${folderAbsPath}/${filename}`;
    const updatedNote: Note = {
      ...note,
      folder: targetFolderId,
      path: newAbsPath,
      updatedAt: new Date(),
    };

    // Move file on disk
    renameItem(note.path, newAbsPath).catch(console.error);

    set((s) => {
      const withoutOld = removeNoteFromFolderTree(s.folders, noteId);
      return {
        notes: s.notes.map((n) => (n.id === noteId ? updatedNote : n)),
        folders: targetFolderId
          ? addNoteToFolderTree(withoutOld, targetFolderId, updatedNote)
          : withoutOld,
        selectedFolderId: targetFolderId,
      };
    });
  },

  reorderNote: (noteId, targetFolderId, insertBeforeNoteId) => {
    const { notes } = get();
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    if (note.folder === targetFolderId) {
      // Same parent — pure positional reorder, no path change needed
      set((s) => {
        if (targetFolderId === null) {
          const rest = s.notes.filter((n) => n.id !== noteId);
          if (insertBeforeNoteId === null) return { notes: [...rest, note] };
          const idx = rest.findIndex((n) => n.id === insertBeforeNoteId);
          return {
            notes:
              idx === -1
                ? [...rest, note]
                : [...rest.slice(0, idx), note, ...rest.slice(idx)],
          };
        }
        return {
          folders: insertNoteIntoFolderAt(
            removeNoteFromFolderTree(s.folders, noteId),
            targetFolderId,
            note,
            insertBeforeNoteId,
          ),
        };
      });
      return;
    }

    // Moving across folders — update path
    const { vaultPath } = get();
    const folderAbsPath = targetFolderId
      ? buildFolderPath(vaultPath, targetFolderId)
      : (vaultPath ?? ".");
    const filename = note.path.split("/").pop()!;
    const newAbsPath = `${folderAbsPath}/${filename}`;
    const updated = {
      ...note,
      folder: targetFolderId,
      path: newAbsPath,
      updatedAt: new Date(),
    };
    renameItem(note.path, newAbsPath).catch(console.error);

    set((s) => {
      let foldersNew = removeNoteFromFolderTree(s.folders, noteId);
      let notesNew = s.notes.map((n) => (n.id === noteId ? updated : n));
      if (targetFolderId) {
        foldersNew = insertNoteIntoFolderAt(
          foldersNew,
          targetFolderId,
          updated,
          insertBeforeNoteId,
        );
      } else {
        notesNew = s.notes.filter((n) => n.id !== noteId);
        const idx = insertBeforeNoteId
          ? notesNew.findIndex((n) => n.id === insertBeforeNoteId)
          : -1;
        notesNew =
          idx === -1
            ? [...notesNew, updated]
            : [...notesNew.slice(0, idx), updated, ...notesNew.slice(idx)];
      }
      return { folders: foldersNew, notes: notesNew };
    });
  },

  moveFolder: (folderId, targetParentId, insertBeforeFolderId) => {
    if (folderId === targetParentId) return;
    const { folders, vaultPath } = get();
    if (
      targetParentId &&
      isFolderInsideDeleted(folders, folderId, targetParentId)
    )
      return;
    const folder = findFolderById(folders, folderId);
    if (!folder) return;

    // New vault-relative ID = targetParentId/folderName or just folderName
    const folderName = folderId.split("/").pop()!;
    const newId = targetParentId
      ? `${targetParentId}/${folderName}`
      : folderName;
    const newAbsPath = vaultPath ? `${vaultPath}/${newId}` : newId;

    if (folder.path !== newAbsPath) {
      renameItem(folder.path, newAbsPath).catch(console.error);
    }

    const updated = {
      ...folder,
      id: newId,
      path: newAbsPath,
      parentId: targetParentId,
    };
    set((s) => ({
      folders: insertFolderAt(
        removeFolderFromTree(s.folders, folderId),
        targetParentId,
        updated,
        insertBeforeFolderId,
      ),
    }));
  },

  updateNote: (id, content) => {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const title = extractTitleFromContent(content);
    const updatedAt = new Date();
    set((s) => {
      const updatedNotes = s.notes.map((n) =>
        n.id === id ? { ...n, content, title, wordCount, updatedAt } : n,
      );
      // Write file to disk (fire-and-forget — AppShell debounce handles save status)
      const updated = updatedNotes.find((n) => n.id === id);
      if (updated) writeNoteFile(updated).catch(console.error);
      return {
        notes: updatedNotes,
        folders: updateFolderNotes(s.folders, id, (n) => ({
          ...n,
          content,
          title,
          wordCount,
          updatedAt,
        })),
      };
    });
  },

  renameNote: (id, title) => {
    const { notes, vaultPath } = get();
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    const trimmed = title.trim() || "Untitled";
    const content = setContentTitle(note.content, trimmed);
    const updatedAt = new Date();

    const folderAbsPath = note.folder
      ? buildFolderPath(vaultPath, note.folder)
      : (vaultPath ?? ".");
    const newPath = `${folderAbsPath}/${slugifyTitle(trimmed)}.md`;

    // Rename file on disk (old path → new path)
    if (note.path !== newPath) {
      renameItem(note.path, newPath).catch(console.error);
    }

    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id
          ? { ...n, title: trimmed, content, path: newPath, updatedAt }
          : n,
      ),
      folders: updateFolderNotes(s.folders, id, (n) => ({
        ...n,
        title: trimmed,
        content,
        path: newPath,
        updatedAt,
      })),
    }));
  },

  deleteNotes: (ids) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);

    // Delete files from disk
    const { notes } = get();
    for (const id of ids) {
      const note = notes.find((n) => n.id === id);
      if (note) deleteNoteFile(note.path).catch(console.error);
    }

    set((s) => {
      const folders = removeNotesFromFolderTree(s.folders, idSet);
      const notes = s.notes.filter((n) => !idSet.has(n.id));

      let selectedNoteIds = s.selectedNoteIds.filter((id) => !idSet.has(id));
      let lastSelectedNoteId = s.lastSelectedNoteId;
      let selectedFolderId = s.selectedFolderId;

      if (lastSelectedNoteId && idSet.has(lastSelectedNoteId)) {
        lastSelectedNoteId =
          selectedNoteIds[selectedNoteIds.length - 1] ?? null;
      }

      if (selectedNoteIds.length === 0) {
        let fallbackId: string | null = null;
        if (selectedFolderId) {
          const folder = findFolderById(folders, selectedFolderId);
          fallbackId = folder?.notes[0]?.id ?? null;
        } else {
          fallbackId = notes.find((n) => n.folder === null)?.id ?? null;
        }
        selectedNoteIds = fallbackId ? [fallbackId] : [];
        lastSelectedNoteId = fallbackId;
      }

      return {
        folders,
        notes,
        selectedNoteIds,
        lastSelectedNoteId,
        selectedFolderId,
      };
    });
  },

  deleteNote: (id) => {
    get().deleteNotes([id]);
  },

  deleteFolder: (id) => {
    const folder = findFolderById(get().folders, id);
    if (!folder) return;

    // Delete directory from disk (recursive)
    deleteFolderDir(folder.path).catch(console.error);

    const noteIdsToDelete = new Set(collectNoteIdsFromFolder(folder));

    set((s) => {
      const folders = removeFolderFromTree(s.folders, id);
      const notes = s.notes.filter((n) => !noteIdsToDelete.has(n.id));

      let selectedNoteIds = s.selectedNoteIds.filter(
        (id) => !noteIdsToDelete.has(id),
      );
      let lastSelectedNoteId = s.lastSelectedNoteId;
      let selectedFolderId = s.selectedFolderId;

      const selectionAffected =
        isFolderInsideDeleted(s.folders, id, s.selectedFolderId) ||
        s.selectedNoteIds.some((noteId) => noteIdsToDelete.has(noteId));

      if (selectionAffected) {
        selectedFolderId = folders[0]?.id ?? null;
        const fallbackId = selectedFolderId
          ? (findFolderById(folders, selectedFolderId)?.notes[0]?.id ?? null)
          : null;
        selectedNoteIds = fallbackId ? [fallbackId] : [];
        lastSelectedNoteId = fallbackId;
      }

      return {
        folders,
        notes,
        selectedNoteIds,
        lastSelectedNoteId,
        selectedFolderId,
      };
    });
  },

  setActiveTask: (id) => set({ activeTaskId: id }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setActiveView: (view) => set({ activeView: view }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  toggleSubtask: (taskId, subtaskId) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((st: Subtask) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st,
              ),
            }
          : t,
      ),
    }));
  },

  addSubtask: (taskId, title) => {
    const newSub: Subtask = {
      id: `sub-${Date.now()}`,
      title,
      completed: false,
    };
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, subtasks: [...t.subtasks, newSub] } : t,
      ),
    }));
  },

  addNoteLink: (noteId, item) => {
    const updateNote = (n: Note) => {
      if (n.id !== noteId) return n;
      const already = (n.linkedItems ?? []).some(
        (l) => l.id === item.id && l.type === item.type,
      );
      if (already) return n;
      return { ...n, linkedItems: [...(n.linkedItems ?? []), item] };
    };
    set((s) => {
      const notes = s.notes.map(updateNote);
      const updated = notes.find((n) => n.id === noteId);
      if (updated && s.vaultPath) {
        writeNoteMeta(s.vaultPath, noteId, {
          attachments: updated.attachments,
          linkedItems: updated.linkedItems,
        }).catch(console.error);
      }
      return {
        notes,
        folders: updateFolderNotes(s.folders, noteId, updateNote),
      };
    });
  },

  removeNoteLink: (noteId, itemId) => {
    const updateNote = (n: Note) =>
      n.id !== noteId
        ? n
        : {
            ...n,
            linkedItems: (n.linkedItems ?? []).filter((l) => l.id !== itemId),
          };
    set((s) => {
      const notes = s.notes.map(updateNote);
      const updated = notes.find((n) => n.id === noteId);
      if (updated && s.vaultPath) {
        writeNoteMeta(s.vaultPath, noteId, {
          attachments: updated.attachments,
          linkedItems: updated.linkedItems,
        }).catch(console.error);
      }
      return {
        notes,
        folders: updateFolderNotes(s.folders, noteId, updateNote),
      };
    });
  },

  addAttachment: (noteId, attachment) => {
    const updateNote = (n: Note) =>
      n.id !== noteId
        ? n
        : { ...n, attachments: [...(n.attachments ?? []), attachment] };
    set((s) => {
      const notes = s.notes.map(updateNote);
      const updated = notes.find((n) => n.id === noteId);
      if (updated && s.vaultPath) {
        writeNoteMeta(s.vaultPath, noteId, {
          attachments: updated.attachments,
          linkedItems: updated.linkedItems,
        }).catch(console.error);
      }
      return {
        notes,
        folders: updateFolderNotes(s.folders, noteId, updateNote),
      };
    });
  },

  removeAttachment: (noteId, attachmentId) => {
    const updateNote = (n: Note) =>
      n.id !== noteId
        ? n
        : {
            ...n,
            attachments: (n.attachments ?? []).filter(
              (a) => a.id !== attachmentId,
            ),
          };
    set((s) => {
      const notes = s.notes.map(updateNote);
      const updated = notes.find((n) => n.id === noteId);
      if (updated && s.vaultPath) {
        writeNoteMeta(s.vaultPath, noteId, {
          attachments: updated.attachments,
          linkedItems: updated.linkedItems,
        }).catch(console.error);
      }
      return {
        notes,
        folders: updateFolderNotes(s.folders, noteId, updateNote),
      };
    });
  },

  // ─── Board actions ──────────────────────────────────────────────────────────

  createBoard: (name) => {
    const boardId = `board-${Date.now()}`;
    const now = Date.now();
    const colDefs = [
      { name: "To Do", color: "blue" },
      { name: "In Progress", color: "amber" },
      { name: "In Review", color: "red" },
      { name: "Done", color: "green" },
    ];
    const columns: BoardColumn[] = colDefs.map((def, i) => ({
      id: `col-${now}-${i}`,
      boardId,
      name: def.name,
      color: def.color,
      taskIds: [],
    }));
    const board: Board = {
      id: boardId,
      name,
      columnIds: columns.map((c) => c.id),
    };
    set((s) => ({
      boards: [...s.boards, board],
      boardColumns: [...s.boardColumns, ...columns],
      activeBoardId: boardId,
    }));
  },

  deleteBoard: (id) => {
    set((s) => {
      const remaining = s.boards.filter((b) => b.id !== id);
      return {
        boards: remaining,
        boardColumns: s.boardColumns.filter((c) => c.boardId !== id),
        boardTasks: s.boardTasks.filter((t) => t.boardId !== id),
        activeBoardId: remaining[0]?.id ?? null,
      };
    });
  },

  setActiveBoardId: (id) => set({ activeBoardId: id }),

  setActiveBoardTaskId: (id) => set({ activeBoardTaskId: id }),

  addBoardColumn: (boardId, name) => {
    const colId = `col-${Date.now()}`;
    const column: BoardColumn = {
      id: colId,
      boardId,
      name,
      color: "blue",
      taskIds: [],
    };
    set((s) => ({
      boardColumns: [...s.boardColumns, column],
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, columnIds: [...b.columnIds, colId] } : b,
      ),
    }));
  },

  renameBoardColumn: (columnId, name) => {
    set((s) => ({
      boardColumns: s.boardColumns.map((c) =>
        c.id === columnId ? { ...c, name } : c,
      ),
    }));
  },

  deleteBoardColumn: (columnId) => {
    set((s) => {
      const column = s.boardColumns.find((c) => c.id === columnId);
      if (!column) return {};
      return {
        boardColumns: s.boardColumns.filter((c) => c.id !== columnId),
        boardTasks: s.boardTasks.filter((t) => t.columnId !== columnId),
        boards: s.boards.map((b) =>
          b.id === column.boardId
            ? { ...b, columnIds: b.columnIds.filter((id) => id !== columnId) }
            : b,
        ),
      };
    });
  },

  reorderBoardColumns: (boardId, columnIds) => {
    set((s) => ({
      boards: s.boards.map((b) => (b.id === boardId ? { ...b, columnIds } : b)),
    }));
  },

  createBoardTask: (columnId, title, priority = "medium") => {
    const column = get().boardColumns.find((c) => c.id === columnId);
    if (!column) return;
    const taskId = `btask-${Date.now()}`;
    const task: BoardTask = {
      id: taskId,
      boardId: column.boardId,
      columnId,
      title,
      description: "",
      priority,
      tags: [],
      subtasks: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      boardTasks: [...s.boardTasks, task],
      boardColumns: s.boardColumns.map((c) =>
        c.id === columnId ? { ...c, taskIds: [...c.taskIds, taskId] } : c,
      ),
    }));
  },

  updateBoardTask: (taskId, updates) => {
    set((s) => {
      const task = s.boardTasks.find((t) => t.id === taskId);
      if (!task) return {};
      const newTask = { ...task, ...updates };
      // If columnId changed, move task between column arrays
      if (updates.columnId && updates.columnId !== task.columnId) {
        const columns = s.boardColumns.map((c) => {
          if (c.id === task.columnId)
            return { ...c, taskIds: c.taskIds.filter((id) => id !== taskId) };
          if (c.id === updates.columnId)
            return { ...c, taskIds: [...c.taskIds, taskId] };
          return c;
        });
        return {
          boardTasks: s.boardTasks.map((t) => (t.id === taskId ? newTask : t)),
          boardColumns: columns,
        };
      }
      return {
        boardTasks: s.boardTasks.map((t) => (t.id === taskId ? newTask : t)),
      };
    });
  },

  deleteBoardTask: (taskId) => {
    set((s) => {
      const task = s.boardTasks.find((t) => t.id === taskId);
      if (!task) return {};
      return {
        boardTasks: s.boardTasks.filter((t) => t.id !== taskId),
        boardColumns: s.boardColumns.map((c) =>
          c.id === task.columnId
            ? { ...c, taskIds: c.taskIds.filter((id) => id !== taskId) }
            : c,
        ),
      };
    });
  },

  addBoardTaskSubtask: (taskId, title) => {
    const sub: Subtask = { id: `bsub-${Date.now()}`, title, completed: false };
    set((s) => ({
      boardTasks: s.boardTasks.map((t) =>
        t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub] } : t,
      ),
    }));
  },

  toggleBoardTaskSubtask: (taskId, subtaskId) => {
    set((s) => ({
      boardTasks: s.boardTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st,
              ),
            }
          : t,
      ),
    }));
  },

  deleteBoardTaskSubtask: (taskId, subtaskId) => {
    set((s) => ({
      boardTasks: s.boardTasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subtaskId) }
          : t,
      ),
    }));
  },

  addBoardTaskComment: (taskId, content) => {
    const comment: BoardComment = {
      id: `bcmt-${Date.now()}`,
      author: "You",
      avatar: "Y",
      content,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      boardTasks: s.boardTasks.map((t) =>
        t.id === taskId
          ? { ...t, comments: [...(t.comments ?? []), comment] }
          : t,
      ),
    }));
  },

  moveBoardTask: (taskId, toColumnId, beforeTaskId = null) => {
    set((s) => {
      const task = s.boardTasks.find((t) => t.id === taskId);
      if (!task) return {};
      const fromColumnId = task.columnId;
      const columns = s.boardColumns.map((c) => {
        if (c.id === fromColumnId && c.id !== toColumnId) {
          return { ...c, taskIds: c.taskIds.filter((id) => id !== taskId) };
        }
        if (c.id === toColumnId) {
          const filtered = c.taskIds.filter((id) => id !== taskId);
          if (beforeTaskId === null)
            return { ...c, taskIds: [...filtered, taskId] };
          const idx = filtered.indexOf(beforeTaskId);
          const inserted =
            idx === -1
              ? [...filtered, taskId]
              : [...filtered.slice(0, idx), taskId, ...filtered.slice(idx)];
          return { ...c, taskIds: inserted };
        }
        return c;
      });
      return {
        boardColumns: columns,
        boardTasks: s.boardTasks.map((t) =>
          t.id === taskId ? { ...t, columnId: toColumnId } : t,
        ),
      };
    });
  },
}));
