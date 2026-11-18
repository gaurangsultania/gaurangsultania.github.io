import * as THREE from 'three'

// The shape of the journey, shared by the camera, the stardust path and the
// door. One winding curve runs from deep space to the threshold; the camera
// rides it at eye height while the path glows a little below.
//
// `journey` is a mutable singleton the scene reads every frame and the DOM
// side (scroll listener, GSAP timeline) writes — no React state in the loop.

export const EYE = 1.5 // camera height above the path surface
export const DOOR_W = 3.2
export const DOOR_H = 5.6
export const PULSE_SLOTS = 6

export const curve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, 0, 46),
    new THREE.Vector3(3.8, -0.5, 33),
    new THREE.Vector3(-4.5, 0.3, 20),
    new THREE.Vector3(4.9, 0.9, 5),
    new THREE.Vector3(-4.1, 0.3, -9),
    new THREE.Vector3(3.4, -0.3, -23),
    new THREE.Vector3(-1.5, 0, -36),
    new THREE.Vector3(0, 0, -47),
  ],
  false,
  'centripetal',
  0.5
)

// where the camera stops, as a fraction of the curve — a few steps short of
// the door so the whole arch is in frame
export const CAM_STOP = 0.87

// camera position on the curve for a given (smoothed) scroll progress —
// eased so the arrival settles instead of stopping dead
export const camU = (p) => CAM_STOP * (1 - Math.pow(1 - p, 1.6))

export const doorBase = curve.getPointAt(1).clone().add(new THREE.Vector3(0, -EYE, 0))
const doorTangent = curve.getTangentAt(1).clone()
doorTangent.y = 0
doorTangent.normalize()
// unit vector pointing out of the door, toward the arriving traveller
export const doorFacing = doorTangent.clone().negate()
export const doorYaw = Math.atan2(doorFacing.x, doorFacing.z)
export const doorCenter = doorBase.clone().add(new THREE.Vector3(0, DOOR_H * 0.5, 0))

export const journey = {
  // 0..1 scroll through the landing runway (target written by scroll, value damped in the rig)
  progress: { target: 0, value: 0 },
  // 0..1 scroll through the content below the door
  content: { target: 0, value: 0 },
  // door animation, written by the GSAP timeline
  door: { open: 0, push: 0, hover: 0 },
  opened: false,
  // set to jump the damped values straight to their targets on the next scroll read
  snap: false,
  cameraSnap: false,
  // DOM hit area laid over the door's projected rectangle
  hitEl: null,
  // recent bass hits, each a wave of light running down the road:
  // t = clock time it landed, u = where on the road it started, a = strength
  pulses: Array.from({ length: PULSE_SLOTS }, () => ({ t: -100, u: 0, a: 0 })),
  pulseNext: 0,
}

export function addPulse(t, u, a) {
  const slot = journey.pulses[journey.pulseNext]
  slot.t = t
  slot.u = u
  slot.a = a
  journey.pulseNext = (journey.pulseNext + 1) % PULSE_SLOTS
}

const side = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)

// lateral axis of the path at u — perpendicular to the tangent, level with the ground
export function sideAt(u, target = side) {
  const t = curve.getTangentAt(u)
  return target.crossVectors(t, up).normalize()
}
