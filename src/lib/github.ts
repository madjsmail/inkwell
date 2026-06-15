/**
 * GitHub API client for inkwell.
 *
 * All calls go to https://api.github.com using a Personal Access Token.
 * Token and default owner are stored in localStorage (never in vault files).
 *
 * Storage keys:
 *   inkwell-github-token  — PAT with `repo` scope
 *   inkwell-github-owner  — default owner/org username
 */

const GITHUB_API = 'https://api.github.com'

// ── localStorage helpers ──────────────────────────────────────────────────────

export function getGithubToken(): string {
  return localStorage.getItem('inkwell-github-token') ?? ''
}
export function setGithubToken(token: string) {
  localStorage.setItem('inkwell-github-token', token)
}

export function getGithubOwner(): string {
  return localStorage.getItem('inkwell-github-owner') ?? ''
}
export function setGithubOwner(owner: string) {
  localStorage.setItem('inkwell-github-owner', owner)
}

export function isGithubConfigured(): boolean {
  return getGithubToken().length > 0 && getGithubOwner().length > 0
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GhRepo {
  name: string
  full_name: string
  description: string | null
  private: boolean
  default_branch: string
  html_url: string
}

export interface GhFile {
  path: string
  name: string
  sha: string
  content: string   // decoded (not base64)
  html_url: string
}

export interface GhTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function ghFetch(
  method: 'GET' | 'PUT',
  path: string,
  body?: unknown,
): Promise<Response> {
  const token = getGithubToken()
  if (!token) throw new Error('GitHub token not configured. Go to Settings → GitHub.')

  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(`GitHub API error ${res.status}: ${err.message ?? res.statusText}`)
  }

  return res
}

// ── API functions ─────────────────────────────────────────────────────────────

/** List repos for the authenticated user, sorted by recently updated. */
export async function listRepos(perPage = 50): Promise<GhRepo[]> {
  const res = await ghFetch('GET', `/user/repos?per_page=${perPage}&sort=updated&type=owner`)
  return res.json()
}

/**
 * Fetch a file's content from a repo.
 * Returns null if the file doesn't exist (404).
 */
export async function getFile(
  owner: string,
  repo: string,
  path: string,
): Promise<GhFile | null> {
  const token = getGithubToken()
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(`GitHub API error ${res.status}: ${err.message ?? res.statusText}`)
  }

  const data = await res.json() as {
    path: string; name: string; sha: string; content: string; html_url: string
  }

  // GitHub base64-encodes file content with embedded newlines
  const clean = data.content.replace(/\n/g, '')
  const decoded = atob(clean)

  return {
    path: data.path,
    name: data.name,
    sha: data.sha,
    content: decoded,
    html_url: data.html_url,
  }
}

/**
 * Create or update a file in a repo.
 * Pass `sha` when updating an existing file (required by GitHub API).
 */
export async function pushFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  options: { sha?: string; message?: string } = {},
): Promise<{ html_url: string; sha: string }> {
  const encoded = btoa(unescape(encodeURIComponent(content))) // UTF-8 safe base64
  const message = options.message ?? (options.sha ? 'docs: update from inkwell' : 'docs: create from inkwell')

  const body: Record<string, string> = { message, content: encoded }
  if (options.sha) body.sha = options.sha

  const res = await ghFetch('PUT', `/repos/${owner}/${repo}/contents/${path}`, body)
  const data = await res.json() as { content: { html_url: string; sha: string } }
  return { html_url: data.content.html_url, sha: data.content.sha }
}

/**
 * List all .md files in a repo (recursive tree walk).
 * Useful for picking a target path or pulling docs.
 */
export async function listMarkdownFiles(
  owner: string,
  repo: string,
  branch = 'main',
): Promise<GhTreeItem[]> {
  const res = await ghFetch('GET', `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`)
  const data = await res.json() as { tree: GhTreeItem[] }
  return data.tree.filter(
    (item) => item.type === 'blob' && item.path.endsWith('.md'),
  )
}

/**
 * High-level: push an inkwell note to GitHub.
 * Automatically fetches the existing SHA if the file already exists.
 * Returns the GitHub URL of the file.
 */
export async function syncNoteToGithub(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message?: string,
): Promise<string> {
  // Check if file exists to get its SHA
  const existing = await getFile(owner, repo, path)
  const result = await pushFile(owner, repo, path, content, {
    sha: existing?.sha,
    message,
  })
  return result.html_url
}

/**
 * High-level: pull a file from GitHub into inkwell.
 * Returns the raw file content.
 */
export async function pullNoteFromGithub(
  owner: string,
  repo: string,
  path: string,
): Promise<string> {
  const file = await getFile(owner, repo, path)
  if (!file) throw new Error(`File not found: ${owner}/${repo}/${path}`)
  return file.content
}
