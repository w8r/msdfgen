# Phase 3: WebGPU Interactive Demo - Research

**Researched:** 2026-05-11
**Domain:** WebGPU real-time text rendering with MSDF atlases, interactive viewport controls, UI integration
**Confidence:** MEDIUM-HIGH

## Summary

Phase 3 requires building an interactive WebGPU demo that renders text from MSDF atlases generated in Phase 2, with live editing, cursor-centered zoom/pan, color customization, custom font loading, and multiple visualization modes. The core technical challenge is bridging CPU-side text layout (pretext) with GPU-side instanced quad rendering using MSDF shaders, while maintaining 60fps interactivity.

**Key findings:**
- WebGPU's MSDF text rendering uses instanced quads with a median-sampling fragment shader and scale-aware smoothstep antialiasing
- lil-gui provides the standard UI library for WebGL/WebGPU demos with built-in color pickers, folders, and event handling
- pretext offers pure-JS text layout that outputs character positions without triggering DOM reflow
- Cursor-centered zoom requires transforming mouse coordinates before/after zoom and adjusting the view matrix by the delta
- Split-screen rendering uses scissor rectangles and viewport settings to render the same scene with different shaders in two halves

**Primary recommendation:** Use render bundles for static quad geometry (reused per frame), separate instance buffers for per-character transforms, and compute character positions once with pretext on text/font change. Fragment shader branches on visualization mode (rendered/raw/heatmap). Viewport transform handled via uniform buffer updated on zoom/pan events.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-screen WebGPU canvas with floating control panels
- Controls use **fixed docked positions** (not draggable) - simpler, more predictable
- **lil-gui** library for settings panel (color pickers, toggles, file upload, metrics display)
- **Separate custom text input overlay** (top or center) - not in lil-gui, allows multi-line editing with better UX
- **Cursor-centered zoom** - zoom toward mouse cursor position (like Google Maps)
- **Click-and-drag to pan** - standard canvas interaction
- **Reasonable limits:** Min zoom 0.1x (see full text), max zoom 10x (see pixel detail), pan constrained to keep some text visible
- **Smooth easing** for zoom and pan (200-300ms animations) - polished, easier on eyes
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GPU-01 | Demo renders text using WebGPU with standard MSDF shader | MSDF shader architecture, median sampling, smoothstep |
| GPU-02 | Demo uses instanced quad rendering for efficient text display | Instanced rendering patterns, vertex buffer layouts |
| GPU-03 | Text remains sharp at any zoom level (scale-aware smoothing) | fwidth/dFdx/dFdy for derivative-based antialiasing |
| GPU-04 | Demo displays helpful error when WebGPU is not supported | WebGPU feature detection patterns |
| GPU-05 | Demo uses pretext for text layout and positioning | pretext API, prepare/layout workflow |
| INT-01 | User can type/edit text in input field and see it rendered live | Event handling, re-layout on text change |
| INT-02 | User can zoom with mouse wheel (smooth, centered on cursor) | Cursor-centered zoom transformation math |
| INT-03 | User can pan the viewport by dragging | Pan delta accumulation, view matrix updates |
| INT-04 | User can pick text color via color selector | lil-gui addColor controller |
| INT-05 | User can pick background color via color selector | lil-gui addColor controller |
| INT-06 | User can load a custom font file (drag-drop or file picker) | Custom file controller or input element overlay |
| VIS-01 | User can toggle distance field visualization | Fragment shader mode branching |
| VIS-02 | User can view the generated glyph atlas texture | Render atlas texture to separate canvas/quad |
| VIS-03 | User can toggle heatmap mode (color-coded distance gradient) | Color mapping from distance to RGB gradient |
| QUAL-01 | Demo displays generation time for atlas | Pass generationTimeMs from AtlasResult |
| QUAL-02 | Demo displays current FPS | requestAnimationFrame timing and rolling average |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WebGPU API | Browser native | GPU rendering pipeline | Modern, high-performance graphics API; replaces WebGL |
| lil-gui | ^0.21.0 | Settings panel UI | Drop-in replacement for dat.gui; used in three.js examples; minimal dependencies |
| pretext | ^0.x (chenglou/pretext) | Text layout engine | Pure JS, no DOM reflow, accurate canvas-based measurement |
| TypeScript | 5.9.3 | Type safety | Already used in project |
| Vite | 7.2.2 | Dev server and bundler | Already used in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @webgpu/types | latest | TypeScript definitions | If not in lib.dom, provides GPUDevice, GPUBuffer types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lil-gui | dat.gui | lil-gui is more modern, lighter, better maintained |
| pretext | Canvas measureText only | pretext handles line breaking, BiDi, complex scripts |
| Render bundles | Direct draw calls | Bundles provide ~10x performance for repeated geometry |
| WGSL shaders | SPIR-V | WGSL is human-readable, standard for WebGPU |

**Installation:**
```bash
npm install lil-gui @chenglou/pretext
npm install --save-dev @webgpu/types  # If needed
```

## Architecture Patterns

### Recommended Project Structure
```
demo/
├── webgpu-demo.ts          # Main entry point
├── webgpu-demo.html        # HTML container with canvas
├── shaders/
│   ├── msdf.wgsl           # MSDF vertex + fragment shader
│   └── types.ts            # Shader uniform/vertex types
├── renderer/
│   ├── MSDFRenderer.ts     # WebGPU pipeline, buffers, textures
│   ├── TextLayout.ts       # Pretext integration, character positioning
│   └── Viewport.ts         # Zoom/pan state, view matrix
└── ui/
    ├── ControlPanel.ts     # lil-gui integration
    └── TextInput.ts        # Custom text input overlay
```

### Pattern 1: MSDF Rendering Pipeline

**What:** Instanced quad rendering with per-character transform and atlas UV lookup

**When to use:** Rendering any number of glyphs from a shared MSDF atlas texture

**Architecture:**
```
CPU Side:
  Text string → pretext.prepare() → pretext.layoutWithLines()
  → Character positions → Instance buffer (mat4 transform + vec4 uvBounds)

GPU Side:
  Vertex shader: quad corner [-0.5, 0.5] × instance transform → clip space
  Fragment shader: sample atlas at UV → median() → smoothstep() → alpha
```

**Example vertex shader structure (WGSL):**
```wgsl
// Source: WebGPU Samples MSDF Text Rendering
struct VertexInput {
  @location(0) position: vec2<f32>,  // Quad corner: (-0.5,-0.5) to (0.5,0.5)
  @location(1) texCoord: vec2<f32>,  // Quad UV: (0,0) to (1,1)
}

struct InstanceInput {
  @location(2) modelCol0: vec4<f32>,  // Transform matrix column 0
  @location(3) modelCol1: vec4<f32>,  // Transform matrix column 1
  @location(4) modelCol2: vec4<f32>,  // Transform matrix column 2
  @location(5) modelCol3: vec4<f32>,  // Transform matrix column 3
  @location(6) uvBounds: vec4<f32>,   // Atlas UV: (u0, v0, u1, v1)
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@group(0) @binding(0) var<uniform> viewProjection: mat4x4<f32>;

@vertex
fn vertexMain(vert: VertexInput, inst: InstanceInput) -> VertexOutput {
  let model = mat4x4<f32>(inst.modelCol0, inst.modelCol1, inst.modelCol2, inst.modelCol3);
  let worldPos = model * vec4<f32>(vert.position, 0.0, 1.0);

  var output: VertexOutput;
  output.position = viewProjection * worldPos;
  // Map quad UV (0-1) to atlas UV bounds
  output.uv = mix(inst.uvBounds.xy, inst.uvBounds.zw, vert.texCoord);
  return output;
}
```

**Example fragment shader (MSDF median + smoothstep):**
```wgsl
// Source: MSDF shader implementations, Red Blob Games, Medium articles
@group(0) @binding(1) var atlasTexture: texture_2d<f32>;
@group(0) @binding(2) var atlasSampler: sampler;

struct Uniforms {
  color: vec4<f32>,
  mode: u32,  // 0=rendered, 1=raw, 2=heatmap
}
@group(0) @binding(3) var<uniform> uniforms: Uniforms;

fn median(r: f32, g: f32, b: f32) -> f32 {
  return max(min(r, g), min(max(r, g), b));
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  let msdf = textureSample(atlasTexture, atlasSampler, input.uv);
  let dist = median(msdf.r, msdf.g, msdf.b);

  if (uniforms.mode == 1u) {
    // Raw MSDF visualization (show RGB channels directly)
    return vec4<f32>(msdf.rgb, 1.0);
  } else if (uniforms.mode == 2u) {
    // Heatmap visualization (distance gradient)
    // Red (far from edge) → Yellow → Green → Blue (close to edge)
    let t = smoothstep(0.3, 0.7, dist);
    let hot = vec3<f32>(1.0, 0.0, 0.0);    // Red
    let warm = vec3<f32>(1.0, 1.0, 0.0);   // Yellow
    let cool = vec3<f32>(0.0, 1.0, 0.0);   // Green
    let cold = vec3<f32>(0.0, 0.0, 1.0);   // Blue

    var color: vec3<f32>;
    if (dist < 0.4) {
      color = mix(hot, warm, dist / 0.4);
    } else if (dist < 0.6) {
      color = mix(warm, cool, (dist - 0.4) / 0.2);
    } else {
      color = mix(cool, cold, (dist - 0.6) / 0.4);
    }
    return vec4<f32>(color, 1.0);
  } else {
    // Standard MSDF rendering with scale-aware antialiasing
    // fwidth equivalent: length of gradient
    let dx = dpdx(dist);
    let dy = dpdy(dist);
    let w = length(vec2<f32>(dx, dy));

    // Smoothstep from 0.5-w to 0.5+w
    let alpha = smoothstep(0.5 - w, 0.5 + w, dist);
    return vec4<f32>(uniforms.color.rgb, uniforms.color.a * alpha);
  }
}
```

### Pattern 2: Cursor-Centered Zoom

**What:** Zoom transformation that keeps the point under the cursor stationary

**When to use:** Mouse wheel zoom events

**Math:**
```
1. Get mouse position in canvas space: (mx, my)
2. Transform to world space BEFORE zoom: worldBefore = canvasToWorld(mx, my, oldZoom, oldPan)
3. Update zoom: newZoom = oldZoom * zoomFactor
4. Transform same mouse position AFTER zoom: worldAfter = canvasToWorld(mx, my, newZoom, oldPan)
5. Adjust pan to compensate: newPan = oldPan + (worldBefore - worldAfter)
```

**Example implementation:**
```typescript
// Source: WebGL Fundamentals, Medium affine transformations article
function handleWheel(event: WheelEvent) {
  const canvas = event.target as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const mx = event.clientX - rect.left;
  const my = event.clientY - rect.top;

  // Transform mouse to world space before zoom
  const worldBefore = {
    x: (mx - viewport.panX) / viewport.zoom,
    y: (my - viewport.panY) / viewport.zoom,
  };

  // Update zoom (clamped to limits)
  const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(10.0, viewport.zoom * zoomDelta));

  // Transform mouse to world space after zoom
  const worldAfter = {
    x: (mx - viewport.panX) / newZoom,
    y: (my - viewport.panY) / newZoom,
  };

  // Adjust pan to keep world point under cursor
  viewport.panX += (worldBefore.x - worldAfter.x) * newZoom;
  viewport.panY += (worldBefore.y - worldAfter.y) * newZoom;
  viewport.zoom = newZoom;

  // Animate to target over 200ms (optional smoothing)
  animateViewport(viewport);
}
```

### Pattern 3: Text Layout with Pretext

**What:** Compute character positions once, cache until text/font changes

**When to use:** On text input change or font load

**Flow:**
```typescript
// Source: chenglou/pretext GitHub README
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';

// One-time preparation (expensive, cache this)
const prepared = prepareWithSegments(text, '24px Inter');

// Layout at container width (cheap, can re-run on resize)
const { lines } = layoutWithLines(prepared, containerWidth, lineHeight);

// Extract character positions for instance buffer
const instances: CharacterInstance[] = [];
let cursorY = 0;

for (const line of lines) {
  let cursorX = 0;

  for (const char of line.text) {
    const glyphInfo = atlas.glyphs.get(char);
    if (!glyphInfo) continue;

    // Build transform matrix: translate + scale
    const glyphWidth = glyphInfo.planeBounds.right - glyphInfo.planeBounds.left;
    const glyphHeight = glyphInfo.planeBounds.top - glyphInfo.planeBounds.bottom;

    instances.push({
      transform: mat4.fromTranslationScale(
        [cursorX, cursorY, 0],
        [glyphWidth * fontSize, glyphHeight * fontSize, 1]
      ),
      uvBounds: [
        glyphInfo.uvBounds.u0,
        glyphInfo.uvBounds.v0,
        glyphInfo.uvBounds.u1,
        glyphInfo.uvBounds.v1,
      ],
    });

    cursorX += (glyphInfo.advanceWidth / font.unitsPerEm) * fontSize;
  }

  cursorY += lineHeight;
}

// Upload to GPU instance buffer
device.queue.writeBuffer(instanceBuffer, 0, instanceData);
```

### Pattern 4: Split-Screen Rendering

**What:** Render left and right halves with different visualization modes

**When to use:** Split-screen comparison toggle is active

**Approach:**
```typescript
// Source: WebGPU viewport/scissor discussions, Bevy split-screen example
function renderSplitScreen(
  encoder: GPUCommandEncoder,
  renderPass: GPURenderPassEncoder
) {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const halfWidth = Math.floor(canvasWidth / 2);

  // Left half: mode A
  renderPass.setViewport(0, 0, halfWidth, canvasHeight, 0, 1);
  renderPass.setScissorRect(0, 0, halfWidth, canvasHeight);
  device.queue.writeBuffer(uniformBuffer, offsetof_mode, new Uint32Array([modeA]));
  renderPass.draw(6, instanceCount);  // 6 vertices per quad

  // Right half: mode B
  renderPass.setViewport(halfWidth, 0, canvasWidth - halfWidth, canvasHeight, 0, 1);
  renderPass.setScissorRect(halfWidth, 0, canvasWidth - halfWidth, canvasHeight);
  device.queue.writeBuffer(uniformBuffer, offsetof_mode, new Uint32Array([modeB]));
  renderPass.draw(6, instanceCount);
}
```

**Note:** Update uniforms between draw calls, not the entire pipeline. Use scissor test to clip rendering to viewport halves.

### Pattern 5: Render Bundles for Performance

**What:** Pre-record static draw commands, reuse across frames

**When to use:** Quad geometry and pipeline state don't change per frame

**Benefits:** ~10x faster than re-encoding every frame (Babylon.js benchmarks)

**Example:**
```typescript
// Source: WebGPU Best Practices (Toji.dev), MDN GPURenderBundle docs
// Record once (or when pipeline changes)
const bundleEncoder = device.createRenderBundleEncoder({
  colorFormats: ['bgra8unorm'],
  depthStencilFormat: undefined,
});

bundleEncoder.setPipeline(pipeline);
bundleEncoder.setBindGroup(0, bindGroup);
bundleEncoder.setVertexBuffer(0, quadVertexBuffer);  // Static quad corners
bundleEncoder.setVertexBuffer(1, instanceBuffer);     // Dynamic instance data
bundleEncoder.draw(6, instanceCount);

const renderBundle = bundleEncoder.finish();

// Execute every frame
const renderPass = encoder.beginRenderPass(passDescriptor);
renderPass.executeBundles([renderBundle]);
renderPass.end();
```

**Key insight:** Commands are static, but buffer contents can change! Update instance buffer via `writeBuffer()` before executing bundle.

### Anti-Patterns to Avoid

- **Hard-coded smoothing values:** Use fwidth/derivative-based antialiasing so text stays sharp at any zoom level. Don't use fixed `smoothstep(0.4, 0.6, dist)`.
- **Recreating textures on every frame:** Upload atlas texture once, reuse. Only re-upload on font change.
- **DOM text measurement in render loop:** Use pretext to avoid `getBoundingClientRect()` / layout thrashing.
- **Separate pipeline per glyph:** Use instanced rendering with one pipeline, not `draw()` per character.
- **RGBA format when RGB is sufficient:** MSDF only needs 3 channels, but WebGPU requires 4-channel alignment. Pad to RGBA8Unorm or RGBA32Float, don't fight the API.
- **Updating uniforms via new bind groups:** Use `writeBuffer()` on existing uniform buffer, don't recreate bind groups.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UI controls (sliders, color pickers, toggles) | Custom HTML/CSS UI panels | lil-gui | Handles layout, events, styling, accessibility, mobile support |
| Text layout (line breaking, glyph positioning) | Manual width accumulation and wrapping | pretext | Handles BiDi, complex scripts, soft hyphens, accurate canvas measurement |
| Matrix math (view projection, transforms) | Manual 4x4 matrix multiplication | gl-matrix or similar | Correct handling of homogeneous coordinates, optimized SIMD paths |
| MSDF atlas sampling | Custom distance field lookup | Standard median() + smoothstep() | Years of research on optimal MSDF rendering, handles corners correctly |
| Smooth animations (zoom/pan easing) | Custom interpolation loops | requestAnimationFrame + lerp | Browser-synced timing, no jank from setTimeout |

**Key insight:** WebGPU is low-level enough already. Use high-quality libraries for layout, UI, and math to focus on rendering architecture.

## Common Pitfalls

### Pitfall 1: Forgetting WebGPU Texture Alignment Requirements

**What goes wrong:** `writeTexture()` fails with cryptic "bytesPerRow must be multiple of 256" errors

**Why it happens:** WebGPU requires bytesPerRow to be a multiple of 256 for texture upload alignment, even if your image width doesn't naturally align

**How to avoid:**
```typescript
const bytesPerPixel = 4;  // RGBA8Unorm or RGBA32Float
const bytesPerRow = Math.ceil((atlasWidth * bytesPerPixel) / 256) * 256;

// Pad row data if necessary
const paddedData = new Uint8Array(bytesPerRow * atlasHeight);
for (let y = 0; y < atlasHeight; y++) {
  const srcOffset = y * atlasWidth * bytesPerPixel;
  const dstOffset = y * bytesPerRow;
  paddedData.set(atlasData.subarray(srcOffset, srcOffset + atlasWidth * bytesPerPixel), dstOffset);
}

device.queue.writeTexture(
  { texture },
  paddedData,
  { bytesPerRow, rowsPerImage: atlasHeight },
  { width: atlasWidth, height: atlasHeight }
);
```

**Warning signs:** Texture upload throws, texture appears corrupted, validation errors mentioning "256"

### Pitfall 2: MSDF Float32Array to GPU Texture Format Mismatch

**What goes wrong:** MSDF atlas is Float32Array (0.0-1.0) but uploaded as Uint8Array (0-255), or vice versa, causing visual artifacts

**Why it happens:** Phase 2 generates `Bitmap<Float32Array, 3>` but WebGPU textures can be RGBA8Unorm (expects 0-255 bytes) or RGBA32Float (expects 0.0-1.0 floats)

**How to avoid:**
```typescript
// Option A: Convert Float32 to Uint8 for RGBA8Unorm (smaller texture, standard filtering)
const floatData = atlas.atlas.data();  // Float32Array
const uint8Data = new Uint8Array(atlasWidth * atlasHeight * 4);
for (let i = 0; i < floatData.length / 3; i++) {
  uint8Data[i * 4 + 0] = Math.round(floatData[i * 3 + 0] * 255);  // R
  uint8Data[i * 4 + 1] = Math.round(floatData[i * 3 + 1] * 255);  // G
  uint8Data[i * 4 + 2] = Math.round(floatData[i * 3 + 2] * 255);  // B
  uint8Data[i * 4 + 3] = 255;  // A (unused but required)
}
const texture = device.createTexture({
  format: 'rgba8unorm',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  // ...
});

// Option B: Keep Float32 for RGBA32Float (exact precision, requires float32-filterable feature)
const floatData = atlas.atlas.data();
const rgbaData = new Float32Array(atlasWidth * atlasHeight * 4);
for (let i = 0; i < floatData.length / 3; i++) {
  rgbaData[i * 4 + 0] = floatData[i * 3 + 0];  // R
  rgbaData[i * 4 + 1] = floatData[i * 3 + 1];  // G
  rgbaData[i * 4 + 2] = floatData[i * 3 + 2];  // B
  rgbaData[i * 4 + 3] = 0.0;  // A (unused)
}
const texture = device.createTexture({
  format: 'rgba32float',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  // ...
});
```

**Recommendation:** Use RGBA8Unorm for smaller texture size and broader compatibility. MSDF doesn't need float precision after generation.

**Warning signs:** Text renders as solid blocks, distance field looks binary, shader samples return unexpected values

### Pitfall 3: Pretext Font String Mismatch with Canvas CSS

**What goes wrong:** Pretext measures text with one font, but rendering uses different font, causing misalignment

**Why it happens:** Pretext uses canvas context font string like `"24px Inter"`, which must exactly match the CSS styling and font loading state

**How to avoid:**
```typescript
// Wait for font to load before pretext measurement
await document.fonts.load('24px Inter');

// Use exact same font string for pretext and CSS
const fontSize = 24;
const fontFamily = 'Inter';
const fontString = `${fontSize}px ${fontFamily}`;

// Pretext layout
const prepared = prepareWithSegments(text, fontString);

// Ensure demo uses same font (optional, for visual consistency)
canvas.style.fontFamily = fontFamily;
```

**Warning signs:** Character spacing is wrong, line breaks in unexpected places, glyphs overlap or have gaps

### Pitfall 4: Forgetting to Clamp Pan Limits

**What goes wrong:** User pans text completely offscreen, no way to find it again

**Why it happens:** Implementing pan as unconstrained `pan += delta` without bounds checking

**How to avoid:**
```typescript
function updatePan(deltaX: number, deltaY: number) {
  viewport.panX += deltaX;
  viewport.panY += deltaY;

  // Clamp pan to keep at least 10% of text bounding box visible
  const textBounds = getTextBounds();  // In world coordinates
  const visibleBounds = getVisibleBounds(viewport);  // In world coordinates

  const minOverlap = 0.1;  // 10%
  const minPanX = visibleBounds.left - textBounds.right + textBounds.width * minOverlap;
  const maxPanX = visibleBounds.right - textBounds.left - textBounds.width * minOverlap;
  const minPanY = visibleBounds.top - textBounds.bottom + textBounds.height * minOverlap;
  const maxPanY = visibleBounds.bottom - textBounds.top - textBounds.height * minOverlap;

  viewport.panX = Math.max(minPanX, Math.min(maxPanX, viewport.panX));
  viewport.panY = Math.max(minPanY, Math.min(maxPanY, viewport.panY));
}
```

**Warning signs:** User reports "text disappeared", need to reload page to reset view

### Pitfall 5: Recreating Render Pipeline on Uniform Changes

**What goes wrong:** FPS drops to single digits when changing colors or visualization modes

**Why it happens:** Creating new pipelines or bind groups instead of updating uniform buffers

**How to avoid:**
```typescript
// BAD: Creates new bind group every frame
function setVisualizationMode(mode: number) {
  const uniformData = new Float32Array([color.r, color.g, color.b, color.a, mode]);
  const uniformBuffer = device.createBuffer(/* ... */);  // ❌ Allocates new buffer
  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  const bindGroup = device.createBindGroup(/* ... */);  // ❌ Creates new bind group
  renderPass.setBindGroup(0, bindGroup);
}

// GOOD: Updates existing uniform buffer
function setVisualizationMode(mode: number) {
  const uniformData = new Float32Array([color.r, color.g, color.b, color.a, mode]);
  device.queue.writeBuffer(uniformBuffer, 0, uniformData);  // ✅ Updates existing buffer
  // Bind group stays the same, pipeline stays the same
}
```

**Warning signs:** Performance drops when changing settings, memory usage grows over time

### Pitfall 6: Not Handling WebGPU Unavailability

**What goes wrong:** Demo shows blank page or crashes on browsers without WebGPU support

**Why it happens:** Assuming `navigator.gpu` exists without checking

**How to avoid:**
```typescript
async function initWebGPU(): Promise<GPUDevice | null> {
  if (!navigator.gpu) {
    showError('WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Safari 18+.');
    return null;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    showError('Failed to get WebGPU adapter. Your GPU may not support WebGPU.');
    return null;
  }

  try {
    const device = await adapter.requestDevice();
    return device;
  } catch (err) {
    showError(`Failed to create WebGPU device: ${err.message}`);
    return null;
  }
}
```

**Warning signs:** Uncaught TypeError: Cannot read property 'requestAdapter' of undefined

## Code Examples

Verified patterns from official sources:

### lil-gui Setup with Folders and Color Pickers

```typescript
// Source: lil-gui GitHub, official examples
import GUI from 'lil-gui';

const settings = {
  textColor: '#ffffff',
  backgroundColor: '#1a1a1a',
  visualizationMode: 'rendered',
  splitScreen: false,
  fontSize: 24,
};

const gui = new GUI();

// Text settings folder
const textFolder = gui.addFolder('Text');
textFolder.addColor(settings, 'textColor').name('Text Color').onChange(updateTextColor);
textFolder.add(settings, 'fontSize', 12, 72, 1).name('Font Size').onChange(relayoutText);
textFolder.open();

// Visualization folder
const visFolder = gui.addFolder('Visualization');
visFolder.add(settings, 'visualizationMode', ['rendered', 'raw', 'heatmap'])
  .name('Mode')
  .onChange(updateVisualizationMode);
visFolder.add(settings, 'splitScreen').name('Split Screen').onChange(toggleSplitScreen);
visFolder.addColor(settings, 'backgroundColor').name('Background').onChange(updateBackground);
visFolder.open();

// Metrics folder (read-only display)
const metrics = {
  fps: 0,
  atlasGenTime: 0,
  glyphCount: 0,
};
const metricsFolder = gui.addFolder('Metrics');
metricsFolder.add(metrics, 'fps').name('FPS').disable().listen();
metricsFolder.add(metrics, 'atlasGenTime').name('Atlas Gen (ms)').disable().listen();
metricsFolder.add(metrics, 'glyphCount').name('Glyph Count').disable().listen();
metricsFolder.open();
```

### WebGPU Device Initialization with Feature Detection

```typescript
// Source: WebGPU Fundamentals, MDN Web Docs
async function initWebGPU(canvas: HTMLCanvasElement): Promise<{
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
} | null> {
  if (!navigator.gpu) {
    console.error('WebGPU not supported');
    return null;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error('No WebGPU adapter found');
    return null;
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) {
    console.error('Failed to get WebGPU context');
    return null;
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  return { device, context, format };
}
```

### MSDF Texture Upload from Phase 2 Atlas

```typescript
// Source: WebGPU Textures tutorial, Phase 2 AtlasResult types
import type { AtlasResult } from '../src/atlas';

function uploadMSDFTexture(device: GPUDevice, atlas: AtlasResult): GPUTexture {
  const { atlasWidth, atlasHeight } = atlas;
  const floatData = atlas.atlas.data();  // Float32Array, 3 channels (RGB)

  // Convert RGB Float32 to RGBA Uint8
  const uint8Data = new Uint8Array(atlasWidth * atlasHeight * 4);
  for (let i = 0; i < atlasWidth * atlasHeight; i++) {
    uint8Data[i * 4 + 0] = Math.round(floatData[i * 3 + 0] * 255);  // R
    uint8Data[i * 4 + 1] = Math.round(floatData[i * 3 + 1] * 255);  // G
    uint8Data[i * 4 + 2] = Math.round(floatData[i * 3 + 2] * 255);  // B
    uint8Data[i * 4 + 3] = 255;  // A
  }

  const texture = device.createTexture({
    size: { width: atlasWidth, height: atlasHeight },
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  // Calculate aligned bytesPerRow
  const bytesPerRow = Math.ceil((atlasWidth * 4) / 256) * 256;
  const paddedData = new Uint8Array(bytesPerRow * atlasHeight);
  for (let y = 0; y < atlasHeight; y++) {
    const srcOffset = y * atlasWidth * 4;
    const dstOffset = y * bytesPerRow;
    paddedData.set(uint8Data.subarray(srcOffset, srcOffset + atlasWidth * 4), dstOffset);
  }

  device.queue.writeTexture(
    { texture },
    paddedData,
    { bytesPerRow, rowsPerImage: atlasHeight },
    { width: atlasWidth, height: atlasHeight }
  );

  return texture;
}
```

### FPS Counter with Rolling Average

```typescript
// Source: Common game loop patterns
class FPSCounter {
  private frameTimes: number[] = [];
  private lastFrameTime = performance.now();

  update(): number {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avgDelta);
  }
}

const fpsCounter = new FPSCounter();

function renderLoop() {
  // ... render frame ...

  metrics.fps = fpsCounter.update();

  requestAnimationFrame(renderLoop);
}
```

### Smooth Zoom/Pan Animation with Lerp

```typescript
// Source: Animation easing patterns
interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

let currentViewport: ViewportState = { zoom: 1, panX: 0, panY: 0 };
let targetViewport: ViewportState = { zoom: 1, panX: 0, panY: 0 };
let animationStartTime = 0;
const animationDuration = 250;  // ms

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function updateViewportAnimation(timestamp: number) {
  if (animationStartTime === 0) {
    currentViewport = { ...targetViewport };
    return;
  }

  const elapsed = timestamp - animationStartTime;
  const t = Math.min(elapsed / animationDuration, 1.0);
  const easedT = easeOutCubic(t);

  currentViewport.zoom = lerp(currentViewport.zoom, targetViewport.zoom, easedT);
  currentViewport.panX = lerp(currentViewport.panX, targetViewport.panX, easedT);
  currentViewport.panY = lerp(currentViewport.panY, targetViewport.panY, easedT);

  if (t >= 1.0) {
    animationStartTime = 0;  // Animation complete
  }
}

function setTargetViewport(zoom: number, panX: number, panY: number) {
  targetViewport = { zoom, panX, panY };
  animationStartTime = performance.now();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebGL + Canvas 2D text | WebGPU + MSDF | 2023-2024 | 15x rendering performance, hardware-accelerated compositing |
| dat.gui | lil-gui | 2021 | Lighter (13KB vs 80KB), modern ES6, better mobile support |
| Manual text measurement | pretext library | 2023 | No layout reflow, accurate measurement, complex script support |
| GLSL shaders | WGSL shaders | 2022-2024 | Type-safe, human-readable, standardized for WebGPU |
| `fwidth()` | `length(vec2(dpdx, dpdy))` | Ongoing | More accurate derivative-based antialiasing |

**Deprecated/outdated:**
- **dat.gui:** Still works but unmaintained; lil-gui is drop-in replacement
- **WebGL fallback:** Out of scope per project goals (WebGPU-only)
- **GLSL to WGSL converters:** WGSL syntax is different enough that hand-writing is clearer

## Open Questions

### 1. Custom Font File Upload Mechanism

**What we know:** lil-gui has limited file input support (experimental InputController), may need custom HTML input element

**What's unclear:** Best integration pattern — overlay input element, or extend lil-gui with custom controller?

**Recommendation:** Use custom HTML input element overlaid on canvas, styled to match lil-gui theme. Simpler than extending lil-gui, avoids library forking.

### 2. Split-Screen Divider Draggability

**What we know:** User marked as "Claude's discretion", requires mouse drag handling and dynamic scissor rect adjustment

**What's unclear:** Worth the complexity for v1? Draggable adds state management and edge cases.

**Recommendation:** Start with fixed 50/50 split (simpler). Add draggable divider in v2 if users request it.

### 3. Touch Input Support for Mobile

**What we know:** User marked as "Claude's discretion", requires touch event handling (pinch-to-zoom, two-finger pan)

**What's unclear:** Mobile browser WebGPU support is still limited (Safari 18+ only)

**Recommendation:** Skip touch input for v1. Focus on desktop Chrome/Edge. Add touch in v2 when mobile WebGPU is more widespread.

### 4. Pretext Version Stability

**What we know:** pretext is chenglou's personal project, no npm package found yet, may need direct GitHub import

**What's unclear:** Is there a published npm package, or should we vendor the source?

**Recommendation:** Check npm registry for `@chenglou/pretext`. If not found, import from GitHub as git submodule or copy source files with attribution. Verify license (MIT expected).

## Sources

### Primary (HIGH confidence)
- [WebGPU Samples - textRenderingMsdf](https://webgpu.github.io/webgpu-samples/?sample=textRenderingMsdf) - MSDF rendering architecture
- [lil-gui GitHub Repository](https://github.com/georgealways/lil-gui) - API, usage patterns, examples
- [lil-gui Official Docs](https://lil-gui.georgealways.com/) - API reference, customization
- [pretext GitHub Repository](https://github.com/chenglou/pretext) - API, layout workflow, performance model
- [WebGPU Fundamentals - Textures](https://webgpufundamentals.org/webgpu/lessons/webgpu-textures.html) - Texture upload, bytesPerRow alignment
- [WebGPU Fundamentals - Vertex Buffers](https://webgpufundamentals.org/webgpu/lessons/webgpu-vertex-buffers.html) - Instance buffer layout
- [WebGPU Best Practices - Render Bundles](https://toji.dev/webgpu-best-practices/render-bundles.html) - Performance optimization
- [MDN - GPUDevice.createTexture()](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture) - Texture creation API
- [MDN - GPUQueue.writeTexture()](https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeTexture) - Texture upload API
- [WGSL Function Reference](https://webgpufundamentals.org/webgpu/lessons/webgpu-wgsl-function-reference.html) - smoothstep, dpdx, dpdy

### Secondary (MEDIUM confidence)
- [Red Blob Games - SDF Fonts Guide](https://www.redblobgames.com/articles/sdf-fonts/) - MSDF theory, median sampling
- [Red Blob Games - SDF Fonts Appendix](https://www.redblobgames.com/articles/sdf-fonts/appendix.html) - Antialiasing techniques
- [Medium - Implementing MSDF Font in OpenGL](https://medium.com/@calebfaith/implementing-msdf-font-in-opengl-ea09a9ab7e00) - Shader implementation
- [Medium - Zooming at Mouse Coordinates with Affine Transformations](https://medium.com/@benjamin.botto/zooming-at-the-mouse-coordinates-with-affine-transformations-86e7312fd50b) - Cursor-centered zoom math
- [WebGL Fundamentals - Mouse Zoom in 2D](https://webglfundamentals.org/webgl/lessons/webgl-qna-how-to-implement-zoom-from-mouse-in-2d-webgl.html) - Coordinate transformation
- [Codrops - WebGPU Gommage Effect (MSDF Text)](https://tympanus.net/codrops/2026/01/28/webgpu-gommage-effect-dissolving-msdf-text-into-dust-and-petals-with-three-js-tsl/) - Modern WebGPU MSDF examples
- [Learn WebGPU - Instancing](https://sotrh.github.io/learn-wgpu/beginner/tutorial7-instancing/) - Instanced rendering patterns
- [Bevy - Split Screen Example](https://bevy.org/examples-webgpu/3d-rendering/split-screen/) - Split viewport techniques
- [GitHub - gpuweb/gpuweb Issue #4806](https://github.com/gpuweb/gpuweb/issues/4806) - Multiple viewport limitations
- [WebGPU 2026 Report](https://byteiota.com/webgpu-2026-70-browser-support-15x-performance-gains/) - Browser support status

### Tertiary (LOW confidence - needs validation)
- WebSearch results on heatmap visualization (no specific WebGPU MSDF heatmap examples found)
- lil-gui file upload controller (feature exists but undocumented)
- Pretext npm availability (GitHub confirmed, npm package unclear)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - lil-gui and WebGPU API are well-documented, pretext is documented but less established
- Architecture (MSDF rendering): HIGH - Multiple sources confirm median + smoothstep + fwidth pattern
- Architecture (zoom/pan): MEDIUM-HIGH - Math is standard but WebGPU-specific examples are sparse
- Architecture (pretext integration): MEDIUM - API is clear but no WebGPU integration examples found
- Pitfalls: MEDIUM - Based on WebGPU documentation and common graphics programming issues
- Code examples: MEDIUM-HIGH - Adapted from official docs and verified patterns, but not tested

**Research date:** 2026-05-11
**Valid until:** ~30 days (WebGPU and lil-gui are stable; pretext is less established but API unlikely to change drastically)
