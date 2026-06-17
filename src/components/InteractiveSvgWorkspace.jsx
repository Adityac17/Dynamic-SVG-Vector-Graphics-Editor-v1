import { useRef, useState, useCallback, useEffect } from 'react'
import { useEditor } from '../store.js'
import { screenToSvg, buildPathData, shapeCenter, shapeBBox } from '../utils/geometry.js'

// Live-rendering scalable root element. Loops the layer array to emit native
// vector tags and overlays interactive control point handles on the selection.
export default function InteractiveSvgWorkspace() {
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const strokeRef = useRef(null) // freehand pencil accumulation

  const tool = useEditor((s) => s.tool)
  const shapes = useEditor((s) => s.shapes)
  const draftAnchors = useEditor((s) => s.draftAnchors)
  const selectedIds = useEditor((s) => s.selectedIds)
  const scale = useEditor((s) => s.scale)
  const offset = useEditor((s) => s.offset)
  const canvas = useEditor((s) => s.canvas)

  const addRect = useEditor((s) => s.addRect)
  const addCircle = useEditor((s) => s.addCircle)
  const addAnchor = useEditor((s) => s.addAnchor)
  const addFreehand = useEditor((s) => s.addFreehand)
  const select = useEditor((s) => s.select)
  const setPointer = useEditor((s) => s.setPointer)
  const moveSelected = useEditor((s) => s.moveSelected)
  const updateShape = useEditor((s) => s.updateShape)
  const updateAnchor = useEditor((s) => s.updateAnchor)
  const pushHistory = useEditor((s) => s.pushHistory)
  const setRotation = useEditor((s) => s.setRotation)

  const [hoverPt, setHoverPt] = useState({ x: 0, y: 0 })
  const [liveStroke, setLiveStroke] = useState(null)
  const selSet = new Set(selectedIds)

  const toSvg = useCallback(
    (e) => screenToSvg(e.clientX, e.clientY, svgRef.current.getBoundingClientRect(), scale, offset),
    [scale, offset],
  )

  // ---- empty-canvas mousedown: tool dispatch ----
  function onCanvasMouseDown(e) {
    if (e.target !== e.currentTarget && e.target.tagName !== 'rect') {
      // allow clicks on the background frame rect to count as canvas
    }
    if (e.target.dataset && e.target.dataset.role === 'shape') return
    const p = toSvg(e)
    if (tool === 'rect') addRect(p.x, p.y)
    else if (tool === 'circle') addCircle(p.x, p.y)
    else if (tool === 'pen') addAnchor(p.x, p.y)
    else if (tool === 'pencil') { strokeRef.current = [p]; setLiveStroke([p]) }
    else select(null)
  }

  function onMouseMove(e) {
    const p = toSvg(e)
    setHoverPt(p)
    setPointer(p)
  }

  // ---- drag wiring ----
  const beginDrag = (descriptor) => (e) => {
    e.stopPropagation()
    pushHistory()
    const start = toSvg(e)
    dragRef.current = { ...descriptor, last: start }
  }

  const onShapeMouseDown = (s) => (e) => {
    e.stopPropagation()
    if (tool !== 'select') { select(s.id, e.shiftKey); return }
    if (!selSet.has(s.id)) select(s.id, e.shiftKey)
    pushHistory()
    dragRef.current = { kind: 'move', last: toSvg(e) }
  }

  useEffect(() => {
    function onMove(e) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const p = screenToSvg(e.clientX, e.clientY, rect, scale, offset)

      // freehand pencil stroke in progress
      if (strokeRef.current) {
        strokeRef.current.push(p)
        setLiveStroke([...strokeRef.current])
        return
      }

      const d = dragRef.current
      if (!d) return
      const dx = p.x - d.last.x
      const dy = p.y - d.last.y
      d.last = p

      if (d.kind === 'move') moveSelected(dx, dy)
      else if (d.kind === 'rect-resize') {
        const sh = useEditor.getState().shapes.find((s) => s.id === d.id)
        updateShape(d.id, { width: Math.max(1, sh.width + dx), height: Math.max(1, sh.height + dy) })
      } else if (d.kind === 'circle-radius') {
        const sh = useEditor.getState().shapes.find((s) => s.id === d.id)
        updateShape(d.id, { r: Math.round(Math.max(1, Math.hypot(p.x - sh.cx, p.y - sh.cy)) * 100) / 100 })
      } else if (d.kind === 'rotate') {
        const sh = useEditor.getState().shapes.find((s) => s.id === d.id)
        const c = shapeCenter(sh)
        const ang = Math.atan2(p.y - c.y, p.x - c.x) * 180 / Math.PI + 90
        setRotation(d.id, Math.round(ang))
      } else if (d.kind === 'anchor') updateAnchor(d.id, d.index, { x: p.x, y: p.y })
      else if (d.kind === 'handle') {
        const a = useEditor.getState().shapes.find((s) => s.id === d.id).anchors[d.index]
        updateAnchor(d.id, d.index, { hx: Math.round((p.x - a.x) * 100) / 100, hy: Math.round((p.y - a.y) * 100) / 100 })
      }
    }
    function onUp() {
      if (strokeRef.current) {
        addFreehand(strokeRef.current)
        strokeRef.current = null
        setLiveStroke(null)
      }
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [scale, offset, moveSelected, updateShape, updateAnchor, addFreehand])

  // ---- render a shape ----
  function renderShape(s) {
    if (s.hidden) return null
    const eff = s.locked ? (s.opacity ?? 1) * 0.5 : (s.opacity ?? 1)
    const common = {
      'data-role': 'shape',
      fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, opacity: eff,
      onMouseDown: s.locked ? undefined : onShapeMouseDown(s),
      style: { cursor: s.locked ? 'not-allowed' : (tool === 'select' ? 'move' : 'pointer') },
    }
    const c = shapeCenter(s)
    const tr = s.rotation ? `rotate(${s.rotation} ${c.x} ${c.y})` : undefined
    let el = null
    if (s.type === 'rect') el = <rect x={s.x} y={s.y} width={s.width} height={s.height} {...common} />
    else if (s.type === 'circle') el = <circle cx={s.cx} cy={s.cy} r={s.r} {...common} />
    else if (s.type === 'path') el = <path d={buildPathData(s.anchors, s.closed)} fill={s.fill} strokeLinejoin="round" strokeLinecap="round" {...common} />
    return <g key={s.id} transform={tr}>{el}</g>
  }

  // ---- selection outline for every selected shape ----
  function selectionOutline(s) {
    if (s.hidden) return null
    const o = { fill: 'none', stroke: '#ff8c00', strokeWidth: 1.5 / scale, strokeDasharray: `${4 / scale} ${3 / scale}`, pointerEvents: 'none' }
    const c = shapeCenter(s)
    const tr = s.rotation ? `rotate(${s.rotation} ${c.x} ${c.y})` : undefined
    let el = null
    if (s.type === 'rect') el = <rect x={s.x} y={s.y} width={s.width} height={s.height} {...o} />
    else if (s.type === 'circle') el = <circle cx={s.cx} cy={s.cy} r={s.r} {...o} />
    else if (s.type === 'path') el = <path d={buildPathData(s.anchors, s.closed)} {...o} />
    return <g key={'o' + s.id} transform={tr}>{el}</g>
  }

  // ---- rotate handle for whatever is selected ----
  function renderRotateHandle() {
    if (tool !== 'select' || selectedIds.length !== 1) return null
    const s = shapes.find((sh) => sh.id === selectedIds[0])
    if (!s || s.locked || s.hidden) return null
    const b = shapeBBox(s)
    const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
    const hs = 5 / scale
    const armLen = 22 / scale
    const hy = b.y - armLen
    const tr = s.rotation ? `rotate(${s.rotation} ${c.x} ${c.y})` : undefined
    return (
      <g transform={tr} pointerEvents="all">
        <line x1={c.x} y1={b.y} x2={c.x} y2={hy} stroke="#ff8c00" strokeWidth={1 / scale} />
        <circle className="handle" cx={c.x} cy={hy} r={hs * 1.2} fill="#ff8c00" stroke="#fff" strokeWidth={1 / scale}
          onMouseDown={beginDrag({ kind: 'rotate', id: s.id })} />
      </g>
    )
  }

  // ---- control handles (single-selection only) ----
  function renderHandles() {
    if (tool !== 'select' || selectedIds.length !== 1) return null
    const s = shapes.find((sh) => sh.id === selectedIds[0])
    if (!s || s.locked || s.hidden) return null
    const hs = 5 / scale

    if (s.type === 'rect')
      return <rect className="handle" x={s.x + s.width - hs} y={s.y + s.height - hs} width={hs * 2} height={hs * 2} fill="#fff" stroke="#4a90d9" strokeWidth={1 / scale} onMouseDown={beginDrag({ kind: 'rect-resize', id: s.id })} />
    if (s.type === 'circle')
      return <circle className="handle" cx={s.cx + s.r} cy={s.cy} r={hs} fill="#fff" stroke="#4a90d9" strokeWidth={1 / scale} onMouseDown={beginDrag({ kind: 'circle-radius', id: s.id })} />
    if (s.type === 'path')
      return s.anchors.map((a, i) => (
        <g key={i}>
          {(a.hx || a.hy) && <line x1={a.x} y1={a.y} x2={a.x + a.hx} y2={a.y + a.hy} stroke="#4a90d9" strokeWidth={1 / scale} />}
          <circle className="handle" cx={a.x} cy={a.y} r={hs} fill="#fff" stroke="#4a90d9" strokeWidth={1 / scale} onMouseDown={beginDrag({ kind: 'anchor', id: s.id, index: i })} />
          <circle className="handle" cx={a.x + a.hx} cy={a.y + a.hy} r={hs * 0.8} fill="#4a90d9" stroke="#fff" strokeWidth={1 / scale} onMouseDown={beginDrag({ kind: 'handle', id: s.id, index: i })} />
        </g>
      ))
    return null
  }

  const gridStep = 50
  return (
    <svg ref={svgRef} width="100%" height="100%" onMouseDown={onCanvasMouseDown} onMouseMove={onMouseMove} style={{ background: 'var(--panel)' }}>
      <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
        <rect x={0} y={0} width={canvas.width} height={canvas.height} fill="var(--canvas-bg)" stroke="#bbb" />
        <g stroke="var(--grid)" strokeWidth={1 / scale} pointerEvents="none">
          {Array.from({ length: Math.floor(canvas.width / gridStep) + 1 }).map((_, i) => (
            <line key={'v' + i} x1={i * gridStep} y1={0} x2={i * gridStep} y2={canvas.height} />
          ))}
          {Array.from({ length: Math.floor(canvas.height / gridStep) + 1 }).map((_, i) => (
            <line key={'h' + i} x1={0} y1={i * gridStep} x2={canvas.width} y2={i * gridStep} />
          ))}
        </g>

        {shapes.map(renderShape)}
        {shapes.filter((s) => selSet.has(s.id)).map(selectionOutline)}

        {/* pen path preview */}
        {draftAnchors.length > 0 && (
          <>
            <path d={buildPathData(draftAnchors)} fill="none" stroke="#d94a4a" strokeWidth={1.5 / scale} strokeDasharray={`${4 / scale} ${3 / scale}`} />
            {draftAnchors.map((a, i) => <circle key={i} cx={a.x} cy={a.y} r={4 / scale} fill="#d94a4a" />)}
            <line x1={draftAnchors[draftAnchors.length - 1].x} y1={draftAnchors[draftAnchors.length - 1].y} x2={hoverPt.x} y2={hoverPt.y} stroke="#d94a4a" strokeWidth={1 / scale} strokeDasharray={`${2 / scale}`} />
          </>
        )}

        {/* freehand preview */}
        {liveStroke && liveStroke.length > 1 && (
          <path d={buildPathData(liveStroke.map((p) => ({ ...p, hx: 0, hy: 0 })))} fill="none" stroke="#2aa54a" strokeWidth={2 / scale} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {renderHandles()}
        {renderRotateHandle()}
      </g>
    </svg>
  )
}
