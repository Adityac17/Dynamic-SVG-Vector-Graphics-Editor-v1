import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { shapeBBox, shapeCenter } from './utils/geometry.js'
import { importSvgString } from './utils/importer.js'

let idSeq = 1
const nextId = (p = 'node') => `${p}_${(idSeq++).toString(36)}_${Date.now().toString(36)}`
const clone = (v) => JSON.parse(JSON.stringify(v))

const DEFAULT_STYLE = { fill: '#4a90d9', stroke: '#1e1e1e', strokeWidth: 2, opacity: 1, rotation: 0, locked: false, hidden: false }
const HISTORY_CAP = 100

// In-memory vector node relational ledger. Canvas = sequential array of
// declarative geometry layers (array order == layer hierarchy index).
export const useEditor = create(
  persist(
    (set, get) => ({
      // ---- Vector Canvas State Model ----
      tool: 'select', // select | rect | circle | pen | pencil
      shapes: [],
      selectedIds: [],
      draftAnchors: [], // pen tool in-progress
      scale: 1,
      offset: { x: 0, y: 0 },
      canvas: { width: 1000, height: 700 },
      events: [],
      pointer: { x: 0, y: 0 },
      past: [], // undo stack (shape snapshots)
      future: [], // redo stack
      snap: false, // snap-to-grid toggle
      gridStep: 50,
      recentColors: ['#4a90d9', '#d94a4a', '#2aa54a', '#1e1e1e', '#ffffff'],

      log(msg) {
        const t = new Date().toLocaleTimeString()
        set((s) => ({ events: [...s.events.slice(-200), `[${t}] ${msg}`] }))
      },

      // ---- Undo / Redo ----
      pushHistory() {
        set((s) => ({
          past: [...s.past.slice(-(HISTORY_CAP - 1)), clone(s.shapes)],
          future: [],
        }))
      },
      undo() {
        const { past, shapes, future } = get()
        if (past.length === 0) return
        const prev = past[past.length - 1]
        set({
          shapes: prev,
          past: past.slice(0, -1),
          future: [...future, clone(shapes)],
          selectedIds: [],
        })
        get().log('undo')
      },
      redo() {
        const { future, shapes, past } = get()
        if (future.length === 0) return
        const next = future[future.length - 1]
        set({
          shapes: next,
          future: future.slice(0, -1),
          past: [...past, clone(shapes)],
          selectedIds: [],
        })
        get().log('redo')
      },

      toggleSnap() { set((s) => ({ snap: !s.snap })); get().log(`snap ${get().snap ? 'on' : 'off'}`) },
      snapVal(v) { const { snap, gridStep } = get(); return snap ? Math.round(v / gridStep) * gridStep : v },

      setTool(tool) {
        if (get().tool === 'pen' && tool !== 'pen') get().commitPath()
        set({ tool })
        get().log(`tool -> ${tool}`)
      },
      setPointer(p) { set({ pointer: p }) },
      setScale(scale) { set({ scale: Math.max(0.1, Math.min(8, scale)) }) },
      setOffset(offset) { set({ offset }) },

      // ---- Selection (multi-select, group-aware) ----
      expand(ids) {
        const { shapes } = get()
        const groups = new Set()
        ids.forEach((id) => {
          const s = shapes.find((x) => x.id === id)
          if (s?.groupId) groups.add(s.groupId)
        })
        const out = new Set(ids)
        shapes.forEach((s) => { if (s.groupId && groups.has(s.groupId)) out.add(s.id) })
        return [...out]
      },
      select(id, additive = false) {
        if (id == null) { set({ selectedIds: [] }); return }
        const sh = get().shapes.find((x) => x.id === id)
        if (sh && (sh.locked || sh.hidden)) return // can't select locked/hidden
        const cur = get().selectedIds
        let base
        if (additive) base = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
        else base = [id]
        set({ selectedIds: get().expand(base) })
      },

      // ---- Shape creation ----
      addRect(x, y) {
        get().pushHistory()
        const sv = get().snapVal
        const shape = { id: nextId(), type: 'rect', x: sv(x - 50), y: sv(y - 35), width: 100, height: 70, ...DEFAULT_STYLE }
        set((s) => ({ shapes: [...s.shapes, shape], selectedIds: [shape.id] }))
        get().log(`+ rect ${shape.id}`)
      },
      addCircle(x, y) {
        get().pushHistory()
        const sv = get().snapVal
        const shape = { id: nextId(), type: 'circle', cx: sv(x), cy: sv(y), r: 50, ...DEFAULT_STYLE }
        set((s) => ({ shapes: [...s.shapes, shape], selectedIds: [shape.id] }))
        get().log(`+ circle ${shape.id}`)
      },

      // ---- Pen / Bezier ----
      addAnchor(x, y) {
        set((s) => ({ draftAnchors: [...s.draftAnchors, { x, y, hx: 0, hy: 0 }] }))
        get().log(`pen anchor (${x}, ${y})`)
      },
      commitPath() {
        const draft = get().draftAnchors
        if (draft.length < 2) { set({ draftAnchors: [] }); return }
        get().pushHistory()
        const shape = { id: nextId(), type: 'path', anchors: draft, closed: false, fill: 'none', stroke: '#d94a4a', strokeWidth: 2 }
        set((s) => ({ shapes: [...s.shapes, shape], draftAnchors: [], selectedIds: [shape.id] }))
        get().log(`+ path ${shape.id} (${draft.length} anchors)`)
      },

      // ---- Freehand pencil ("draw anything") ----
      addFreehand(points) {
        if (!points || points.length < 2) return
        get().pushHistory()
        const anchors = points.map((p) => ({ x: p.x, y: p.y, hx: 0, hy: 0 }))
        const shape = { id: nextId(), type: 'path', anchors, closed: false, freehand: true, fill: 'none', stroke: '#2aa54a', strokeWidth: 2 }
        set((s) => ({ shapes: [...s.shapes, shape], selectedIds: [shape.id] }))
        get().log(`+ freehand ${shape.id} (${anchors.length} pts)`)
      },

      // ---- Mutation ----
      updateShape(id, patch) {
        set((s) => ({ shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)) }))
      },
      // apply style patch to every selected shape (history-tracked)
      styleSelected(patch) {
        get().pushHistory()
        const ids = new Set(get().selectedIds)
        set((s) => ({ shapes: s.shapes.map((sh) => (ids.has(sh.id) ? { ...sh, ...patch } : sh)) }))
        const c = patch.fill || patch.stroke
        if (c && /^#[0-9a-fA-F]{6}$/.test(c)) {
          set((s) => ({ recentColors: [c, ...s.recentColors.filter((x) => x !== c)].slice(0, 8) }))
        }
      },
      updateAnchor(id, index, patch) {
        set((s) => ({
          shapes: s.shapes.map((sh) => {
            if (sh.id !== id || sh.type !== 'path') return sh
            return { ...sh, anchors: sh.anchors.map((a, i) => (i === index ? { ...a, ...patch } : a)) }
          }),
        }))
      },

      moveSelected(dx, dy) {
        const ids = new Set(get().selectedIds)
        set((s) => ({
          shapes: s.shapes.map((sh) => {
            if (!ids.has(sh.id) || sh.locked) return sh
            if (sh.type === 'rect') return { ...sh, x: sh.x + dx, y: sh.y + dy }
            if (sh.type === 'circle') return { ...sh, cx: sh.cx + dx, cy: sh.cy + dy }
            if (sh.type === 'path') return { ...sh, anchors: sh.anchors.map((a) => ({ ...a, x: a.x + dx, y: a.y + dy })) }
            return sh
          }),
        }))
      },

      deleteSelected() {
        const ids = new Set(get().selectedIds)
        if (ids.size === 0) return
        get().pushHistory()
        set((s) => ({ shapes: s.shapes.filter((sh) => !ids.has(sh.id)), selectedIds: [] }))
        get().log(`- delete ${ids.size} layer(s)`)
      },

      // ---- Grouping ----
      groupSelected() {
        const ids = get().selectedIds
        if (ids.length < 2) return
        get().pushHistory()
        const gid = nextId('grp')
        const set2 = new Set(ids)
        set((s) => {
          // tag membership, then cluster members contiguously at the first
          // member's slot so the <g> serializes as one run
          const tagged = s.shapes.map((sh) => (set2.has(sh.id) ? { ...sh, groupId: gid } : sh))
          const firstIdx = tagged.findIndex((sh) => sh.groupId === gid)
          const members = tagged.filter((sh) => sh.groupId === gid)
          const rest = tagged.filter((sh) => sh.groupId !== gid)
          const out = [...rest]
          out.splice(firstIdx, 0, ...members)
          return { shapes: out }
        })
        get().log(`group ${ids.length} -> ${gid}`)
      },
      ungroupSelected() {
        const ids = new Set(get().selectedIds)
        if (ids.size === 0) return
        get().pushHistory()
        set((s) => ({ shapes: s.shapes.map((sh) => (ids.has(sh.id) ? { ...sh, groupId: undefined } : sh)) }))
        get().log('ungroup')
      },

      // ---- Duplicate / nudge / z-order / select-all ----
      duplicateSelected() {
        const ids = new Set(get().selectedIds)
        if (ids.size === 0) return
        get().pushHistory()
        const newIds = []
        const groupMap = {}
        set((s) => {
          const copies = s.shapes
            .filter((sh) => ids.has(sh.id))
            .map((sh) => {
              const c = clone(sh)
              c.id = nextId()
              if (c.groupId) { groupMap[sh.groupId] = groupMap[sh.groupId] || nextId('grp'); c.groupId = groupMap[sh.groupId] }
              if (c.type === 'rect') { c.x += 20; c.y += 20 }
              else if (c.type === 'circle') { c.cx += 20; c.cy += 20 }
              else if (c.type === 'path') c.anchors = c.anchors.map((a) => ({ ...a, x: a.x + 20, y: a.y + 20 }))
              newIds.push(c.id)
              return c
            })
          return { shapes: [...s.shapes, ...copies], selectedIds: newIds }
        })
        get().log(`duplicate ${ids.size}`)
      },
      nudgeSelected(dx, dy) {
        if (get().selectedIds.length === 0) return
        get().pushHistory()
        get().moveSelected(dx, dy)
      },
      bringToFront() {
        const ids = new Set(get().selectedIds)
        if (ids.size === 0) return
        get().pushHistory()
        set((s) => ({ shapes: [...s.shapes.filter((sh) => !ids.has(sh.id)), ...s.shapes.filter((sh) => ids.has(sh.id))] }))
      },
      sendToBack() {
        const ids = new Set(get().selectedIds)
        if (ids.size === 0) return
        get().pushHistory()
        set((s) => ({ shapes: [...s.shapes.filter((sh) => ids.has(sh.id)), ...s.shapes.filter((sh) => !ids.has(sh.id))] }))
      },
      selectAll() { set((s) => ({ selectedIds: s.shapes.map((sh) => sh.id) })) },
      snapSelectedToGrid() {
        const ids = new Set(get().selectedIds)
        const g = get().gridStep
        const r = (v) => Math.round(v / g) * g
        get().pushHistory()
        set((s) => ({
          shapes: s.shapes.map((sh) => {
            if (!ids.has(sh.id)) return sh
            if (sh.type === 'rect') return { ...sh, x: r(sh.x), y: r(sh.y) }
            if (sh.type === 'circle') return { ...sh, cx: r(sh.cx), cy: r(sh.cy) }
            if (sh.type === 'path') return { ...sh, anchors: sh.anchors.map((a) => ({ ...a, x: r(a.x), y: r(a.y) })) }
            return sh
          }),
        }))
        get().log('snap selection to grid')
      },

      raiseLayer(id) {
        get().pushHistory()
        set((s) => {
          const i = s.shapes.findIndex((sh) => sh.id === id)
          if (i < 0 || i === s.shapes.length - 1) return s
          const arr = [...s.shapes]; [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; return { shapes: arr }
        })
      },
      lowerLayer(id) {
        get().pushHistory()
        set((s) => {
          const i = s.shapes.findIndex((sh) => sh.id === id)
          if (i <= 0) return s
          const arr = [...s.shapes]; [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; return { shapes: arr }
        })
      },

      // ---- Lock / Hide per layer ----
      toggleLock(id) {
        get().pushHistory()
        set((s) => ({
          shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, locked: !sh.locked } : sh)),
          selectedIds: s.selectedIds.filter((x) => x !== id),
        }))
      },
      toggleHide(id) {
        get().pushHistory()
        set((s) => ({
          shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, hidden: !sh.hidden } : sh)),
          selectedIds: s.selectedIds.filter((x) => x !== id),
        }))
      },

      // ---- Rotation ----
      // rotation lives on each shape as a degrees value; transform is applied
      // at render and serialize time via transform="rotate(deg cx cy)".
      rotateSelected(deg) {
        const ids = new Set(get().selectedIds)
        if (ids.size === 0) return
        get().pushHistory()
        set((s) => ({
          shapes: s.shapes.map((sh) => (ids.has(sh.id) && !sh.locked ? { ...sh, rotation: ((sh.rotation || 0) + deg) % 360 } : sh)),
        }))
        get().log(`rotate ${deg}° (${ids.size})`)
      },
      setRotation(id, deg) {
        set((s) => ({ shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, rotation: deg } : sh)) }))
      },

      // ---- Align / Distribute ----
      alignSelected(mode) {
        const ids = get().selectedIds
        if (ids.length < 2) return
        get().pushHistory()
        const shapes = get().shapes
        const sel = shapes.filter((sh) => ids.includes(sh.id) && !sh.locked)
        const boxes = sel.map((sh) => ({ sh, b: shapeBBox(sh) }))
        const minX = Math.min(...boxes.map((o) => o.b.x))
        const maxX = Math.max(...boxes.map((o) => o.b.x + o.b.w))
        const minY = Math.min(...boxes.map((o) => o.b.y))
        const maxY = Math.max(...boxes.map((o) => o.b.y + o.b.h))
        const cxAll = (minX + maxX) / 2
        const cyAll = (minY + maxY) / 2

        const moveTo = (sh, b, nx, ny) => {
          const dx = nx - b.x, dy = ny - b.y
          if (sh.type === 'rect') return { ...sh, x: sh.x + dx, y: sh.y + dy }
          if (sh.type === 'circle') return { ...sh, cx: sh.cx + dx, cy: sh.cy + dy }
          if (sh.type === 'path') return { ...sh, anchors: sh.anchors.map((a) => ({ ...a, x: a.x + dx, y: a.y + dy })) }
          return sh
        }

        const patched = new Map()
        boxes.forEach(({ sh, b }) => {
          let nx = b.x, ny = b.y
          if (mode === 'left') nx = minX
          else if (mode === 'right') nx = maxX - b.w
          else if (mode === 'centerH') nx = cxAll - b.w / 2
          else if (mode === 'top') ny = minY
          else if (mode === 'bottom') ny = maxY - b.h
          else if (mode === 'centerV') ny = cyAll - b.h / 2
          patched.set(sh.id, moveTo(sh, b, nx, ny))
        })
        set((s) => ({ shapes: s.shapes.map((sh) => patched.get(sh.id) || sh) }))
        get().log(`align ${mode}`)
      },

      distributeSelected(axis) {
        const ids = get().selectedIds
        if (ids.length < 3) return
        get().pushHistory()
        const shapes = get().shapes
        const sel = shapes.filter((sh) => ids.includes(sh.id) && !sh.locked)
        const boxes = sel.map((sh) => ({ sh, b: shapeBBox(sh) }))
        boxes.sort((a, b) => axis === 'h' ? a.b.x - b.b.x : a.b.y - b.b.y)
        const first = boxes[0], last = boxes[boxes.length - 1]
        const start = axis === 'h' ? first.b.x : first.b.y
        const end = axis === 'h' ? last.b.x : last.b.y
        const step = (end - start) / (boxes.length - 1)

        const move = (sh, b, nx, ny) => {
          const dx = nx - b.x, dy = ny - b.y
          if (sh.type === 'rect') return { ...sh, x: sh.x + dx, y: sh.y + dy }
          if (sh.type === 'circle') return { ...sh, cx: sh.cx + dx, cy: sh.cy + dy }
          if (sh.type === 'path') return { ...sh, anchors: sh.anchors.map((a) => ({ ...a, x: a.x + dx, y: a.y + dy })) }
          return sh
        }

        const patched = new Map()
        boxes.forEach(({ sh, b }, i) => {
          if (axis === 'h') patched.set(sh.id, move(sh, b, start + step * i, b.y))
          else patched.set(sh.id, move(sh, b, b.x, start + step * i))
        })
        set((s) => ({ shapes: s.shapes.map((sh) => patched.get(sh.id) || sh) }))
        get().log(`distribute ${axis}`)
      },

      // ---- SVG file import ----
      importSvg(text) {
        try {
          const imported = importSvgString(text)
          if (imported.length === 0) { get().log('import: no recognized shapes'); return }
          get().pushHistory()
          const merged = imported.map((s) => ({ rotation: 0, locked: false, hidden: false, opacity: 1, ...s }))
          set((s) => ({ shapes: [...s.shapes, ...merged], selectedIds: merged.map((m) => m.id) }))
          get().log(`import +${merged.length} shape(s)`)
        } catch (err) {
          get().log(`import failed: ${err.message}`)
        }
      },

      clearAll() {
        get().pushHistory()
        set({ shapes: [], draftAnchors: [], selectedIds: [] })
        get().log('clear canvas')
      },
    }),
    {
      name: 'svg-vector-editor-session',
      partialize: (s) => ({ shapes: s.shapes, scale: s.scale, offset: s.offset, canvas: s.canvas }),
    },
  ),
)
