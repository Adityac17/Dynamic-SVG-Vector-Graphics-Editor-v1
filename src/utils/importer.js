// Minimal SVG file importer: parses an external SVG string and converts its
// <rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>, <path> elements
// into the editor's shape ledger. Paths are coarsely tokenized into anchor
// nodes (M/L/H/V/Z + first control of C/Q absolute commands); complex relative
// or arc commands fall back to straight Line segments at endpoint coords.

let idSeq = 1
const nextId = () => `imp_${(idSeq++).toString(36)}_${Date.now().toString(36)}`

const num = (v, d = 0) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : d
}

function styleFor(el) {
  const fill = el.getAttribute('fill') || '#4a90d9'
  const stroke = el.getAttribute('stroke') || '#1e1e1e'
  const strokeWidth = num(el.getAttribute('stroke-width'), 2)
  const opacity = num(el.getAttribute('opacity'), 1)
  return { fill, stroke, strokeWidth, opacity }
}

function pointsToAnchors(str) {
  if (!str) return []
  return str
    .trim()
    .split(/[\s,]+/)
    .reduce((acc, _, i, arr) => {
      if (i % 2 === 0 && arr[i + 1] != null) acc.push({ x: num(arr[i]), y: num(arr[i + 1]), hx: 0, hy: 0 })
      return acc
    }, [])
}

// Tokenize a path "d" string into anchor nodes. Handles absolute M/L/H/V/Z/C/Q
// reasonably; relative commands are normalized to absolute by tracking the
// current pen position.
function pathDToAnchors(d) {
  if (!d) return []
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []
  const anchors = []
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = ''
  const push = (x, y, hx = 0, hy = 0) => { anchors.push({ x, y, hx, hy }); cx = x; cy = y }
  const readNum = () => num(tokens[i++])

  while (i < tokens.length) {
    const t = tokens[i]
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++ } // sticky command
    const abs = cmd === cmd.toUpperCase()
    switch (cmd.toUpperCase()) {
      case 'M': {
        const x = readNum(), y = readNum()
        const nx = abs ? x : cx + x, ny = abs ? y : cy + y
        push(nx, ny); sx = nx; sy = ny
        cmd = abs ? 'L' : 'l' // implicit lineto after moveto
        break
      }
      case 'L': {
        const x = readNum(), y = readNum()
        push(abs ? x : cx + x, abs ? y : cy + y); break
      }
      case 'H': { const x = readNum(); push(abs ? x : cx + x, cy); break }
      case 'V': { const y = readNum(); push(cx, abs ? y : cy + y); break }
      case 'C': {
        const c1x = readNum(), c1y = readNum()
        readNum(); readNum() // c2 (kept as line-style approx on import)
        const x = readNum(), y = readNum()
        const nx = abs ? x : cx + x, ny = abs ? y : cy + y
        // attach outgoing handle to previous anchor
        if (anchors.length > 0) {
          const prev = anchors[anchors.length - 1]
          prev.hx = (abs ? c1x : cx + c1x) - prev.x
          prev.hy = (abs ? c1y : cy + c1y) - prev.y
        }
        push(nx, ny); break
      }
      case 'Q': {
        const c1x = readNum(), c1y = readNum()
        const x = readNum(), y = readNum()
        if (anchors.length > 0) {
          const prev = anchors[anchors.length - 1]
          prev.hx = (abs ? c1x : cx + c1x) - prev.x
          prev.hy = (abs ? c1y : cy + c1y) - prev.y
        }
        push(abs ? x : cx + x, abs ? y : cy + y); break
      }
      case 'Z': { cx = sx; cy = sy; i = i; cmd = ''; break }
      default: i++ // unknown / arc → skip
    }
  }
  return anchors
}

export function importSvgString(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror')) throw new Error('Invalid SVG file')
  const out = []
  const each = (sel, fn) => doc.querySelectorAll(sel).forEach(fn)

  each('rect', (el) => out.push({
    id: nextId(), type: 'rect',
    x: num(el.getAttribute('x')), y: num(el.getAttribute('y')),
    width: num(el.getAttribute('width'), 50), height: num(el.getAttribute('height'), 50),
    ...styleFor(el),
  }))
  each('circle', (el) => out.push({
    id: nextId(), type: 'circle',
    cx: num(el.getAttribute('cx')), cy: num(el.getAttribute('cy')),
    r: num(el.getAttribute('r'), 25),
    ...styleFor(el),
  }))
  each('ellipse', (el) => out.push({
    id: nextId(), type: 'circle',
    cx: num(el.getAttribute('cx')), cy: num(el.getAttribute('cy')),
    r: Math.max(num(el.getAttribute('rx'), 25), num(el.getAttribute('ry'), 25)),
    ...styleFor(el),
  }))
  each('line', (el) => out.push({
    id: nextId(), type: 'path',
    anchors: [
      { x: num(el.getAttribute('x1')), y: num(el.getAttribute('y1')), hx: 0, hy: 0 },
      { x: num(el.getAttribute('x2')), y: num(el.getAttribute('y2')), hx: 0, hy: 0 },
    ],
    closed: false, ...styleFor(el),
  }))
  each('polyline', (el) => out.push({
    id: nextId(), type: 'path',
    anchors: pointsToAnchors(el.getAttribute('points')), closed: false, ...styleFor(el),
  }))
  each('polygon', (el) => out.push({
    id: nextId(), type: 'path',
    anchors: pointsToAnchors(el.getAttribute('points')), closed: true, ...styleFor(el),
  }))
  each('path', (el) => {
    const anchors = pathDToAnchors(el.getAttribute('d') || '')
    if (anchors.length >= 2) out.push({
      id: nextId(), type: 'path', anchors,
      closed: /Z\s*$/i.test(el.getAttribute('d') || ''),
      ...styleFor(el),
    })
  })
  return out
}
