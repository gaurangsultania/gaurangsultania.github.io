import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import CosmicLanding, { resetJourney } from '../components/cosmic/CosmicLanding'
import Projects from '../components/Projects'
import Blog from '../components/Blog'
import Now from '../components/Now'
import Contact from '../components/Contact'
import Music from '../components/Music'
import { useNotion } from '../hooks/useNotion'
import { journey } from '../components/cosmic/journey'
import { scrollToTarget, startSmoothScroll, stopSmoothScroll } from '../lib/smoothScroll'

// The site lives behind the door. Until it is opened the page ends at the
// landing; coming back from a case study (location.state.section) skips
// the walk and lands on that section with the door already open.

export default function Home() {
  const { projects, posts } = useNotion()
  const location = useLocation()
  const returnTo = location.state?.section
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [opened, setOpened] = useState(() => reduced || !!returnTo)
  const [entered, setEntered] = useState(false)

  // set before the landing's first frame so the scene starts in the right state
  useState(() => resetJourney(reduced || !!returnTo))

  useEffect(() => {
    startSmoothScroll()
    return () => stopSmoothScroll()
  }, [])

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    if (returnTo) {
      journey.snap = true
      scrollToTarget(`#${returnTo}`, { immediate: true })
    }
    else window.scrollTo(0, 0)
  }, [returnTo])

  const onOpen = useCallback(() => setOpened(true), [])
  const onEntered = useCallback((v) => setEntered(v), [])

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {(entered || (reduced && opened)) && (
          <motion.div
            className="relative z-50"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Navbar />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        <CosmicLanding opened={opened} onOpen={onOpen} onEntered={onEntered} reduced={reduced} />

        {opened && (
          <div id="after-cosmic">
            <Projects projects={projects} />
            <Blog posts={posts} />
            <Music />
            <Now />
            <Contact />

            <footer className="py-10 px-6">
              <p className="text-center font-mono text-stone" style={{ fontSize: '10px', letterSpacing: '0.2em' }}>
                © {new Date().getFullYear()} Gaurang Sultania
              </p>
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}
