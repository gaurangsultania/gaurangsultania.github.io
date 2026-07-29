import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Scene from './Scene'
import { ambient } from './audio'
import Hero from '../Hero'

gsap.registerPlugin(ScrollTrigger)

// Immersive landing: 420vh of scroll scrubs a camera flight through a star
// field toward a tear of white light. At the threshold the screen whites out,
// then dissolves into the projects section — entering another universe.
//
// The white flash is the product of two scroll-linked ramps:
//   up   — rises to 1 near the end of the flight (this container's trigger)
//   down — falls from 1 as the next section scrolls in (#after-cosmic trigger)
// flash = min(up, down), so the crossover is seamless in both directions.

export default function CosmicLanding({ onEntered }) {
  const wrapRef = useRef(null)
  const flashRef = useRef(null)
  const nameRef = useRef(null)
  const hintRef = useRef(null)
  const progressRef = useRef({ target: 0, value: 0 })
  const flashParts = useRef({ up: 0, down: 1 })
  const [soundOn, setSoundOn] = useState(false)
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const isMobile = window.innerWidth < 768

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useLayoutEffect(() => {
    if (reduced) {
      onEntered?.(true)
      return
    }

    const applyFlash = () => {
      const f = Math.min(flashParts.current.up, flashParts.current.down)
      if (flashRef.current) {
        flashRef.current.style.opacity = f
        flashRef.current.style.visibility = f > 0.001 ? 'visible' : 'hidden'
      }
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: wrapRef.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const p = self.progress
          progressRef.current.target = p

          flashParts.current.up = gsap.utils.clamp(0, 1, (p - 0.86) / 0.08)
          applyFlash()

          // the only visible text fades away as the journey begins
          if (nameRef.current) {
            nameRef.current.style.opacity = 1 - gsap.utils.clamp(0, 1, p / 0.14)
            nameRef.current.style.transform = `translateY(${p * -60}px)`
          }
          if (hintRef.current) {
            hintRef.current.style.opacity = 1 - gsap.utils.clamp(0, 1, p / 0.08)
          }
        },
      })

      ScrollTrigger.create({
        trigger: '#after-cosmic',
        start: 'top bottom',
        end: 'top 35%',
        onUpdate: (self) => {
          flashParts.current.down = 1 - self.progress
          applyFlash()
          onEntered?.(self.progress > 0.2)
        },
      })
    })

    return () => ctx.revert()
  }, [reduced, onEntered])

  const toggleSound = async () => {
    const playing = await ambient.toggle()
    setSoundOn(!!playing)
  }

  if (reduced) return <Hero />

  return (
    <>
      <div ref={wrapRef} className="relative h-[420vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          <Canvas
            dpr={[1, 1.75]}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 62], fov: 58, near: 0.1, far: 400 }}
          >
            <Scene progressRef={progressRef} isMobile={isMobile} />
          </Canvas>

          {/* the only text in the void — dissolves as you begin to move */}
          <div
            ref={nameRef}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none will-change-transform"
          >
            <p className="text-muted text-xs font-medium tracking-[0.4em] uppercase mb-5">
              Product · Strategy · Technology
            </p>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white/90 tracking-tight text-center">
              Gaurang Sultania
            </h1>
          </div>

          <div
            ref={hintRef}
            className="absolute bottom-10 inset-x-0 flex flex-col items-center gap-3 pointer-events-none"
          >
            <span className="text-muted text-[10px] tracking-[0.35em] uppercase">
              Scroll into the void
            </span>
            <div className="w-px h-10 bg-gradient-to-b from-muted to-transparent animate-pulse" />
          </div>
        </div>
      </div>

      {/* white-out at the threshold */}
      <div
        ref={flashRef}
        className="fixed inset-0 z-[60] bg-white pointer-events-none"
        style={{ opacity: 0, visibility: 'hidden' }}
      />

      {/* sound — audio can only start from a gesture */}
      <button
        onClick={toggleSound}
        className="fixed bottom-6 right-6 z-[70] text-[10px] tracking-[0.3em] uppercase text-muted hover:text-white transition-colors"
        aria-label={soundOn ? 'Mute ambient sound' : 'Play ambient sound'}
      >
        <span className={soundOn ? 'text-white' : ''}>
          {soundOn ? '● sound on' : '○ sound off'}
        </span>
      </button>
    </>
  )
}
