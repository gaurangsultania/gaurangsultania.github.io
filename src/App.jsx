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

  return (
    <div className="min-h-screen bg-bg">
      {/* No UI until the portal has been crossed */}
      {entered && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <Navbar />
        </motion.div>
      )}

      <main>
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
      </main>

      <footer className="border-t border-border py-8 px-6">
        <p className="text-center text-muted text-xs">
          © {new Date().getFullYear()} Gaurang Sultania
        </p>
      </footer>
    </div>
  )
}
