// Shared pointer state for the cosmic scene: mouse parallax + the
// click-and-hold black hole. The 3D scene reads this singleton every frame.
//
// The black hole engages only for mouse pointers (touch drag must stay
// scrolling) and only when the press does not start on an interactive
// element — links, buttons, form fields, nav.

export const interaction = {
  mouse: { x: 0, y: 0 }, // normalized device coords, -1..1
  holeNdc: { x: 0, y: 0 },
  holding: false,
  // spring state, driven by the camera rig each frame
  holeStrength: 0,
  holeVelocity: 0,
}

const INTERACTIVE = 'a, button, input, textarea, select, summary, [role="button"], nav, header'

export function attachInteraction() {
  const toNdc = (e) => ({
    x: (e.clientX / window.innerWidth) * 2 - 1,
    y: -((e.clientY / window.innerHeight) * 2 - 1),
  })

  const onMove = (e) => {
    const ndc = toNdc(e)
    interaction.mouse = ndc
    if (interaction.holding) {
      // pointerup can be swallowed by context menus / chorded buttons —
      // if the left button is no longer down, the hold is over
      if ((e.buttons & 1) === 0) release()
      else interaction.holeNdc = ndc
    }
  }

  const onDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    if (e.target.closest?.(INTERACTIVE)) return
    interaction.holding = true
    interaction.holeNdc = toNdc(e)
    document.body.style.userSelect = 'none'
  }

  const release = () => {
    if (!interaction.holding) return
    interaction.holding = false
    document.body.style.userSelect = ''
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)
  window.addEventListener('contextmenu', release)
  window.addEventListener('blur', release)

  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', release)
    window.removeEventListener('pointercancel', release)
    window.removeEventListener('contextmenu', release)
    window.removeEventListener('blur', release)
    release()
  }
}
