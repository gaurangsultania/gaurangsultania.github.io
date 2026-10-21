import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react'

// Liquid glass.
//
// Every surface gets the same layered material in CSS (index.css, `.lg`):
// a frosted, saturated backdrop, a bright top lip, a warm bottom bounce, a
// gradient rim and a specular highlight that follows the pointer. Presses
// squash the shape and release it on an overshooting spring, like a drop.
//
// On Chromium, which accepts SVG filters in `backdrop-filter`, the backdrop
// is also refracted: a displacement map generated for the element's exact
// size bends what sits behind its rim inward, the way a thick lens does,
// with the colour channels split slightly at the edge. Other browsers keep
// the frosted material only.

const REFRACTS =
  typeof navigator !== 'undefined' &&
  /Chrome\//.test(navigator.userAgent) &&
  !/Firefox\//.test(navigator.userAgent)

// R/G encode the x/y offset (128 = none) for feDisplacementMap. Inside the
// bezel band the backdrop is sampled from further in, strongest at the rim.
function displacementMap(w, h, radius, bezel) {
  const W = Math.max(2, Math.round(w))
  const H = Math.max(2, Math.round(h))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  const hw = W / 2
  const hh = H / 2
  const r = Math.min(radius, hw, hh)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5 - hw
      const py = y + 0.5 - hh
      const qx = Math.abs(px) - (hw - r)
      const qy = Math.abs(py) - (hh - r)
      // distance inside the rounded rectangle, and the outward normal
      let inside, nx, ny
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy) || 1
        inside = r - l
        nx = (qx / l) * Math.sign(px)
        ny = (qy / l) * Math.sign(py)
      } else if (qx > qy) {
        inside = r - qx
        nx = Math.sign(px)
        ny = 0
      } else {
        inside = r - qy
        nx = 0
        ny = Math.sign(py)
      }
      const t = Math.max(0, 1 - inside / bezel)
      const amount = t * t * (3 - 2 * t)
      const i = (y * W + x) * 4
      img.data[i] = 128 - nx * amount * 127
      img.data[i + 1] = 128 - ny * amount * 127
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL()
}

function useLiquidFilter(ref, { radius, bezel = 14, scale = 38, enabled = true }) {
  const id = 'lg' + useId().replace(/:/g, '')
  const [map, setMap] = useState(null)

  useEffect(() => {
    if (!REFRACTS || !enabled || !ref.current) return
    const el = ref.current
    let raf = 0
    let last = ''
    const build = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width < 4 || height < 4) return
      const key = `${Math.round(width)}x${Math.round(height)}`
      if (key === last) return
      last = key
      const rad = radius === 'pill' ? height / 2 : radius
      setMap({ url: displacementMap(width, height, rad, bezel), w: Math.round(width), h: Math.round(height) })
    }
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(build)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [ref, radius, bezel, enabled])

  if (!map) return { filterStyle: undefined, svg: null }

  const svg = (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }}>
      <filter
        id={id}
        x="0"
        y="0"
        width={map.w}
        height={map.h}
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feImage href={map.url} x="0" y="0" width={map.w} height={map.h} preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={scale} xChannelSelector="R" yChannelSelector="G" result="dr" />
        <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={scale * 0.9} xChannelSelector="R" yChannelSelector="G" result="dg" />
        <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={scale * 0.8} xChannelSelector="R" yChannelSelector="G" result="db" />
        <feColorMatrix in="db" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b" />
        <feBlend in="r" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="b" mode="screen" />
      </filter>
    </svg>
  )

  const backdrop = `url(#${id}) blur(1.5px) saturate(1.7) brightness(1.08)`
  return { filterStyle: { backdropFilter: backdrop }, svg }
}

// pointer-tracked highlight + press squash, shared by every glass surface
function usePointerSheen(ref) {
  const onPointerMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--gx', `${x * 100}%`)
    el.style.setProperty('--gy', `${y * 100}%`)
    // lean a couple of pixels toward the pointer
    el.style.setProperty('--tx', `${(x - 0.5) * 4}px`)
    el.style.setProperty('--ty', `${(y - 0.5) * 3}px`)
  }, [ref])

  const onPointerLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--tx', '0px')
    el.style.setProperty('--ty', '0px')
    el.classList.remove('is-pressed')
  }, [ref])

  const onPointerDown = useCallback(() => ref.current?.classList.add('is-pressed'), [ref])
  const onPointerUp = useCallback(() => ref.current?.classList.remove('is-pressed'), [ref])

  return { onPointerMove, onPointerLeave, onPointerDown, onPointerUp, onPointerCancel: onPointerUp }
}

function mergeRefs(...refs) {
  return (node) => {
    for (const r of refs) {
      if (typeof r === 'function') r(node)
      else if (r) r.current = node
    }
  }
}

// A glass button, link or chip. `as` takes a tag or a component (e.g. a router Link).
export const Glass = forwardRef(function Glass(
  { as: Comp = 'button', className = '', size = 'md', radius = 'pill', refract = true, style, children, ...props },
  outerRef
) {
  const ref = useRef(null)
  const { filterStyle, svg } = useLiquidFilter(ref, {
    radius,
    bezel: size === 'lg' ? 18 : 12,
    scale: size === 'lg' ? 46 : 32,
    enabled: refract,
  })
  const sheen = usePointerSheen(ref)
  const typeProps = Comp === 'button' && !props.type ? { type: 'button' } : null

  return (
    <Comp
      ref={mergeRefs(ref, outerRef)}
      className={`lg lg--${size} ${className}`}
      style={{ ...(radius !== 'pill' ? { '--lg-radius': `${radius}px` } : null), ...filterStyle, ...style }}
      {...typeProps}
      {...sheen}
      {...props}
    >
      {svg}
      <span className="lg__label">{children}</span>
    </Comp>
  )
})

// A larger glass surface that holds other controls (the nav bar, the filter bar).
export const GlassBar = forwardRef(function GlassBar({ as: Comp = 'div', className = '', style, children, ...props }, outerRef) {
  const ref = useRef(null)
  const { filterStyle, svg } = useLiquidFilter(ref, { radius: 'pill', bezel: 16, scale: 30 })
  return (
    <Comp ref={mergeRefs(ref, outerRef)} className={`lg lg--bar ${className}`} style={{ ...filterStyle, ...style }} {...props}>
      {svg}
      {children}
    </Comp>
  )
})
