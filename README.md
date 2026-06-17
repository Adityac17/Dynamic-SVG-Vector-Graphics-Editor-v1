<h1 align="center">Dynamic SVG Vector Graphics Editor 🎨</h1>

<div align="center">
  <p><strong>A high-performance, frontend-only vector asset creation studio.</strong></p>
  <p><em>Developed for ITM Skills University Case Study #153</em></p>
  
  [![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)](https://github.com/pmndrs/zustand)
</div>

## 📝 Overview

A complete frontend-only vector graphics editor running entirely in the browser. No backend, no database—all coordinate math, path compilation, and XML serialization are handled locally. Built with React 18, Vite, and Zustand for fluid 60fps drag mutations and state management.

## ✨ Features

### 🛠 Core Capabilities
- **Local Browser Execution:** Fully frontend architecture with zero server dependencies.
- **Persistent State:** Auto-saves your workspace to `localStorage` via Zustand persist middleware.
- **Advanced Exporting:** Production-ready XML serializer for SVG downloads, plus native in-browser rasterization for PNG exports.
- **Live Telemetry HUD:** Real-time monitoring of layer counts, anchor nodes, parse latency, cache size, and chronological event logging.

### 🚀 Pro & Productivity Tools
- **Advanced Editing:** - Bezier curve manipulation and freehand pencil capturing.
  - Multi-select, real grouping (`<g>`), and rotation (0–359° pivot support).
- **Alignment & Distribution:** Left, Center, Right, Top, Bottom alignments and precise distribution.
- **Layer Management:** Lock, hide, and manage Z-order (Bring Front / Send Back) per layer.
- **Workflow Enhancers:** - Undo/Redo history stack.
  - Snap-to-grid, arrow-key nudging (1px or 10px with `Shift`), and object duplication.
  - Color swatch memory for one-click reapplications.
- **SVG Import:** Parses existing `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polyline>`, `<polygon>`, and `<path>` nodes into editable layers.

## 💻 Tech Stack & Architecture

- **Framework:** React 18 & Vite
- **State Management:** Zustand (with `persist` middleware)
- **Math/Geometry:** Custom Cartesian Screen-to-SVG Matrix Translator `(P − Offset)/Scale` and Bezier Curve Parameter Generators.

## 📂 Implementation Map

| System / Component | Location |
| :--- | :--- |
| **In-Memory Ledger** (ordered layer array) | `src/store.js` |
| **Session Memory** | `persist` middleware, `src/store.js` |
| **Geometry & Paths** (Screen-to-SVG, Bezier) | `src/utils/geometry.js` |
| **XML Serializer & Export** | `src/utils/serializer.js` |
| **SVG Importer** | `src/utils/importer.js` |
| **Canvas & Interaction** | `src/components/CanvasStage.jsx` <br> `src/components/InteractiveSvgWorkspace.jsx` |
| **Tooling & Forms** | `src/components/DrawingToolActionBar.jsx` <br> `src/components/VectorPropertyInspectorForm.jsx` |
| **Telemetry & Outputs** | `src/components/XmlTelemetryHUD.jsx` <br> `src/components/CompiledXmlCodeSnippet.jsx` |

## 🚀 Quick Start

1. **Clone the repository**
```bash
   git clone [https://github.com/Adityac17/Dynamic-SVG-Vector-Graphics-Editor.git](https://github.com/Adityac17/Dynamic-SVG-Vector-Graphics-Editor.git)
   cd Dynamic-SVG-Vector-Graphics-Editor
Install dependencies
```
Bash
   npm install
Start the development server

Bash
   npm run dev      # Server runs on http://localhost:3000
Build for production

Bash
   npm run build

   
🎯 Usage Guide
Select a Tool: Use the toolbar to drop a Rect or Circle. Use the Pen Bezier to lay anchor points and click Finish Path. Use the Freehand Pencil to drag and draw.

Transformations: Drag shapes to move them. Drag white handles to resize. For paths, manipulate anchor nodes or blue control handles to flex curves. Use Shift + Click to multi-select.

Property Inspector: Edit geometric parameters, colors, and opacity directly.

Grouping: Use Group Selected to bundle shapes into a single <g> tag. Selecting any member selects the entire group.

Exporting: Access the bottom HUD to copy the compiled XML, Download as an SVG, or Download as a rendered PNG.

## ⌨️ Keyboard Shortcuts
Shortcut	Action
V	Select Tool
R	Rectangle Tool
C	Circle Tool
P	Pen Tool
B	Pencil Tool
Ctrl/Cmd + Z	Undo
Ctrl/Cmd + Shift + Z / Ctrl + Y	Redo
Ctrl/Cmd + D	Duplicate Selection
Ctrl/Cmd + A	Select All
Arrow Keys	Nudge Selection (Hold Shift for 10x speed)
Delete / Backspace	Delete Selection
Esc	Finish Path / Deselect All

## 👨‍💻 Author
Aditya Sunil Chouksey

SAM ALTMAN

B.Tech CSE

ITM Skills University 
