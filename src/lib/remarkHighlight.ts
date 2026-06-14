import { visit } from 'unist-util-visit'
import type { Root, Text, Parent } from 'mdast'

// Transforms ==text== into <mark>text</mark> HTML nodes (rendered by rehype-raw)
export function remarkHighlight() {
  return (tree: Root) => {
    const MARK_RE = /==([^=\n]+)==/g

    visit(tree, 'text', (node: Text, index, parent: Parent | null) => {
      if (!parent || index == null) return

      const matches = [...node.value.matchAll(MARK_RE)]
      if (matches.length === 0) return

      const newNodes: Array<Text | { type: 'html'; value: string }> = []
      let lastIndex = 0

      for (const match of matches) {
        const matchIndex = match.index!
        if (matchIndex > lastIndex) {
          newNodes.push({ type: 'text', value: node.value.slice(lastIndex, matchIndex) })
        }
        newNodes.push({ type: 'html', value: `<mark>${match[1]}</mark>` })
        lastIndex = matchIndex + match[0].length
      }

      if (lastIndex < node.value.length) {
        newNodes.push({ type: 'text', value: node.value.slice(lastIndex) })
      }

      parent.children.splice(index, 1, ...(newNodes as Parent['children']))
    })
  }
}
