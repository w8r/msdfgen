# Phase 3: WebGPU Interactive Demo - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive WebGPU text rendering demo with live text editing, zoom/pan viewport controls, custom font loading, and visualization mode toggles (rendered text vs raw MSDF vs heatmap). Users can type text and see it rendered in real-time with WebGPU, zoom/pan to inspect quality, change colors, load custom fonts, and switch between visualization modes to understand how MSDF works.

</domain>

<decisions>
## Implementation Decisions

### UI Layout
- Full-screen WebGPU canvas with floating control panels
- Controls use **fixed docked positions** (not draggable) - simpler, more predictable
- **lil-gui** library for settings panel (color pickers, toggles, file upload, metrics display)
- **Separate custom text input overlay** (top or center) - not in lil-gui, allows multi-line editing with better UX

### Viewport Interaction
- **Cursor-centered zoom** - zoom toward mouse cursor position (like Google Maps)
- **Click-and-drag to pan** - standard canvas interaction
- **Reasonable limits:** Min zoom 0.1x (see full text), max zoom 10x (see pixel detail), pan constrained to keep some text visible
- **Smooth easing** for zoom and pan (200-300ms animations) - polished, easier on eyes

### Visualization Modes
- **Toggle buttons in lil-gui** - switch between rendered text, raw MSDF, heatmap
- **Vertical split-screen comparison** (left/right) - allows side-by-side comparison of two modes
- **Hot-to-cold gradient for heatmap** - Red (far from edge) → Yellow → Green → Blue (close to edge)

### Claude's Discretion
- Debug metrics panel layout and styling (FPS, atlas generation time, atlas texture preview)
- Exact lil-gui panel positioning (which edge to dock)
- Text input overlay styling and positioning
- Split-screen divider draggability and styling
- Keyboard shortcuts for mode switching (optional enhancement)
- WebGPU error message styling and content
- Touch input handling (pinch-to-zoom, touch-pan)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **demo/demo-browser.ts** - Canvas-based demo with card layout, visualization utilities
- **src/utils/canvas-utils.ts** - Canvas rendering utilities (sdfToImageData, msdfToImageData, renderMSDFAntialiased) - can inform WebGPU shader implementation
- **demo/index.html** - Dark theme styling, gradient headers, modern aesthetic
- **demo/style.css** - Dark theme (#1a1a1a background, #667eea accent), card-based components

### Established Patterns
- Dark theme with purple/blue accent colors (#667eea, #764ba2)
- Card-based UI with rounded corners, shadows
- Modern sans-serif typography (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- Stat display pattern (value + label, centered, accent color)
- Responsive grid layouts (grid-template-columns: repeat(auto-fit, minmax(...)))

### Integration Points
- **Font loading:** Phase 1 provides `loadFont()` and `parseFont()` from `src/font`
- **Atlas generation:** Phase 2 provides `generateAtlas()` from `src/atlas`
- **WebGPU API:** Will need new WebGPU rendering pipeline (shaders, buffers, instanced quads)
- **pretext integration:** Need to integrate chenglou/pretext for text layout/positioning
- Demo entry point: `demo/index.html` currently loads `demo-browser.ts` - Phase 3 would be new entry or replace

### Dependencies to Add
- **lil-gui** - Settings panel UI library
- **pretext** - Text layout engine (chenglou/pretext)
- WebGPU types (@webgpu/types if not in lib.dom)

</code_context>

<specifics>
## Specific Ideas

- Use lil-gui for settings (industry-standard for WebGL/WebGPU demos, used by three.js)
- Split-screen comparison helps users understand MSDF vs raw distance field visually
- Cursor-centered zoom feels natural and intuitive (Google Maps pattern)
- Hot-to-cold heatmap gradient clearly shows distance gradients

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-webgpu-interactive-demo*
*Context gathered: 2026-05-11*
