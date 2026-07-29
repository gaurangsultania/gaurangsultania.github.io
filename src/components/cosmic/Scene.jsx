import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import Stars from './Stars'
import Portal from './Portal'
import { ambient } from './audio'
import { interaction } from './interaction'

// Two-phase journey, one continuous camera:
//   landing (progressRef): deep space z=62 → the lip of the tear z=2.2
//   content (contentRef):  through the tear and onward, z=2.2 → -55, as the
//                          user browses projects / blog / contact
// Mouse parallax rides on top of both phases; the black-hole strength spring
// (build while held, elastic bounce on release) is integrated here so every
// consumer reads one shared value.

const CAM_START = 62
const CAM_END = 2.2
const CAM_DEEP = -55
const look = new THREE.Vector3()
const parallax = { x: 0, y: 0 }

function CameraRig({ progressRef, contentRef }) {
  const { camera } = useThree()

  useFrame((state, delta) => {
    ambient.update()

    // --- black hole spring ---
    if (interaction.holding) {
      // strength builds over ~1s while held; kill any leftover bounce
      interaction.holeStrength = THREE.MathUtils.damp(interaction.holeStrength, 1, 2.2, delta)
      interaction.holeVelocity = 0
    } else if (Math.abs(interaction.holeStrength) > 0.0005 || Math.abs(interaction.holeVelocity) > 0.0005) {
      // underdamped spring back to 0 — stars overshoot outward then settle
      const dt = Math.min(delta, 1 / 30)
      interaction.holeVelocity += (-70 * interaction.holeStrength - 9 * interaction.holeVelocity) * dt
      interaction.holeStrength = THREE.MathUtils.clamp(
        interaction.holeStrength + interaction.holeVelocity * dt, -0.25, 1
      )
    } else {
      interaction.holeStrength = 0
      interaction.holeVelocity = 0
    }

    const pr = progressRef.current
    const cr = contentRef.current
    pr.value = THREE.MathUtils.damp(pr.value, pr.target, 2.4, delta)
    cr.value = THREE.MathUtils.damp(cr.value, cr.target, 2.4, delta)
    const p = pr.value
    const c = cr.value
    const t = state.clock.elapsedTime

    // accelerate slightly as the portal nears — a gravity well
    const travel = Math.pow(p, 1.22)
    const sway = 0.25 + 0.75 * (1 - p)

    // mouse parallax, damped so it glides
    parallax.x = THREE.MathUtils.damp(parallax.x, interaction.mouse.x * 0.8, 3, delta)
    parallax.y = THREE.MathUtils.damp(parallax.y, interaction.mouse.y * 0.5, 3, delta)

    camera.position.z =
      THREE.MathUtils.lerp(CAM_START, CAM_END, travel) + (CAM_DEEP - CAM_END) * c
    camera.position.x =
      Math.sin(t * 0.16) * 0.9 * sway + ambient.bands.bass * 0.12 * sway + parallax.x
    camera.position.y = Math.cos(t * 0.11) * 0.55 * sway + parallax.y

    // gaze converges on the tear as it forms, then releases forward once
    // the crossing is behind us
    const portalFocus = p * THREE.MathUtils.clamp(1 - c * 5, 0, 1)
    look.set(0, 0, THREE.MathUtils.lerp(camera.position.z - 12, 0, portalFocus))
    camera.lookAt(look)

    // dolly-zoom into the tear, then settle back to a calm lens beyond it
    const fovIn = THREE.MathUtils.lerp(58, 74, travel)
    camera.fov = THREE.MathUtils.lerp(fovIn, 60, Math.min(c * 4, 1))
    camera.updateProjectionMatrix()
  })

  return null
}

export default function Scene({ progressRef, contentRef, isMobile }) {
  return (
    <>
      <color attach="background" args={['#030306']} />
      <fogExp2 attach="fog" args={['#050508', 0.016]} />

      <CameraRig progressRef={progressRef} contentRef={contentRef} />
      <Stars count={isMobile ? 2800 : 5200} />
      <Portal progressRef={progressRef} particleCount={isMobile ? 350 : 650} />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.32}
          mipmapBlur
          radius={0.85}
        />
        {!isMobile && (
          <DepthOfField focusDistance={0.025} focalLength={0.08} bokehScale={2.2} />
        )}
        <ChromaticAberration offset={[0.0006, 0.0004]} radialModulation modulationOffset={0.4} />
        <Vignette eskil={false} offset={0.22} darkness={0.82} />
      </EffectComposer>
    </>
  )
}
