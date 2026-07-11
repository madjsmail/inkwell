// Wraps @tauri-apps/plugin-updater's check() — this talks to the signed
// `latest.json` manifest published alongside GitHub releases (see
// tauri.conf.json's plugins.updater config and .github/workflows/release.yml),
// verifies the update's signature, and hands back an `Update` object whose own
// downloadAndInstall()/close() methods do the real work. No manual version
// comparison or GitHub REST polling needed — the plugin handles all of that.

import type { Update } from '@tauri-apps/plugin-updater'

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Resolves to null if there's no update, or if running outside Tauri. */
export async function checkForAppUpdate(): Promise<Update | null> {
  if (!isTauri) return null
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    return await check()
  } catch (e) {
    console.error('[inkwell] update check failed:', e)
    return null
  }
}
