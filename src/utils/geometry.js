// Cartesian Screen-to-SVG Matrix Translator.
// Maps a raw pointer event (viewport coords) into the SVG coordinate space,
// accounting for the live canvas scale factor and pan offset deltas:
//   X_svg = (X_pointer - OffsetX) / ScaleFactor
//   Y_svg = (Y_pointer - OffsetY) / ScaleFactor
export function screenToSvg(clientX, clientY, rect, scale, offset) {
  const x = (clientX - rect.left - offset.x) / scale
  const y = (clientY - rect.top - offset.y) / scale
  return { x: round(x), y: round(y) }
}

export function round(n, p = 2) {
  const f = Math.pow(10, p)
  return Math.round(n * f) / f
}

// Bezier Curve Parameter Generator.
// Walks an ordered anchor list and rebuilds the SVG path "d" command string.
// Each anchor: { x, y, hx, hy } where (hx,hy) is the outgoing control handle
// delta. A segment is emitted as Cubic (C) when either endpoint carries a
// handle, otherwise as a straight Line (L). Quadratic (Q) is produced when an
// anchor is explicitly flagged quadratic.
export function buildPathData(anchors, closed = false) {
  if (!anchors || anchors.length === 0) return ''
  const a0 = anchors[0]
  let d = `M ${a0.x},${a0.y}`

  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1]
    const cur = anchors[i]
    const prevHandled = prev.hx || prev.hy
    const curHandled = cur.hx || cur.hy

    if (cur.quadratic) {
      const qx = prev.x + (prev.hx || 0)
      const qy = prev.y + (prev.hy || 0)
      d += ` Q ${qx},${qy} ${cur.x},${cur.y}` // Quadratic Bezier
    } else if (prevHandled || curHandled) {
      const c1x = prev.x + (prev.hx || 0)
      const c1y = prev.y + (prev.hy || 0)
      const c2x = cur.x - (cur.hx || 0)
      const c2y = cur.y - (cur.hy || 0)
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${cur.x},${cur.y}` // Cubic Bezier
    } else {
      d += ` L ${cur.x},${cur.y}` // straight Line
    }
  }
  if (closed) d += ' Z'
  return d
}

// Axis-aligned bounding box of a single shape in SVG space (pre-rotation).
export function shapeBBox(s) {
  if (s.type === 'rect') return { x: s.x, y: s.y, w: s.width, h: s.height }
  if (s.type === 'circle') return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 }
  if (s.type === 'path') {
    if (!s.anchors.length) return { x: 0, y: 0, w: 0, h: 0 }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const a of s.anchors) {
      if (a.x < minX) minX = a.x; if (a.x > maxX) maxX = a.x
      if (a.y < minY) minY = a.y; if (a.y > maxY) maxY = a.y
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }
  return { x: 0, y: 0, w: 0, h: 0 }
}

// Shape center (rotation pivot, alignment ref).
export function shapeCenter(s) {
  const b = shapeBBox(s)
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

// Count anchor nodes across all shapes for telemetry.
export function countAnchors(shapes) {
  let n = 0
  for (const s of shapes) {
    if (s.type === 'rect') n += 4
    else if (s.type === 'circle') n += 1
    else if (s.type === 'path') n += (s.anchors ? s.anchors.length : 0)
  }
  return n
}
