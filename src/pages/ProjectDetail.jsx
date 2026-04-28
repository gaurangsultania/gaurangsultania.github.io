import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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

// Markdown component overrides — styled to match the dark aesthetic
const mdComponents = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-extrabold text-white mt-10 mb-4 tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-bold text-white mt-10 mb-3 tracking-tight border-t border-border pt-8">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold text-white mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-muted leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="space-y-2 mb-4 pl-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-2 mb-4 pl-4 list-decimal">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-muted leading-relaxed flex gap-2">
      <span className="text-white mt-1 shrink-0">—</span>
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-white/20 pl-4 my-4 text-muted italic">{children}</blockquote>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-surface border border-border text-white text-sm px-1.5 py-0.5 rounded-sm font-mono">
        {children}
      </code>
    ) : (
      <pre className="bg-surface border border-border rounded-sm p-4 overflow-x-auto my-4">
        <code className="text-sm font-mono text-white">{children}</code>
      </pre>
    ),
  hr: () => <hr className="border-border my-8" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-2 hover:text-muted transition-colors">
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt} className="rounded-sm border border-border w-full my-6 object-cover" />
  ),
  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
}

export default function ProjectDetail() {
  const { slug } = useParams()
  const project = projects.find((p) => p.slug === slug)
  const caseStudy = getCaseStudy(slug)

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-muted text-sm mb-4">Project not found.</p>
        <Link to="/" className="text-white text-sm font-semibold underline underline-offset-2">
          ← Back to home
        </Link>
      </div>
    )
  }

  const categories = Array.isArray(project.category)
    ? project.category
    : [project.category].filter(Boolean)

  return (
    <div className="min-h-screen bg-bg">
      {/* Back nav */}
      <div className="max-w-3xl mx-auto px-6 pt-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted text-sm font-medium hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All Projects
        </Link>
      </div>

      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-3xl mx-auto px-6 pt-10 pb-12"
      >
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {categories.map((cat) => (
              <span
                key={cat}
                className="text-xs font-semibold text-muted tracking-widest uppercase border border-border px-2 py-0.5 rounded-sm"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
          {project.name}
        </h1>
        <p className="text-xl text-muted leading-relaxed">{project.tagline}</p>

        {/* External link */}
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white border border-border px-5 py-2.5 rounded-sm hover:bg-white hover:text-bg transition-colors"
          >
            View Project
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        )}
      </motion.header>

      <div className="border-t border-border" />

      {/* Body */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-14">

        {/* Video */}
        {project.videoURL && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-xs font-semibold text-muted tracking-widest uppercase mb-4">Walkthrough</h2>
            <VideoEmbed url={project.videoURL} />
          </motion.section>
        )}

        {/* Case Study Markdown */}
        {caseStudy?.markdown ? (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {caseStudy.markdown}
            </ReactMarkdown>
          </motion.section>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="space-y-8"
          >
            {[
              { title: 'Overview', body: 'Add an Overview block to the Notion case study page.' },
              { title: 'Problem', body: 'Add a Problem block to the Notion case study page.' },
              { title: 'Research & Insights', body: 'Add a Research & Insights block to the Notion case study page.' },
              { title: 'Solution', body: 'Add a Solution block to the Notion case study page.' },
              { title: 'Outcomes', body: 'Add an Outcomes block to the Notion case study page.' },
            ].map((s, i) => (
              <div key={s.title} className={i > 0 ? 'border-t border-border pt-8' : ''}>
                <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">{s.title}</h2>
                <p className="text-muted text-sm italic">{s.body}</p>
              </div>
            ))}
          </motion.section>
        )}

        {/* PDF Attachment */}
        {project.attachmentURL && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xs font-semibold text-muted tracking-widest uppercase mb-4">Attachment</h2>
            <PDFViewer url={project.attachmentURL} />
          </motion.section>
        )}
      </main>

      {/* Footer nav */}
      <div className="border-t border-border mt-4">
        <div className="max-w-3xl mx-auto px-6 py-10 flex justify-between items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted text-sm font-medium hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 7H3M3 7L7 3M3 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            All Projects
          </Link>
        </div>
      </div>
    </div>
  )
}
