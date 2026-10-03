import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, FileText, Folder, FolderPlus, NotebookPen, Palette, Pencil, Pin, Plus, Search, Shuffle, Trash2 } from 'lucide-react'
import './themes.css'
import { THEMES } from './themes'
import { fmtDate, htmlToText, loadData, loadTheme, saveData, saveTheme, uid, type Folder as FolderT, type Note } from './notes'
import Editor from './Editor'
import ThemeGallery from './ThemeGallery'

function NoteCard({ n, selected, onSelect }: { n: Note; selected: boolean; onSelect: () => void }) {
  return (
    <button className={'card note' + (selected ? ' sel' : '')} onClick={onSelect} aria-current={selected}>
      <div className="nt">
        {n.pinned && <Pin size={13} aria-label="Pinned" />}
        <span>{n.title || 'Untitled note'}</span>
        <small>{fmtDate(n.updated)}</small>
      </div>
      <p>{htmlToText(n.html).trim().slice(0, 140) || 'No content yet'}</p>
    </button>
  )
}

function FolderRow(p: {
  folder: FolderT
  depth: number
  folders: FolderT[]
  notes: Note[]
  activeId: string
  selFolder: string | null
  collapsed: Set<string>
  onSelectFolder: (id: string | null) => void
  onToggle: (id: string) => void
  onSelectNote: (id: string) => void
  onNewSub: (parentId: string) => void
  onRename: (f: FolderT) => void
  onDelete: (f: FolderT) => void
}) {
  const kids = p.folders.filter((f) => f.parentId === p.folder.id)
  const isCollapsed = p.collapsed.has(p.folder.id)
  const folderNotes = p.notes.filter((n) => n.folderId === p.folder.id)
  return (
    <>
      <div className="frow" style={{ paddingLeft: 4 + p.depth * 14 }}>
        <button
          type="button"
          className="fchev"
          aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
          onClick={() => p.onToggle(p.folder.id)}
          style={{ visibility: kids.length || folderNotes.length ? 'visible' : 'hidden' }}
        >
          <ChevronDown size={14} style={{ transform: isCollapsed ? 'rotate(-90deg)' : undefined }} />
        </button>
        <button
          type="button"
          className={'flabel' + (p.selFolder === p.folder.id ? ' on' : '')}
          onClick={() => p.onSelectFolder(p.selFolder === p.folder.id ? null : p.folder.id)}
        >
          <Folder size={15} /> {p.folder.name}
        </button>
        <span className="fbtns">
          <button type="button" className="fbtn" title="New subfolder" aria-label="New subfolder" onClick={() => p.onNewSub(p.folder.id)}>
            <FolderPlus size={13} />
          </button>
          <button type="button" className="fbtn" title="Rename folder" aria-label="Rename folder" onClick={() => p.onRename(p.folder)}>
            <Pencil size={13} />
          </button>
          <button type="button" className="fbtn" title="Delete folder" aria-label="Delete folder" onClick={() => p.onDelete(p.folder)}>
            <Trash2 size={13} />
          </button>
        </span>
      </div>
      {!isCollapsed && (
        <>
          {kids.map((k) => (
            <FolderRow key={k.id} {...p} folder={k} depth={p.depth + 1} />
          ))}
          {folderNotes.map((n) => (
            <div key={n.id} style={{ paddingLeft: (p.depth + 1) * 14 }}>
              <NoteCard n={n} selected={n.id === p.activeId} onSelect={() => p.onSelectNote(n.id)} />
            </div>
          ))}
        </>
      )}
    </>
  )
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<FolderT[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(0)
  const [gallery, setGallery] = useState(false)
  const [toast, setToast] = useState('')
  const [selFolder, setSelFolder] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([loadData(), loadTheme()]).then(([data, t]) => {
      if (!alive) return
      setNotes(data.notes)
      setFolders(data.folders)
      setActiveId(data.notes[0]?.id ?? '')
      if (typeof t === 'number' && Number.isInteger(t) && t >= 0 && t < THEMES.length) setTheme(t)
      setLoaded(true)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (loaded) saveData({ notes, folders })
  }, [notes, folders, loaded])
  useEffect(() => {
    if (loaded) saveTheme(theme)
  }, [theme, loaded])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const [themeId, themeLabel] = THEMES[theme]
  const step = (d: number) => setTheme((t) => (t + d + THEMES.length) % THEMES.length)
  const shuffle = () =>
    setTheme((t) => {
      let n = t
      while (n === t) n = Math.floor(Math.random() * THEMES.length)
      return n
    })

  const active = notes.find((n) => n.id === activeId) ?? null

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter((n) => !q || n.title.toLowerCase().includes(q) || htmlToText(n.html).toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated)
  }, [notes, query])

  const patch = useCallback(
    (p: Partial<Note>) =>
      setNotes((all) =>
        all.map((n) => (n.id === activeId ? { ...n, ...p, updated: 'pinned' in p ? n.updated : Date.now() } : n)),
      ),
    [activeId],
  )

  const create = () => {
    const now = Date.now()
    const n: Note = { id: uid(), title: '', html: '', created: now, updated: now, pinned: false, folderId: selFolder }
    setNotes((all) => [n, ...all])
    setActiveId(n.id)
    setQuery('')
  }

  const [modal, setModal] = useState<
    | null
    | { kind: 'newFolder'; parentId: string | null }
    | { kind: 'renameFolder'; folder: FolderT }
    | { kind: 'deleteFolder'; folder: FolderT }
    | { kind: 'deleteNote'; id: string; title: string }
  >(null)
  const [modalInput, setModalInput] = useState('')

  const newFolder = (parentId: string | null) => {
    setModalInput('')
    setModal({ kind: 'newFolder', parentId })
  }

  const renameFolder = (f: FolderT) => {
    setModalInput(f.name)
    setModal({ kind: 'renameFolder', folder: f })
  }

  const deleteFolder = (f: FolderT) => setModal({ kind: 'deleteFolder', folder: f })

  const submitModal = () => {
    if (!modal) return
    if (modal.kind === 'newFolder') {
      const name = modalInput.trim()
      if (name) setFolders((all) => [...all, { id: uid(), name, parentId: modal.parentId }])
    } else if (modal.kind === 'renameFolder') {
      const name = modalInput.trim()
      if (name) setFolders((all) => all.map((x) => (x.id === modal.folder.id ? { ...x, name } : x)))
    } else if (modal.kind === 'deleteFolder') {
      const f = modal.folder
      setFolders((all) => all.filter((x) => x.id !== f.id).map((x) => (x.parentId === f.id ? { ...x, parentId: f.parentId } : x)))
      setNotes((all) => all.map((n) => (n.folderId === f.id ? { ...n, folderId: f.parentId } : n)))
      if (selFolder === f.id) setSelFolder(null)
      setToast(`Deleted folder "${f.name}"`)
    } else if (modal.kind === 'deleteNote') {
      const rest = notes.filter((n) => n.id !== modal.id)
      setNotes(rest)
      if (activeId === modal.id) setActiveId(rest[0]?.id ?? '')
      setToast('Note deleted')
    }
    setModal(null)
  }

  const setNoteFolder = (id: string, folderId: string | null) =>
    setNotes((all) => all.map((n) => (n.id === id ? { ...n, folderId } : n)))

  const toggleCollapse = (id: string) =>
    setCollapsed((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const remove = () => {
    if (!active) return
    setModal({ kind: 'deleteNote', id: active.id, title: active.title || 'Untitled note' })
  }

  return (
    <div className={`app t-${themeId}`}>
      <header className="top">
        <b>
          <NotebookPen size={20} aria-hidden /> Saraswati Notes
          <span className="chip">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
        </b>
        <div className="tools-h">
          <button className="btn sm" onClick={() => step(-1)} aria-label="Previous theme" title="Previous theme">
            <ChevronLeft size={16} />
          </button>
          <button className="btn sm" onClick={() => setGallery(true)} aria-label="Open theme gallery" title="Theme gallery">
            <Palette size={16} />
            <span>
              {theme + 1}. {themeLabel}
            </span>
          </button>
          <button className="btn sm" onClick={() => step(1)} aria-label="Next theme" title="Next theme">
            <ChevronRight size={16} />
          </button>
          <button className="btn sm" onClick={shuffle} aria-label="Random theme" title="Random theme">
            <Shuffle size={16} />
          </button>
        </div>
      </header>

      <div className="main">
        {!loaded ? (
          <p style={{ textAlign: 'center', opacity: 0.6 }}>Loading your notes…</p>
        ) : (
        <>
        <aside className="side" aria-label="Notes">
          <div className="side-h">
            <h2>All notes</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm" onClick={() => newFolder(null)} title="New folder" aria-label="New folder">
                <FolderPlus size={16} />
              </button>
              <button className="btn p sm" onClick={create}>
                <Plus size={16} /> New
              </button>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 12, opacity: 0.6 }} aria-hidden />
            <input
              className="field"
              style={{ paddingLeft: 32 }}
              placeholder="Search notes"
              aria-label="Search notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="list">
            {query.trim() ? (
              <>
                {shown.map((n) => (
                  <NoteCard key={n.id} n={n} selected={n.id === activeId} onSelect={() => setActiveId(n.id)} />
                ))}
                {shown.length === 0 && <div className="empty">No notes match your search.</div>}
              </>
            ) : (
              <>
                {folders
                  .filter((f) => f.parentId === null)
                  .map((f) => (
                    <FolderRow
                      key={f.id}
                      folder={f}
                      depth={0}
                      folders={folders}
                      notes={notes}
                      activeId={activeId}
                      selFolder={selFolder}
                      collapsed={collapsed}
                      onSelectFolder={setSelFolder}
                      onToggle={toggleCollapse}
                      onSelectNote={setActiveId}
                      onNewSub={newFolder}
                      onRename={renameFolder}
                      onDelete={deleteFolder}
                    />
                  ))}
                <div className="frow" style={{ cursor: 'default' }}>
                  <button
                    type="button"
                    className={'flabel' + (selFolder === null ? ' on' : '')}
                    onClick={() => setSelFolder(null)}
                    title="Notes not in any folder"
                  >
                    <FileText size={15} /> No folder
                  </button>
                </div>
                {notes.filter((n) => n.folderId === null).map((n) => (
                  <NoteCard key={n.id} n={n} selected={n.id === activeId} onSelect={() => setActiveId(n.id)} />
                ))}
                {folders.length === 0 && notes.length === 0 && <div className="empty">No notes yet.</div>}
              </>
            )}
          </div>
        </aside>

        {active ? (
          <Editor
            key={active.id}
            note={active}
            folders={folders}
            onPatch={patch}
            onDelete={remove}
            onToast={setToast}
            onSetFolder={(folderId) => setNoteFolder(active.id, folderId)}
          />
        ) : (
          <section className="card empty" style={{ display: 'grid', placeItems: 'center', gap: 12, alignContent: 'center' }}>
            <h2>Nothing selected</h2>
            <button className="btn p" onClick={create}>
              <Plus size={16} /> Create a note
            </button>
          </section>
        )}
        </>
        )}
      </div>

      {gallery && <ThemeGallery current={theme} onPick={setTheme} onClose={() => setGallery(false)} />}
      {modal && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setModal(null)}>
          <div className="card dlg" onClick={(e) => e.stopPropagation()}>
            {(modal.kind === 'newFolder' || modal.kind === 'renameFolder') && (
              <>
                <h2>{modal.kind === 'newFolder' ? 'New folder' : 'Rename folder'}</h2>
                <input
                  className="field"
                  placeholder="Folder name"
                  aria-label="Folder name"
                  autoFocus
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitModal()
                    if (e.key === 'Escape') setModal(null)
                  }}
                />
                <div className="dlg-btns">
                  <button className="btn sm" onClick={() => setModal(null)}>Cancel</button>
                  <button className="btn p sm" onClick={submitModal}>{modal.kind === 'newFolder' ? 'Create' : 'Save'}</button>
                </div>
              </>
            )}
            {modal.kind === 'deleteFolder' && (
              <>
                <h2>Delete folder</h2>
                <p style={{ margin: 0 }}>
                  Delete "{modal.folder.name}"? Its notes and subfolders will move up a level.
                </p>
                <div className="dlg-btns">
                  <button className="btn sm" onClick={() => setModal(null)}>Cancel</button>
                  <button className="btn p sm" onClick={submitModal}>Delete</button>
                </div>
              </>
            )}
            {modal.kind === 'deleteNote' && (
              <>
                <h2>Delete note</h2>
                <p style={{ margin: 0 }}>Delete "{modal.title}"? This cannot be undone.</p>
                <div className="dlg-btns">
                  <button className="btn sm" onClick={() => setModal(null)}>Cancel</button>
                  <button className="btn p sm" onClick={submitModal}>Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
