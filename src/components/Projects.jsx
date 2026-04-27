import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ProjectCard from './ProjectCard'

export default function Projects({ projects }) {
  const data = projects
  const categories = [
    'All',
    ...Array.from(
      new Set(
        data.flatMap((p) => (Array.isArray(p.category) ? p.category : [p.category])).filter(Boolean)
      )
    ),
  ]
  const [active, setActive] = useState('All')

  const filtered =
    active === 'All'
      ? data
      : data.filter((p) =>
          Array.isArray(p.category) ? p.category.includes(active) : p.category === active
        )

  return (
    <section id="projects" className="py-24 px-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-muted text-sm font-medium tracking-widest uppercase mb-3">Work</p>
        <h2 className="text-4xl font-extrabold text-white tracking-tight mb-10">Projects</h2>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`px-4 py-1.5 text-xs font-semibold tracking-wider uppercase rounded-sm border transition-colors ${
              active === cat
                ? 'bg-white text-bg border-white'
                : 'border-border text-muted hover:border-white/40 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Card grid */}
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((project) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
