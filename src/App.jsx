import { useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from './components/Navbar'
import CosmicLanding from './components/cosmic/CosmicLanding'
import Projects from './components/Projects'
import Blog from './components/Blog'
import Contact from './components/Contact'
import { useNotion } from './hooks/useNotion'

export default function App() {
  const { projects, posts, loading } = useNotion()
  const [entered, setEntered] = useState(false)

  // No background on the root — the fixed cosmic canvas (z-0) is the
  // backdrop for the entire site; all content floats above it on z-10.
  return (
    <div className="min-h-screen">
      {/* No UI until the portal has been crossed */}
      {/* relative z-50 keeps the fade wrapper's stacking position identical
          during and after the opacity animation — without it the navbar fades
          in underneath main, then pops on top when the animation ends */}
      {entered && (
        <motion.div
          className="relative z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Navbar />
        </motion.div>
      )}

      <main className="relative z-10">
        <CosmicLanding onEntered={setEntered} />

        <div id="after-cosmic">
          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <span className="text-muted text-sm tracking-widest uppercase animate-pulse">Loading…</span>
            </div>
          ) : (
            <>
              <Projects projects={projects} />
              <div className="border-t border-border max-w-6xl mx-auto" />
              <Blog posts={posts} />
              <div className="border-t border-border max-w-6xl mx-auto" />
              <Contact />
            </>
          )}
        </div>

        <footer className="border-t border-border py-8 px-6">
          <p className="text-center text-muted text-xs">
            © {new Date().getFullYear()} Gaurang Sultania
          </p>
        </footer>
      </main>
    </div>
  )
}
