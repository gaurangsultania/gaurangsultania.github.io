import { useRef, useEffect } from 'react'
import posts from '../data/posts.json'

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

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

function PostRow({ post, index }) {
  const ref = useRef(null)
  useReveal(ref)

  const inner = (
    <div
      ref={ref}
      className="reveal group py-6 border-b border-stone/30"
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="flex items-baseline justify-between gap-6">
        <span
          className="font-serif text-cream list-item-title"
          style={{ fontSize: '18px' }}
        >
          {post.title}
        </span>
        {post.date && (
          <span className="font-mono text-stone shrink-0" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>
            {formatDate(post.date)}
          </span>
        )}
      </div>
    </div>
  )

  if (post.link) {
    return (
      <a href={post.link} target="_blank" rel="noopener noreferrer" className="block" style={{ textDecoration: 'none' }}>
        {inner}
      </a>
    )
  }

  return <div>{inner}</div>
}

export default function Blog() {
  const headerRef = useRef(null)
  useReveal(headerRef)

  return (
    <section id="writing" style={{ paddingTop: '140px', paddingBottom: '140px' }}>
      <div className="content-wrap">
        <div ref={headerRef} className="reveal mb-12">
          <div className="divider mb-6" />
          <h2 className="font-serif text-cream" style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Writing
          </h2>
        </div>

        {posts.length === 0 ? (
          <p className="font-mono text-stone" style={{ fontSize: '12px' }}>
            nothing published yet.
          </p>
        ) : (
          <div>
            {posts.map((post, i) => (
              <PostRow key={post.id} post={post} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
