import { motion } from 'framer-motion'


function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Blog({ posts }) {
  const data = posts

  return (
    <section id="blog" className="py-24 px-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <p className="text-muted text-sm font-medium tracking-widest uppercase mb-3">Writing</p>
        <h2 className="text-4xl font-extrabold text-white tracking-tight">Blog</h2>
      </motion.div>

      {data.length === 0 && (
        <p className="text-muted text-sm">No posts published yet — check back soon.</p>
      )}
      <div className="flex flex-col divide-y divide-border">
        {data.map((post, i) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="py-8 group"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1">
                {post.link ? (
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <h3 className="text-white font-bold text-xl leading-snug mb-2 group-hover:text-accent transition-colors">
                      {post.title}
                    </h3>
                  </a>
                ) : (
                  <h3 className="text-white font-bold text-xl leading-snug mb-2">{post.title}</h3>
                )}
                {post.summary && (
                  <p className="text-muted text-sm leading-relaxed max-w-2xl">{post.summary}</p>
                )}
              </div>
              {post.date && (
                <time className="text-muted text-xs font-medium whitespace-nowrap sm:mt-1">
                  {formatDate(post.date)}
                </time>
              )}
            </div>

            {post.link && (
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-white transition-colors"
              >
                Read post
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}
          </motion.article>
        ))}
      </div>
    </section>
  )
}
