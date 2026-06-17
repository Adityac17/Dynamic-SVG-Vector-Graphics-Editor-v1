import { useState } from 'react'
import { useEditor } from '../store.js'
import { round } from '../utils/geometry.js'

function Num({ label, value, onChange }) {
  return (
    <div className="field-row">
      <label>{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(round(parseFloat(e.target.value) || 0))}
      />
    </div>
  )
}

export default function VectorPropertyInspectorForm() {
  const selectedIds = useEditor((s) => s.selectedIds)
  const shapes = useEditor((s) => s.shapes)
  const update = useEditor((s) => s.updateShape)
  const pushHistory = useEditor((s) => s.pushHistory)
  const styleSelected = useEditor((s) => s.styleSelected)
  const group = useEditor((s) => s.groupSelected)
  const ungroup = useEditor((s) => s.ungroupSelected)
  const del = useEditor((s) => s.deleteSelected)
  const duplicate = useEditor((s) => s.duplicateSelected)
  const bringToFront = useEditor((s) => s.bringToFront)
  const sendToBack = useEditor((s) => s.sendToBack)
  const snapSel = useEditor((s) => s.snapSelectedToGrid)
  const recentColors = useEditor((s) => s.recentColors)
  const setRotation = useEditor((s) => s.setRotation)
  const alignSelected = useEditor((s) => s.alignSelected)
  const distributeSelected = useEditor((s) => s.distributeSelected)
  const toggleLock = useEditor((s) => s.toggleLock)
  const toggleHide = useEditor((s) => s.toggleHide)

  const [showMore, setShowMore] = useState(false)
  const primary = shapes.find((sh) => sh.id === selectedIds[0])
  const single = selectedIds.length === 1
  const multi = selectedIds.length > 1
  const grouped = selectedIds.some((id) => shapes.find((s) => s.id === id)?.groupId)

  if (!primary) {
    return (
      <div>
        <div className="section-title">Property Inspector</div>
        <div className="hint">Select a layer. Shift-click = multi-select.</div>
      </div>
    )
  }

  const setGeo = (patch) => { pushHistory(); update(primary.id, patch) }

  return (
    <div>
      <div className="section-title">
        Property Inspector — {multi ? `${selectedIds.length} selected` : primary.type}
      </div>

      {/* Geometry — per spec: X/Y Coordinates, Width/Height Scales */}
      {single && primary.type === 'rect' && (
        <>
          <Num label="X" value={primary.x} onChange={(v) => setGeo({ x: v })} />
          <Num label="Y" value={primary.y} onChange={(v) => setGeo({ y: v })} />
          <Num label="Width" value={primary.width} onChange={(v) => setGeo({ width: v })} />
          <Num label="Height" value={primary.height} onChange={(v) => setGeo({ height: v })} />
        </>
      )}
      {single && primary.type === 'circle' && (
        <>
          <Num label="Center X" value={primary.cx} onChange={(v) => setGeo({ cx: v })} />
          <Num label="Center Y" value={primary.cy} onChange={(v) => setGeo({ cy: v })} />
          <Num label="Radius" value={primary.r} onChange={(v) => setGeo({ r: v })} />
        </>
      )}
      {single && primary.type === 'path' && (
        <div className="hint">{primary.anchors.length} anchor nodes.</div>
      )}

      {/* Style — per spec: Hex Color Fills, Stroke Border Weights */}
      <div className="field-row">
        <label>Fill</label>
        <input
          type="color"
          value={primary.fill === 'none' ? '#ffffff' : primary.fill}
          onChange={(e) => styleSelected({ fill: e.target.value })}
        />
      </div>
      <div className="field-row">
        <label>Stroke</label>
        <input type="color" value={primary.stroke} onChange={(e) => styleSelected({ stroke: e.target.value })} />
      </div>
      <Num label="Stroke W" value={primary.strokeWidth} onChange={(v) => styleSelected({ strokeWidth: v })} />

      {/* Spec macros */}
      <div className="macro-row">
        <button onClick={group} disabled={!multi}>Group Selected</button>
        <button onClick={del}>Delete Layer</button>
      </div>

      <div className="macro-row">
        <button onClick={() => setShowMore((v) => !v)}>{showMore ? '▾ Hide More' : '▸ More'}</button>
      </div>

      {showMore && (
        <>
          <div className="field-row">
            <label>Opacity</label>
            <input type="range" min="0" max="1" step="0.05" value={primary.opacity ?? 1} onChange={(e) => styleSelected({ opacity: parseFloat(e.target.value) })} />
          </div>
          <div className="field-row">
            <label>Rotation°</label>
            <input type="range" min="0" max="359" step="1" value={primary.rotation || 0}
              onMouseDown={pushHistory}
              onChange={(e) => setRotation(primary.id, parseInt(e.target.value, 10))} />
          </div>

          <div className="swatches">
            {recentColors.map((c) => (
              <button key={c} className="swatch" title={c} style={{ background: c }} onClick={() => styleSelected({ fill: c })} />
            ))}
          </div>

          <div className="macro-row">
            <button onClick={duplicate}>Duplicate</button>
            <button onClick={ungroup} disabled={!grouped}>Ungroup</button>
          </div>
          <div className="macro-row">
            <button onClick={bringToFront}>Bring Front</button>
            <button onClick={sendToBack}>Send Back</button>
            <button onClick={snapSel}>Snap Grid</button>
          </div>
          <div className="macro-row">
            <button onClick={() => toggleLock(primary.id)}>{primary.locked ? 'Unlock' : 'Lock'}</button>
            <button onClick={() => toggleHide(primary.id)}>{primary.hidden ? 'Show' : 'Hide'}</button>
          </div>

          {multi && (
            <>
              <div className="section-title">Align</div>
              <div className="tool-grid">
                <button onClick={() => alignSelected('left')}>Left</button>
                <button onClick={() => alignSelected('centerH')}>Center H</button>
                <button onClick={() => alignSelected('right')}>Right</button>
                <button onClick={() => alignSelected('top')}>Top</button>
                <button onClick={() => alignSelected('centerV')}>Center V</button>
                <button onClick={() => alignSelected('bottom')}>Bottom</button>
              </div>
              <div className="macro-row">
                <button onClick={() => distributeSelected('h')} disabled={selectedIds.length < 3}>Distribute H</button>
                <button onClick={() => distributeSelected('v')} disabled={selectedIds.length < 3}>Distribute V</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
