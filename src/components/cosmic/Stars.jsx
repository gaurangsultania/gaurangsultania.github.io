import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambient } from './audio'
import { interaction } from './interaction'

// Star field spanning the full journey — deep space before the tear AND the
// universe beyond it (z: -170 → 130), so stars live behind every section.
//
// Audio: bass swells stars near the camera, highs modulate twinkle.
// Black hole: uHole/uHolePos drive a GPU vortex — stars spiral into the held
// point; on release the spring (computed in the camera rig) bounces them back.

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uHigh;
  uniform float uPixelRatio;
  uniform vec3 uHolePos;
  uniform float uHole;
  attribute float aScale;
  attribute float aPhase;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // --- black hole vortex ---
    vec3 rel = position - uHolePos;
    float hd = length(rel);
    float fall = smoothstep(90.0, 4.0, hd);
    float k = uHole * (0.22 + 0.78 * fall);
    float theta = uHole * uHole * (1.2 + 9.0 * exp(-hd * 0.045));
    float cs = cos(theta), sn = sin(theta);
    rel.xy = mat2(cs, -sn, sn, cs) * rel.xy;
    vec3 pos = uHolePos + rel * (1.0 - 0.97 * clamp(k, -1.0, 1.0));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = length(mv.xyz);

    // proximity: 1 for stars close to the camera, 0 far away
    float near = smoothstep(45.0, 6.0, dist);
    float tw = sin(uTime * (0.5 + fract(aPhase) * 1.6) + aPhase * 7.0);

    float size = aScale
      * (1.0 + uBass * 1.7 * near)
      * (1.0 + tw * 0.16 * (0.3 + uHigh))
      * (1.0 + max(uHole, 0.0) * fall * 0.6); // infalling stars brighten

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

export default function Stars({ count = 5200 }) {
  const material = useRef()
  const holeWorld = useRef(new THREE.Vector3())
  const ndcVec = useRef(new THREE.Vector3())

  // MUST be referentially stable: R3F diffs the uniforms prop by reference,
  // and replacing it disconnects the compiled program from the object our
  // useFrame mutates — the stars would freeze after any React re-render.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uHigh: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) },
      uHolePos: { value: new THREE.Vector3() },
      uHole: { value: 0 },
    }),
    []
  )

  const { positions, scales, phases, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const tint = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // Cylindrical shell around the camera path, covering deep space before
      // the tear and the universe beyond it, keeping a loose corridor clear.
      const angle = Math.random() * Math.PI * 2
      const radius = 3 + Math.pow(Math.random(), 0.6) * 70
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.sin(angle) * radius * 0.7
      positions[i * 3 + 2] = -170 + Math.random() * 300

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
    const u = material.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uBass.value = ambient.bands.bass
    u.uHigh.value = ambient.bands.high
    u.uHole.value = interaction.holeStrength

    // unproject the held pointer to a world point ~26 units ahead of camera
    if (Math.abs(interaction.holeStrength) > 0.001) {
      const cam = state.camera
      ndcVec.current.set(interaction.holeNdc.x, interaction.holeNdc.y, 0.5).unproject(cam)
      ndcVec.current.sub(cam.position).normalize()
      holeWorld.current.copy(cam.position).addScaledVector(ndcVec.current, 26)
      u.uHolePos.value.copy(holeWorld.current)
    }
  })

  return (
    // key forces a clean remount if count ever changes — swapping attribute
    // arrays of a different size on a live geometry corrupts the draw range
    <points key={count}>
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
        uniforms={uniforms}
        transparent
        vertexColors
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
