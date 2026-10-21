import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { Canvas } from '@react-three/fiber'
import { gsap } from 'gsap'
import Scene from './Scene'
import { attachInteraction } from './interaction'
import { journey } from './journey'
import Hero from '../Hero'
import SoundToggle from './SoundToggle'
import { ambient } from './audio'
import { Glass } from '../glass/LiquidGlass'
import { lockScroll, scrollToTarget } from '../../lib/smoothScroll'

// The landing journey.
//
// A 190vh runway scrubs the walk: stars gather into a winding road and the
// camera follows it to a door standing alone at its end. The page ends there
// until the door is opened — by the button, or by clicking the door itself.
// Opening plays one timed sequence (swing, push through, warm white-out),
// reveals the site under the light and lands on Work.
//
// Once open, the content sits directly after the runway, and scrolling
// between them scrubs the camera back and forth through the doorway.

const clamp01 = (v) => Math.min(1, Math.max(0, v))

export function resetJourney(opened) {
  journey.progress.target = journey.progress.value = 0
  journey.content.target = journey.content.value = 0
  journey.door.open = opened ? 1 : 0
  journey.door.push = 0
  journey.door.hover = 0
  journey.opened = opened
}

export default function CosmicLanding({ opened, onOpen, onEntered, reduced }) {
  const wrapRef = useRef(null)
  const flashRef = useRef(null)
  const introRef = useRef(null)
  const hintRef = useRef(null)
  const ctaRef = useRef(null)
  const hitRef = useRef(null)
  const busy = useRef(false)
  const [isMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    // the switch unmounts with the scene — don't strand audio playing
    if (reduced) {
      ambient.mute()
      return
    }
    return attachInteraction()
  }, [reduced])

  useLayoutEffect(() => {
    journey.opened = opened
    if (opened) journey.door.open = 1
  }, [opened])

  useLayoutEffect(() => {
    if (reduced) return

    let firstRun = true
    let entered = false

    const update = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const vh = window.innerHeight

      const wr = wrap.getBoundingClientRect()
      const p = clamp01(-wr.top / Math.max(1, wr.height - vh))
      journey.progress.target = p

      // past the door: how far the content has come up through the doorway
      const after = document.getElementById('after-cosmic')
      let entry = 0
      if (journey.opened && after) {
        const ar = after.getBoundingClientRect()
        entry = clamp01((vh - ar.top) / (vh * 0.6))
        journey.content.target = clamp01((vh * 0.4 - ar.top) / Math.max(1, ar.height))
        if (!busy.current) {
          journey.door.push = entry
          // a warm wash at the moment of crossing, gone once through
          const f = 0.5 * Math.sin(Math.PI * entry)
          gsap.set(flashRef.current, { autoAlpha: f })
        }
      }

      if (firstRun || journey.snap) {
        journey.snap = false
        journey.cameraSnap = true
        firstRun = false
        journey.progress.value = journey.progress.target
        journey.content.value = journey.content.target
      }

      if (introRef.current) {
        introRef.current.style.opacity = 1 - clamp01(p / 0.1)
        introRef.current.style.transform = `translateY(${p * -80}px)`
      }
      if (hintRef.current) hintRef.current.style.opacity = 1 - clamp01(p / 0.05)

      // the invitation appears as the door comes into full view
      const atDoor = p > 0.9 && !journey.opened
      ctaRef.current?.classList.toggle('is-shown', atDoor)
      if (hitRef.current) hitRef.current.style.pointerEvents = p > 0.8 && !journey.opened ? 'auto' : 'none'

      // hysteresis so jitter at the threshold can't flicker the navbar
      if (!entered && journey.opened && entry > 0.4) entered = true
      else if (entered && entry < 0.2) entered = false
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

  const openDoor = useCallback(() => {
    if (busy.current || journey.opened) return
    busy.current = true
    lockScroll(true)
    ctaRef.current?.classList.remove('is-shown')

    const door = journey.door
    gsap
      .timeline({
        onComplete: () => {
          busy.current = false
          lockScroll(false)
        },
      })
      .to(door, { hover: 0, duration: 0.3 }, 0)
      // the slab swings, light floods the road
      .to(door, { open: 1, duration: 1.5, ease: 'power3.inOut' }, 0)
      // then the walk through, quickening
      .to(door, { push: 1, duration: 1.7, ease: 'power2.in' }, 0.75)
      // into the light
      .to(flashRef.current, { autoAlpha: 1, duration: 0.55, ease: 'power2.in' }, 1.9)
      .add(() => {
        // reveal the site under the light and land on Work
        flushSync(() => onOpen?.())
        scrollToTarget('#work', { immediate: true })
      }, 2.5)
      .to(flashRef.current, { autoAlpha: 0, duration: 1.3, ease: 'power2.out' }, 2.65)
  }, [onOpen])

  const hoverDoor = (on) => {
    if (busy.current || journey.opened) return
    gsap.to(journey.door, { hover: on ? 1 : 0, duration: 0.6, ease: 'power2.out' })
  }

  if (reduced) return <Hero />

  return (
    <>
      {/* the universe — fixed behind everything for the whole page */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 46], fov: 60, near: 0.1, far: 400 }}
        >
          <Scene isMobile={isMobile} />
        </Canvas>
      </div>

      <div ref={wrapRef} className="relative h-[190vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* the name, before the walk begins */}
          <div
            ref={introRef}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none will-change-transform px-6"
          >
            <p className="font-mono text-stone uppercase mb-6" style={{ fontSize: '10px', letterSpacing: '0.42em' }}>
              Product · Strategy · Technology
            </p>
            <h1
              className="font-serif text-cream text-center"
              style={{ fontSize: 'clamp(52px, 10vw, 128px)', lineHeight: 0.95, letterSpacing: '-0.01em' }}
            >
              Gaurang Sultania
            </h1>
            <p className="font-serif italic text-stone mt-6 text-center" style={{ fontSize: 'clamp(16px, 2vw, 20px)' }}>
              follow the stars to the door
            </p>
          </div>

          <div ref={hintRef} className="absolute bottom-10 inset-x-0 flex justify-center">
            <Glass size="sm" onClick={() => scrollToTarget(window.innerHeight * 0.5)}>
              Scroll to begin <span aria-hidden="true">↓</span>
            </Glass>
          </div>

          {/* invisible hit area laid over the door by the scene each frame */}
          <button
            ref={(el) => {
              hitRef.current = el
              journey.hitEl = el
            }}
            type="button"
            aria-label="Open the door"
            tabIndex={-1}
            onClick={openDoor}
            onMouseEnter={() => hoverDoor(true)}
            onMouseLeave={() => hoverDoor(false)}
            className="absolute left-0 top-0 cursor-pointer"
            style={{ background: 'transparent', border: 'none', pointerEvents: 'none' }}
          />

          <div ref={ctaRef} className="door-cta absolute bottom-12 inset-x-0 flex flex-col items-center gap-4">
            <Glass
              size="lg"
              onClick={openDoor}
              onMouseEnter={() => hoverDoor(true)}
              onMouseLeave={() => hoverDoor(false)}
            >
              Open the door
            </Glass>
            <span className="lg-caption">
              The work is on the other side
            </span>
          </div>
        </div>
      </div>

      {/* the light and the sound switch — portalled so they sit above the navbar */}
      {createPortal(
        <>
          <SoundToggle />
          <div
            ref={flashRef}
            className="fixed inset-0 z-[60] pointer-events-none"
            style={{
              opacity: 0,
              visibility: 'hidden',
              background: 'radial-gradient(ellipse at 50% 55%, #fffaf0 0%, #fbe9c9 55%, #e9cf9c 100%)',
            }}
          />
        </>,
        document.body
      )}
    </>
  )
}
