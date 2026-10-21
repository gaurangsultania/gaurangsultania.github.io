import { useRef, useEffect } from 'react'
import { Glass } from './glass/LiquidGlass'

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {contactLinks.map((l) => (
              <Glass
                key={l.label}
                as="a"
                href={l.href}
                target={l.href.startsWith('mailto') ? undefined : '_blank'}
                rel="noopener noreferrer"
                style={{ textTransform: 'none', letterSpacing: '0.06em', fontSize: '12px' }}
              >
                {l.label}
              </Glass>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
