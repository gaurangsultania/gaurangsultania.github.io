import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Projects from '../components/Projects'
import Blog from '../components/Blog'
import Now from '../components/Now'
import Contact from '../components/Contact'
// MUSIC_SECTION — uncomment the line below when ready
// import Music from '../components/Music'

export default function Home() {
  return (
    <div className="bg-canvas min-h-screen">
      <Navbar />

      <Hero />

      <Projects />

      {/* MUSIC_SECTION — uncomment when ready */}
      {/* <Music /> */}

      <Blog />

      <Now />

      <Contact />

      <footer style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div className="content-wrap">
          <span className="font-mono text-stone" style={{ fontSize: '10px', letterSpacing: '0.12em' }}>
            © {new Date().getFullYear()} Gaurang Sultania
          </span>
        </div>
      </footer>
    </div>
  )
}
