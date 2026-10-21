import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { curve, sideAt, journey, camU, EYE } from './journey'

// The stardust road. Each particle owns two positions: a loose scatter in the
// sky and a seat on the winding path. A front runs a little ahead of the
// camera: stars behind it have settled into the road, stars beyond it are
// still sky, so the road keeps assembling itself just ahead of the visitor.
// A slow pulse of light runs along it toward the door.

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uFront;
  uniform float uDoor;
  uniform float uLevel;
  uniform float uPixelRatio;
  attribute vec3 aScatter;
  attribute float aU;
  attribute float aEdge;
  attribute float aSeed;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // settled behind the front, still sky beyond it; each star on its own clock
    float g = 1.0 - smoothstep(uFront - 0.16, uFront, aU + aSeed * 0.05);

    // arc in from the scatter rather than sliding in a straight line
    vec3 pos = mix(aScatter, position, g);
    pos.y += sin(g * 3.14159) * (2.0 + aSeed * 3.0);
    // settled stars still breathe a little
    pos.y += sin(uTime * 0.8 + aSeed * 40.0) * 0.04 * g;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = length(mv.xyz);

    // a wave of light running toward the door
    float wave = pow(0.5 + 0.5 * sin(aU * 90.0 - uTime * 2.2), 8.0);
    float sparkle = 0.75 + 0.25 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 60.0);

    float size = (0.4 + aEdge * 0.45 + wave * 0.5) * (0.6 + 0.4 * g);
    gl_PointSize = max(min(size * uPixelRatio * 75.0 / dist, 6.0 * uPixelRatio), 1.2);

    float near = smoothstep(0.8, 3.0, dist);
    float fog = exp(-dist * 0.018);
    // the door's light washes the last stretch of road
    float doorWash = smoothstep(0.82, 1.0, aU) * uDoor;
    vAlpha = (0.45 + aEdge * 0.75 + wave * 0.6 + doorWash) * sparkle * near * fog * (0.3 + 0.7 * g) * uLevel;

    // cool starlight near the start, warming to gold toward the door
    vec3 cool = vec3(0.85, 0.9, 1.0);
    vec3 gold = vec3(1.0, 0.78, 0.48);
    vColor = mix(cool, gold, smoothstep(0.25, 1.0, aU)) * (1.0 + wave * 0.6 + doorWash);

    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`

const ROAD_HALF_WIDTH = 1.1

export default function StarPath({ count = 2600 }) {
  const material = useRef()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFront: { value: 0 },
      uDoor: { value: 0 },
      uLevel: { value: 1 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) },
    }),
    []
  )

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scatter = new Float32Array(count * 3)
    const us = new Float32Array(count)
    const edges = new Float32Array(count)
    const seeds = new Float32Array(count)
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()

    for (let i = 0; i < count; i++) {
      const u = Math.random()
      curve.getPointAt(u, p)
      sideAt(u, s)

      // ~55% of the stars line the two edges of the road, the rest dust its surface
      const onEdge = Math.random() < 0.55
      const lateral = onEdge
        ? (Math.random() < 0.5 ? -1 : 1) * (ROAD_HALF_WIDTH + (Math.random() - 0.5) * 0.12)
        : (Math.random() * 2 - 1) * ROAD_HALF_WIDTH * 0.92
      const x = p.x + s.x * lateral
      const y = p.y - EYE + (Math.random() - 0.5) * 0.05
      const z = p.z + s.z * lateral
      positions.set([x, y, z], i * 3)

      // scattered somewhere in the sky above and around their seat
      const r = 10 + Math.random() * 26
      const a = Math.random() * Math.PI * 2
      scatter.set(
        [x + Math.cos(a) * r, y + 4 + Math.random() * 22, z + Math.sin(a) * r * 0.6],
        i * 3
      )

      us[i] = u
      edges[i] = onEdge ? 1 : 0
      seeds[i] = Math.random()
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    g.setAttribute('aU', new THREE.BufferAttribute(us, 1))
    g.setAttribute('aEdge', new THREE.BufferAttribute(edges, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    // the scatter positions sit far outside the seated bounds
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 400)
    return g
  }, [count])

  useFrame((state) => {
    if (!material.current) return
    const u = material.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    // the front leads the camera by a stretch; once the door is in sight the whole road is laid
    const lead = camU(journey.progress.value) + 0.3 + journey.progress.value * 0.3
    u.uFront.value = Math.min(1.25, lead)
    // held back behind the name until the walk begins
    u.uLevel.value = 0.4 + 0.6 * THREE.MathUtils.smoothstep(journey.progress.value, 0, 0.08)
    u.uDoor.value = 0.25 + journey.door.open * 1.5 + journey.door.hover * 0.4
  })

  return (
    <points key={count} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
