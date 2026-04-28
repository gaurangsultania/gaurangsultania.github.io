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

const contactLinks = [
  { label: 'gaurangsultania@gmail.com', href: 'mailto:gaurangsultania@gmail.com' },
  { label: 'linkedin',                  href: 'https://linkedin.com/in/gaurangsultania' },
  { label: 'github',                    href: 'https://github.com/gaurangsultania' },
]

export default function Contact() {
  const ref = useRef(null)
  useReveal(ref)

  return (
    <section id="contact" style={{ paddingTop: '140px', paddingBottom: '140px' }}>
      <div className="content-wrap">
        <div ref={ref} className="reveal">
          <div className="divider mb-10" />

          {/* One serif line — the whole invitation */}
          <p
            className="font-serif text-cream"
            style={{ fontSize: '22px', lineHeight: 1.5, marginBottom: '2.5rem' }}
          >
            the best conversations start with a real question
          </p>

          {/* Links — no form, no theatre */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {contactLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith('mailto') ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="font-mono text-stone nav-link"
                style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'none' }}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
