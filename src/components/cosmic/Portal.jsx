import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambient } from './audio'

// The tear in space: a vertical slit of pure white light that gradually forms
// as the user approaches, flanked by soft volumetric flares, with particles
// drifting toward it as though pulled by gravity. `progressRef.value` (0..1,
// already smoothed by the camera rig) drives how open the tear is.

const slitVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const slitFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  varying vec2 vUv;

  void main() {
    // a living edge — the tear breathes slightly
    float x = vUv.x - 0.5 + sin(vUv.y * 14.0 + uTime * 0.7) * 0.012 * (1.0 - uOpen * 0.5);
    float core = exp(-x * x * 950.0);
    float halo = exp(-x * x * 80.0) * 0.4;
    float yEnv = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.86, vUv.y);
    float taper = mix(0.35, 1.0, sin(vUv.y * 3.14159));
    float i = (core + halo) * taper * yEnv;
    gl_FragColor = vec4(vec3(1.0), i * uOpen);
  }
`

const raysFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  varying vec2 vUv;

  void main() {
    float px = vUv.x - 0.5;
    float py = vUv.y - 0.5;
    // beams widen as they leave the slit — reads as volumetric light
    float width = 0.015 + 0.55 * abs(py);
    float beam = exp(-(px * px) / (width * width));
    float env = 1.0 - smoothstep(0.28, 0.5, abs(py));
    float flicker = 0.82 + 0.18 * sin(uTime * 0.55 + py * 6.0);
    float a = beam * env * flicker * 0.3 * uOpen;
    gl_FragColor = vec4(vec3(1.0), a);
  }
`

function openFrom(progress) {
  // the tear starts forming a quarter of the way in, fully formed at 80%
  const t = THREE.MathUtils.clamp((progress - 0.22) / 0.58, 0, 1)
  return t * t * (3 - 2 * t) // smoothstep
}

export default function Portal({ progressRef, particleCount = 650 }) {
  const slitMat = useRef()
  const raysMat = useRef()
  const glowMat = useRef()
  const slitMesh = useRef()
  const particlesMat = useRef()
  const particlesGeo = useRef()

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) respawn(positions, velocities, i)
    return { positions, velocities }
  }, [particleCount])

  useFrame((state, delta) => {
    const open = openFrom(progressRef.current.value)
    const t = state.clock.elapsedTime

    if (slitMat.current) {
      slitMat.current.uniforms.uTime.value = t
      slitMat.current.uniforms.uOpen.value = open
    }
    if (raysMat.current) {
      raysMat.current.uniforms.uTime.value = t
      raysMat.current.uniforms.uOpen.value = open * 0.9
    }
    if (glowMat.current) glowMat.current.opacity = open * 0.22
    if (slitMesh.current) {
      slitMesh.current.scale.y = 0.04 + 0.96 * open
      slitMesh.current.scale.x = 0.6 + 0.4 * open
    }

    // particles fall toward the tear, swirling slightly; mids set flow speed
    if (particlesGeo.current) {
      const pos = particlesGeo.current.attributes.position.array
      const speed = (0.35 + ambient.bands.mid * 1.1) * delta
      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3
        const x = pos[ix]
        const y = pos[ix + 1]
        const z = pos[ix + 2]
        const d = Math.sqrt(x * x + y * y + z * z)
        if (d < 0.7) {
          respawn(pos, velocities, i)
          continue
        }
        const pull = velocities[i] * speed * (1 + 6 / (d + 1))
        pos[ix] -= (x / d) * pull + (y / d) * pull * 0.25 // slight tangential swirl
        pos[ix + 1] -= (y / d) * pull - (x / d) * pull * 0.25
        pos[ix + 2] -= (z / d) * pull
      }
      particlesGeo.current.attributes.position.needsUpdate = true
    }
    if (particlesMat.current) particlesMat.current.opacity = open * 0.55
  })

  return (
    <group>
      {/* the tear itself */}
      <mesh ref={slitMesh}>
        <planeGeometry args={[2.2, 16]} />
        <shaderMaterial
          ref={slitMat}
          vertexShader={slitVertex}
          fragmentShader={slitFragment}
          uniforms={{ uTime: { value: 0 }, uOpen: { value: 0 } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* volumetric flare */}
      <mesh>
        <planeGeometry args={[15, 26]} />
        <shaderMaterial
          ref={raysMat}
          vertexShader={slitVertex}
          fragmentShader={raysFragment}
          uniforms={{ uTime: { value: 0 }, uOpen: { value: 0 } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* broad ambient glow around the tear */}
      <sprite scale={[26, 30, 1]}>
        <spriteMaterial
          ref={glowMat}
          map={useMemo(makeGlowTexture, [])}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* dust pulled toward the light */}
      <points>
        <bufferGeometry ref={particlesGeo}>
          <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          ref={particlesMat}
          size={0.055}
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  )
}

function respawn(pos, vel, i) {
  const angle = Math.random() * Math.PI * 2
  const radius = 4 + Math.random() * 22
  pos[i * 3] = Math.cos(angle) * radius
  pos[i * 3 + 1] = Math.sin(angle) * radius * 0.8
  pos[i * 3 + 2] = 2 + Math.random() * 38
  vel[i] = 0.6 + Math.random() * 1.4
}

function makeGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.25)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  return tex
}
