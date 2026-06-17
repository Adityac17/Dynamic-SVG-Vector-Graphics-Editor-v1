import { useState, useCallback } from 'react'
import { useEditor } from '../store.js'
import { countAnchors } from '../utils/geometry.js'
import CompiledXmlCodeSnippet from './CompiledXmlCodeSnippet.jsx'

// System Telemetry & Compiled XML Output Terminal.
export default function XmlTelemetryHUD() {
  const shapes = useEditor((s) => s.shapes)
  const events = useEditor((s) => s.events)
  const [latency, setLatency] = useState(0)
  const [byteSize, setByteSize] = useState(0)

  const onLatency = useCallback((ms, size) => {
    setLatency(ms)
    setByteSize(size)
  }, [])

  // cache size = localStorage footprint of the persisted session
  const cacheBytes =
    (localStorage.getItem('svg-vector-editor-session') || '').length

  return (
    <div className="xml-hud">
      <div className="hud-left">
        <div className="hud-head"><span>Session Telemetry</span></div>
        <div className="metrics">
          <span className="metric">Shape Layers: <b>{shapes.length}</b></span>
          <span className="metric">Anchor Nodes: <b>{countAnchors(shapes)}</b></span>
          <span className="metric">Parse Latency: <b>{latency.toFixed(2)} ms</b></span>
          <span className="metric">XML Size: <b>{byteSize} B</b></span>
          <span className="metric">Cache Size: <b>{cacheBytes} B</b></span>
        </div>
        <div className="hud-head"><span>Graphics Event Log</span></div>
        <div className="event-log">
          {events.length === 0 && <div className="ev">No events yet.</div>}
          {events.slice().reverse().map((e, i) => (
            <div className="ev" key={i}>{e}</div>
          ))}
        </div>
      </div>

      <CompiledXmlCodeSnippet onLatency={onLatency} />
    </div>
  )
}
