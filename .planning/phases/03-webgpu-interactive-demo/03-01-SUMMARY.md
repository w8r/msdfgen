---
phase: 03-webgpu-interactive-demo
plan: 01
subsystem: webgpu-rendering
tags: [webgpu, msdf, shaders, rendering, text-layout]
completed: 2026-05-11T20:24:53Z
duration_minutes: 5

dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [webgpu-pipeline, msdf-renderer, text-layout-engine]
  affects: [demo-system]

tech_stack:
  added:
    - lil-gui@0.21.0
    - '@chenglou/pretext@0.0.7'
  patterns:
    - WebGPU instanced rendering
    - MSDF median sampling with derivative antialiasing
    - Orthographic view-projection matrices
    - Float32 to Uint8 texture conversion
    - Pretext character positioning

key_files:
  created:
    - demo/webgpu-demo.html
    - demo/webgpu-demo.ts
    - demo/shaders/msdf.wgsl
    - demo/shaders/types.ts
    - demo/renderer/MSDFRenderer.ts
    - demo/renderer/TextLayout.ts
    - demo/renderer/Viewport.ts
  modified:
    - package.json
    - package-lock.json

decisions:
  - Use RGBA8Unorm texture format (convert Float32 to Uint8) for smaller size and broader compatibility
  - Implement bytesPerRow padding to 256-byte alignment for WebGPU texture upload
  - Use column-major matrices throughout for WebGPU uniform buffers
  - Single-line text layout for Plan 01 (multi-line deferred to Plan 02)
  - Center text with viewport pan offset rather than transform matrix
  - Use linear texture filtering for MSDF sampling
  - Skip whitespace characters in instance buffer (handle space advance width)

metrics:
  tasks_completed: 6
  commits: 6
  files_created: 9
  lines_added: 1071
  test_coverage: manual-verification-pending
---

# Phase 3 Plan 01: WebGPU Rendering Foundation Summary

Built the WebGPU rendering pipeline and text layout system for MSDF text rendering with three visualization modes.

## One-liner

WebGPU instanced quad renderer with MSDF median sampling, derivative-based antialiasing, pretext text layout, and three visualization modes (rendered/raw/heatmap).

## What Was Built

### 1. Dependencies (Task 1)
- Installed `lil-gui@0.21.0` for UI controls (Plan 02)
- Installed `@chenglou/pretext@0.0.7` for text layout
- Created `demo/webgpu-demo.html` with full-screen canvas and dark theme
- Added WebGPU unsupported error message div

### 2. WGSL Shaders (Task 2)
- Created `demo/shaders/msdf.wgsl` with vertex and fragment shaders
- Implemented `median()` function for MSDF sampling from RGB channels
- Added derivative-based antialiasing using `dpdx()`/`dpdy()` for scale-invariant sharpness
- Three visualization modes:
  - **Mode 0 (Rendered)**: Standard MSDF rendering with smoothstep antialiasing
  - **Mode 1 (Raw)**: Display raw RGB channels directly
  - **Mode 2 (Heatmap)**: Distance gradient (red → yellow → green → blue)
- Created `demo/shaders/types.ts` with TypeScript buffer layout helpers

### 3. Viewport State Management (Task 3)
- Created `demo/renderer/Viewport.ts` class
- Manages zoom (clamped 0.1-10.0) and pan (panX, panY) state
- Computes orthographic view-projection matrix with zoom/pan applied
- Returns column-major Float32Array for WebGPU uniform buffers
- No event handling (deferred to Plan 02)

### 4. Text Layout (Task 4)
- Created `demo/renderer/TextLayout.ts` module
- Integrated `@chenglou/pretext` for character positioning
- Converts text string to GPU-ready instance buffer data
- Packs transform matrix (mat4) and UV bounds (vec4) per character (20 floats total)
- Handles whitespace advance width and missing glyphs

### 5. MSDFRenderer Pipeline (Task 5)
- Created `demo/renderer/MSDFRenderer.ts` class
- Full WebGPU initialization: adapter, device, context, pipeline
- Loads WGSL shaders via Vite `?raw` import
- Atlas texture upload with Float32 → Uint8 conversion
- Handles bytesPerRow alignment (256-byte multiple requirement)
- Instance buffer management (recreates on size change)
- Uniform buffer updates via `writeBuffer()` (no bind group recreation)
- Instanced quad rendering (6 vertices per quad, N instances)
- WebGPU error handling with callback

### 6. Main Demo Entry Point (Task 6)
- Created `demo/webgpu-demo.ts` main entry point
- Loads Roboto-Regular.ttf font from test fixtures
- Generates MSDF atlas for "Hello MSDF!" text
- Initializes renderer, uploads atlas, computes text instances
- Starts `requestAnimationFrame` render loop
- Centers text on screen with viewport pan offset
- Logs FPS to console every 60 frames
- Handles window resize events

## Technical Decisions

### Texture Format: RGBA8Unorm
**Decision**: Convert Phase 2's Float32Array RGB atlas to Uint8Array RGBA for GPU upload.

**Rationale**:
- Smaller texture size (1 byte vs 4 bytes per channel)
- Broader compatibility (RGBA32Float requires `float32-filterable` feature)
- MSDF doesn't need float precision after generation
- Linear filtering works well with 8-bit precision

**Implementation**: Loop through Float32 RGB data, multiply by 255, round, pack with alpha=255.

### BytesPerRow Alignment
**Decision**: Pad texture rows to 256-byte multiples for WebGPU `writeTexture()`.

**Rationale**:
- WebGPU spec requires bytesPerRow alignment for texture upload
- Validation errors if not aligned
- Different from WebGL (no alignment requirement)

**Implementation**: Calculate `bytesPerRow = ceil((width * 4) / 256) * 256`, copy rows into padded buffer.

### Matrix Layout: Column-Major
**Decision**: Use column-major layout for all matrices (view-projection, model transforms).

**Rationale**:
- WebGPU/WGSL expects column-major matrices
- Different from CPU-side libraries (often row-major)
- Matches OpenGL convention

**Implementation**: Pack matrices as `[col0, col1, col2, col3]` where each column is `vec4<f32>`.

### Single-Line Layout
**Decision**: Use unlimited container width (10000px) for single-line text layout.

**Rationale**:
- Plan 01 focuses on rendering foundation, not layout complexity
- Multi-line layout deferred to Plan 02 (with UI controls for text input)
- Simpler to debug and verify rendering correctness

**Implementation**: Call `layoutWithLines(prepared, 10000, lineHeight)` with large width.

### Viewport Centering
**Decision**: Center text using viewport pan offset, not transform matrix.

**Rationale**:
- Separates rendering logic from positioning logic
- Viewport owns view transformation, not individual text instances
- Easier to add zoom/pan controls in Plan 02

**Implementation**: Calculate text bounds, set `viewport.setPan(-startX, -startY)`.

## Integration Points

### Phase 2 → Phase 3
- Import `AtlasResult`, `GlyphInfo` types from `src/atlas`
- Use `atlas.atlas.data()` Float32Array RGB data for texture upload
- Use `atlas.glyphs` Map for character lookup in TextLayout
- Use `glyphInfo.uvBounds` for atlas UV coordinates
- Use `glyphInfo.planeBounds` for glyph sizing
- Use `glyphInfo.advanceWidth` for horizontal positioning

### Phase 1 → Phase 3
- Import `loadFont` from `src/font`
- Load Roboto-Regular.ttf from `src/test-fixtures`
- Use font for atlas generation (Phase 2 bridge)

### Plan 01 → Plan 02
- Viewport class ready for event handlers (wheel, mouse)
- MSDFRenderer exposes `setVisualizationMode()` for UI toggle
- MSDFRenderer exposes `setColor()` for color picker
- TextLayout `computeTextInstances()` ready for re-layout on text change
- All infrastructure ready for lil-gui integration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vite raw import for WGSL shader**
- **Found during:** Task 5 (MSDFRenderer implementation)
- **Issue:** No clear way to inline WGSL shader code in TypeScript
- **Fix:** Used Vite `?raw` import suffix to load shader as string
- **Files modified:** `demo/renderer/MSDFRenderer.ts`
- **Commit:** 47c2c82

**2. [Rule 2 - Missing critical functionality] Whitespace handling in TextLayout**
- **Found during:** Task 4 (TextLayout implementation)
- **Issue:** Pretext includes spaces in text string, but spaces have no visual glyph
- **Fix:** Added explicit whitespace detection and advance width calculation
- **Files modified:** `demo/renderer/TextLayout.ts`
- **Commit:** 698780f

**3. [Rule 2 - Missing critical functionality] Canvas resize handling**
- **Found during:** Task 6 (Main demo implementation)
- **Issue:** Canvas size fixed at initialization, breaks on window resize
- **Fix:** Added window resize event listener to update canvas dimensions
- **Files modified:** `demo/webgpu-demo.ts`
- **Commit:** 3281f18

## Verification Status

### Automated Checks: PASSED
```bash
npm list lil-gui @chenglou/pretext  # Dependencies installed
ls demo/webgpu-demo.html demo/webgpu-demo.ts demo/shaders/msdf.wgsl  # Files exist
grep -q "median" demo/shaders/msdf.wgsl  # MSDF sampling
grep -q "dpdx" demo/shaders/msdf.wgsl  # Derivative antialiasing
grep -q "navigator.gpu" demo/renderer/MSDFRenderer.ts  # WebGPU detection
grep -q "prepareWithSegments" demo/renderer/TextLayout.ts  # Pretext integration
grep -q "requestAnimationFrame" demo/webgpu-demo.ts  # Render loop
```

### Manual Verification: PENDING
Per plan verification section, manual testing required:
1. Open `demo/webgpu-demo.html` in Chrome 113+ or Edge 113+
2. Verify "Hello MSDF!" text appears rendered with sharp edges
3. Verify no console errors related to WebGPU
4. Test in Safari 17 or Firefox (no WebGPU) - verify error message appears

**Status**: Automated checks passed, visual verification deferred to user testing.

## Performance Metrics

| Metric | Value |
|--------|-------|
| Tasks completed | 6/6 |
| Duration | 5 minutes |
| Commits | 6 |
| Files created | 9 |
| Lines added | ~1071 |
| Dependencies added | 2 |

## Known Limitations

1. **Single-line layout only**: Multi-line text wrapping deferred to Plan 02
2. **No UI controls**: Hard-coded text, color, zoom, pan values
3. **No interactivity**: Mouse/keyboard input deferred to Plan 02
4. **No split-screen mode**: Deferred to Plan 02
5. **Fixed text**: Cannot change text without reloading page
6. **No atlas preview**: Atlas texture visualization deferred to Plan 02
7. **No FPS display**: Console logging only, no UI metrics panel

## Next Steps (Plan 02)

1. Integrate lil-gui for control panels
2. Add text input overlay for live text editing
3. Implement mouse wheel zoom (cursor-centered)
4. Implement click-and-drag panning
5. Add color pickers for text and background
6. Add visualization mode toggles
7. Implement split-screen comparison mode
8. Add atlas texture preview canvas
9. Display FPS and atlas generation time in UI
10. Add custom font file upload

## Commits

| Hash | Message |
|------|---------|
| e496436 | feat(03-01): install dependencies and create WebGPU demo HTML entry point |
| 583cda2 | feat(03-01): implement WGSL shaders with visualization modes |
| b29af99 | feat(03-01): implement Viewport state management |
| 698780f | feat(03-01): implement TextLayout with pretext integration |
| 47c2c82 | feat(03-01): implement MSDFRenderer WebGPU pipeline |
| 3281f18 | feat(03-01): create main demo entry point with render loop |

## Self-Check: PASSED

### Files exist
```
FOUND: demo/webgpu-demo.html
FOUND: demo/webgpu-demo.ts
FOUND: demo/shaders/msdf.wgsl
FOUND: demo/shaders/types.ts
FOUND: demo/renderer/MSDFRenderer.ts
FOUND: demo/renderer/TextLayout.ts
FOUND: demo/renderer/Viewport.ts
```

### Commits exist
```
FOUND: e496436
FOUND: 583cda2
FOUND: b29af99
FOUND: 698780f
FOUND: 47c2c82
FOUND: 3281f18
```

All files and commits verified successfully.
