import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { THEMES } from './themes'

type Props = {
  current: number
  onPick: (i: number) => void
  onClose: () => void
}

export default function ThemeGallery({ current, onPick, onClose }: Props) {
  const curRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    curRef.current?.scrollIntoView({ block: 'center' })
    curRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card gal" role="dialog" aria-modal="true" aria-label="Choose a theme">
        <div className="side-h">
          <h2>Pick a theme · {THEMES.length}</h2>
          <button className="btn sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="gal-grid">
          {THEMES.map(([id, label], i) => (
            <button
              key={id}
              ref={i === current ? curRef : undefined}
              className={`sw t-${id}${i === current ? ' cur' : ''}`}
              onClick={() => {
                onPick(i)
                onClose()
              }}
              aria-pressed={i === current}
            >
              <span className="nm">
                {i + 1}. {label}
              </span>
              <span className="bar" />
              <span className="row">
                <span className="dot" />
                <span className="bar" style={{ flex: 1, height: 10 }} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
