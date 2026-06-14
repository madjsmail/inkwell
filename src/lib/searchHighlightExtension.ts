import { StateEffect, StateField, RangeSetBuilder } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'

export interface SearchHighlightSpec {
  ranges: Array<{ from: number; to: number }>
  activeIndex: number
}

export const setSearchHighlights = StateEffect.define<SearchHighlightSpec>()

const matchDeco = Decoration.mark({ class: 'cm-inkwell-search' })
const activeDeco = Decoration.mark({ class: 'cm-inkwell-search cm-inkwell-search-active' })

export const searchHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decos, tr) {
    decos = decos.map(tr.changes)
    for (const effect of tr.effects) {
      if (effect.is(setSearchHighlights)) {
        const { ranges, activeIndex } = effect.value
        if (!ranges.length) {
          decos = Decoration.none
        } else {
          const builder = new RangeSetBuilder<Decoration>()
          ranges.forEach(({ from, to }, i) => {
            builder.add(from, to, i === activeIndex ? activeDeco : matchDeco)
          })
          decos = builder.finish()
        }
      }
    }
    return decos
  },
  provide: f => EditorView.decorations.from(f),
})

export const searchHighlightTheme = EditorView.baseTheme({
  '.cm-inkwell-search': {
    backgroundColor: 'hsl(47 96% 53% / 0.3)',
    borderRadius: '2px',
    padding: '0 1px',
  },
  '.cm-inkwell-search-active': {
    backgroundColor: 'hsl(47 96% 53% / 0.75) !important',
    outline: '1.5px solid hsl(47 96% 53% / 0.9)',
  },
})

export const searchHighlightExtension = [searchHighlightField, searchHighlightTheme]
