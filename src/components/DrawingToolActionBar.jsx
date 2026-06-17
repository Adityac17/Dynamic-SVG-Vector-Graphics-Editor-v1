import { useEditor } from '../store.js'

const TOOLS = [
  { id: 'select', label: 'Select / Transform' },
  { id: 'rect', label: 'Draw Rectangle' },
  { id: 'circle', label: 'Draw Circle' },
  { id: 'pen', label: 'Pen Bezier Anchor' },
  { id: 'pencil', label: 'Freehand Pencil' },
]

export default function DrawingToolActionBar() {
  const tool = useEditor((s) => s.tool)
  const setTool = useEditor((s) => s.setTool)
  const commitPath = useEditor((s) => s.commitPath)
  const draftLen = useEditor((s) => s.draftAnchors.length)

  return (
    <div>
      <div className="section-title">Drawing Tools</div>
      <div className="tool-grid">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={tool === t.id ? 'active' : ''}
            onClick={() => setTool(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tool === 'pen' && (
        <div className="macro-row">
          <button onClick={commitPath} disabled={draftLen < 2}>
            Finish Path ({draftLen})
          </button>
        </div>
      )}
    </div>
  )
}
