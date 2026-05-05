# Domain Pitfalls

**Domain:** MSDF Font Rendering with WebGPU
**Project:** msdfgen-ts
**Researched:** 2026-05-04
**Confidence:** MEDIUM (based on training data, web verification unavailable)

## Critical Pitfalls

Mistakes that cause rewrites, visual corruption, or major functionality failures.

---

### Pitfall 1: Incorrect Screen-Space Derivative Calculation in MSDF Shader

**What goes wrong:** Text appears blurry, has incorrect anti-aliasing, or shows "stepping" artifacts at certain zoom levels. The shader produces inconsistent edge sharpness as text scales.

**Why it happens:** MSDF rendering requires calculating the appropriate threshold width based on screen-space derivatives (`dFdx`/`dFdy` in GLSL, `dpdx`/`dpdy` in WGSL). Developers often:
1. Use a fixed threshold instead of computing from derivatives
2. Calculate derivatives incorrectly (e.g., on interpolated values rather than distance)
3. Forget to account for anisotropic scaling
4. Apply derivatives before median calculation instead of after

**Consequences:**
- Blurry text at all zoom levels
- Text that looks sharp at one size but wrong at others
- Visible stepping/aliasing on diagonal edges
- Different quality on different GPUs (derivatives are approximations)

**Prevention:**
```wgsl
// CORRECT: Calculate screen-space gradient AFTER median
let median = median3(msdf.r, msdf.g, msdf.b);
let screenPxDistance = (median - 0.5) * distanceRange;
let screenPxRange = length(vec2(dpdx(screenPxDistance), dpdy(screenPxDistance)));
let opacity = clamp(screenPxDistance / screenPxRange + 0.5, 0.0, 1.0);
```

**Detection (Warning Signs):**
- Text looks different when zoomed vs. at 1:1
- Diagonal strokes have visible stair-stepping
- Anti-aliasing varies across the screen
- Different results on different GPUs

**Phase:** WebGPU Rendering Implementation

---

### Pitfall 2: Glyph Contour Winding Order Confusion

**What goes wrong:** Glyphs render inverted (fill where should be empty, empty where should be filled), or compound glyphs like "8", "B", "O" appear as solid blobs.

**Why it happens:** TrueType and OpenType fonts can use either:
- TrueType: clockwise outer contours, counter-clockwise inner (holes)
- PostScript/CFF: counter-clockwise outer, clockwise inner

Developers assume one convention without checking the font's actual winding order, or forget that font parsers may or may not normalize this.

**Consequences:**
- Inverted glyphs (white on black instead of black on white)
- Letters with counters (a, b, d, e, g, o, p, q, 0, 4, 6, 8, 9, etc.) appear filled
- Inconsistent results between different fonts

**Prevention:**
1. Always compute signed area to determine winding direction
2. Normalize all contours to a consistent convention before MSDF generation
3. Test with fonts from different sources (system fonts, Google Fonts, custom fonts)
4. Test specifically with: "8", "B", "@", "%" (complex counter shapes)

```typescript
function getContourWinding(contour: Contour): 'clockwise' | 'counter-clockwise' {
  const signedArea = computeSignedArea(contour);
  return signedArea > 0 ? 'clockwise' : 'counter-clockwise';
}

function normalizeContours(glyph: Glyph, outerWinding: 'clockwise' | 'counter-clockwise'): Glyph {
  // Ensure all outer contours match expected winding
  // Ensure all inner contours (holes) have opposite winding
}
```

**Detection (Warning Signs):**
- Some glyphs render correctly, others are inverted
- Glyphs with holes appear solid
- Works with one font, fails with another

**Phase:** Font Parsing / Glyph-to-Shape Conversion

---

### Pitfall 3: Edge Coloring Failures at Sharp Corners

**What goes wrong:** Sharp corners (like in "M", "W", "V", "N") show "bleeding" artifacts where colors mix incorrectly, creating visible color fringes or notches.

**Why it happens:** The MSDF edge coloring algorithm must assign different color channels to edges meeting at sharp corners. Common failures:
1. Angle threshold too small (corners not detected)
2. Angle threshold too large (smooth curves incorrectly segmented)
3. Color assignment creates impossible-to-resolve configurations
4. Degenerate segments (zero length) confuse the algorithm

**Consequences:**
- Visible red/green/blue color fringing at corners
- "Notches" cut into sharp corners
- Artifacts appear at specific angles (45-degree corners most vulnerable)

**Prevention:**
1. Use proven angle threshold (~3.0 radians, approximately 171 degrees)
2. Implement robust edge coloring (Chlumsky's algorithm, not simplistic alternation)
3. Handle degenerate segments (zero length, coincident points) before coloring
4. Test with: "M", "W", "V", "A", "7", "#" (sharp corners)
5. Test at multiple zoom levels and rotations

**Detection (Warning Signs):**
- Colored artifacts at letter corners
- Sharp corners appear "bitten" or have notches
- Artifacts that change with zoom or rotation

**Phase:** MSDF Generation (existing code — verify during integration)

---

### Pitfall 4: WebGPU Texture Format and sRGB Handling

**What goes wrong:** Text appears too dark, too light, has incorrect contrast, or colors look "washed out" or "crushed".

**Why it happens:** WebGPU texture formats must match shader expectations:
1. Creating texture with sRGB format but sampling as linear (double-gamma)
2. Creating texture with linear format but treating as sRGB in shader
3. Incorrect render target format causing gamma issues
4. Alpha blending with premultiplied alpha when data is straight (or vice versa)

**Consequences:**
- Text too dark or too light
- Poor anti-aliasing quality (incorrect gradients)
- Color fringing even with correct MSDF data
- Platform-dependent rendering differences

**Prevention:**
```typescript
// MSDF atlas: Use linear format, shader handles color interpretation
const texture = device.createTexture({
  format: 'rgba8unorm',  // NOT 'rgba8unorm-srgb'
  // ...
});

// Render target: Match canvas configuration
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device,
  format: canvasFormat,
  alphaMode: 'premultiplied',  // Be explicit
});
```

**Detection (Warning Signs):**
- Text colors don't match expected values
- Anti-aliased edges look too sharp or too soft
- Different appearance on different browsers/platforms
- Colors appear correct in one area, wrong in another

**Phase:** WebGPU Rendering Implementation

---

### Pitfall 5: Texture Atlas Glyph Bleeding

**What goes wrong:** Characters show fragments of adjacent glyphs, especially at small sizes or when zoomed out. Edges of glyphs have "ghost" lines from neighbors.

**Why it happens:**
1. Insufficient padding between glyphs in atlas
2. Texture filtering samples beyond glyph boundaries
3. Mipmap generation bleeds colors between glyphs
4. UV coordinates calculated without padding consideration

**Consequences:**
- Visible lines/artifacts at glyph edges
- Worse at small text sizes (more minification)
- Color pollution from adjacent glyphs
- Inconsistent artifacts depending on which glyphs are adjacent

**Prevention:**
1. Add sufficient padding (minimum 2-4 pixels, ideally equal to MSDF distance range)
2. Use `clamp` sampling mode (not `repeat`)
3. Either disable mipmaps OR use conservative atlas packing with mip-safe borders
4. Calculate UVs to sample from glyph center, not edges:

```typescript
// Pad UVs inward by half-texel to avoid bleeding
const halfTexel = 0.5 / atlasSize;
const uv = {
  left: (glyph.x + padding) / atlasSize + halfTexel,
  right: (glyph.x + glyph.width - padding) / atlasSize - halfTexel,
  // ...
};
```

**Detection (Warning Signs):**
- Thin lines at edges of some glyphs
- Artifacts worse at smaller text sizes
- Problems disappear when glyphs are isolated in atlas
- Color fringing that doesn't match MSDF channel expectations

**Phase:** Atlas Generation, WebGPU Rendering

---

### Pitfall 6: Font Metric Misinterpretation (Units Per Em)

**What goes wrong:** Text appears at wrong size, line spacing is incorrect, glyphs are clipped or have excessive whitespace.

**Why it happens:** Font files express metrics in "font units" (typically 1000 or 2048 units per em). Developers:
1. Use raw font units without scaling
2. Apply wrong scale factor (assuming 1000 when font uses 2048, or vice versa)
3. Confuse ascender/descender with bounding box
4. Ignore or mishandle negative descender values

**Consequences:**
- Inconsistent sizing between fonts
- Clipped ascenders (accents cut off) or descenders (g, j, p, q, y)
- Incorrect line spacing
- Baseline misalignment in mixed-font text

**Prevention:**
```typescript
interface FontMetrics {
  unitsPerEm: number;  // REQUIRED: varies per font
  ascender: number;    // Distance above baseline (positive)
  descender: number;   // Distance below baseline (negative!)
  lineGap: number;     // Additional line spacing
}

function glyphToPixels(fontUnits: number, fontSize: number, unitsPerEm: number): number {
  return fontUnits * (fontSize / unitsPerEm);
}

// Line height calculation
const lineHeight = (metrics.ascender - metrics.descender + metrics.lineGap)
                   * (fontSize / metrics.unitsPerEm);
```

**Detection (Warning Signs):**
- Same font-size produces different visual sizes for different fonts
- Accented characters clipped (e, E, A, O with accents)
- Descenders (g, j, p, q, y) clipped
- Line spacing looks wrong

**Phase:** Font Parsing, Glyph Extraction

---

## Moderate Pitfalls

Issues that cause bugs or suboptimal results but don't require complete rewrites.

---

### Pitfall 7: Composite Glyph Handling Failures

**What goes wrong:** Accented characters (e, a, u, c, etc.) render as only the base character without the accent, or the accent appears in the wrong position.

**Why it happens:** Many glyphs (especially accented characters) are defined as composites referencing other glyphs with transform matrices. Font parsers may:
1. Return only the base component
2. Fail to apply the transform matrix
3. Apply transforms in wrong order
4. Not recursively resolve nested composites

**Prevention:**
1. Test with non-ASCII characters: "cafe" (e-acute), "naive" (i-umlaut), "resume" (e-acute)
2. Verify composite resolution in font parser output
3. Handle nested composites (component of component)
4. Apply 2x2 transformation matrices AND translation offsets

**Detection (Warning Signs):**
- Accented characters missing diacritics
- Diacritics appear but in wrong position
- Works for basic ASCII, fails for extended Latin

**Phase:** Font Parsing, Glyph-to-Shape Conversion

---

### Pitfall 8: Incorrect Distance Range Calculation

**What goes wrong:** Text appears either too "bold" (thick strokes) or too "thin", anti-aliasing either too aggressive or non-existent.

**Why it happens:** The "distance range" (how far the SDF extends from edges) must be:
1. Known at MSDF generation time
2. Encoded consistently in atlas
3. Passed correctly to shader
4. Matched to texture resolution

Developers often use arbitrary values or fail to propagate the value through the pipeline.

**Consequences:**
- Strokes consistently too thick or thin
- Anti-aliasing quality degraded
- Sharp edges when should be smooth (or vice versa)

**Prevention:**
1. Calculate range based on SDF resolution and expected render size
2. Store range in atlas metadata (not hardcoded in shader)
3. Typical values: 2-4 pixels for screen-resolution rendering
4. Formula: `range = sdfSize / expectedRenderSize * desiredPixelRange`

**Detection (Warning Signs):**
- All text too bold or too thin (consistently)
- Anti-aliasing either missing or excessive
- Different fonts require different shader tweaks (they shouldn't)

**Phase:** MSDF Generation, WebGPU Rendering (shader uniforms)

---

### Pitfall 9: WebGPU Buffer Alignment Violations

**What goes wrong:** Shader produces garbage output, validation errors, or GPU device loss.

**Why it happens:** WebGPU has strict alignment requirements:
- Uniform buffers: 16-byte aligned members
- Storage buffers: 4-byte alignment minimum
- Array stride must match WGSL struct layout

WGSL struct padding differs from TypeScript struct assumptions.

**Consequences:**
- GPU validation errors (if validation enabled)
- Garbage rendering (wrong uniform values read)
- Intermittent failures (memory layout-dependent)
- Device loss on some platforms

**Prevention:**
```wgsl
// WGSL struct with explicit alignment
struct GlyphInstance {
  @align(16) position: vec2f,  // Even vec2 may need alignment
  @align(16) size: vec2f,
  @align(16) uvRect: vec4f,
  // ... etc
}
```

```typescript
// Match JavaScript buffer layout to WGSL
const INSTANCE_SIZE = 48; // Not 32! Padding matters
const buffer = new Float32Array(glyphCount * INSTANCE_SIZE / 4);
```

**Detection (Warning Signs):**
- Shader works on one GPU, fails on another
- Validation errors mention alignment
- Glyphs appear at wrong positions or sizes
- Intermittent garbage rendering

**Phase:** WebGPU Rendering Implementation

---

### Pitfall 10: WOFF2 Brotli Decompression Overhead

**What goes wrong:** Font loading takes hundreds of milliseconds, blocking the main thread and causing UI jank.

**Why it happens:** WOFF2 uses Brotli compression. JavaScript Brotli decompression is:
1. CPU-intensive (even with WASM)
2. Synchronous in most implementations
3. Much slower than native browser font loading

**Consequences:**
- Noticeable delay before text appears
- UI freezes during font processing
- Poor perceived performance
- Battery drain on mobile

**Prevention:**
1. Use Web Workers for font parsing
2. Prefer TTF/OTF when possible (no Brotli)
3. Cache decompressed fonts in IndexedDB
4. Show loading indicator during font processing
5. Consider streaming decompression if available

```typescript
// Worker-based font loading
const fontWorker = new Worker('font-parser-worker.js');
fontWorker.postMessage({ type: 'load', url: fontUrl });
fontWorker.onmessage = (e) => {
  const { glyphs, metrics } = e.data;
  // Continue with MSDF generation (also consider worker)
};
```

**Detection (Warning Signs):**
- Fonts load slowly (measure time from request to first render)
- Main thread blocked during font load (check performance trace)
- Mobile performance notably worse than desktop

**Phase:** Font Parsing

---

### Pitfall 11: Missing CFF (OpenType PostScript) Support

**What goes wrong:** Modern OpenType fonts (especially many Google Fonts) fail to parse or render incorrectly.

**Why it happens:** OpenType fonts contain either:
- TrueType outlines (glyf table): quadratic Bezier curves
- CFF outlines (CFF table): cubic Bezier curves, stack-based

Many MSDF implementations only handle TrueType, failing silently or crashing on CFF fonts.

**Consequences:**
- Popular fonts fail (many Google Fonts use CFF)
- Inconsistent support confuses users
- Silent failures hard to debug

**Prevention:**
1. Detect outline type from font header (check for CFF vs glyf table)
2. Implement or use library supporting both formats
3. Document supported formats clearly
4. Test with: Roboto (TrueType), Source Sans Pro (CFF), and variable fonts

**Detection (Warning Signs):**
- Some fonts work, others don't
- Fonts with thin strokes or complex curves fail
- Google Fonts have inconsistent support

**Phase:** Font Parsing, Glyph-to-Shape Conversion

---

## Minor Pitfalls

Issues that cause friction or minor bugs but are easily fixed.

---

### Pitfall 12: Kerning Table Ignorance

**What goes wrong:** Text looks "off" with irregular spacing, especially in pairs like "VA", "AV", "To", "Ty".

**Why it happens:** Fonts include kerning data (GPOS table or kern table) that adjusts spacing between specific character pairs. Ignoring this produces technically correct but visually wrong spacing.

**Prevention:**
1. Extract kerning pairs from font (GPOS or legacy kern table)
2. Apply kerning during text layout
3. For MVP: document that kerning is not implemented (acceptable initial limitation)

**Detection (Warning Signs):**
- "WAVE", "TYPE", "AVATAR" look poorly spaced
- Comparison with browser-rendered text shows differences

**Phase:** Text Layout (can be deferred post-MVP)

---

### Pitfall 13: Zero-Width and Control Character Handling

**What goes wrong:** Crashes or garbage output when rendering text with special characters (zero-width joiners, control characters, etc.).

**Why it happens:** Not all Unicode codepoints have visual glyphs. Zero-width characters, control characters, and missing glyphs need special handling.

**Prevention:**
1. Check if codepoint has glyph (glyphId !== 0)
2. Skip zero-width characters in rendering
3. Provide fallback for missing glyphs (.notdef glyph)
4. Filter control characters (U+0000-U+001F, U+007F-U+009F)

**Detection (Warning Signs):**
- Crashes on copy-pasted text
- Invisible characters cause layout issues
- Emoji or special characters crash system

**Phase:** Text Processing, Pre-render Filtering

---

### Pitfall 14: Subpixel Positioning Artifacts

**What goes wrong:** Text shimmer or "jitter" when animating, or characters appear to have different weights.

**Why it happens:** Subpixel glyph positioning combined with bilinear filtering can cause visible shimmering. Each character samples slightly different texels as position changes.

**Prevention:**
1. For static text: snap to pixel boundaries
2. For animated text: use higher atlas resolution
3. Increase MSDF distance range for smoother subpixel transitions
4. Consider disabling mipmaps for text (reduces shimmer)

**Detection (Warning Signs):**
- Text "vibrates" during animation
- Characters seem to change weight as they move
- Aliasing during pan/scroll

**Phase:** WebGPU Rendering, Text Layout

---

## WebGPU-Specific Pitfalls

---

### Pitfall 15: Bind Group Layout Mismatch

**What goes wrong:** Pipeline creation fails or shader produces incorrect results.

**Why it happens:** WebGPU requires explicit bind group layouts matching between:
1. Pipeline layout declaration
2. Shader resource bindings
3. Actual bind group creation

Any mismatch causes failures or undefined behavior.

**Prevention:**
1. Define layouts once, reuse everywhere
2. Use auto layout during prototyping, explicit for production
3. Validate binding indices match between WGSL and JS

```typescript
// Define once
const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
  ],
});

// Use in pipeline
const pipelineLayout = device.createPipelineLayout({
  bindGroupLayouts: [bindGroupLayout],
});

// Match in bind group creation
const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,  // Same layout!
  entries: [/* matching entries */],
});
```

**Detection (Warning Signs):**
- Pipeline creation fails with validation error
- Shader compiles but produces wrong output
- Works with auto layout, fails with explicit

**Phase:** WebGPU Rendering Implementation

---

### Pitfall 16: Instancing Stride Miscalculation

**What goes wrong:** Glyphs render at wrong positions, sizes, or with corrupted UV coordinates.

**Why it happens:** When instancing glyphs, the vertex buffer stride must exactly match the per-instance data layout. WGSL struct padding differs from naive byte counts.

**Prevention:**
1. Calculate stride from WGSL perspective (respecting alignments)
2. Use explicit `@location` and `@offset` annotations
3. Log and verify buffer contents during development

```wgsl
struct InstanceInput {
  @location(2) position: vec2f,   // 8 bytes, but may be padded
  @location(3) size: vec2f,       // 8 bytes
  @location(4) uvMin: vec2f,      // 8 bytes
  @location(5) uvMax: vec2f,      // 8 bytes
  @location(6) color: vec4f,      // 16 bytes
}
// Total: May be 48 bytes due to alignment, not 44
```

**Detection (Warning Signs):**
- First glyph correct, subsequent glyphs wrong
- Pattern of every Nth glyph being correct
- Glyphs offset by consistent amount

**Phase:** WebGPU Rendering Implementation

---

## Phase-Specific Warnings Summary

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| Font Parsing | Winding order confusion (#2) | Critical | Normalize all contours, test compound glyphs |
| Font Parsing | CFF support missing (#11) | Moderate | Support both TrueType and CFF, or document limitation |
| Font Parsing | Metric misinterpretation (#6) | Critical | Always use unitsPerEm scaling |
| Font Parsing | Composite glyph failures (#7) | Moderate | Recursive resolution with transforms |
| Font Parsing | WOFF2 performance (#10) | Moderate | Web Worker, caching |
| Glyph-to-Shape | Winding normalization (#2) | Critical | Signed area calculation |
| MSDF Generation | Edge coloring at corners (#3) | Critical | Test sharp-cornered characters |
| MSDF Generation | Distance range (#8) | Moderate | Calculate and propagate consistently |
| Atlas Generation | Glyph bleeding (#5) | Critical | Sufficient padding, half-texel UV adjustment |
| WebGPU Rendering | Screen derivatives (#1) | Critical | Correct WGSL implementation |
| WebGPU Rendering | Texture format/sRGB (#4) | Critical | Match formats throughout pipeline |
| WebGPU Rendering | Buffer alignment (#9) | Moderate | Explicit WGSL alignment annotations |
| WebGPU Rendering | Bind group layout (#15) | Moderate | Define layouts once, reuse |
| WebGPU Rendering | Instancing stride (#16) | Moderate | Calculate from WGSL perspective |
| Text Layout | Kerning (#12) | Minor | Document limitation or implement |
| Text Layout | Subpixel positioning (#14) | Minor | Pixel snapping for static text |

## Testing Checklist

Characters to test that expose most pitfalls:
- **Compound counters:** "8", "B", "%", "@", "&"
- **Sharp corners:** "M", "W", "V", "A", "N", "7", "#"
- **Accented:** "cafe", "naive", "resume", "Zuerich"
- **Descenders:** "gyp", "typography"
- **Different fonts:** System font, Google Font (TrueType), Google Font (CFF)
- **Zoom levels:** 8px, 16px, 32px, 64px, 128px
- **Animation:** Panning text, scaling text

## Sources

- Training data from MSDF implementations (msdfgen, msdf-bmfont-xml, three-msdf-text)
- Training data from WebGPU specification and tutorials
- Training data from OpenType/TrueType font specifications

**Note:** Web-based verification was unavailable during this research session. Pitfalls documented are based on domain knowledge from training data. Recommend verification against current documentation during implementation.
