import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Glass, GlassBar } from './glass/LiquidGlass'
import { scrollToTarget } from '../lib/smoothScroll'

const links = [
  { label: 'Work',    id: 'work' },
  { label: 'Writing', id: 'writing' },
  { label: 'Music',   id: 'music' },
  { label: 'Now',     id: 'now' },
  { label: 'Contact', id: 'contact' },
]

// Section links scroll in place — a bare "#work" href would be read by the
// HashRouter as a route.
function go(e, id) {
  e.preventDefault()
  scrollToTarget(`#${id}`, { offset: -24 })
}

// which section is under the middle of the viewport
function useActiveSection() {
  const [active, setActive] = useState('work')
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    for (const l of links) {
      const el = document.getElementById(l.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [])
  return active
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const active = useActiveSection()
  const [hovered, setHovered] = useState(null)
  const highlighted = hovered ?? active

  return (
    <>
      {/* Desktop: a glass bar, a liquid drop sliding under the current section */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 hidden md:block">
        <GlassBar onMouseLeave={() => setHovered(null)}>
          {links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => go(e, l.id)}
              onMouseEnter={() => setHovered(l.id)}
              className={`lg-item${active === l.id ? ' is-active' : ''}`}
              aria-current={active === l.id ? 'true' : undefined}
            >
              {highlighted === l.id && (
                <motion.span
                  layoutId="nav-drop"
                  className="lg-drop"
                  transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.9 }}
                />
              )}
              {l.label}
            </a>
          ))}
        </GlassBar>
      </nav>

      {/* Mobile: a glass button and a frosted overlay */}
      <div className="fixed top-5 right-5 z-[110] md:hidden">
        <Glass size="sm" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={open}>
          {open ? 'Close' : 'Menu'}
        </Glass>
      </div>

      {open && (
        <div className="nav-overlay md:hidden">
          {links.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => {
                setOpen(false)
                go(e, l.id)
              }}
              className="font-serif text-cream"
              style={{ fontSize: '40px', textDecoration: 'none' }}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </>
  )
}
