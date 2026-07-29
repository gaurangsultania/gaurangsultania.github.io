import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambient } from './audio'

// Sparse, realistic star field surrounding the camera's flight corridor.
// Bass gently swells stars near the camera, highs modulate twinkle amplitude.

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uHigh;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aPhase;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = length(mv.xyz);

    // proximity: 1 for stars close to the camera, 0 far away
    float near = smoothstep(45.0, 6.0, dist);
    float tw = sin(uTime * (0.5 + fract(aPhase) * 1.6) + aPhase * 7.0);

    float size = aScale
      * (1.0 + uBass * 1.7 * near)
      * (1.0 + tw * 0.16 * (0.3 + uHigh));

    gl_PointSize = min(size * uPixelRatio * 95.0 / dist, 15.0 * uPixelRatio);

    float twinkle = 0.72 + 0.28 * tw * (0.35 + 0.65 * uHigh);
    float fogFade = exp(-dist * 0.013);
    float nearFade = smoothstep(1.5, 4.5, dist); // never let a star blob the lens
    vAlpha = twinkle * fogFade * nearFade;
    vColor = color;

    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float disc = smoothstep(0.5, 0.06, d);
    float core = smoothstep(0.16, 0.0, d);
    float a = (disc * 0.5 + core * 0.9) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`

export default function Stars({ count = 4200 }) {
  const material = useRef()

  const { positions, scales, phases, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const tint = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // Cylindrical shell around the camera path (z: -40 → 130), keeping a
      // loose corridor clear so the flight always has depth to move through.
      const angle = Math.random() * Math.PI * 2
      const radius = 3 + Math.pow(Math.random(), 0.6) * 70
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.7
      positions[i * 3 + 2] = -40 + Math.random() * 170

      scales[i] = 0.5 + Math.pow(Math.random(), 3.0) * 2.6
      phases[i] = Math.random() * Math.PI * 2

      // near-white with faint warm/cool variation, like a real sky
      const t = Math.random()
      if (t < 0.12) tint.setRGB(1.0, 0.85, 0.72)
      else if (t < 0.28) tint.setRGB(0.75, 0.85, 1.0)
      else tint.setRGB(0.92, 0.94, 1.0)
      colors[i * 3] = tint.r
      colors[i * 3 + 1] = tint.g
      colors[i * 3 + 2] = tint.b
    }
    return { positions, scales, phases, colors }
  }, [count])

  useFrame((state) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = state.clock.elapsedTime
    material.current.uniforms.uBass.value = ambient.bands.bass
    material.current.uniforms.uHigh.value = ambient.bands.high
  })

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={count} array={scales} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" count={count} array={phases} itemSize={1} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uBass: { value: 0 },
          uHigh: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) },
        }}
        transparent
        vertexColors
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
