<h1 align="center">Dynamic SVG Vector Graphics Editor</h1>

<div align="center">
  <p><strong>A browser-native vector graphics editor built with React 18, Vite, and Zustand.</strong></p>
  <p>No backend. No server. Runs entirely in the browser.</p>

  <a href="https://adityac17.github.io/Dynamic-SVG-Vector-Graphics-Editor-v1/">
    <img src="https://img.shields.io/badge/Live_Demo-Visit_Site-brightgreen?style=for-the-badge" alt="Live Demo" />
  </a>
  
  [![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)](https://github.com/pmndrs/zustand)
</div>

---

## Live Demo

**[https://adityac17.github.io/Dynamic-SVG-Vector-Graphics-Editor-v1/](https://adityac17.github.io/Dynamic-SVG-Vector-Graphics-Editor-v1/)**

---

## Project Description

A complete, production-quality SVG vector graphics editor that runs entirely in the browser as a React single-page application. Users can draw rectangles, circles, Bezier pen paths, and freehand strokes on an interactive SVG canvas. Every shape is stored in a Zustand state store with localStorage persistence — work survives page refresh.

The editor covers the full spectrum from low-level graphics math (screen-to-SVG coordinate transforms, Bezier curve generation, rotation pivot arithmetic) to high-level UX features (undo/redo, grouping, layer management, file import/export) — all from first principles, with no graphics library dependency.

Built for **ITM Skills University Case Study #153 — Dynamic SVG Vector Graphics Editor**.

---

## Screenshots

> Draw shapes, edit properties, export SVG/PNG — all in the browser.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Editor Console  │           SVG Canvas                             │
│  ─────────────   │  ┌──────────────────────────────────────────┐    │
│  Tools:          │  │                                          │    │
│  ◻ Rect          │  │   [rect]  [circle]  [path]               │    │
│  ○ Circle        │  │      ↑ drag to move/resize               │    │
│  ✏ Pen           │  │                                          │    │ 
│  ✒ Pencil        │  └──────────────────────────────────────────┘    │
│                  │                                                  │ 
│  Property        │  ┌──────────────────────────────────────────┐    │
│  Inspector:      │  │  <svg xmlns="http://www.w3.org/2000/svg">│    │
│  X / Y / W / H   │  │    <rect x="50" y="40" .../>             │    │
│  Fill  Stroke    │  │  </svg>          [Copy] [SVG] [PNG]      │    │
│  [Group] [Del]   │  └──────────────────────────────────────────┘    │
│                  │                                                  │
│  Layer List:     │  Telemetry: 3 layers · 8 anchors · 2ms latency   │
│  ● rect          │                                                  │
│  ● circle        │                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### Drawing Tools
- **Rectangle** — click-drag to place, resize via corner handles
- **Circle** — click-drag to place, resize via radius handle
- **Pen (Bezier)** — click to lay anchor points, drag handles to curve; press `Esc` or "Finish Path" to commit
- **Freehand Pencil** — drag to draw free-form strokes captured as smooth paths

### Shape Editing
- Drag to move; resize handles per shape type
- **Rotation handle** — orange dot arm above shape, drag to rotate around bbox center
- **Bezier control handles** — blue handles on path anchors for curve manipulation
- Multi-select via `Shift+Click`; move all selected together

### Property Inspector
- X / Y coordinates, Width / Height (rect), Center X/Y/Radius (circle)
- Fill color picker, Stroke color picker, Stroke weight
- Opacity slider, Rotation slider (0–359°)
- Recent color swatches for one-click re-apply

### Layer Management
- Layer hierarchy list — reverse Z-order (top layer = top of list)
- Raise / Lower layer (↑ / ↓)
- Show / Hide toggle per layer (●/◌)
- Lock layer (prevents editing)
- Group selected shapes into `<g>` / Ungroup
- Bring to Front / Send to Back
- Duplicate selection
- Delete layer

### Align & Distribute
- Align: Left, Center H, Right, Top, Center V, Bottom
- Distribute: Horizontal, Vertical (requires ≥ 3 selected)

### Canvas Controls
- Zoom In / Out / Reset
- Pan (arrow buttons or keyboard)
- Snap-to-Grid toggle — rounds coordinates to nearest grid step
- Import SVG file — parses `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`, `<path>` into editable layers
- Clear All

### Export
- **Copy XML** — copies full SVG markup to clipboard
- **Download SVG** — saves as `.svg` file
- **Download PNG** — rasterizes to PNG via offscreen canvas (no server needed)

### Undo / Redo
- 100-step history via snapshot stacks
- `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` / `Ctrl+Y` redo

### Session Persistence
- Auto-saves to `localStorage` on every change via Zustand persist middleware
- Workspace survives page refresh

### Live Telemetry HUD
- Shape layer count, anchor node count, parse latency (ms), XML byte size, cache size
- Reverse-chronological event log

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 (Concurrent Mode, StrictMode) |
| Build Tool | Vite 5 |
| State Management | Zustand 4 with `persist` middleware |
| Language | JavaScript ES2022 (modules) |
| Styling | Plain CSS, CSS Grid layout |
| Export | Clipboard API, Blob + `URL.createObjectURL`, HTML5 Canvas |
| Import | `FileReader` API + `DOMParser` |
| Persistence | `localStorage` |
| Deployment | GitHub Pages via GitHub Actions |

---

## Project Structure

```
src/
├── App.jsx                          # Root — keyboard shortcuts, global layout
├── store.js                         # Zustand store — all state + actions
├── index.css                        # Global styles (Times New Roman 12pt)
├── main.jsx                         # React 18 concurrent root
├── components/
│   ├── CanvasStage.jsx              # Top toolbar: undo/redo, zoom, snap, import
│   ├── InteractiveSvgWorkspace.jsx  # SVG canvas — pointer events, rendering
│   ├── EditorConsole.jsx            # Left panel — tools + inspector + layers
│   ├── DrawingToolActionBar.jsx     # Tool selector buttons
│   ├── VectorPropertyInspectorForm.jsx  # Shape properties panel
│   ├── CompiledXmlCodeSnippet.jsx   # Live XML output + export buttons
│   └── XmlTelemetryHUD.jsx         # Metrics HUD + event log
└── utils/
    ├── geometry.js                  # screenToSvg, buildPathData, shapeBBox
    ├── serializer.js                # SVG/PNG export, XML generation
    └── importer.js                  # SVG file parser (DOMParser)
```

---

## Setup Instructions

### Prerequisites

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **npm** v9 or higher (comes with Node)
- **Git**

### 1. Clone

```bash
git clone https://github.com/Adityac17/Dynamic-SVG-Vector-Graphics-Editor-v1.git
cd Dynamic-SVG-Vector-Graphics-Editor-v1
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start development server

```bash
npm run dev
```

Opens at **http://localhost:3000** with hot module reload.

### 4. Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview the production build:

```bash
npm run preview
```

### 5. Deploy to GitHub Pages (optional)

The repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.

Enable Pages in your repo:
1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**
3. Push to `main` — the workflow builds and deploys automatically.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `R` | Rectangle tool |
| `C` | Circle tool |
| `P` | Pen (Bezier) tool |
| `B` | Pencil (freehand) tool |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` / `Ctrl + Y` | Redo |
| `Ctrl/Cmd + D` | Duplicate selection |
| `Ctrl/Cmd + A` | Select all |
| `Arrow keys` | Nudge selection 1px |
| `Shift + Arrow keys` | Nudge selection 10px |
| `Delete` / `Backspace` | Delete selection |
| `Esc` | Finish path / deselect all |

---

## Author

**Aditya Sunil Chouksey**  
B.Tech CSE — ITM Skills University  
GitHub: [@Adityac17](https://github.com/Adityac17)
