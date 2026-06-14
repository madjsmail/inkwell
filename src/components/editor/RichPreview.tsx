import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { remarkHighlight } from '../../lib/remarkHighlight'
import { useAppStore } from '../../store/useAppStore'
// No external hljs stylesheet — token colors come from CSS variables in globals.css

interface RichPreviewProps {
  content: string
  noteId?: string
  searchQuery?: string
  searchMatchIndex?: number
}

const isTauriEnv = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// Module-level cache: absPath → data URL. Persists across re-renders and note switches.
const imageCache = new Map<string, string>()

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
}

/** Renders an external (http/https) image with a styled error fallback. */
function ExternalImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground border border-border/40 rounded-md px-2 py-1 my-2">
        <span className="opacity-60">⚠</span> Could not load image — make sure the URL points directly to an image, not a webpage.
      </span>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="max-w-full rounded-lg my-4 border border-border/40"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

/** Renders a local image by reading it via plugin-fs and converting to a data URL. */
function LocalImage({ absPath, alt }: { absPath: string; alt: string }) {
  const [dataSrc, setDataSrc] = useState(() => imageCache.get(absPath) ?? '')

  useEffect(() => {
    if (!isTauriEnv || imageCache.has(absPath)) return
    import('@tauri-apps/plugin-fs')
      .then(({ readFile }) => readFile(absPath))
      .then(bytes => {
        const ext = absPath.split('.').pop()?.toLowerCase() ?? 'jpg'
        const mime = MIME[ext] ?? 'image/jpeg'
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        const dataUrl = `data:${mime};base64,${btoa(binary)}`
        imageCache.set(absPath, dataUrl)
        setDataSrc(dataUrl)
      })
      .catch(e => console.error('Failed to load image:', absPath, e))
  }, [absPath])

  return (
    <img
      src={dataSrc}
      alt={alt}
      className="max-w-full rounded-lg my-4 border border-border/40"
    />
  )
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children)
  }
  return ''
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(getText())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-2 py-0.5 rounded bg-surface border border-border text-muted-foreground hover:text-foreground"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export function RichPreview({ content, noteId, searchQuery = '', searchMatchIndex = 0 }: RichPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<number | null>(null)
  const { updateNote, vaultPath } = useAppStore()

  // Restore scroll position synchronously before the browser repaints,
  // preventing the visible jump when markdown re-parses after a toggle.
  useLayoutEffect(() => {
    if (pendingScrollRef.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop = pendingScrollRef.current
      pendingScrollRef.current = null
    }
  })

  // ── Search highlighting in preview DOM ──────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Remove previous highlights
    container.querySelectorAll('mark.inkwell-search').forEach(el => {
      const parent = el.parentNode
      if (!parent) return
      while (el.firstChild) parent.insertBefore(el.firstChild, el)
      parent.removeChild(el)
      parent.normalize()
    })

    if (!searchQuery || searchQuery.length < 1) return

    const query = searchQuery.toLowerCase()
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // Skip text inside <code> and <pre> blocks
        let el = node.parentElement
        while (el) {
          if (el.tagName === 'CODE' || el.tagName === 'PRE') return NodeFilter.FILTER_REJECT
          el = el.parentElement
        }
        return NodeFilter.FILTER_ACCEPT
      }
    })

    const textNodes: Text[] = []
    let node: Text | null
    while ((node = walker.nextNode() as Text)) textNodes.push(node)

    let matchCount = 0
    textNodes.forEach(textNode => {
      const text = textNode.textContent ?? ''
      if (!text.toLowerCase().includes(query)) return
      const fragment = document.createDocumentFragment()
      let last = 0
      let pos = text.toLowerCase().indexOf(query)
      while (pos !== -1) {
        if (pos > last) fragment.appendChild(document.createTextNode(text.slice(last, pos)))
        const mark = document.createElement('mark')
        mark.className = matchCount === searchMatchIndex
          ? 'inkwell-search inkwell-search-active'
          : 'inkwell-search'
        mark.textContent = text.slice(pos, pos + searchQuery.length)
        fragment.appendChild(mark)
        matchCount++
        last = pos + searchQuery.length
        pos = text.toLowerCase().indexOf(query, last)
      }
      if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)))
      textNode.parentNode?.replaceChild(fragment, textNode)
    })

    // Scroll active match into view
    const active = container.querySelector('mark.inkwell-search-active')
    active?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [searchQuery, searchMatchIndex, content])

  // ── DOM-position-based handler: find the checkbox's index among all checkboxes
  // in the committed DOM at event time instead of counting during render.
  // This is immune to React StrictMode's double-invocation of components.
  const handleCheckboxMouseDown = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    e.preventDefault()

    const container = containerRef.current
    if (!container) return
    const allCheckboxes = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    )
    const index = allCheckboxes.indexOf(e.currentTarget)
    if (index === -1) return

    if (scrollRef.current) pendingScrollRef.current = scrollRef.current.scrollTop

    const state = useAppStore.getState()
    const targetId = noteId ?? state.lastSelectedNoteId ?? state.selectedNoteIds[0]
    if (!targetId) return
    const note = state.notes.find(n => n.id === targetId)
    if (!note) return

    let count = 0
    const updated = note.content.replace(/- \[[ xX]\]/g, (match) => {
      const hit = count === index
      count++
      if (!hit) return match
      return match.toLowerCase() === '- [x]' ? '- [ ]' : '- [x]'
    })
    updateNote(targetId, updated)
  }, [noteId, updateNote])

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-8 py-6 antialiased">
      <div ref={containerRef} className="max-w-[720px] mx-auto font-sans text-[15px] leading-[1.7] text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkHighlight]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-semibold mb-4 text-foreground leading-tight tracking-tight">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mb-3 text-accent mt-8 tracking-tight">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-semibold mb-2 text-foreground mt-6 tracking-tight">{children}</h3>
            ),
            p: ({ children }) => <p className="mb-4 text-foreground">{children}</p>,

            // react-markdown v9 removed the `inline` prop.
            // Detect inline code by the absence of a language class and no newlines in content.
            code: ({ className, children, ...props }) => {
              const isBlock = className?.startsWith('language-') || String(children).includes('\n')
              return isBlock ? (
                <code className={className} {...props}>{children}</code>
              ) : (
                <code className="font-mono text-[13px] text-accent bg-code-bg px-1.5 py-0.5 rounded" {...props}>
                  {children}
                </code>
              )
            },

            pre: ({ children }) => (
              <div className="relative group mb-4">
                <pre className="inkwell-code-block font-mono text-[13px] p-4 rounded-lg overflow-x-auto border border-border/50">
                  {children}
                </pre>
                <CopyButton getText={() => extractText(children)} />
              </div>
            ),

            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-accent pl-4 my-4 text-muted-foreground italic">
                {children}
              </blockquote>
            ),

            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr className="border-b border-border/50 hover:bg-surface/50 transition-colors">{children}</tr>,
            th: ({ children }) => (
              <th className="px-3 py-2.5 text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wide">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2.5 text-foreground text-[14px]">{children}</td>
            ),

            ul: ({ children, className }) =>
              className === 'contains-task-list' ? (
                <ul className="mb-4 space-y-1 list-none pl-4">{children}</ul>
              ) : (
                <ul className="list-disc list-inside mb-4 space-y-1 text-foreground">{children}</ul>
              ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-1 text-foreground">{children}</ol>
            ),

            li: ({ children, className }) => {
              if (className === 'task-list-item') {
                return (
                  <li className="flex flex-wrap items-start gap-x-2 leading-[1.7] list-none [&>ul]:w-full [&>ul]:mt-1 [&>ol]:w-full [&>ol]:mt-1">
                    {children}
                  </li>
                )
              }
              return <li className="leading-[1.7]">{children}</li>
            },

            input: ({ type, checked }) => {
              if (type !== 'checkbox') return null
              return (
                <input
                  type="checkbox"
                  checked={checked === true}
                  disabled={false}
                  readOnly={false}
                  onChange={() => {}} // controlled; actual toggle via onMouseDown
                  onMouseDown={handleCheckboxMouseDown}
                  className="w-[15px] h-[15px] mt-[3px] shrink-0 rounded cursor-pointer"
                  style={{ accentColor: 'hsl(var(--accent))' }}
                />
              )
            },

            a: ({ children, href }) => (
              <a href={href} className="text-accent underline underline-offset-2 hover:opacity-80">
                {children}
              </a>
            ),
            hr: () => <hr className="border-border my-6" />,

            img: ({ src, alt }) => {
              const isExternal = !src || /^(https?:|data:|blob:)/.test(src)
              if (isExternal) {
                return <ExternalImage src={src ?? ''} alt={alt ?? ''} />
              }
              const absPath = vaultPath
                ? (src.startsWith('/') ? src : `${vaultPath}/${src}`)
                : src
              return <LocalImage absPath={absPath} alt={alt ?? ''} />
            },

            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
            em: ({ children }) => <em className="italic text-foreground">{children}</em>,

            // <mark> produced by remarkHighlight from ==text==
            mark: ({ children }) => (
              <mark className="bg-yellow-300/30 text-foreground rounded px-0.5">{children}</mark>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
