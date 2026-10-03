export type Folder = { id: string; name: string; parentId: string | null }

export type Note = {
  id: string
  title: string
  html: string
  created: number
  updated: number
  pinned: boolean
  folderId: string | null
}

const KEY = 'notely.data.v2'
const OLD_KEY = 'notely.notes.v1'
const THEME_KEY = 'notely.theme.v1'

const DB_NAME = 'saraswati-notes'
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, val: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(val, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\u00a0/g, ' ')
}

const WELCOME = `<h1>Welcome to Saraswati Notes ✨</h1>
<p>A what-you-see-is-what-you-get notes app. Select some text and use the toolbar — <b>bold</b>, <i>italic</i>, <u>underline</u>, <strike>strike</strike>, even <span style="color:#e03131">colors</span> and <span style="background-color:#fff3a3;color:#111111">highlights</span>.</p>
<h2>Try these</h2>
<ul><li>Bullet lists and numbered lists</li><li>Headings, quotes and code blocks</li><li>Links, images and dividers</li></ul>
<p><input type="checkbox" checked="checked">&nbsp;Create my first note</p>
<p><input type="checkbox">&nbsp;Pick a theme from the palette button — there are 100</p>
<blockquote>Everything is saved automatically in your browser.</blockquote>
<pre>&lt;/&gt; Use the source button to view or edit the raw HTML</pre>
<hr>
<p>Press the <b>arrows</b> in the header to flip through themes, or hit shuffle.</p>`

function defaultNotes(): Note[] {
  const now = Date.now()
  return [
    { id: uid(), title: 'Welcome to Saraswati Notes', html: WELCOME, created: now, updated: now, pinned: true, folderId: null },
    {
      id: uid(),
      title: 'Meeting notes',
      html: '<h2>Team sync</h2><ol><li>Review designs</li><li>Plan next sprint</li></ol><p>Follow up on <a href="https://example.com">the brief</a>.</p>',
      created: now - 3600_000,
      updated: now - 3600_000,
      pinned: false,
      folderId: null,
    },
  ]
}

export async function loadData(): Promise<{ notes: Note[]; folders: Folder[] }> {
  try {
    const stored = await idbGet<{ notes: Note[]; folders: Folder[] }>('data')
    if (stored && Array.isArray(stored.notes)) {
      return {
        notes: stored.notes.map((n) => ({ ...n, folderId: n.folderId ?? null })),
        folders: Array.isArray(stored.folders) ? stored.folders : [],
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.notes)) {
        const data = {
          notes: parsed.notes.map((n: Note) => ({ ...n, folderId: n.folderId ?? null })),
          folders: Array.isArray(parsed.folders) ? parsed.folders : [],
        }
        await saveData(data)
        localStorage.removeItem(KEY)
        return data
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const old = localStorage.getItem(OLD_KEY)
    if (old) {
      const notes = (JSON.parse(old) as Note[]).map((n) => ({ ...n, folderId: null }))
      if (Array.isArray(notes) && notes.length) {
        const data = { notes, folders: [] }
        await saveData(data)
        localStorage.removeItem(OLD_KEY)
        return data
      }
    }
  } catch {
    /* ignore */
  }
  return { notes: defaultNotes(), folders: [] }
}

export async function saveData(data: { notes: Note[]; folders: Folder[] }) {
  try {
    await idbSet('data', data)
  } catch {
    /* ignore */
  }
}

export async function loadTheme(): Promise<number | null> {
  try {
    const t = await idbGet<number>('theme')
    if (typeof t === 'number') return t
    const old = localStorage.getItem(THEME_KEY)
    if (old !== null) {
      const n = Number(old)
      localStorage.removeItem(THEME_KEY)
      if (Number.isInteger(n)) {
        await saveTheme(n)
        return n
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export async function saveTheme(theme: number) {
  try {
    await idbSet('theme', theme)
  } catch {
    /* ignore */
  }
}

export function fmtDate(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
