import { useRef } from 'react'
import InteractiveSvgWorkspace from './InteractiveSvgWorkspace.jsx'
import { useEditor } from '../store.js'

// Interactive Scalable Canvas Staging Area.
export default function CanvasStage() {
  const scale = useEditor((s) => s.scale)
  const setScale = useEditor((s) => s.setScale)
  const setOffset = useEditor((s) => s.setOffset)
  const offset = useEditor((s) => s.offset)
  const pointer = useEditor((s) => s.pointer)
  const clearAll = useEditor((s) => s.clearAll)
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const snap = useEditor((s) => s.snap)
  const toggleSnap = useEditor((s) => s.toggleSnap)
  const importSvg = useEditor((s) => s.importSvg)
  const fileRef = useRef(null)

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => importSvg(String(reader.result || ''))
    reader.readAsText(f)
    e.target.value = ''
  }

  const zoom = (f) => setScale(Math.round(scale * f * 100) / 100)
  const pan = (dx, dy) => setOffset({ x: offset.x + dx, y: offset.y + dy })

  return (
    <div className="canvas-stage">
      <div className="canvas-toolbar">
        <button onClick={undo} disabled={!canUndo}>↶ Undo</button>
        <button onClick={redo} disabled={!canRedo}>↷ Redo</button>
        <button onClick={() => zoom(1.2)}>Zoom +</button>
        <button onClick={() => zoom(1 / 1.2)}>Zoom −</button>
        <span>×{scale.toFixed(2)}</span>
        <button onClick={() => pan(-40, 0)}>◀</button>
        <button onClick={() => pan(40, 0)}>▶</button>
        <button onClick={() => pan(0, -40)}>▲</button>
        <button onClick={() => pan(0, 40)}>▼</button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}>Reset View</button>
        <button className={snap ? 'active' : ''} onClick={toggleSnap}>Snap: {snap ? 'On' : 'Off'}</button>
        <button onClick={() => fileRef.current?.click()}>Import SVG</button>
        <input ref={fileRef} type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }} onChange={onPick} />
        <button onClick={clearAll}>Clear</button>
      </div>

      <InteractiveSvgWorkspace />

      <div className="coord-readout">
        SVG&nbsp;X: {pointer.x.toFixed(1)} &nbsp; Y: {pointer.y.toFixed(1)} &nbsp;|&nbsp; Scale: {scale.toFixed(2)}
      </div>
    </div>
  )
}
