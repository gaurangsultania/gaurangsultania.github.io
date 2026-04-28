import { useRef, useEffect } from 'react'

function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('is-visible') },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

// ─── Edit these strings to update the Now section ─────────────────────────────
// NOW_WORKING
const WORKING_ON = 'building this portfolio and a few product ideas in parallel'

// NOW_LISTENING
const LISTENING_TO = 'Nils Frahm — All Melody'

// NOW_THINKING
const THINKING_ABOUT = 'how interfaces shape the questions we think to ask'
// ──────────────────────────────────────────────────────────────────────────────

const fragments = [
  { label: 'Working on',     content: WORKING_ON },
  { label: 'Listening to',   content: LISTENING_TO },
  { label: 'Thinking about', content: THINKING_ABOUT },
]

function Fragment({ label, content, delay }) {
  const ref = useRef(null)
  useReveal(ref)
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      <div
        className="font-mono text-stone"
        style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}
      >
        {label}
      </div>
      <div className="font-mono text-cream" style={{ fontSize: '14px', letterSpacing: '0.02em' }}>
        {content}
      </div>
    </div>
  )
}

export default function Now() {
  const headerRef = useRef(null)
  useReveal(headerRef)

  return (
    <section id="now" style={{ paddingTop: '140px', paddingBottom: '140px' }}>
      <div className="content-wrap">
        <div ref={headerRef} className="reveal mb-12">
          <div className="divider mb-6" />
          <h2 className="font-serif text-cream" style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Now
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {fragments.map((f, i) => (
            <Fragment key={f.label} label={f.label} content={f.content} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  )
}
