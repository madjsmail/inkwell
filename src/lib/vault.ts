import type { Folder, Note, Task, Board, BoardColumn, BoardTask } from '../types'

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const VAULT_FILE = 'inkwell.json'
const RECENT_KEY = 'inkwell-recent-vaults'
const LAST_VAULT_KEY = 'inkwell-last-vault'

export interface VaultData {
  version: number
  folders: Folder[]
  notes: Note[]
  tasks: Task[]
  boards?: Board[]
  boardColumns?: BoardColumn[]
  boardTasks?: BoardTask[]
}

export interface RecentVault {
  path: string
  name: string
  lastOpenedAt: string
}

export async function pickVaultDirectory(): Promise<string | null> {
  if (!isTauri) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const result = await open({ directory: true, multiple: false, title: 'Choose Vault Folder' })
  if (typeof result === 'string') return result
  return null
}

function reviveDates(key: string, value: unknown): unknown {
  if (typeof value === 'string' && (key === 'createdAt' || key === 'updatedAt' || key === 'dueDate' || key === 'lastOpenedAt')) {
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d
  }
  return value
}

export async function readVault(vaultPath: string): Promise<VaultData | null> {
  if (!isTauri) return null
  try {
    const { readTextFile, exists } = await import('@tauri-apps/plugin-fs')
    const filePath = `${vaultPath}/${VAULT_FILE}`
    const fileExists = await exists(filePath)
    if (!fileExists) return null
    const json = await readTextFile(filePath)
    return JSON.parse(json, reviveDates) as VaultData
  } catch (e) {
    console.error('Failed to read vault:', e)
    return null
  }
}

export async function writeVault(vaultPath: string, data: VaultData): Promise<void> {
  if (!isTauri) return
  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const filePath = `${vaultPath}/${VAULT_FILE}`
    await writeTextFile(filePath, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('Failed to write vault:', e)
  }
}

export function getRecentVaults(): RecentVault[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as RecentVault[]) : []
  } catch {
    return []
  }
}

export function addRecentVault(path: string): void {
  const name = path.split('/').pop() ?? path
  const vaults = getRecentVaults().filter((v) => v.path !== path)
  vaults.unshift({ path, name, lastOpenedAt: new Date().toISOString() })
  localStorage.setItem(RECENT_KEY, JSON.stringify(vaults.slice(0, 8)))
  localStorage.setItem(LAST_VAULT_KEY, path)
}

export function removeRecentVault(path: string): void {
  const vaults = getRecentVaults().filter((v) => v.path !== path)
  localStorage.setItem(RECENT_KEY, JSON.stringify(vaults))
  if (localStorage.getItem(LAST_VAULT_KEY) === path) {
    localStorage.removeItem(LAST_VAULT_KEY)
  }
}

export function getLastVaultPath(): string | null {
  return localStorage.getItem(LAST_VAULT_KEY)
}
