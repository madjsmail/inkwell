<div align="center">
  <img src="src/assets/inkwell-icon.svg" width="100" height="100" alt="inkwell logo" />

  <h1>inkwell</h1>
  <p>A focused, beautiful markdown note-taking app for macOS.</p>

  ![Version](https://img.shields.io/badge/version-0.1.0-orange?style=flat-square)
  ![Platform](https://img.shields.io/badge/platform-macOS-black?style=flat-square)
  ![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square&color=c47d2e)
</div>

---

## Overview

inkwell is a local-first markdown editor built as a native macOS desktop app. Notes are stored as plain `.md` files in a vault folder you own — no cloud, no accounts, no lock-in.

It pairs a distraction-free writing environment with a rich live preview, a Kanban board, and a suite of themes that make long writing sessions comfortable.

---

## Features

**Writing**
- Distraction-free CodeMirror 6 editor with markdown syntax decoration
- Live split-view preview with full GFM rendering (tables, task lists, strikethrough)
- Syntax-highlighted code blocks that adapt to the active theme
- Inline code, blockquotes, ==highlights==, and embedded images

**Organisation**
- Vault-based storage — notes live as real `.md` files on disk
- Nested folders with drag-and-drop reordering
- Kanban board view with columns, cards, due dates, and subtasks
- Full-text search across all notes (⌘K)
- Starred / favourites and trash with soft-delete

**Themes**
- 8 built-in themes: Midnight, Parchment, Ink, Dusk, Forest, Sepia, Gruvbox, Fog
- Custom theme builder with live preview
- Syntax highlight colours automatically follow the active theme

**Export & Share**
- Export notes as Markdown, standalone HTML, or PDF
- Live preview before exporting
- One-click copy to clipboard

**macOS**
- Native window with overlay title bar
- Optional frosted-glass sidebar (Settings → Appearance → Glass sidebar)
- Smooth scrolling, native vibrancy, system font stack

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) (Rust) |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v3 |
| Editor | CodeMirror 6 |
| State | Zustand |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| Drag & drop | @dnd-kit/core |
| Build | Vite |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io)
- [Rust](https://rustup.rs) (stable toolchain)
- Xcode Command Line Tools (`xcode-select --install`)

### Development

```bash
# Clone and install dependencies
git clone https://github.com/your-username/inkwell.git
cd inkwell
pnpm install

# Start the dev server (hot-reload on frontend changes, recompile on Rust changes)
pnpm tauri dev
```

### Build for production

```bash
pnpm tauri build
```

The output `.app` and `.dmg` are written to `src-tauri/target/release/bundle/macos/`.

To update an existing installation, drag the new `.app` onto the old one in `/Applications` and click **Replace**.

---

## Project Structure

```
inkwell/
├── src/
│   ├── components/
│   │   ├── editor/       # MarkdownEditor, RichPreview, ShareDialog
│   │   ├── layout/       # AppShell, Sidebar, NoteList, EditorPane
│   │   ├── board/        # Kanban BoardView, KanbanColumn, TaskCard
│   │   ├── settings/     # SettingsDialog, ThemeEditor
│   │   └── shared/       # Search, dialogs, context menus
│   ├── store/            # Zustand store (useAppStore)
│   ├── lib/              # Vault I/O, export, themes, utilities
│   ├── styles/           # globals.css — CSS variables & theme definitions
│   └── types/            # TypeScript interfaces
└── src-tauri/
    ├── src/lib.rs        # Tauri commands (vibrancy, etc.)
    └── tauri.conf.json   # Window config, permissions
```

---

## License

MIT
