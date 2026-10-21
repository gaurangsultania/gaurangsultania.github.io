import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import Stars from './Stars'
import StarPath from './StarPath'
import Door from './Door'
import { ambient } from './audio'
import { interaction } from './interaction'
import { journey, curve, CAM_STOP, camU, doorCenter, doorFacing, DOOR_W, DOOR_H } from './journey'

// One continuous camera:
//   walk    — rides the winding curve at eye height, looking a little ahead,
//             turning its gaze onto the door as it arrives
//   push    — through the open doorway into the light (GSAP or scroll driven)
//   beyond  — drifts on through the star field behind the content sections
// The target pose is computed from those inputs every frame and the real
// camera is damped toward it, so any discontinuity (a scroll jump hidden by
// the flash, a resize) resolves as a glide rather than a cut.

const pos = new THREE.Vector3()
const ahead = new THREE.Vector3()
const look = new THREE.Vector3()
const smoothLook = new THREE.Vector3(0, 0, 0)
const tmp = new THREE.Vector3()
const parallax = { x: 0, y: 0 }
const corner = new THREE.Vector3()

// the camera's arrival spot, a few steps short of the door
const stopPos = curve.getPointAt(CAM_STOP).clone()
// through the doorway and out the far side
const throughPos = doorCenter.clone().addScaledVector(doorFacing, -6)
throughPos.y = stopPos.y + 0.6

function CameraRig() {
  const { camera, size } = useThree()

  useFrame((state, delta) => {
    ambient.update()
    springHole(delta)

    const pr = journey.progress
    const cr = journey.content
    pr.value = THREE.MathUtils.damp(pr.value, pr.target, 5, delta)
    cr.value = THREE.MathUtils.damp(cr.value, cr.target, 5, delta)
    const p = pr.value
    const t = state.clock.elapsedTime
    const push = journey.door.push

    // --- walk ---
    const u = camU(p)
    curve.getPointAt(u, pos)
    curve.getPointAt(Math.min(u + 0.035, 1), ahead)
    // the gaze swings from the road ahead onto the door over the last stretch
    const arrive = THREE.MathUtils.smoothstep(p, 0.72, 1)
    look.lerpVectors(ahead, doorCenter, arrive)

    // a slow sway while walking, damped to stillness at the door
    const sway = 1 - arrive * 0.85
    pos.x += Math.sin(t * 0.3) * 0.12 * sway
    pos.y += Math.sin(t * 0.55) * 0.06 * sway

    // --- push through the doorway, then drift beyond ---
    if (push > 0) {
      tmp.lerpVectors(stopPos, throughPos, push)
      pos.lerp(tmp, Math.min(1, push * 1.4))
      look.lerp(tmp.copy(doorCenter).addScaledVector(doorFacing, -40), push)
    }
    if (journey.opened && cr.value > 0) {
      pos.addScaledVector(doorFacing, -cr.value * 60)
      look.addScaledVector(doorFacing, -cr.value * 60)
    }

    // pointer parallax, gentle
    parallax.x = THREE.MathUtils.damp(parallax.x, interaction.mouse.x * 0.35, 3, delta)
    parallax.y = THREE.MathUtils.damp(parallax.y, interaction.mouse.y * 0.2, 3, delta)
    pos.x += parallax.x
    pos.y += parallax.y

    // follow the target pose — tight during the timeline, softer otherwise
    // (or instantly, after a jump the visitor shouldn't watch replayed)
    const k = journey.cameraSnap ? 1e4 : push > 0 && push < 1 ? 14 : 6
    journey.cameraSnap = false
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, k, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, k, delta)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, k, delta)
    smoothLook.x = THREE.MathUtils.damp(smoothLook.x, look.x, k, delta)
    smoothLook.y = THREE.MathUtils.damp(smoothLook.y, look.y, k, delta)
    smoothLook.z = THREE.MathUtils.damp(smoothLook.z, look.z, k, delta)
    camera.lookAt(smoothLook)

    // the lens widens as we cross the threshold
    const fov = 60 + push * 38 * (1 - push * 0.35)
    camera.fov = THREE.MathUtils.damp(camera.fov, fov, k, delta)
    camera.updateProjectionMatrix()

    placeHitArea(camera, size)
  })

  return null
}

// lay the DOM hit area over the door's on-screen rectangle
function placeHitArea(camera, size) {
  const el = journey.hitEl
  if (!el) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const side = tmp.set(doorFacing.z, 0, -doorFacing.x) // horizontal, across the door
  for (const [sx, sy] of [[-0.5, 0], [0.5, 0], [-0.5, 1], [0.5, 1]]) {
    corner.copy(doorCenter).addScaledVector(side, sx * DOOR_W)
    corner.y += (sy - 0.5) * DOOR_H
    corner.project(camera)
    const x = (corner.x * 0.5 + 0.5) * size.width
    const y = (-corner.y * 0.5 + 0.5) * size.height
    minX = Math.min(minX, x); maxX = Math.max(maxX, x)
    minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  el.style.transform = `translate(${minX}px, ${minY}px)`
  el.style.width = `${Math.max(0, maxX - minX)}px`
  el.style.height = `${Math.max(0, maxY - minY)}px`
}

// click-and-hold black hole: strength builds while held, springs back on release
function springHole(delta) {
  if (interaction.holding) {
    interaction.holeStrength = THREE.MathUtils.damp(interaction.holeStrength, 1, 2.2, delta)
    interaction.holeVelocity = 0
  } else if (Math.abs(interaction.holeStrength) > 0.0005 || Math.abs(interaction.holeVelocity) > 0.0005) {
    const dt = Math.min(delta, 1 / 30)
    interaction.holeVelocity += (-70 * interaction.holeStrength - 9 * interaction.holeVelocity) * dt
    interaction.holeStrength = THREE.MathUtils.clamp(
      interaction.holeStrength + interaction.holeVelocity * dt, -0.25, 1
    )
  } else {
    interaction.holeStrength = 0
    interaction.holeVelocity = 0
  }
}

export default function Scene({ isMobile }) {
  return (
    <>
      <color attach="background" args={['#030306']} />
      <fogExp2 attach="fog" args={['#050508', 0.012]} />

      <CameraRig />
      <Stars count={isMobile ? 2600 : 4800} />
      <StarPath count={isMobile ? 5000 : 9000} />
      <Door />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.25} mipmapBlur radius={0.75} />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>
    </>
  )
}
