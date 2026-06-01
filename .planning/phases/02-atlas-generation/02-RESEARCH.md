# Phase 2: Atlas Generation - Research

**Researched:** 2026-05-07
**Domain:** MSDF texture atlas generation, bin packing, glyph metrics
**Confidence:** HIGH

## Summary

Atlas generation for MSDF fonts requires three core components: (1) generating individual MSDF textures for each glyph, (2) packing these into a single texture atlas using bin-packing algorithms, and (3) storing glyph metrics with atlas coordinates for rendering. The existing codebase already has robust MSDF generation (`generateMSDF`) and bitmap handling (`Bitmap` with section/copy support), so the primary new work is integrating potpack for bin packing and designing the atlas data structures.

The user has made explicit decisions: use potpack (Mapbox library) for bin packing, return a synchronous API with `{ atlas: Bitmap, glyphs: Map<string, GlyphInfo>, generationTimeMs: number }`, and use power-of-two atlas dimensions. The <100ms performance target for typical character sets (~70 characters) is achievable with single-threaded generation at 32px glyph size, as the existing MSDF generator is already optimized.

**Primary recommendation:** Build AtlasGenerator class that orchestrates potpack for layout, generates individual glyph MSDFs into a pre-allocated atlas bitmap, and returns normalized UV coordinates plus font metrics in a Map.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Character input via string (e.g., `"ABCabc0123"`) - simple, auto-dedupes, readable
- Return single object: `{ atlas: Bitmap, glyphs: Map<string, GlyphInfo>, generationTimeMs: number }`
- Synchronous API only - no Promise wrapper needed
- Minimal configuration options: glyph size (px), padding
- Plain objects for glyph info - JSON-serializable, easy to inspect
- Normalized UV coordinates (0-1 range) - GPU-ready, resolution independent
- Include both font-unit values AND atlas-space values - useful for different rendering contexts
- Map keyed by character string - `glyphs.get('A')`
- Use potpack (Mapbox library) for bin packing - fast, simple, proven for font atlases
- Padding between glyphs: configurable (user-specified)
- Overflow handling: split into multiple atlases if needed
- Atlas dimensions: power-of-two (512x512, 1024x1024, etc.) for GPU compatibility
- Single-threaded first - measure actual perf before optimizing
- Default glyph size: 32px - good quality/speed balance
- Include `generationTimeMs` in returned result - useful for debugging and demo display
- No caching of individual glyph MSDFs - generate fresh each time, fast enough

### Claude's Discretion
- Internal bitmap copying/composition strategy
- Error handling for missing glyphs
- Exact potpack integration details
- Multiple atlas splitting threshold and strategy

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MSDF-01 | Library generates MSDF atlas for a set of glyphs on demand | Potpack for layout + existing generateMSDF + Bitmap composition via getSection/copyFromSection |
| MSDF-02 | Library stores glyph metrics (bearing, advance, atlas position) alongside atlas | GlyphInfo interface with planeBounds (font units), atlasBounds (pixels), uvBounds (normalized 0-1), advanceWidth, leftSideBearing |
| MSDF-03 | Atlas generation completes in <100ms for typical character sets | 32px default size, single-threaded, potpack O(N log N), ~70 chars = ~1-2ms per glyph target |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| potpack | 2.1.0 | Rectangle bin packing | Mapbox's proven solution for sprite/font atlases, simple API, fast O(N log N) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (existing) Bitmap | - | Atlas storage | Float32Array with getSection/copyFromSection support |
| (existing) generateMSDF | - | Per-glyph MSDF | Already implemented, tested, ~1-5ms per glyph at 32px |
| (existing) Shape.getBounds() | - | Glyph bounding box | Returns `{ l, b, r, t }` with optional border parameter |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| potpack | shelf-pack | Similar perf, potpack is simpler API and user explicitly requested |
| potpack | custom packing | Unnecessary - potpack handles edge cases, well-tested |
| Float32Array atlas | Uint8Array | Float32 internal, convert at export; keeps precision for compositing |

**Installation:**
```bash
npm install potpack
```

**TypeScript Types:** potpack includes built-in TypeScript definitions (generated from source).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── atlas/                    # NEW: Atlas generation module
│   ├── AtlasGenerator.ts     # Main atlas generation class
│   ├── types.ts              # GlyphInfo, AtlasConfig, AtlasResult interfaces
│   ├── AtlasGenerator.test.ts
│   └── index.ts              # Barrel export
├── core/                     # Existing: MSDF generation
│   ├── bitmap/               # Bitmap, BitmapSection (reuse)
│   └── generators/           # generateMSDF (reuse)
└── font/                     # Existing: Font parsing
    └── types.ts              # Font, Glyph, GlyphMetrics (reuse)
```

### Pattern 1: Orchestrator Pattern for Atlas Generation
**What:** AtlasGenerator orchestrates the pipeline: dedupe chars -> get glyph shapes -> compute sizes -> potpack layout -> allocate atlas -> generate MSDFs -> compose
**When to use:** Multi-step generation with clear data flow
**Example:**
```typescript
// Source: Project-specific pattern following existing generator style
export interface AtlasConfig {
  glyphSize: number;       // Glyph bitmap size in pixels (default: 32)
  padding: number;         // Padding between glyphs (default: 2)
  distanceRange: number;   // SDF distance range in pixels (default: 4)
}

export interface GlyphInfo {
  // Atlas position (pixels)
  atlasBounds: { left: number; bottom: number; right: number; top: number };
  // Normalized UV (0-1, GPU-ready)
  uvBounds: { u0: number; v0: number; u1: number; v1: number };
  // Font metrics (font units)
  advanceWidth: number;
  leftSideBearing: number;
  // Glyph bounds in em units (for quad positioning)
  planeBounds: { left: number; bottom: number; right: number; top: number };
}

export interface AtlasResult {
  atlas: Bitmap<Float32Array, 3>;
  glyphs: Map<string, GlyphInfo>;
  generationTimeMs: number;
  atlasWidth: number;
  atlasHeight: number;
}
```

### Pattern 2: Potpack Integration
**What:** Transform glyph size requirements to potpack boxes, run packing, read back positions
**When to use:** Always - this is the locked bin packing approach
**Example:**
```typescript
// Source: potpack README + project adaptation
import potpack from 'potpack';

// Input: boxes need { w, h } properties
const boxes = chars.map((char, i) => ({
  w: glyphSize + padding * 2,
  h: glyphSize + padding * 2,
  char,  // Attach metadata for later reference
  index: i
}));

// Potpack mutates boxes, adding x, y coordinates
const { w, h, fill } = potpack(boxes);

// Round up to power of two for GPU
const atlasWidth = nextPowerOfTwo(w);
const atlasHeight = nextPowerOfTwo(h);

// boxes now have { w, h, x, y, char, index }
for (const box of boxes) {
  // box.x, box.y are the top-left position
  // Generate MSDF at (box.x + padding, box.y + padding)
}
```

### Pattern 3: Bitmap Composition via Section
**What:** Use existing BitmapSection for efficient copying from glyph bitmap to atlas
**When to use:** Compositing individual glyph MSDFs into final atlas
**Example:**
```typescript
// Source: Existing Bitmap.ts patterns
// Generate glyph MSDF into temporary bitmap
const glyphBitmap = new Bitmap(Float32Array, 3, glyphSize, glyphSize);
generateMSDF(glyphBitmap, shape, transformation, config);

// Get target section in atlas
const targetSection = atlas.getSection(
  box.x + padding,
  box.y + padding,
  box.x + padding + glyphSize,
  box.y + padding + glyphSize
);

// Copy glyph data to atlas (row by row due to different strides)
for (let y = 0; y < glyphSize; y++) {
  for (let x = 0; x < glyphSize; x++) {
    const pixel = glyphBitmap.getPixel(x, y);
    targetSection.setPixel(x, y, pixel);
  }
}
```

### Anti-Patterns to Avoid
- **Creating new atlas per glyph:** Allocate once, compose all glyphs into it
- **Re-sorting boxes after potpack:** Potpack sorts by height internally, don't re-sort
- **Non-power-of-two dimensions:** Always round up for GPU compatibility
- **Ignoring padding in UV calculations:** UVs must account for the padding offset

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rectangle bin packing | Custom shelf/guillotine packer | potpack | Proven, 3-5x faster than naive, handles edge cases |
| Power-of-two calculation | Math tricks | `1 << Math.ceil(Math.log2(n))` | Simple, fast, correct |
| MSDF generation | Custom distance field | Existing generateMSDF | Already implemented and tested |
| Bitmap section copying | Manual index math | BitmapSection | Handles row stride, Y orientation |
| Shape bounds | Custom traversal | Shape.getBounds() | Already exists, returns `{ l, b, r, t }` |

**Key insight:** The hard problems (MSDF generation, font parsing, shape bounds) are already solved in Phase 1. This phase is integration and data structure design.

## Common Pitfalls

### Pitfall 1: UV Coordinate Origin Confusion
**What goes wrong:** UVs are calculated with wrong origin (top-left vs bottom-left)
**Why it happens:** OpenGL uses bottom-left origin, Canvas uses top-left
**How to avoid:** Use `v = 1 - (y / atlasHeight)` for bottom-left origin, document clearly
**Warning signs:** Glyphs render upside-down or at wrong positions

### Pitfall 2: Missing Padding in UV Bounds
**What goes wrong:** Glyphs bleed into each other when rendered with texture filtering
**Why it happens:** UVs point to full cell including padding, not just glyph content
**How to avoid:** Calculate UVs from `(x + padding)` to `(x + padding + glyphSize)`, not from `x` to `x + cellSize`
**Warning signs:** Visible artifacts at glyph edges, especially when zoomed out

### Pitfall 3: Empty/Space Character Handling
**What goes wrong:** Space character crashes or produces invalid atlas
**Why it happens:** Space has no contours, shape is empty
**How to avoid:** Check `shape.contours.length === 0`, still include in map with metrics but skip MSDF generation
**Warning signs:** Exception when generating atlas with space, or missing space in glyph map

### Pitfall 4: Character Deduplication Order
**What goes wrong:** Same character appears multiple times in atlas
**Why it happens:** Input string not deduplicated before processing
**How to avoid:** `[...new Set(chars)]` at start of generation
**Warning signs:** Atlas larger than expected, duplicate entries in glyph map

### Pitfall 5: Performance Regression from Float32 to Uint8 Conversion
**What goes wrong:** Generation takes 2-3x longer than expected
**Why it happens:** Converting Float32 to Uint8 during composition instead of at end
**How to avoid:** Keep Float32Array throughout, only convert to Uint8Array if needed for export
**Warning signs:** Unexpected time in composition step, not generation step

### Pitfall 6: Atlas Overflow Without Warning
**What goes wrong:** Too many glyphs silently truncated or crash
**Why it happens:** No check for potpack result exceeding reasonable atlas size
**How to avoid:** Check result dimensions, split into multiple atlases if > 4096px (common GPU limit)
**Warning signs:** Missing glyphs, extremely large atlas dimensions

## Code Examples

Verified patterns from official sources and existing codebase:

### Next Power of Two Calculation
```typescript
// Source: Standard bit manipulation pattern
function nextPowerOfTwo(n: number): number {
  if (n <= 0) return 1;
  return 1 << Math.ceil(Math.log2(n));
}
// nextPowerOfTwo(300) => 512
// nextPowerOfTwo(512) => 512
// nextPowerOfTwo(513) => 1024
```

### Potpack Usage
```typescript
// Source: https://github.com/mapbox/potpack
import potpack from 'potpack';

interface Box {
  w: number;
  h: number;
  x?: number;  // Added by potpack
  y?: number;  // Added by potpack
}

const boxes: Box[] = [
  { w: 34, h: 34 },  // 32px glyph + 2px padding each side
  { w: 34, h: 34 },
];

const result = potpack(boxes);
// result = { w: 68, h: 34, fill: 1.0 }
// boxes[0] = { w: 34, h: 34, x: 0, y: 0 }
// boxes[1] = { w: 34, h: 34, x: 34, y: 0 }
```

### GlyphInfo Construction
```typescript
// Source: Project-specific, following msdf-atlas-gen JSON structure
function createGlyphInfo(
  box: { x: number; y: number; w: number; h: number },
  atlasWidth: number,
  atlasHeight: number,
  glyphMetrics: GlyphMetrics,
  glyphSize: number,
  padding: number,
  unitsPerEm: number
): GlyphInfo {
  // Actual glyph content position (inside padding)
  const contentX = box.x + padding;
  const contentY = box.y + padding;

  // Atlas bounds in pixels
  const atlasBounds = {
    left: contentX,
    bottom: contentY,
    right: contentX + glyphSize,
    top: contentY + glyphSize
  };

  // Normalized UVs (0-1 range, bottom-left origin)
  const uvBounds = {
    u0: atlasBounds.left / atlasWidth,
    v0: 1 - atlasBounds.top / atlasHeight,    // Flip Y for bottom-left origin
    u1: atlasBounds.right / atlasWidth,
    v1: 1 - atlasBounds.bottom / atlasHeight
  };

  // Scale factor from font units to glyph bitmap
  const scale = glyphSize / unitsPerEm;

  return {
    atlasBounds,
    uvBounds,
    advanceWidth: glyphMetrics.advanceWidth,
    leftSideBearing: glyphMetrics.leftSideBearing,
    planeBounds: {
      left: 0,  // Computed from shape bounds
      bottom: 0,
      right: glyphMetrics.advanceWidth / unitsPerEm,
      top: 1.0  // Normalized to em
    }
  };
}
```

### SDFTransformation Setup for Glyph
```typescript
// Source: Existing SDFTransformation.ts patterns + Shape.getBounds()
import { SDFTransformation } from '../core/generators/SDFTransformation';
import { Projection } from '../core/types/Projection';
import { Range } from '../core/types/Range';
import { Vector2 } from '../core/types/Vector2';

function createGlyphTransformation(
  shape: Shape,
  glyphSize: number,
  distanceRange: number
): SDFTransformation {
  // Get shape bounds using existing method
  // Shape.getBounds() returns { l: number, b: number, r: number, t: number }
  const bounds = shape.getBounds();

  // Calculate scale to fit shape in glyph bitmap with margin
  const margin = distanceRange;  // Leave room for SDF gradient
  const availableSize = glyphSize - 2 * margin;
  const shapeWidth = bounds.r - bounds.l;
  const shapeHeight = bounds.t - bounds.b;
  const scale = Math.min(
    availableSize / shapeWidth,
    availableSize / shapeHeight
  );

  // Center shape in glyph bitmap
  const translateX = margin / scale - bounds.l + (availableSize / scale - shapeWidth) / 2;
  const translateY = margin / scale - bounds.b + (availableSize / scale - shapeHeight) / 2;

  const projection = new Projection(
    new Vector2(scale, scale),
    new Vector2(translateX, translateY)
  );

  // Distance range in shape units
  const rangeInUnits = distanceRange / scale;
  const range = new Range(-rangeInUnits, rangeInUnits);

  return new SDFTransformation(projection, range);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled bin packing | Use potpack | 2020+ | Faster, fewer bugs, maintenance-free |
| Fixed atlas size | Dynamic power-of-two sizing | 2015+ | Better memory usage, GPU compatibility |
| Pixel UV coordinates | Normalized 0-1 UVs | Standard | Resolution-independent rendering |
| Generate at render time | Pre-generate atlas | Standard | Much faster text rendering |

**Deprecated/outdated:**
- BMFont XML format: JSON is more portable and easier to work with
- Shelf-only packing: Potpack uses more efficient algorithm

## Open Questions

1. **Multiple Atlas Splitting Strategy**
   - What we know: User wants overflow to split into multiple atlases
   - What's unclear: Exact threshold (4096? 2048?), API for returning multiple atlases
   - Recommendation: Start with single atlas, add splitting in follow-up if needed; document 4096px limit

2. **Distance Range Default**
   - What we know: 3-4px is common, affects glyph quality vs padding needed
   - What's unclear: Optimal value for 32px default glyph size
   - Recommendation: Use 4px default (12.5% of glyph size), allow override in config

## Sources

### Primary (HIGH confidence)
- [potpack GitHub](https://github.com/mapbox/potpack) - API, algorithm details, types
- Existing codebase: `src/core/bitmap/Bitmap.ts`, `src/core/generators/msdfgen.ts`, `src/core/shape/Shape.ts` - Composition patterns
- CONTEXT.md - User decisions on API design and library choices

### Secondary (MEDIUM confidence)
- [msdf-atlas-gen](https://github.com/Chlumsky/msdf-atlas-gen) - GlyphInfo structure inspiration
- [Red Blob Games SDF Guide](https://www.redblobgames.com/articles/sdf-fonts/) - Distance range guidance
- [Shelf packing algorithms](https://blog.roomanna.com/09-25-2015/binpacking-shelf) - Algorithm comparison

### Tertiary (LOW confidence)
- Performance estimates (~1-2ms per glyph at 32px) - based on similar projects, needs validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - potpack is explicitly chosen by user, well-documented
- Architecture: HIGH - follows existing codebase patterns, straightforward integration
- Pitfalls: MEDIUM - based on general font atlas knowledge, some project-specific unknowns

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (30 days - stable domain, potpack unlikely to change)
