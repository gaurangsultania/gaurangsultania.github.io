import { useParams, Link } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import VideoEmbed from '../components/VideoEmbed'
import PDFViewer from '../components/PDFViewer'
import projects from '../data/projects.json'

// Import all generated case study files at build time
const caseStudyModules = import.meta.glob('../data/case-studies/*.json', { eager: true })

function getCaseStudy(slug) {
  const key = `../data/case-studies/${slug}.json`
  return caseStudyModules[key]?.default ?? caseStudyModules[key] ?? null
}

function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('is-visible') },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

function Section({ children, delay = 0 }) {
  const ref = useRef(null)
  useReveal(ref)
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// Markdown rendering — Glass Room aesthetic
const mdComponents = {
  h1: ({ children }) => (
    <h1 className="font-serif text-cream" style={{ fontSize: '28px', marginTop: '3rem', marginBottom: '1rem', lineHeight: 1.3 }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <>
      <div className="divider" style={{ marginTop: '3.5rem', marginBottom: '1.5rem' }} />
      <h2 className="font-serif text-cream" style={{ fontSize: '20px', marginBottom: '1rem', lineHeight: 1.4 }}>
        {children}
      </h2>
    </>
  ),
  h3: ({ children }) => (
    <h3 className="font-mono text-cream" style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2rem', marginBottom: '0.75rem' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="font-mono text-stone" style={{ fontSize: '13px', lineHeight: 1.85, marginBottom: '1.2rem', letterSpacing: '0.02em' }}>
      {children}
    </p>
  ),
  ul: ({ children }) => <ul style={{ marginBottom: '1.2rem', paddingLeft: 0 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ marginBottom: '1.2rem', paddingLeft: '1rem' }}>{children}</ol>,
  li: ({ children }) => (
    <li className="font-mono text-stone" style={{ fontSize: '13px', lineHeight: 1.85, marginBottom: '0.4rem', letterSpacing: '0.02em', listStyle: 'none', display: 'flex', gap: '0.75rem' }}>
      <span className="text-stone" style={{ userSelect: 'none' }}>—</span>
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '1px solid #3a3832', paddingLeft: '1rem', margin: '1.5rem 0' }}>
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) => inline
    ? <code className="font-mono text-cream" style={{ fontSize: '12px', background: 'rgba(58,56,50,0.4)', padding: '1px 5px' }}>{children}</code>
    : <pre className="font-mono text-stone" style={{ fontSize: '12px', overflowX: 'auto', margin: '1.5rem 0', padding: '1rem', border: '1px solid #3a3832' }}><code>{children}</code></pre>,
  hr: () => <div className="divider" style={{ margin: '3rem 0' }} />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-gold" style={{ fontSize: '13px', textDecoration: 'none', borderBottom: '1px solid #c8a96e40' }}>
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt} style={{ width: '100%', display: 'block', margin: '2rem 0' }} />
  ),
  strong: ({ children }) => <strong className="text-cream font-mono" style={{ fontWeight: 500 }}>{children}</strong>,
}

// Placeholder sections shown when no Notion page is linked yet
const PLACEHOLDER_SECTIONS = ['Overview', 'Problem', 'Research & Insights', 'Solution', 'Outcomes']

export default function ProjectDetail() {
  const { slug } = useParams()
  const project    = projects.find((p) => p.slug === slug)
  const caseStudy  = getCaseStudy(slug)

  if (!project) {
    return (
      <div className="bg-canvas min-h-screen flex flex-col items-center justify-center">
        <p className="font-mono text-stone" style={{ fontSize: '12px', marginBottom: '1.5rem' }}>
          project not found.
        </p>
        <Link to="/" className="font-mono text-stone nav-link" style={{ fontSize: '11px' }}>
          ← all work
        </Link>
      </div>
    )
  }

  const categories = Array.isArray(project.category)
    ? project.category
    : [project.category].filter(Boolean)

  return (
    <div className="bg-canvas min-h-screen">
      {/* Back link */}
      <div className="content-wrap" style={{ paddingTop: '3rem' }}>
        <Link to="/" className="font-mono text-stone nav-link" style={{ fontSize: '11px' }}>
          ← work
        </Link>
      </div>

      {/* Project hero */}
      <header className="content-wrap" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <Section>
          <div className="font-mono text-stone" style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            {categories.join(' · ')}
          </div>
          <h1 className="font-serif text-cream" style={{ fontSize: '36px', lineHeight: 1.2, marginBottom: '1rem' }}>
            {project.name}
          </h1>
          <p className="font-mono text-stone" style={{ fontSize: '13px', lineHeight: 1.75, marginBottom: '2rem' }}>
            {project.tagline}
          </p>
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-stone nav-link"
              style={{ fontSize: '11px' }}
            >
              view project ↗
            </a>
          )}
        </Section>
      </header>

      <div className="content-wrap">
        <div className="divider" />
      </div>

      {/* Body */}
      <main className="content-wrap" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>

        {/* Video */}
        {project.videoURL && (
          <Section delay={50}>
            <div className="font-mono text-stone" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem', marginTop: '3rem' }}>
              Walkthrough
            </div>
            <VideoEmbed url={project.videoURL} />
          </Section>
        )}

        {/* Case study markdown or placeholder */}
        {caseStudy?.markdown ? (
          <Section delay={80}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {caseStudy.markdown}
            </ReactMarkdown>
          </Section>
        ) : (
          <div style={{ marginTop: '3rem' }}>
            {PLACEHOLDER_SECTIONS.map((title, i) => (
              <Section key={title} delay={i * 60}>
                <div className="divider" style={{ margin: '3rem 0 1.5rem' }} />
                <h2 className="font-serif text-cream" style={{ fontSize: '20px', marginBottom: '0.75rem' }}>
                  {title}
                </h2>
                <p className="font-mono text-stone" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                  Add a {title} block to the Notion case study page.
                </p>
              </Section>
            ))}
          </div>
        )}

        {/* PDF attachment */}
        {project.attachmentURL && (
          <Section delay={100}>
            <div className="font-mono text-stone" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem', marginTop: '3rem' }}>
              Attachment
            </div>
            <PDFViewer url={project.attachmentURL} />
          </Section>
        )}
      </main>

      {/* Footer nav */}
      <div className="content-wrap" style={{ paddingBottom: '4rem' }}>
        <div className="divider" style={{ marginBottom: '2rem' }} />
        <Link to="/" className="font-mono text-stone nav-link" style={{ fontSize: '11px' }}>
          ← work
        </Link>
      </div>
    </div>
  )
}
