import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'

interface RichEditorProps {
  /** Initial markdown — the document `content` stays markdown end to end. */
  content: string
  /** Fired with the updated MARKDOWN on every change (caller debounces the save). */
  onChange: (markdown: string) => void
}

/**
 * WYSIWYG editor for LONG-FORM canvas docs (briefs, emails, generic) — formatting
 * renders as formatting instead of raw `**`/`##`. Markdown in, markdown out, so
 * versions/undo/span-patch see the exact same content model as the raw textarea.
 * Ad/social doc types deliberately keep in-preview editing + the Text view.
 * Lazy-loaded (see canvas-pane) so TipTap stays out of the main chat bundle.
 */
const RichEditor = ({ content, onChange }: RichEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit, // includes history → native Cmd+Z keeps working
      Markdown.configure({ html: false, linkify: true }),
    ],
    // The Markdown extension makes TipTap parse `content` as markdown directly.
    content,
    onUpdate: ({ editor: e }) => {
      // tiptap-markdown registers untyped storage — cast once here.
      const md = (e.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown
      onChange(md.getMarkdown())
    },
    editorProps: {
      attributes: {
        // Match ChatMarkdown's reading rhythm with semantic tokens.
        class:
          'outline-none min-h-[60vh] paragraph-md text-primary ' +
          '[&_h1]:title-h5 [&_h2]:title-h6 [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:font-semibold [&_h3]:mt-3 ' +
          '[&_p]:my-2 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5 ' +
          '[&_blockquote]:border-l-2 [&_blockquote]:border-tertiary [&_blockquote]:pl-3 [&_blockquote]:text-tertiary ' +
          '[&_hr]:my-4 [&_hr]:border-tertiary [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:bg-tertiary [&_code]:rounded [&_code]:px-1',
      },
    },
  })

  return <EditorContent editor={editor} />
}

export default RichEditor
