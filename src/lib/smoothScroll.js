import Lenis from 'lenis'
import { gsap } from 'gsap'

// One Lenis instance for the page, ticked by GSAP's clock so scroll-driven
// visuals and timelines advance on the same frame.

let lenis = null
let tick = null

export function startSmoothScroll() {
  if (lenis) return lenis
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true })
  tick = (time) => lenis.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function stopSmoothScroll() {
  if (!lenis) return
  gsap.ticker.remove(tick)
  lenis.destroy()
  lenis = null
  tick = null
}

export function getLenis() {
  return lenis
}

// scroll to an element (or y), smoothly when Lenis is running
export function scrollToTarget(target, { immediate = false, offset = 0 } = {}) {
  if (lenis) {
    if (immediate) lenis.resize()
    lenis.scrollTo(target, { immediate, offset, force: true, duration: immediate ? 0 : 1.4 })
    return
  }
  const el = typeof target === 'string' ? document.querySelector(target) : target
  const y = typeof target === 'number' ? target : el ? el.getBoundingClientRect().top + window.scrollY + offset : 0
  window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' })
}

export function lockScroll(locked) {
  if (lenis) locked ? lenis.stop() : lenis.start()
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}
