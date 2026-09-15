import { schema as basicSchema } from 'prosemirror-schema-basic'
import { Schema } from 'prosemirror-model'

/**
 * Shared editor schema. Keeping this in one place ensures live documents and
 * read-only revision previews understand the same formatting marks.
 */
export const editorSchema = new Schema({
  nodes: basicSchema.spec.nodes,
  marks: basicSchema.spec.marks.addToEnd('textStyle', {
    attrs: {
      fontFamily: { default: null },
      fontSize: { default: null },
    },
    parseDOM: [{
      tag: 'span[style]',
      getAttrs: (dom: HTMLElement) => ({
        fontFamily: dom.style.fontFamily || null,
        fontSize: dom.style.fontSize || null,
      }),
    }],
    toDOM(mark) {
      const { fontFamily, fontSize } = mark.attrs
      const style = [fontFamily && `font-family: ${fontFamily}`, fontSize && `font-size: ${fontSize}`].filter(Boolean).join('; ')
      return ['span', { style }, 0]
    },
  }),
})
