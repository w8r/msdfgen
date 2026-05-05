# Architecture Patterns

**Domain:** Font Rendering with MSDF + WebGPU
**Researched:** 2026-05-04

## Recommended Architecture

The integration of font parsing, MSDF atlas generation, and WebGPU rendering follows a clear pipeline with five major components connected by well-defined data transformations.

```
Font File (TTF/OTF/WOFF2)
         |
         v
+-------------------+
|   Font Parser     |  Component 1: Extract glyph outlines
+-------------------+
         |
    GlyphOutline[]
         |
         v
+-------------------+
|  Shape Converter  |  Component 2: Convert to Shape format
+-------------------+
         |
    Shape (per glyph)
         |
         v
+-------------------+
|  MSDF Generator   |  Component 3: Generate distance fields (EXISTING)
+-------------------+
         |
    Bitmap<Float32Array>
         |
         v
+-------------------+
|   Atlas Packer    |  Component 4: Pack into texture atlas
+-------------------+
         |
    Atlas + GlyphMetrics
         |
         v
+-------------------+
| WebGPU Renderer   |  Component 5: Render with MSDF shader
+-------------------+
         |
         v
    Screen Pixels
```

### Component Boundaries

| Component | Responsibility | Input | Output | Communicates With |
|-----------|---------------|-------|--------|-------------------|
| **FontParser** | Parse font binary, extract glyph paths | ArrayBuffer (font file) | Font object with glyph outlines | Shape Converter |
| **ShapeConverter** | Transform font paths to Shape contours | GlyphOutline (path commands) | Shape with LinearSegment/QuadraticSegment/CubicSegment | MSDF Generator |
| **MSDFGenerator** | Generate multi-channel distance fields | Shape + SDFTransformation | Bitmap<Float32Array, 3 or 4> | Atlas Packer |
| **AtlasPacker** | Bin-pack glyph bitmaps into single texture | Bitmap[] + GlyphMetrics[] | Atlas texture + UV mapping | WebGPU Renderer |
| **WebGPURender** | GPU-accelerated text rendering | Atlas + text string + layout | Rendered pixels on screen | None (terminal) |

### Data Flow

**Stage 1: Font Parsing**
```typescript
// Input: Font file as ArrayBuffer
const fontData: ArrayBuffer = await fetch('font.ttf').then(r => r.arrayBuffer());

// Output: Parsed font with glyph access
interface ParsedFont {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  getGlyph(charCode: number): GlyphOutline | null;
  getGlyphByName(name: string): GlyphOutline | null;
}

interface GlyphOutline {
  advanceWidth: number;
  leftSideBearing: number;
  path: PathCommand[];  // moveTo, lineTo, quadraticCurveTo, bezierCurveTo, closePath
}
```

**Stage 2: Shape Conversion**
```typescript
// Input: GlyphOutline from font parser
const glyphOutline = font.getGlyph(charCode);

// Output: Shape compatible with existing MSDF generator
function glyphToShape(outline: GlyphOutline): Shape {
  const shape = new Shape();
  let currentContour: Contour | null = null;
  let currentPoint: Vector2 | null = null;

  for (const cmd of outline.path) {
    switch (cmd.type) {
      case 'moveTo':
        currentContour = shape.addEmptyContour();
        currentPoint = new Vector2(cmd.x, cmd.y);
        break;
      case 'lineTo':
        currentContour.addEdge(new EdgeHolder(
          currentPoint,
          new Vector2(cmd.x, cmd.y),
          EdgeColor.WHITE
        ));
        currentPoint = new Vector2(cmd.x, cmd.y);
        break;
      case 'quadraticCurveTo':
        currentContour.addEdge(new EdgeHolder(
          currentPoint,
          new Vector2(cmd.cpx, cmd.cpy),
          new Vector2(cmd.x, cmd.y),
          EdgeColor.WHITE
        ));
        currentPoint = new Vector2(cmd.x, cmd.y);
        break;
      case 'bezierCurveTo':
        currentContour.addEdge(new EdgeHolder(
          currentPoint,
          new Vector2(cmd.cp1x, cmd.cp1y),
          new Vector2(cmd.cp2x, cmd.cp2y),
          new Vector2(cmd.x, cmd.y),
          EdgeColor.WHITE
        ));
        currentPoint = new Vector2(cmd.x, cmd.y);
        break;
      case 'closePath':
        // Connect back to contour start if needed
        break;
    }
  }
  return shape;
}
```

**Stage 3: MSDF Generation (Existing)**
```typescript
// Existing API - no changes needed
import { generateMSDF, SDFTransformation, Projection, Range } from 'msdfgen-ts';

const glyphSize = 32;  // Pixels per glyph in atlas
const padding = 2;     // SDF padding for antialiasing
const range = 4;       // Distance field range in pixels

const bitmap = new Bitmap(Float32Array, 3, glyphSize, glyphSize);
const projection = calculateProjection(shape, glyphSize, padding);
const transformation = new SDFTransformation(projection, new Range(-range, range));

edgeColoringSimple(shape, Math.PI / 3, 0n);
generateMSDF(bitmap, shape, transformation);
```

**Stage 4: Atlas Packing**
```typescript
interface GlyphEntry {
  charCode: number;
  bitmap: Bitmap<Float32Array, 3>;
  metrics: GlyphMetrics;
}

interface GlyphMetrics {
  advanceWidth: number;      // Horizontal advance (in font units)
  leftSideBearing: number;   // Left side bearing (in font units)
  width: number;             // Glyph bitmap width (pixels)
  height: number;            // Glyph bitmap height (pixels)
  xOffset: number;           // X offset from origin to bitmap (pixels)
  yOffset: number;           // Y offset from origin to bitmap (pixels)
}

interface PackedAtlas {
  texture: Float32Array;     // Packed MSDF data (width * height * 3)
  width: number;
  height: number;
  glyphs: Map<number, PackedGlyph>;  // charCode -> glyph info
}

interface PackedGlyph {
  metrics: GlyphMetrics;
  uvRect: { u0: number; v0: number; u1: number; v1: number };
}

// Simple shelf-packing algorithm
function packAtlas(glyphs: GlyphEntry[], atlasWidth: number = 1024): PackedAtlas {
  // Sort by height descending for better packing
  const sorted = [...glyphs].sort((a, b) => b.bitmap.height() - a.bitmap.height());

  let x = 0, y = 0, rowHeight = 0;
  const positions: { glyph: GlyphEntry; x: number; y: number }[] = [];

  for (const glyph of sorted) {
    const w = glyph.bitmap.width();
    const h = glyph.bitmap.height();

    if (x + w > atlasWidth) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }

    positions.push({ glyph, x, y });
    x += w;
    rowHeight = Math.max(rowHeight, h);
  }

  const atlasHeight = nextPowerOfTwo(y + rowHeight);
  // ... copy bitmaps to atlas, build UV mapping
}
```

**Stage 5: WebGPU Rendering**
```typescript
interface TextRenderer {
  setFont(atlas: PackedAtlas): void;
  setText(text: string, x: number, y: number, fontSize: number): void;
  render(encoder: GPURenderPassEncoder): void;
}

// WGSL MSDF shader (fragment)
const msdfFragmentShader = `
@group(0) @binding(0) var msdfTexture: texture_2d<f32>;
@group(0) @binding(1) var msdfSampler: sampler;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
}

fn median(r: f32, g: f32, b: f32) -> f32 {
  return max(min(r, g), min(max(r, g), b));
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let msdf = textureSample(msdfTexture, msdfSampler, in.uv).rgb;
  let sd = median(msdf.r, msdf.g, msdf.b);

  // Screen-space derivative for proper antialiasing at any scale
  let screenPxRange = 4.0;  // Adjust based on atlas generation range
  let screenPxDistance = screenPxRange * (sd - 0.5);
  let opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);

  return vec4<f32>(in.color.rgb, in.color.a * opacity);
}
`;
```

## Patterns to Follow

### Pattern 1: Lazy Glyph Generation
**What:** Generate MSDF for glyphs on-demand rather than pre-generating entire character set
**When:** Interactive applications, large character sets (CJK), memory-constrained environments
**Example:**
```typescript
class LazyAtlas {
  private glyphCache = new Map<number, PackedGlyph>();
  private pendingGlyphs: number[] = [];
  private needsRebuild = false;

  requestGlyph(charCode: number): PackedGlyph | null {
    if (this.glyphCache.has(charCode)) {
      return this.glyphCache.get(charCode)!;
    }

    // Queue for generation, return null (render placeholder or skip)
    if (!this.pendingGlyphs.includes(charCode)) {
      this.pendingGlyphs.push(charCode);
      this.needsRebuild = true;
    }
    return null;
  }

  async rebuildIfNeeded(): Promise<boolean> {
    if (!this.needsRebuild) return false;

    for (const charCode of this.pendingGlyphs) {
      const shape = this.glyphToShape(charCode);
      const bitmap = this.generateMSDF(shape);
      // Add to atlas...
    }

    this.pendingGlyphs = [];
    this.needsRebuild = false;
    return true;  // Atlas texture needs GPU upload
  }
}
```

### Pattern 2: Double-Buffered Atlas Updates
**What:** Maintain two atlas textures, update one while rendering with the other
**When:** Dynamic glyph generation to avoid render stalls
**Example:**
```typescript
class DoubleBufferedAtlas {
  private atlases: [GPUTexture, GPUTexture];
  private activeIndex = 0;

  getActiveTexture(): GPUTexture {
    return this.atlases[this.activeIndex];
  }

  async updateAsync(newGlyphs: GlyphEntry[]): Promise<void> {
    const inactiveIndex = 1 - this.activeIndex;
    await this.uploadToTexture(this.atlases[inactiveIndex], newGlyphs);
    this.activeIndex = inactiveIndex;  // Swap on next frame
  }
}
```

### Pattern 3: Font Unit to Pixel Projection
**What:** Calculate transformation from font units to MSDF bitmap pixels
**When:** Every glyph generation
**Example:**
```typescript
function calculateGlyphProjection(
  shape: Shape,
  targetSize: number,
  padding: number,
  range: number
): SDFTransformation {
  const bounds = shape.getBounds(0);
  const glyphWidth = bounds.r - bounds.l;
  const glyphHeight = bounds.t - bounds.b;

  // Scale to fit in targetSize - 2*padding, maintaining aspect ratio
  const availableSize = targetSize - 2 * padding;
  const scale = Math.min(
    availableSize / glyphWidth,
    availableSize / glyphHeight
  );

  // Center in bitmap
  const scaledWidth = glyphWidth * scale;
  const scaledHeight = glyphHeight * scale;
  const xOffset = (targetSize - scaledWidth) / 2 - bounds.l * scale;
  const yOffset = (targetSize - scaledHeight) / 2 - bounds.b * scale;

  const projection = new Projection(
    new Vector2(scale, scale),
    new Vector2(xOffset / targetSize, yOffset / targetSize)
  );

  // Range in font units = range in pixels / scale
  const fontRange = range / scale;

  return new SDFTransformation(projection, new Range(-fontRange, fontRange));
}
```

### Pattern 4: Instanced Quad Rendering
**What:** Use GPU instancing to render all glyphs in a single draw call
**When:** Rendering any amount of text (always preferable)
**Example:**
```typescript
// Per-instance data (one per glyph to render)
interface GlyphInstance {
  position: [number, number];     // Screen position
  size: [number, number];         // Rendered size
  uvRect: [number, number, number, number];  // Atlas UV coordinates
  color: [number, number, number, number];   // RGBA
}

// WGSL vertex shader with instancing
const vertexShader = `
struct GlyphInstance {
  @location(5) position: vec2<f32>,
  @location(6) size: vec2<f32>,
  @location(7) uvRect: vec4<f32>,
  @location(8) color: vec4<f32>,
}

@vertex
fn vs_main(
  @builtin(vertex_index) vertexIndex: u32,
  instance: GlyphInstance
) -> VertexOutput {
  // Unit quad vertices
  let vertices = array<vec2<f32>, 6>(
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0)
  );

  let pos = vertices[vertexIndex];
  let screenPos = instance.position + pos * instance.size;
  let uv = mix(instance.uvRect.xy, instance.uvRect.zw, pos);

  // Output...
}
`;
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Regenerating MSDF Per Frame
**What:** Generating MSDF bitmaps during the render loop
**Why bad:** MSDF generation is CPU-intensive (~1-10ms per glyph). Doing this per frame causes stuttering.
**Instead:** Pre-generate and cache in atlas. Use lazy generation with async rebuild between frames.

### Anti-Pattern 2: Single Draw Call Per Glyph
**What:** Issuing a separate GPU draw call for each character
**Why bad:** Draw call overhead dominates. 100 characters = 100 draw calls = poor performance.
**Instead:** Use instanced rendering. One draw call for all text with same font/material.

### Anti-Pattern 3: Font Parsing in Hot Path
**What:** Parsing font files or extracting glyph paths during text rendering
**Why bad:** Font parsing involves binary decoding, table lookups. Expensive.
**Instead:** Parse font once on load. Cache glyph outlines or shapes.

### Anti-Pattern 4: Screen-Size MSDF Generation
**What:** Generating MSDF at the displayed pixel size
**Why bad:** MSDF is resolution-independent. A 32px MSDF renders perfectly at 8px or 128px.
**Instead:** Generate at fixed atlas resolution (32-64px typically). Let the shader handle scaling.

### Anti-Pattern 5: RGB Texture for MSDF
**What:** Using RGB8 format for MSDF atlas texture
**Why bad:** Quantization artifacts at glyph edges, poor antialiasing quality.
**Instead:** Use RGBA8 minimum (median in alpha for compatibility), prefer R8G8B8A8_UNORM or RG11B10_FLOAT for quality.

## Scalability Considerations

| Concern | MVP (< 100 glyphs) | Demo (< 1K glyphs) | Production (< 100K glyphs) |
|---------|-------------------|--------------------|-----------------------------|
| **Atlas Size** | Single 512x512 | Single 2048x2048 | Multiple atlases, paged loading |
| **Glyph Generation** | Pre-generate all | Lazy generation | Background worker, streaming |
| **Memory** | Keep all in memory | Keep all in memory | LRU cache, evict unused |
| **GPU Upload** | Single upload on init | Single upload on init | Incremental atlas updates |
| **Text Layout** | Simple left-to-right | Basic line wrapping | Full layout engine (harfbuzz) |
| **Instance Buffer** | Static buffer | Dynamic buffer per frame | Ring buffer, persistent mapping |

## Suggested Build Order

Based on component dependencies:

**Phase 1: Font Parser + Shape Converter**
- These are tightly coupled (parser output format determines converter input)
- No dependencies on WebGPU
- Can validate output against existing MSDF generator

**Phase 2: Atlas Packer**
- Depends on: Font Parser, Shape Converter, MSDF Generator (all existing after Phase 1)
- No WebGPU dependency yet
- Can validate by rendering atlas to Canvas2D

**Phase 3: WebGPU Renderer**
- Depends on: Atlas Packer (Phase 2)
- This is the only WebGPU-dependent component
- Can start with static text, add interactivity later

**Rationale for this order:**
1. Font parsing is the unknown - tackle risky work first
2. Atlas generation validates the font+MSDF integration end-to-end without GPU complexity
3. WebGPU rendering is well-documented, lower risk, builds on validated data

## Sources

- Existing codebase analysis: `src/core/generators/msdfgen.ts`, `src/core/shape/Shape.ts`
- Current demo patterns: `demo/shape-demo.ts`, `demo/demo-browser.ts`
- Original msdfgen C++ architecture (training data - MEDIUM confidence)
- WebGPU best practices for text rendering (training data - MEDIUM confidence)

---

*Architecture analysis: 2026-05-04*
