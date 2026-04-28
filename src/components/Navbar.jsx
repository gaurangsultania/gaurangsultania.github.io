import { useState } from 'react'

const links = [
  { label: 'Work',    href: '#work' },
  { label: 'Writing', href: '#writing' },
  { label: 'Now',     href: '#now' },
  { label: 'Contact', href: '#contact' },
  // Music is scaffolded but not live yet
  { label: 'Music',   href: '#music', comingSoon: true },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop nav — fixed top-right */}
      <nav className="fixed top-0 right-0 z-50 hidden md:flex items-center gap-8 px-10 py-7">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className={`nav-link${l.comingSoon ? ' nav-coming-soon' : ''}`}
            tabIndex={l.comingSoon ? -1 : undefined}
            aria-hidden={l.comingSoon ? 'true' : undefined}
          >
            {l.label}
          </a>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <button
        className="fixed top-6 right-6 z-[110] md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
        style={{ color: '#3a3832', fontSize: '18px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Mobile full-screen overlay */}
      {open && (
        <div className="nav-overlay md:hidden">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`nav-link${l.comingSoon ? ' nav-coming-soon' : ''}`}
              style={{ fontSize: '18px', letterSpacing: '0.12em' }}
              tabIndex={l.comingSoon ? -1 : undefined}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </>
  )
}
