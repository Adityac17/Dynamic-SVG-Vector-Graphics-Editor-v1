// Production-Ready XML Serializer.
// Walks the shape layer array, formats each JS geometry node into a valid,
// indented SVG element, and wraps grouped layers in <g> containers — ready for
// copy-paste into a production codebase.
import { buildPathData, shapeCenter } from './geometry.js'

function transformAttr(s) {
  if (!s.rotation) return ''
  const c = shapeCenter(s)
  return ` transform="rotate(${s.rotation} ${c.x} ${c.y})"`
}

function shapeToXml(s, indent) {
  const op = s.opacity != null && s.opacity !== 1 ? ` opacity="${s.opacity}"` : ''
  const tr = transformAttr(s)
  const common = `fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}"${op}${tr}`
  switch (s.type) {
    case 'rect':
      return `${indent}<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" ${common} />`
    case 'circle':
      return `${indent}<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${common} />`
    case 'path':
      return `${indent}<path d="${buildPathData(s.anchors, s.closed)}" ${common} />`
    default:
      return ''
  }
}

export function serializeSvg(shapesIn, canvas) {
  const w = canvas?.width || 1000
  const h = canvas?.height || 700
  const shapes = shapesIn.filter((s) => !s.hidden)

  const lines = []
  let i = 0
  while (i < shapes.length) {
    const s = shapes[i]
    if (s.groupId) {
      // collect the contiguous run of shapes sharing this groupId
      const gid = s.groupId
      const members = []
      while (i < shapes.length && shapes[i].groupId === gid) { members.push(shapes[i]); i++ }
      lines.push(`  <g id="${gid}">`)
      members.forEach((m) => lines.push(shapeToXml(m, '    ')))
      lines.push('  </g>')
    } else {
      lines.push(shapeToXml(s, '  '))
      i++
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
    (lines.length ? lines.join('\n') + '\n' : '') +
    `</svg>`
  )
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Client-side SVG download (no server).
export function downloadSvg(xmlString, filename = 'vector-asset.svg') {
  triggerDownload(new Blob([xmlString], { type: 'image/svg+xml' }), filename)
}

// Rasterize the compiled SVG to PNG entirely in-browser via an offscreen canvas.
export function downloadPng(xmlString, width, height, filename = 'vector-asset.png') {
  const svgBlob = new Blob([xmlString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    URL.revokeObjectURL(url)
    canvas.toBlob((blob) => triggerDownload(blob, filename), 'image/png')
  }
  img.onerror = () => { URL.revokeObjectURL(url); alert('PNG export failed') }
  img.src = url
}
