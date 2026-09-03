import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { EditorState } from 'prosemirror-state'
import type YjsStompProvider from './YjsStompProvider'

export const presencePluginKey = new PluginKey<DecorationSet>('presence')

// ── Cursor DOM element ────────────────────────────────────────────────────────

function createCursorElement(user: { id: number; name: string; color: string }): HTMLElement {
  const el = document.createElement('span')
  el.className             = 'remote-cursor'
  el.style.borderColor     = user.color || 'red'
  el.style.backgroundColor = user.color || 'red'
  // data-label is used by ::after to show the floating name tag
  el.dataset.label         = user.name || `User ${user.id}`
  return el
}

// ── Build all remote-cursor decorations ───────────────────────────────────────

function buildDecorations(state: EditorState, provider: YjsStompProvider): DecorationSet {
  const decorations: Decoration[] = []

  provider.getUsers().forEach((awarenessState, clientId) => {
    if (clientId === provider.getClientId()) return
    const user   = (awarenessState as any)?.user
    const cursor = (awarenessState as any)?.cursor
    if (!user || !cursor) return

    const positions = provider.getCursorPosition(cursor)
    if (!positions) return

    const { anchor, head } = positions
    const color = user.color || 'red'

    // Selection highlight
    if (anchor !== head) {
      const from = Math.min(anchor, head)
      const to   = Math.max(anchor, head)
      try {
        decorations.push(
          Decoration.inline(from, to, {
            class: 'remote-selection',
            style: `background-color: ${color}33;`,
          })
        )
      } catch { /* position out of range — skip */ }
    }

    // Cursor caret widget
    try {
      decorations.push(
        Decoration.widget(head, createCursorElement(user), {
          side: 0,
          key:  `cursor-${clientId}`,
        })
      )
    } catch { /* skip */ }
  })

  return DecorationSet.create(state.doc, decorations)
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export function createPresencePlugin(provider: YjsStompProvider): Plugin {
  return new Plugin<DecorationSet>({
    key: presencePluginKey,

    state: {
      init(_config, state) {
        return buildDecorations(state, provider)
      },
      apply(tr, oldSet, _oldState, newState) {
        // Always remap after doc changes
        let set = oldSet.map(tr.mapping, tr.doc)
        // Rebuild when awareness explicitly changed
        if (tr.getMeta(presencePluginKey)) {
          set = buildDecorations(newState, provider)
        }
        return set
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)
      },
    },
  })
}
