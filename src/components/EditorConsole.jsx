import DrawingToolActionBar from './DrawingToolActionBar.jsx'
import VectorPropertyInspectorForm from './VectorPropertyInspectorForm.jsx'
import { useEditor } from '../store.js'

// Vector Toolbox & Parameter Inspector Panel.
export default function EditorConsole() {
  const shapes = useEditor((s) => s.shapes)
  const selectedIds = useEditor((s) => s.selectedIds)
  const select = useEditor((s) => s.select)
  const raiseLayer = useEditor((s) => s.raiseLayer)
  const lowerLayer = useEditor((s) => s.lowerLayer)
  const toggleHide = useEditor((s) => s.toggleHide)

  return (
    <div className="editor-console">
      <div className="section-title">Editor Console</div>

      <DrawingToolActionBar />
      <VectorPropertyInspectorForm />

      <div className="section-title">Layer Hierarchy</div>
      {shapes.length === 0 && <div className="hint">No layers yet.</div>}
      {shapes.slice().reverse().map((s) => (
        <div
          key={s.id}
          className={'layer-item' + (selectedIds.includes(s.id) ? ' selected' : '')}
          onClick={(e) => select(s.id, e.shiftKey)}
        >
          <span style={{ opacity: s.hidden ? 0.4 : 1 }}>
            {s.type}{s.groupId ? ' • grp' : ''}{s.hidden ? ' ⦰' : ''}
          </span>
          <span>
            <button title="Hide" onClick={(e) => { e.stopPropagation(); toggleHide(s.id) }}>{s.hidden ? '◌' : '●'}</button>
            <button onClick={(e) => { e.stopPropagation(); raiseLayer(s.id) }}>↑</button>
            <button onClick={(e) => { e.stopPropagation(); lowerLayer(s.id) }}>↓</button>
          </span>
        </div>
      ))}
    </div>
  )
}
