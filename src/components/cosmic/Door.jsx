import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { journey, doorBase, doorYaw, DOOR_W, DOOR_H } from './journey'

// The door at the end of the road: an arched slab standing alone in space,
// light leaking around its edges. Behind it is a pane of warm light; the slab
// is a hair smaller than that pane, so even shut the seams glow. When it
// opens, it swings on its left hinge, the light floods the road, and a broad
// spill reaches toward the camera.

const FRAME = 0.12 // frame thickness
const GAP = 0.05 // seam between slab and frame, where the light leaks

function arch(w, h) {
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(-r, 0)
  s.lineTo(-r, h - r)
  s.absarc(0, h - r, r, Math.PI, 0, true)
  s.lineTo(r, 0)
  s.lineTo(-r, 0)
  return s
}

function archPath(w, h) {
  const r = w / 2
  const p = new THREE.Path()
  p.moveTo(-r, 0)
  p.lineTo(-r, h - r)
  p.absarc(0, h - r, r, Math.PI, 0, true)
  p.lineTo(r, 0)
  p.lineTo(-r, 0)
  return p
}

const passVertex = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// the light beyond: a hot core, gold at the rim, slow rays turning inside it
const lightFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform vec2 uSize;
  varying vec2 vPos;
  void main() {
    vec2 c = vec2(vPos.x / uSize.x, (vPos.y - uSize.y * 0.45) / uSize.y);
    float d = length(c * vec2(1.4, 1.0));
    float core = exp(-d * d * 7.0);
    float ang = atan(c.y, c.x);
    float rays = 0.5 + 0.5 * sin(ang * 9.0 + uTime * 0.35) * sin(ang * 5.0 - uTime * 0.2);
    vec3 gold = vec3(1.0, 0.72, 0.4);
    vec3 white = vec3(1.0, 0.97, 0.9);
    vec3 col = mix(gold * 0.9, white * 1.6, core) + rays * 0.15 * gold;
    float level = 0.55 + uOpen * 1.6;
    gl_FragColor = vec4(col * level, 1.0);
  }
`

// the slab: near-black, two recessed panels, rim light from the seams, a glowing handle
const panelFragment = /* glsl */ `
  uniform float uTime;
  uniform float uHover;
  uniform float uOpen;
  uniform vec2 uSize;
  varying vec2 vPos;

  float box(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  void main() {
    // hinge sits at x = 0, slab spans 0..w
    vec2 p = vec2(vPos.x / uSize.x, vPos.y / uSize.y);
    vec3 base = vec3(0.035, 0.032, 0.03);

    // recessed panels, upper and lower
    float upper = box(p - vec2(0.5, 0.66), vec2(0.3, 0.17));
    float lower = box(p - vec2(0.5, 0.27), vec2(0.3, 0.17));
    float groove = smoothstep(0.012, 0.0, abs(upper)) + smoothstep(0.012, 0.0, abs(lower));
    vec3 col = base + groove * vec3(0.09, 0.075, 0.05);

    // light catching the edges near the seams
    float edge = min(min(p.x, 1.0 - p.x), p.y * 0.6);
    col += vec3(1.0, 0.75, 0.45) * smoothstep(0.08, 0.0, edge) * (0.12 + uHover * 0.25);

    // handle
    float h = length((p - vec2(0.86, 0.46)) * vec2(uSize.x / uSize.y, 1.0));
    float pulse = 0.6 + 0.4 * sin(uTime * 2.0);
    col += vec3(1.0, 0.8, 0.5) * (smoothstep(0.018, 0.008, h) * 2.4 + smoothstep(0.07, 0.0, h) * 0.5 * pulse) * (1.0 + uHover);

    gl_FragColor = vec4(col, 1.0);
  }
`

// a soft fan of light poured onto the road in front of the door
const spillFragment = /* glsl */ `
  uniform float uOpen;
  varying vec2 vPos;
  void main() {
    // vPos.y runs from the threshold (0) toward the traveller (1)
    float t = clamp(vPos.y, 0.0, 1.0);
    float width = mix(0.35, 1.0, t);
    float x = vPos.x / width;
    float a = exp(-x * x * 5.0) * pow(1.0 - t, 1.6);
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * a * uOpen, a * uOpen);
  }
`

export default function Door() {
  const hinge = useRef()
  const lightMat = useRef()
  const panelMat = useRef()
  const spillMat = useRef()
  const glowMat = useRef()

  const panelW = DOOR_W - GAP * 2
  const panelH = DOOR_H - GAP

  const { frameGeo, lightGeo, panelGeo, spillGeo } = useMemo(() => {
    const outer = arch(DOOR_W + FRAME * 2, DOOR_H + FRAME)
    outer.holes.push(archPath(DOOR_W, DOOR_H))
    const frameGeo = new THREE.ShapeGeometry(outer, 48)

    const lightGeo = new THREE.ShapeGeometry(arch(DOOR_W, DOOR_H), 48)

    // slab pivots on its left edge
    const panelGeo = new THREE.ShapeGeometry(arch(panelW, panelH), 48)
    panelGeo.translate(panelW / 2, 0, 0)

    const spillGeo = new THREE.PlaneGeometry(1, 1, 1, 1)
    spillGeo.translate(0, 0.5, 0)
    return { frameGeo, lightGeo, panelGeo, spillGeo }
  }, [panelW, panelH])

  const lightUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOpen: { value: 0 }, uSize: { value: new THREE.Vector2(DOOR_W, DOOR_H) } }),
    []
  )
  const panelUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHover: { value: 0 },
      uOpen: { value: 0 },
      uSize: { value: new THREE.Vector2(panelW, panelH) },
    }),
    [panelW, panelH]
  )
  const spillUniforms = useMemo(() => ({ uOpen: { value: 0 } }), [])
  const glowMap = useMemo(makeGlowTexture, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const { open, hover } = journey.door
    // hovering cracks it a few degrees, as if it heard you
    if (hinge.current) hinge.current.rotation.y = -(open * 1.85 + hover * 0.1)
    if (lightMat.current) {
      lightMat.current.uniforms.uTime.value = t
      lightMat.current.uniforms.uOpen.value = open
    }
    if (panelMat.current) {
      panelMat.current.uniforms.uTime.value = t
      panelMat.current.uniforms.uHover.value = hover
      panelMat.current.uniforms.uOpen.value = open
    }
    if (spillMat.current) spillMat.current.uniforms.uOpen.value = 0.12 + hover * 0.15 + open * 0.9
    if (glowMat.current) glowMat.current.opacity = 0.08 + hover * 0.06 + open * 0.5
  })

  return (
    <group position={doorBase} rotation={[0, doorYaw, 0]}>
      {/* frame */}
      <mesh geometry={frameGeo} position={[0, 0, 0.02]}>
        <meshBasicMaterial color={new THREE.Color(1.5, 1.2, 0.85)} toneMapped={false} />
      </mesh>

      {/* the light beyond */}
      <mesh geometry={lightGeo} position={[0, 0, -0.06]}>
        <shaderMaterial ref={lightMat} vertexShader={passVertex} fragmentShader={lightFragment} uniforms={lightUniforms} toneMapped={false} />
      </mesh>

      {/* the slab, hinged on the left */}
      <group ref={hinge} position={[-panelW / 2, 0, 0]}>
        <mesh geometry={panelGeo}>
          <shaderMaterial ref={panelMat} vertexShader={passVertex} fragmentShader={panelFragment} uniforms={panelUniforms} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* light poured onto the road */}
      <mesh geometry={spillGeo} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[DOOR_W * 2.6, 14, 1]}>
        <shaderMaterial
          ref={spillMat}
          side={THREE.DoubleSide}
          vertexShader={passVertex}
          fragmentShader={spillFragment}
          uniforms={spillUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* halo around the whole arch */}
      <sprite position={[0, DOOR_H * 0.5, -0.3]} scale={[DOOR_W * 5, DOOR_H * 3, 1]}>
        <spriteMaterial ref={glowMat} map={glowMap} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} color="#ffd6a0" />
      </sprite>
    </group>
  )
}

function makeGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.3, 'rgba(255,255,255,0.22)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}
