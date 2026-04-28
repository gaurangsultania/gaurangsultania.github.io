import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import projects from '../data/projects.json'

function useReveal(ref) {
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('is-visible') },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
}

function ProjectRow({ project, index }) {
  const ref = useRef(null)
  useReveal(ref)

  const categories = Array.isArray(project.category)
    ? project.category
    : [project.category].filter(Boolean)

  const inner = (
    <div
      ref={ref}
      className="reveal group py-6 border-b border-dim/30"
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="flex items-baseline gap-4 mb-1.5">
        <span
          className="font-serif text-cream list-item-title"
          style={{ fontSize: '18px' }}
        >
          {project.name}
        </span>
        {project.videoURL && (
          <span className="font-mono text-stone" style={{ fontSize: '9px', letterSpacing: '0.12em' }}>▶ VIDEO</span>
        )}
        {project.attachmentURL && (
          <span className="font-mono text-stone" style={{ fontSize: '9px', letterSpacing: '0.12em' }}>PDF</span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-0">
        <span className="font-mono text-stone" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
          {categories.join(' · ')}
        </span>
      </div>

      {/* One-line description — appears on hover */}
      {project.tagline && (
        <p
          className="font-mono text-stone mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ fontSize: '12px', letterSpacing: '0.03em' }}
        >
          {project.tagline}
        </p>
      )}
    </div>
  )

  if (project.caseStudyPageId) {
    return (
      <Link to={`/projects/${project.slug}`} className="block" style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
    )
  }

  return <div>{inner}</div>
}

export default function Projects() {
  const headerRef = useRef(null)
  useReveal(headerRef)

  // All unique categories from the Notion data
  const allCategories = ['All', ...Array.from(
    new Set(
      projects.flatMap((p) => Array.isArray(p.category) ? p.category : [p.category]).filter(Boolean)
    )
  )]

  const [active, setActive] = useState('All')

  // Featured first, then by order
  const sorted = [...projects].sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return (a.order ?? 99) - (b.order ?? 99)
  })

  const filtered = active === 'All'
    ? sorted
    : sorted.filter((p) =>
        Array.isArray(p.category) ? p.category.includes(active) : p.category === active
      )

  return (
    <section id="work" style={{ paddingTop: '140px', paddingBottom: '140px' }}>
      <div className="content-wrap">
        {/* Section header */}
        <div ref={headerRef} className="reveal mb-12">
          <div className="divider mb-6" />
          <h2 className="font-serif text-cream" style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Work
          </h2>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-6 mb-10">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`filter-tab${active === cat ? ' active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Project list */}
        <div>
          {filtered.map((project, i) => (
            <ProjectRow key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
