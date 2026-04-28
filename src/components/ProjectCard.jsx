import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

// Icons
function VideoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function ProjectCard({ project }) {
  const { slug, name, tagline, category, featured, link, videoURL, attachmentURL, caseStudyPageId } = project
  const hasDetail = !!caseStudyPageId
  const categories = Array.isArray(category) ? category : [category].filter(Boolean)

  const cardContent = (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="group relative flex flex-col bg-surface border border-border rounded-sm p-6 hover:border-white/20 transition-colors h-full"
    >
      {featured && (
        <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase text-muted border border-border px-2 py-0.5 rounded-sm">
          Featured
        </span>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <span key={cat} className="text-xs font-semibold text-muted tracking-wider uppercase">
              {cat}
            </span>
          ))}
        </div>
      )}

      <h3 className="text-white font-bold text-xl mb-2 leading-tight pr-16">{name}</h3>
      <p className="text-muted text-sm leading-relaxed flex-1">{tagline}</p>

      <div className="mt-6 flex items-center justify-between">
        {/* Media indicators */}
        <div className="flex items-center gap-2">
          {videoURL && (
            <span className="flex items-center gap-1 text-muted text-[11px] font-medium border border-border px-2 py-1 rounded-sm">
              <VideoIcon /> Video
            </span>
          )}
          {attachmentURL && (
            <span className="flex items-center gap-1 text-muted text-[11px] font-medium border border-border px-2 py-1 rounded-sm">
              <DocIcon /> PDF
            </span>
          )}
        </div>

        {/* CTA */}
        {hasDetail ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white border border-border px-4 py-2 rounded-sm group-hover:bg-white group-hover:text-bg transition-colors">
            Case Study <ArrowIcon />
          </span>
        ) : link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white border border-border px-4 py-2 rounded-sm hover:bg-white hover:text-bg transition-colors"
          >
            View <ArrowIcon />
          </a>
        ) : null}
      </div>
    </motion.div>
  )

  if (hasDetail) {
    return (
      <Link to={`/projects/${slug}`} className="block h-full">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}
