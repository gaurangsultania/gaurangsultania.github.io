import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import Stars from './Stars'
import Portal from './Portal'
import { ambient } from './audio'

// Scroll drives the journey: the camera travels from deep space (z=62) to the
// lip of the tear (z=2.2). Raw scroll progress arrives in progressRef.target;
// we damp it here so the flight always feels weighted and cinematic, and the
// smoothed value is shared back for the portal and DOM overlays to read.

const CAM_START = 62
const CAM_END = 2.2
const look = new THREE.Vector3()

function CameraRig({ progressRef }) {
  const { camera } = useThree()

  useFrame((state, delta) => {
    ambient.update()

    const pr = progressRef.current
    pr.value = THREE.MathUtils.damp(pr.value, pr.target, 2.4, delta)
    const p = pr.value
    const t = state.clock.elapsedTime

    // accelerate slightly as the portal nears — a gravity well
    const travel = Math.pow(p, 1.22)
    const sway = 1 - p

    camera.position.z = THREE.MathUtils.lerp(CAM_START, CAM_END, travel)
    camera.position.x = Math.sin(t * 0.16) * 0.9 * sway + ambient.bands.bass * 0.12 * sway
    camera.position.y = Math.cos(t * 0.11) * 0.55 * sway

    // gaze converges on the tear as it forms
    look.set(0, 0, THREE.MathUtils.lerp(camera.position.z - 12, 0, p))
    camera.lookAt(look)

    // subtle dolly-zoom: fov widens on approach, heightening the pull
    camera.fov = THREE.MathUtils.lerp(58, 74, travel)
    camera.updateProjectionMatrix()
  })

  return null
}

export default function Scene({ progressRef, isMobile }) {
  const dofRef = useRef()

  return (
    <>
      <color attach="background" args={['#030306']} />
      <fogExp2 attach="fog" args={['#050508', 0.016]} />

      <CameraRig progressRef={progressRef} />
      <Stars count={isMobile ? 2400 : 4200} />
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
          <DepthOfField ref={dofRef} focusDistance={0.025} focalLength={0.08} bokehScale={2.2} />
        )}
        <ChromaticAberration offset={[0.0006, 0.0004]} radialModulation modulationOffset={0.4} />
        <Vignette eskil={false} offset={0.22} darkness={0.82} />
      </EffectComposer>
    </>
  )
}
