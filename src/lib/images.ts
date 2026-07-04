const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Opens the system file picker, copies the chosen image into {vaultPath}/assets/,
 *  and returns the ready-to-insert markdown snippet, e.g. `![image](assets/photo.jpg)`. */
export async function pickAndCopyImage(vaultPath: string): Promise<string | null> {
  if (!isTauri) return null
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile, writeFile, mkdir, exists } = await import('@tauri-apps/plugin-fs')
    const { basename } = await import('@tauri-apps/api/path')

    const selected = await open({
      multiple: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'] }],
    })

    if (!selected || typeof selected !== 'string') return null

    const assetsDir = `${vaultPath}/assets`
    if (!(await exists(assetsDir))) {
      await mkdir(assetsDir, { recursive: true })
    }

    const filename = await basename(selected)
    const bytes = await readFile(selected)
    await writeFile(`${assetsDir}/${filename}`, bytes)

    return `![image](assets/${filename})`
  } catch (e) {
    console.error('Failed to pick/copy image:', e)
    return null
  }
}

