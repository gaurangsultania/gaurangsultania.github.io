import { motion } from 'framer-motion'

export default function ProjectCard({ project }) {
  const { name, tagline, category, featured, link } = project

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="group relative flex flex-col bg-surface border border-border rounded-sm p-6 hover:border-white/20 transition-colors"
    >
      {featured && (
        <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase text-muted border border-border px-2 py-0.5 rounded-sm">
          Featured
        </span>
      )}

      {category && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(Array.isArray(category) ? category : [category]).map((cat) => (
            <span key={cat} className="text-xs font-semibold text-muted tracking-wider uppercase">
              {cat}
            </span>
          ))}
        </div>
      )}

      <h3 className="text-white font-bold text-xl mb-2 leading-tight">{name}</h3>
      <p className="text-muted text-sm leading-relaxed flex-1">{tagline}</p>

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white border border-border px-4 py-2 rounded-sm hover:bg-white hover:text-bg transition-colors self-start"
        >
          View Project
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-60">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      )}
    </motion.div>
  )
}
