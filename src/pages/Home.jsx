import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Projects from '../components/Projects'
import Blog from '../components/Blog'
import Contact from '../components/Contact'
import { useNotion } from '../hooks/useNotion'

export default function Home() {
  const { projects, posts } = useNotion()

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main>
        <Hero />
        <div className="border-t border-border" />
        <Projects projects={projects} />
        <div className="border-t border-border max-w-6xl mx-auto" />
        <Blog posts={posts} />
        <div className="border-t border-border max-w-6xl mx-auto" />
        <Contact />
      </main>
      <footer className="border-t border-border py-8 px-6">
        <p className="text-center text-muted text-xs">
          © {new Date().getFullYear()} Gaurang Sultania
        </p>
      </footer>
    </div>
  )
}
