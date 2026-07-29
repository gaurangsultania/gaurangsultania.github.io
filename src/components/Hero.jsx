import { useRef, useEffect } from 'react'

// ─── Canvas config ─────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 62
const LINE_DIST      = 125      // px — max distance to draw a connection
const CURSOR_RADIUS  = 170      // px — deflection zone
const REPEL          = 0.22     // deflection strength
const MAX_SPEED      = 0.22     // px/frame

export default function Hero() {
  const canvasRef = useRef(null)
  const mouse     = useRef({ x: -9999, y: -9999 })
  const raf       = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    // Resize
    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Cursor tracking — mouse and touch
    const onMove  = (e) => { mouse.current = { x: e.clientX,       y: e.clientY } }
    const onTouch = (e) => { mouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove',  onTouch, { passive: true })

    // Seed particles scattered across the viewport
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * MAX_SPEED,
      vy: (Math.random() - 0.5) * MAX_SPEED,
      r:  Math.random() * 1.1 + 0.4,
    }))

    let t = 0

    function frame() {
      raf.current = requestAnimationFrame(frame)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t++

      const { x: mx, y: my } = mouse.current

      for (const p of particles) {
        // Slow-evolving flow field pushes particles gently
        const angle =
          Math.sin(p.x * 0.0035 + t * 0.00025) * Math.PI +
          Math.cos(p.y * 0.003  - t * 0.0002 ) * Math.PI * 0.5
        p.vx += Math.cos(angle) * 0.004
        p.vy += Math.sin(angle) * 0.004

        // Speed cap — keeps everything feeling slow
        const spd = Math.hypot(p.vx, p.vy)
        if (spd > MAX_SPEED) { p.vx = (p.vx / spd) * MAX_SPEED; p.vy = (p.vy / spd) * MAX_SPEED }

        // Cursor deflection — the way water notices a hand
        const dx   = p.x - mx
        const dy   = p.y - my
        const dist = Math.hypot(dx, dy)
        if (dist < CURSOR_RADIUS && dist > 0) {
          const force = (1 - dist / CURSOR_RADIUS) * REPEL
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        p.x += p.vx
        p.y += p.vy

        // Wrap at edges — particles pass through quietly
        if (p.x < 0)              p.x = canvas.width
        if (p.x > canvas.width)   p.x = 0
        if (p.y < 0)              p.y = canvas.height
        if (p.y > canvas.height)  p.y = 0

        // Particle dot — barely there
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(200, 195, 180, 0.85)'
        ctx.fill()
      }

      // Connection lines — field line aesthetic
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x
          const dy   = particles[i].y - particles[j].y
          const dist = Math.hypot(dx, dy)
          if (dist < LINE_DIST) {
            const alpha = (1 - dist / LINE_DIST) * 0.45
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(200, 169, 110, ${alpha})`
            ctx.lineWidth   = 0.5
            ctx.stroke()
          }
        }
      }
    }

    frame()

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize',     resize)
      window.removeEventListener('mousemove',  onMove)
      window.removeEventListener('touchmove',  onTouch)
    }
  }, [])

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Generative canvas — runs before you arrive, keeps running after you leave */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ pointerEvents: 'none' }}
      />

      {/* Hero text layer */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full select-none">

        {/* HERO_LINE — replace this string with your own line */}
        <p
          className="font-serif text-cream text-center px-6"
          style={{ fontSize: '33px', opacity: 0.85, letterSpacing: '0.01em', lineHeight: 1.4 }}
        >
          things worth making take time to notice
        </p>

        {/* Scroll direction — not a button, just a signal */}
        <div
          className="absolute bottom-10 font-mono text-stone chevron-pulse"
          style={{ fontSize: '13px', letterSpacing: '0.1em' }}
          aria-hidden="true"
        >
          ↓
        </div>
      </div>
    </section>
  )
}
