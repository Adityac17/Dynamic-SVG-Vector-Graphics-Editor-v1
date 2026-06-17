import { useEffect } from 'react'
import EditorConsole from './components/EditorConsole.jsx'
import CanvasStage from './components/CanvasStage.jsx'
import XmlTelemetryHUD from './components/XmlTelemetryHUD.jsx'
import { useEditor } from './store.js'

export default function App() {
  useEffect(() => {
    function onKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return // don't hijack typing
      const st = useEditor.getState()
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? st.redo() : st.undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault(); st.redo()
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault(); st.duplicateSelected()
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault(); st.selectAll()
      } else if (e.key.startsWith('Arrow')) {
        if (st.selectedIds.length === 0) return
        e.preventDefault()
        const step = (e.shiftKey ? 10 : 1)
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
        if (d) st.nudgeSelected(d[0], d[1])
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); st.deleteSelected()
      } else if (e.key === 'Escape') {
        if (st.tool === 'pen') st.commitPath()
        st.select(null)
      } else if (e.key === 'v') st.setTool('select')
      else if (e.key === 'r') st.setTool('rect')
      else if (e.key === 'c') st.setTool('circle')
      else if (e.key === 'p') st.setTool('pen')
      else if (e.key === 'b') st.setTool('pencil')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <EditorConsole />
      <CanvasStage />
      <XmlTelemetryHUD />
    </div>
  )
}
