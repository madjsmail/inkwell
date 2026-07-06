export interface LinkedItem {
  type: 'note' | 'board'
  id: string
}

export interface Note {
  id: string
  title: string
  content: string
  path: string
  folder: string | null
  tags: string[]
  pinned: boolean
  createdAt: Date
  updatedAt: Date
  wordCount: number
  attachments: Attachment[]
  linkedItems: LinkedItem[]
  /** True for a standalone .md file opened from outside the vault tree (see vault.ts "External files"). */
  external?: boolean
  /** For external notes: extra directory to search when resolving embeds/images that live in the note's own source vault, not this one. */
  searchRoot?: string
}

export interface Folder {
  id: string
  name: string
  path: string
  parentId: string | null
  children: Folder[]
  notes: Note[]
  expanded: boolean
}

export interface Attachment {
  id: string
  name: string
  path: string
  size: number
  type: 'pdf' | 'image' | 'video' | 'other'
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'in-review' | 'done'
  priority: 'low' | 'medium' | 'high'
  tags: string[]
  assignee?: string
  assigneeAvatar?: string
  dueDate?: Date
  subtasks: Subtask[]
  comments: Comment[]
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Comment {
  id: string
  author: string
  avatar: string
  content: string
  createdAt: Date
}

export type ViewMode = 'edit' | 'split' | 'preview'
export type ActiveView = 'notes' | 'board' | 'trash' | 'canvas' | 'planner'

// ─── Weekly Planner ───────────────────────────────────────────────────────────

export interface PlannerTask {
  id: string
  text: string
  done: boolean
  label?: string   // category label, e.g. "DESIGN", "PERSONAL"
}

export interface PlannerDay {
  date: string   // 'YYYY-MM-DD'
  tasks: PlannerTask[]
}

/** Keyed by the Monday ISO date of each week, e.g. "2025-06-16" */
export type WeeklyPlan = Record<string, PlannerDay[]>

// ─── Board system ─────────────────────────────────────────────────────────────

export interface Board {
  id: string
  name: string
  columnIds: string[]  // ordered
}

export interface BoardColumn {
  id: string
  boardId: string
  name: string
  color: string  // 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'gray'
  taskIds: string[]  // ordered
}

export interface BoardComment {
  id: string
  author: string
  avatar: string
  content: string
  createdAt: string  // ISO date string
}

export interface BoardTask {
  id: string
  boardId: string
  columnId: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  tags: string[]
  assignee?: string
  dueDate?: string  // ISO date string
  subtasks: Subtask[]
  comments: BoardComment[]
  createdAt: string  // ISO date string
}
