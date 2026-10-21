import { useEffect, useRef, useState } from 'react'
import { Glass } from '../glass/LiquidGlass'
import { ambient } from './audio'

// The soundtrack switch. Audio may only start from a click, so this is the
// one way in. Three bars beside the label move with the bass, mids and highs
// while it plays. The page going to the background pauses it.

export default function SoundToggle() {
  const [playing, setPlaying] = useState(ambient.playing)
  const bars = useRef([])

  useEffect(() => ambient.subscribe(setPlaying), [])

  useEffect(() => {
    const onHide = () => { if (document.hidden) ambient.mute() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  useEffect(() => {
    let raf = 0
    const draw = () => {
      const { bass, mid, high } = ambient.bands
      ;[bass, mid, high].forEach((v, i) => {
        const el = bars.current[i]
        if (el) el.style.transform = `scaleY(${0.25 + Math.min(1, v) * 0.75})`
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      <Glass
        size="sm"
        onClick={() => ambient.toggle()}
        aria-pressed={playing}
        aria-label={playing ? 'Turn sound off' : 'Turn sound on'}
      >
        <span className="sound-bars" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} ref={(el) => (bars.current[i] = el)} />
          ))}
        </span>
        {playing ? 'Sound on' : 'Sound off'}
      </Glass>
    </div>
  )
}
