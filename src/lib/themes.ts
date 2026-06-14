export interface ThemeDef {
  id: string
  label: string
  description: string
  dark: boolean
  preview: {
    bg: string
    sidebar: string
    accent: string
    text: string
    border: string
  }
}

export const THEMES: ThemeDef[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Warm dark with amber glow',
    dark: true,
    preview: { bg: '#1a1714', sidebar: '#161412', accent: '#c07840', text: '#f5f4f2', border: '#2e2a26' },
  },
  {
    id: 'parchment',
    label: 'Parchment',
    description: 'Warm cream with golden ink',
    dark: false,
    preview: { bg: '#f8f5f0', sidebar: '#ede9e0', accent: '#b86e2a', text: '#1e1b17', border: '#e0d8cc' },
  },
  {
    id: 'ink',
    label: 'Ink',
    description: 'Deep dark with steel blue',
    dark: true,
    preview: { bg: '#0e1117', sidebar: '#0b0e14', accent: '#4da3e8', text: '#e6ecf5', border: '#1c2333' },
  },
  {
    id: 'dusk',
    label: 'Dusk',
    description: 'Indigo night with soft violet',
    dark: true,
    preview: { bg: '#12101e', sidebar: '#100e1a', accent: '#9b72f0', text: '#eeebfa', border: '#201d32' },
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Deep green with sage light',
    dark: true,
    preview: { bg: '#0c1410', sidebar: '#0a1110', accent: '#4db87a', text: '#e8f3ec', border: '#172519' },
  },
  {
    id: 'gruvbox',
    label: 'Gruvbox',
    description: 'Retro groove with warm earth tones',
    dark: true,
    preview: { bg: '#282828', sidebar: '#1d2021', accent: '#d79921', text: '#ebdbb2', border: '#504945' },
  },
  {
    id: 'sepia',
    label: 'Sepia',
    description: 'Aged paper with terracotta',
    dark: false,
    preview: { bg: '#f4ebda', sidebar: '#ede2cf', accent: '#c04a1a', text: '#2a1e14', border: '#ddd1bb' },
  },
  {
    id: 'fog',
    label: 'Fog',
    description: 'Cool silver with slate blue',
    dark: false,
    preview: { bg: '#f4f6f9', sidebar: '#eaedf2', accent: '#2563eb', text: '#1a2030', border: '#dde2ea' },
  },
]

export const isDarkTheme = (id: string): boolean =>
  THEMES.find(t => t.id === id)?.dark ?? true

export const DARK_THEMES = THEMES.filter(t => t.dark)
export const LIGHT_THEMES = THEMES.filter(t => !t.dark)

// ─── Custom themes ────────────────────────────────────────────────────────────

export interface CustomTheme {
  id: string
  label: string
  dark: boolean
  colors: {
    background: string  // hex
    foreground: string  // hex
    sidebar: string     // hex
    accent: string      // hex
    border: string      // hex
  }
}

const CUSTOM_THEMES_KEY = 'inkwell-custom-themes'

export function loadCustomThemes(): CustomTheme[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function persistCustomThemes(themes: CustomTheme[]): void {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
}
