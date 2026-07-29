import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas } from '@react-three/fiber'
import Scene from './Scene'
import { ambient } from './audio'
import { attachInteraction } from './interaction'
import Hero from '../Hero'

// Immersive landing + persistent universe.
//
// The canvas is FIXED behind the whole site (-z-10); content scrolls above it.
// 420vh of scroll scrubs the camera toward the tear; past the crossing, a
// second scrubbed range keeps the camera drifting through the star field
// behind projects / blog / contact, so the transition needs only a soft
// bloom of light (peak ~0.65) instead of a hard white-out — the stars
// themselves carry the continuity.
//
// All scroll progress is computed in a plain passive scroll listener rather
// than an animation-frame-driven library, so the DOM side (flash, text fade,
// navbar reveal) stays correct even when the WebGL frame rate dips — the 3D
// side smooths the same raw values with per-frame damping in the camera rig.
//
//   up   — rises near the end of the flight
//   down — falls as the next section scrolls in
// flash = min(up, down), seamless in both scroll directions.

const FLASH_PEAK = 0.65
const clamp01 = (v) => Math.min(1, Math.max(0, v))

export default function CosmicLanding({ onEntered }) {
  const wrapRef = useRef(null)
  const flashRef = useRef(null)
  const nameRef = useRef(null)
  const hintRef = useRef(null)
  const progressRef = useRef({ target: 0, value: 0 })
  const contentRef = useRef({ target: 0, value: 0 })
  const [soundOn, setSoundOn] = useState(false)
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  // captured once — flipping it on resize would swap star/particle counts on
  // live geometries (attribute-size corruption) and remount the whole scene
  const [isMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduced) {
      // the sound button unmounts with the scene — don't strand audio playing
      ambient.mute()
      return
    }
    return attachInteraction()
  }, [reduced])

  useLayoutEffect(() => {
    if (reduced) {
      onEntered?.(true)
      return
    }

    let firstRun = true
    let entered = false

    const update = () => {
      const wrap = wrapRef.current
      const after = document.getElementById('after-cosmic')
      if (!wrap || !after) return
      const vh = window.innerHeight

      // landing flight: wrapper top pinned at 0 → bottom reaching viewport bottom
      const wr = wrap.getBoundingClientRect()
      const p = clamp01(-wr.top / Math.max(1, wr.height - vh))
      progressRef.current.target = p

      // content phase: #after-cosmic from entering the viewport to its bottom
      const ar = after.getBoundingClientRect()
      const entry = clamp01((vh - ar.top) / (vh * 0.45)) // top:bottom → top:55%
      contentRef.current.target = clamp01((vh - ar.top) / Math.max(1, ar.height))

      // scroll restoration (reload / back-nav mid-page): snap the smoothed
      // values to their targets so the camera doesn't replay the whole flight
      if (firstRun) {
        firstRun = false
        progressRef.current.value = progressRef.current.target
        contentRef.current.value = contentRef.current.target
      }

      // soft bloom of light only around the actual crossing moment
      const up = clamp01((p - 0.92) / 0.06) * FLASH_PEAK
      const down = (1 - entry) * FLASH_PEAK
      const f = Math.min(up, down)
      if (flashRef.current) {
        flashRef.current.style.opacity = f
        flashRef.current.style.visibility = f > 0.001 ? 'visible' : 'hidden'
      }

      // the only visible text fades away as the journey begins
      if (nameRef.current) {
        nameRef.current.style.opacity = 1 - clamp01(p / 0.14)
        nameRef.current.style.transform = `translateY(${p * -60}px)`
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = 1 - clamp01(p / 0.08)
      }

      // hysteresis so scroll jitter at the threshold can't flicker the navbar
      if (!entered && entry > 0.3) entered = true
      else if (entered && entry < 0.15) entered = false
      onEntered?.(entered)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [reduced, onEntered])

  const toggleSound = async () => {
    const playing = await ambient.toggle()
    setSoundOn(!!playing)
  }

  if (reduced) return <Hero />

  return (
    <>
      {/* the universe — behind everything, for the entire page.
          -z-10 keeps it under all static content within main's stacking
          context while still painting above the body background. */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 62], fov: 58, near: 0.1, far: 400 }}
        >
          <Scene progressRef={progressRef} contentRef={contentRef} isMobile={isMobile} />
        </Canvas>
      </div>

      {/* scroll runway for the flight, with the only text in the void */}
      <div ref={wrapRef} className="relative h-[420vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
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

      {/* Flash + sound button portal to <body>: inside <main class="z-10">
          their z-indexes would be sealed below the navbar's z-50. */}
      {createPortal(
        <>
          {/* soft light at the threshold */}
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
        </>,
        document.body
      )}
    </>
  )
}
