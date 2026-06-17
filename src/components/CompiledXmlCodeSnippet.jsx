import { useMemo, useState } from 'react'
import { useEditor } from '../store.js'
import { serializeSvg, downloadSvg, downloadPng } from '../utils/serializer.js'

// Read-only compiled production-ready SVG code, with copy + download actions.
// Returns the serialize latency so the HUD can report parsing telemetry.
export default function CompiledXmlCodeSnippet({ onLatency }) {
  const shapes = useEditor((s) => s.shapes)
  const canvas = useEditor((s) => s.canvas)
  const [copied, setCopied] = useState(false)

  const xml = useMemo(() => {
    const t0 = performance.now()
    const out = serializeSvg(shapes, canvas)
    const t1 = performance.now()
    onLatency?.(t1 - t0, new Blob([out]).size)
    return out
  }, [shapes, canvas, onLatency])

  const copy = async () => {
    await navigator.clipboard.writeText(xml)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="hud-right">
      <div className="hud-head">
        <span>Compiled XML Output</span>
        <span>
          <button onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          <button onClick={() => downloadSvg(xml)}>Download SVG</button>
          <button onClick={() => downloadPng(xml, canvas.width, canvas.height)}>Download PNG</button>
        </span>
      </div>
      <pre className="xml-code">{xml}</pre>
    </div>
  )
}
