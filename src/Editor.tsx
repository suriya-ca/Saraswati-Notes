import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Code, Copy, Download, FileCode, Eye, Heading1, Heading2, Heading3,
  Highlighter, ImagePlus, Italic, Link as LinkIcon, List, ListChecks, ListOrdered, Minus, Pilcrow, Pin, PinOff,
  Quote, Redo2, Strikethrough, Trash2, Type, Underline, Undo2,
} from 'lucide-react'
import { htmlToText, type Note } from './notes'

type Props = {
  note: Note
  folders: import('./notes').Folder[]
  onPatch: (patch: Partial<Note>) => void
  onDelete: () => void
  onToast: (msg: string) => void
  onSetFolder: (folderId: string | null) => void
}

type Fmt = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; ul: boolean; ol: boolean; block: string }
const NOFMT: Fmt = { bold: false, italic: false, underline: false, strike: false, ul: false, ol: false, block: '' }

const TEXT_COLORS = ['#e03131', '#f08c00', '#2f9e44', '#1971c2', '#9c36b5', '#111111', '#ffffff']
const MARKS = ['#fff3a3', '#ffc9de', '#c3f0ca', '#bfe3ff', '#e5d4ff', 'transparent']

function flattenFolders(folders: import('./notes').Folder[]): { f: import('./notes').Folder; depth: number }[] {
  const out: { f: import('./notes').Folder; depth: number }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const f of folders.filter((x) => x.parentId === parentId)) {
      out.push({ f, depth })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

function Tool(p: { icon: LucideIcon; label: string; on?: boolean; disabled?: boolean; onClick: () => void }) {
  const Icon = p.icon
  return (
    <button
      type="button"
      className={'btn sm' + (p.on ? ' on' : '')}
      title={p.label}
      aria-label={p.label}
      aria-pressed={p.on === undefined ? undefined : p.on}
      disabled={p.disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={p.onClick}
    >
      <Icon size={16} />
    </button>
  )
}

export default function Editor({ note, folders, onPatch, onDelete, onToast, onSetFolder }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const saved = useRef<Range | null>(null)
  const [mode, setMode] = useState<'visual' | 'html'>('visual')
  const [pop, setPop] = useState<null | 'color' | 'mark'>(null)
  const [fmt, setFmt] = useState<Fmt>(NOFMT)

  // load note content into the editable surface
  useLayoutEffect(() => {
    const el = ref.current
    if (mode === 'visual' && el && el.innerHTML !== note.html) el.innerHTML = note.html
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, mode])

  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => setPop(null), [note.id, mode])

  // track selection + active formatting
  useEffect(() => {
    const h = () => {
      const s = document.getSelection()
      const el = ref.current
      if (!s || !el || !s.rangeCount || !el.contains(s.anchorNode)) return
      saved.current = s.getRangeAt(0).cloneRange()
      const q = (c: string) => {
        try {
          return document.queryCommandState(c)
        } catch {
          return false
        }
      }
      let block = ''
      try {
        block = String(document.queryCommandValue('formatBlock')).toLowerCase().replace(/[<>]/g, '')
      } catch {
        /* ignore */
      }
      const next: Fmt = {
        bold: q('bold'), italic: q('italic'), underline: q('underline'), strike: q('strikeThrough'),
        ul: q('insertUnorderedList'), ol: q('insertOrderedList'), block,
      }
      setFmt((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    document.addEventListener('selectionchange', h)
    return () => document.removeEventListener('selectionchange', h)
  }, [])

  const sync = () => {
    if (ref.current) onPatch({ html: ref.current.innerHTML })
  }

  const exec = (cmd: string, val?: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const s = document.getSelection()
    if (saved.current && (!s || !s.rangeCount || !el.contains(s.anchorNode))) {
      s?.removeAllRanges()
      s?.addRange(saved.current)
    }
    const css = cmd === 'foreColor' || cmd === 'hiliteColor'
    if (css) document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(cmd, false, val)
    if (css) document.execCommand('styleWithCSS', false, 'false')
    sync()
  }

  const block = (tag: string) => exec('formatBlock', `<${fmt.block === tag ? 'p' : tag}>`)

  const addLink = () => {
    const sel = document.getSelection()
    const had = saved.current
    const url = window.prompt('Link URL', 'https://')
    if (!url) return
    if (had && sel) {
      sel.removeAllRanges()
      sel.addRange(had)
    }
    if (sel && sel.isCollapsed && !had?.toString()) {
      exec('insertHTML', `<a href="${url.replace(/"/g, '&quot;')}">${url.replace(/</g, '&lt;')}</a>&nbsp;`)
    } else exec('createLink', url)
  }

  const addImage = () => {
    const url = window.prompt('Image URL')
    if (url) exec('insertImage', url)
  }

  const exportHtml = () => {
    const title = note.title || 'Untitled'
    const doc = `<!doctype html>\n<html><head><meta charset="utf-8"><title>${title.replace(/</g, '&lt;')}</title>\n<style>body{font:17px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}blockquote{border-left:4px solid #999;margin:1em 0;padding-left:12px;color:#555}pre{background:#f1f1f1;padding:10px;border-radius:6px;white-space:pre-wrap}img{max-width:100%}</style></head>\n<body>\n<h1>${title.replace(/</g, '&lt;')}</h1>\n${note.html}\n</body></html>`
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html' }))
    const a = document.createElement('a')
    a.href = url
    a.download = (title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'note') + '.html'
    a.click()
    URL.revokeObjectURL(url)
    onToast('Exported as HTML')
  }

  const copyHtml = async () => {
    const el = ref.current
    const html = mode === 'visual' && el ? el.innerHTML : note.html
    onPatch({ html })
    try {
      await navigator.clipboard.writeText(html)
      onToast('HTML copied')
    } catch {
      onToast('Copy not available')
    }
  }

  const text = useMemo(() => htmlToText(note.html), [note.html])
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const off = mode === 'html'

  return (
    <section className="editor" aria-label="Note editor">
      <div className="card toolbar" role="toolbar" aria-label="Formatting">
        <Tool icon={Undo2} label="Undo" disabled={off} onClick={() => exec('undo')} />
        <Tool icon={Redo2} label="Redo" disabled={off} onClick={() => exec('redo')} />
        <span className="sep" />
        <Tool icon={Bold} label="Bold" on={fmt.bold} disabled={off} onClick={() => exec('bold')} />
        <Tool icon={Italic} label="Italic" on={fmt.italic} disabled={off} onClick={() => exec('italic')} />
        <Tool icon={Underline} label="Underline" on={fmt.underline} disabled={off} onClick={() => exec('underline')} />
        <Tool icon={Strikethrough} label="Strikethrough" on={fmt.strike} disabled={off} onClick={() => exec('strikeThrough')} />
        <span className="sep" />
        <Tool icon={Pilcrow} label="Paragraph" on={fmt.block === 'p'} disabled={off} onClick={() => exec('formatBlock', '<p>')} />
        <Tool icon={Heading1} label="Heading 1" on={fmt.block === 'h1'} disabled={off} onClick={() => block('h1')} />
        <Tool icon={Heading2} label="Heading 2" on={fmt.block === 'h2'} disabled={off} onClick={() => block('h2')} />
        <Tool icon={Heading3} label="Heading 3" on={fmt.block === 'h3'} disabled={off} onClick={() => block('h3')} />
        <span className="sep" />
        <Tool icon={List} label="Bullet list" on={fmt.ul} disabled={off} onClick={() => exec('insertUnorderedList')} />
        <Tool icon={ListOrdered} label="Numbered list" on={fmt.ol} disabled={off} onClick={() => exec('insertOrderedList')} />
        <Tool icon={ListChecks} label="Checkbox" disabled={off} onClick={() => exec('insertHTML', '<input type="checkbox">&nbsp;')} />
        <Tool icon={Quote} label="Quote" on={fmt.block === 'blockquote'} disabled={off} onClick={() => block('blockquote')} />
        <Tool icon={Code} label="Code block" on={fmt.block === 'pre'} disabled={off} onClick={() => block('pre')} />
        <span className="sep" />
        <Tool icon={AlignLeft} label="Align left" disabled={off} onClick={() => exec('justifyLeft')} />
        <Tool icon={AlignCenter} label="Align center" disabled={off} onClick={() => exec('justifyCenter')} />
        <Tool icon={AlignRight} label="Align right" disabled={off} onClick={() => exec('justifyRight')} />
        <span className="sep" />
        <span className="rel">
          <Tool icon={Type} label="Text color" on={pop === 'color'} disabled={off} onClick={() => setPop(pop === 'color' ? null : 'color')} />
          {pop === 'color' && (
            <div className="card pop" role="group" aria-label="Text colors">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="cdot"
                  style={{ background: c }}
                  aria-label={`Text color ${c}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec('foreColor', c)
                    setPop(null)
                  }}
                />
              ))}
              <button
                type="button"
                className="cdot"
                style={{ background: 'repeating-linear-gradient(45deg,#fff 0 4px,#e03131 4px 5px)' }}
                aria-label="Clear text color"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const el = ref.current
                  const c = el ? getComputedStyle(el).color : 'inherit'
                  exec('foreColor', c)
                  setPop(null)
                }}
              />
            </div>
          )}
        </span>
        <span className="rel">
          <Tool icon={Highlighter} label="Highlight" on={pop === 'mark'} disabled={off} onClick={() => setPop(pop === 'mark' ? null : 'mark')} />
          {pop === 'mark' && (
            <div className="card pop" role="group" aria-label="Highlight colors">
              {MARKS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="cdot"
                  style={{
                    background: c === 'transparent' ? 'repeating-linear-gradient(45deg,#fff 0 4px,#e03131 4px 5px)' : c,
                  }}
                  aria-label={c === 'transparent' ? 'Remove highlight' : `Highlight ${c}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec('hiliteColor', c)
                    if (c !== 'transparent') exec('foreColor', '#111111')
                    setPop(null)
                  }}
                />
              ))}
            </div>
          )}
        </span>
        <Tool icon={LinkIcon} label="Insert link" disabled={off} onClick={addLink} />
        <Tool icon={ImagePlus} label="Insert image" disabled={off} onClick={addImage} />
        <Tool icon={Minus} label="Divider" disabled={off} onClick={() => exec('insertHorizontalRule')} />
        <span style={{ flex: 1 }} />
        <select
          className="btn sm"
          style={{ maxWidth: 160 }}
          aria-label="Note folder"
          title="Move note to folder"
          value={note.folderId ?? ''}
          onChange={(e) => onSetFolder(e.target.value || null)}
        >
          <option value="">No folder</option>
          {flattenFolders(folders).map(({ f, depth }) => (
            <option key={f.id} value={f.id}>
              {'\u00A0'.repeat(depth * 3)}{f.name}
            </option>
          ))}
        </select>
        <Tool icon={mode === 'html' ? Eye : FileCode} label={mode === 'html' ? 'Back to visual editor' : 'Edit HTML source'} on={mode === 'html'} onClick={() => setMode(mode === 'html' ? 'visual' : 'html')} />
        <Tool icon={Copy} label="Copy HTML" onClick={copyHtml} />
        <Tool icon={Download} label="Export .html" onClick={exportHtml} />
        <Tool icon={note.pinned ? PinOff : Pin} label={note.pinned ? 'Unpin note' : 'Pin note'} on={note.pinned} onClick={() => onPatch({ pinned: !note.pinned })} />
        <button type="button" className="btn sm danger" title="Delete note" aria-label="Delete note" onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="card paper">
        <input
          className="ttl"
          value={note.title}
          placeholder="Untitled note"
          aria-label="Note title"
          onChange={(e) => onPatch({ title: e.target.value })}
        />
        {mode === 'visual' ? (
          <div
            ref={ref}
            className="edit"
            contentEditable
            suppressContentEditableWarning
            spellCheck
            role="textbox"
            aria-multiline="true"
            aria-label="Note content"
            data-ph="Start writing…"
            onInput={sync}
            onBlur={sync}
            onClick={(e) => {
              const t = e.target as HTMLElement
              if (t instanceof HTMLInputElement && t.type === 'checkbox') {
                if (t.checked) t.setAttribute('checked', 'checked')
                else t.removeAttribute('checked')
                sync()
              }
              const a = t.closest('a')
              if (a && (e.ctrlKey || e.metaKey)) window.open(a.href, '_blank', 'noopener')
            }}
          />
        ) : (
          <textarea
            className="src"
            value={note.html}
            spellCheck={false}
            aria-label="HTML source"
            onChange={(e) => onPatch({ html: e.target.value })}
          />
        )}
      </div>

      <div className="status">
        <span>
          {words} {words === 1 ? 'word' : 'words'} · {text.length} characters
        </span>
        <span>{mode === 'html' ? 'HTML source mode' : 'Saved automatically'}</span>
      </div>
    </section>
  )
}
