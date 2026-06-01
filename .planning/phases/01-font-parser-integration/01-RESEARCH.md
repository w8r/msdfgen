# Phase 1: Font Parser Integration - Research

**Researched:** 2026-05-06
**Domain:** Font file parsing (TTF/OTF/WOFF2) and glyph-to-Shape conversion
**Confidence:** HIGH

## Summary

Phase 1 integrates font parsing capabilities with the existing MSDF generator by loading font files and converting glyph outlines to Shape objects. The core challenge is mapping font path commands (moveTo, lineTo, qCurveTo, curveTo, closePath) to the existing LinearSegment, QuadraticSegment, and CubicSegment edge types that the MSDF generator expects.

The recommended approach uses opentype.js (v2.0.0, ~90KB, zero runtime dependencies) for TTF/OTF parsing, with wawoff2 (v2.0.1, ~450KB WASM) lazy-loaded only when WOFF2 files are detected. This achieves the zero-dependency goal for the core library while accepting strategic optional dependencies for font parsing.

**Primary recommendation:** Use opentype.js for font parsing with a thin adapter layer that converts path commands to Shape/Contour/EdgeHolder structures. Implement winding normalization during conversion to prevent inverted glyph rendering.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FONT-01 | Library can load TTF font files and extract glyph outlines | opentype.js v2.0.0 parse() function handles TTF natively |
| FONT-02 | Library can load OTF font files and extract glyph outlines | opentype.js handles both TrueType and CFF/PostScript outlines |
| FONT-03 | Library can load WOFF2 font files (with Brotli decompression) | wawoff2 v2.0.1 decompress() + lazy loading pattern |
| FONT-04 | Library extracts font metrics (ascender, descender, units per em) | font.unitsPerEm, font.ascender, font.descender properties |
| FONT-05 | Library converts glyph outlines to Shape objects compatible with MSDF generator | Path command mapping to EdgeHolder (M/L/Q/C/Z commands) |
| QUAL-03 | Core distance calculations have unit test coverage | Existing tests in src/core/distance/*.test.ts |
| QUAL-04 | Font parsing has unit test coverage for edge cases | Test with "8", "B", "M", accented chars across multiple fonts |
| QUAL-05 | Library has zero runtime dependencies (font parser allowed as optional peer dep) | opentype.js as optional peer dependency, no bundled deps |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| opentype.js | 2.0.0 | TTF/OTF font parsing | Zero dependencies, mature (8+ years), full glyph path extraction, TypeScript types available |
| wawoff2 | 2.0.1 | WOFF2 Brotli decompression | WebAssembly-based, only viable browser option for Brotli |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/opentype.js | 1.3.9 | TypeScript definitions | Development only, zero runtime cost |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| opentype.js | fontkit | fontkit has 7+ dependencies, 300KB+ total bundle - rejected |
| opentype.js | typr.js | typr.js unmaintained since 2021, no TypeScript - rejected |
| opentype.js | Custom parser | 2-3 weeks effort for worse results - rejected |
| wawoff2 | woff2-encoder | Similar functionality, wawoff2 more established |

**Installation:**
```bash
# Core font parsing (optional peer dependency)
npm install opentype.js

# TypeScript support (dev only)
npm install -D @types/opentype.js

# WOFF2 support (optional, lazy-loaded)
npm install wawoff2
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── font/                    # NEW: Font parsing module
│   ├── index.ts             # Public exports
│   ├── FontParser.ts        # Font loading and parsing
│   ├── GlyphConverter.ts    # Glyph path to Shape conversion
│   ├── types.ts             # Font-related type definitions
│   └── FontParser.test.ts   # Unit tests
├── core/                    # EXISTING: No changes needed
│   ├── shape/               # Shape, Contour, EdgeHolder
│   ├── edge/                # LinearSegment, QuadraticSegment, CubicSegment
│   └── ...
└── index.ts                 # Add font module exports
```

### Pattern 1: Path Command to Shape Conversion

**What:** Convert opentype.js path commands to msdfgen-ts Shape structure
**When to use:** Every glyph extraction
**Example:**
```typescript
// Source: opentype.js path commands structure
// Command types: 'M' (moveTo), 'L' (lineTo), 'Q' (quadratic), 'C' (cubic), 'Z' (close)

interface PathCommand {
  type: 'M' | 'L' | 'Q' | 'C' | 'Z';
  x?: number;
  y?: number;
  x1?: number;  // Control point 1
  y1?: number;
  x2?: number;  // Control point 2 (cubic only)
  y2?: number;
}

function glyphToShape(glyph: opentype.Glyph, font: opentype.Font): Shape {
  const path = glyph.getPath(0, 0, font.unitsPerEm);
  const shape = new Shape();
  let currentContour: Contour | null = null;
  let contourStart: Point2 | null = null;
  let currentPoint: Point2 | null = null;

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        // Start new contour
        currentContour = shape.addEmptyContour();
        contourStart = { x: cmd.x!, y: cmd.y! };
        currentPoint = contourStart;
        break;

      case 'L':
        // Linear segment
        if (currentContour && currentPoint) {
          const endPoint = { x: cmd.x!, y: cmd.y! };
          currentContour.addEdge(new EdgeHolder(currentPoint, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'Q':
        // Quadratic Bezier
        if (currentContour && currentPoint) {
          const control = { x: cmd.x1!, y: cmd.y1! };
          const endPoint = { x: cmd.x!, y: cmd.y! };
          currentContour.addEdge(new EdgeHolder(currentPoint, control, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'C':
        // Cubic Bezier
        if (currentContour && currentPoint) {
          const control1 = { x: cmd.x1!, y: cmd.y1! };
          const control2 = { x: cmd.x2!, y: cmd.y2! };
          const endPoint = { x: cmd.x!, y: cmd.y! };
          currentContour.addEdge(new EdgeHolder(currentPoint, control1, control2, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'Z':
        // Close path - connect back to start if not already there
        if (currentContour && currentPoint && contourStart) {
          const dist = Math.hypot(currentPoint.x - contourStart.x, currentPoint.y - contourStart.y);
          if (dist > 0.001) {
            currentContour.addEdge(new EdgeHolder(currentPoint, contourStart));
          }
        }
        break;
    }
  }

  // Normalize winding order
  shape.normalize();
  return shape;
}
```

### Pattern 2: Lazy WOFF2 Loading

**What:** Only load wawoff2 WASM when WOFF2 file is detected
**When to use:** Font loading to minimize initial bundle size
**Example:**
```typescript
// Source: wawoff2 documentation pattern

const WOFF2_MAGIC = 0x774F4632;  // 'wOF2' in big-endian

async function loadFontBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const view = new DataView(buffer);
  const magic = view.getUint32(0, false);  // big-endian

  if (magic === WOFF2_MAGIC) {
    // Lazy load wawoff2 only when needed
    const wawoff2 = await import('wawoff2');
    const decompressed = await wawoff2.decompress(new Uint8Array(buffer));
    return decompressed.buffer;
  }

  // TTF/OTF pass through directly
  return buffer;
}

export async function parseFont(buffer: ArrayBuffer): Promise<opentype.Font> {
  const fontBuffer = await loadFontBuffer(buffer);
  return opentype.parse(fontBuffer);
}
```

### Pattern 3: Font Interface Abstraction

**What:** Abstract away opentype.js behind a clean interface
**When to use:** Maintain flexibility for future parser changes
**Example:**
```typescript
// Public interface - hides opentype.js implementation details
export interface Font {
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  readonly lineGap: number;

  getGlyph(char: string): Glyph | null;
  getGlyphByIndex(index: number): Glyph | null;
  hasGlyph(char: string): boolean;
}

export interface Glyph {
  readonly advanceWidth: number;
  readonly leftSideBearing: number;
  readonly name: string | null;

  toShape(): Shape;
}

// Implementation wraps opentype.js
class OpentypeFont implements Font {
  constructor(private readonly font: opentype.Font) {}

  get unitsPerEm(): number { return this.font.unitsPerEm; }
  get ascender(): number { return this.font.ascender; }
  get descender(): number { return this.font.descender; }
  get lineGap(): number { return this.font.tables?.os2?.sTypoLineGap ?? 0; }

  getGlyph(char: string): Glyph | null {
    const glyph = this.font.charToGlyph(char);
    if (!glyph || glyph.index === 0) return null;  // .notdef
    return new OpentypeGlyph(glyph, this.font);
  }

  hasGlyph(char: string): boolean {
    const glyph = this.font.charToGlyph(char);
    return glyph && glyph.index !== 0;
  }
}
```

### Anti-Patterns to Avoid

- **Assuming 1000 unitsPerEm:** Different fonts use different values (1000, 2048, etc.). Always read from font.
- **Ignoring winding order:** TrueType and PostScript use opposite conventions. Always normalize after conversion.
- **Parsing in render loop:** Font parsing is expensive. Parse once, cache the Font object.
- **Loading full wawoff2 eagerly:** The 450KB WASM should be lazy-loaded only when WOFF2 is detected.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TTF/OTF parsing | Custom binary parser | opentype.js | TTF spec is 200+ pages; CFF is even more complex |
| Brotli decompression | Pure JS decoder | wawoff2 (WASM) | Brotli is computationally intensive; pure JS would be 10x slower |
| Glyph metrics extraction | Manual table parsing | opentype.js accessors | Already handles all table formats and edge cases |
| Composite glyph resolution | Manual transform matrix math | opentype.js | Handles nested composites with transform matrices correctly |

**Key insight:** Font parsing is a solved problem. The complexity of TTF/OTF/CFF formats makes custom implementations error-prone and time-consuming. opentype.js has 8+ years of bug fixes for edge cases you won't anticipate.

## Common Pitfalls

### Pitfall 1: Glyph Contour Winding Order Confusion

**What goes wrong:** Glyphs render inverted (fill where should be empty) or letters with counters ("8", "B", "O") appear as solid blobs.

**Why it happens:** TrueType uses clockwise outer/counter-clockwise inner contours; PostScript/CFF uses opposite. opentype.js doesn't normalize this.

**How to avoid:** Always call `shape.normalize()` after conversion, which uses `contour.winding()` (shoelace formula) to detect and fix orientation.

**Warning signs:** Some fonts render correctly, others are inverted. Glyphs with holes appear solid.

### Pitfall 2: Missing Closing Edge

**What goes wrong:** Glyphs have gaps where contours should be closed, causing MSDF artifacts.

**Why it happens:** The 'Z' (closePath) command indicates the path should close, but if the current point isn't exactly at the contour start, the closing edge is missing.

**How to avoid:** Explicitly add a LinearSegment from current point to contour start in the 'Z' handler when distance > epsilon.

**Warning signs:** Hairline cracks in rendered glyphs, MSDF shows incorrect distances at contour endpoints.

### Pitfall 3: Font Metric Misinterpretation (unitsPerEm)

**What goes wrong:** Text appears wrong size, glyphs clipped, line spacing incorrect.

**Why it happens:** Font metrics are in font units (typically 1000 or 2048 per em). Code assumes a specific value rather than reading from font.

**How to avoid:** Always extract unitsPerEm from font and use it in scaling calculations: `pixelSize = fontUnits * (fontSize / unitsPerEm)`.

**Warning signs:** Different fonts at same font-size produce wildly different visual sizes.

### Pitfall 4: Composite Glyph Failures

**What goes wrong:** Accented characters ("e", "a", "u") render without their accents or with accents in wrong positions.

**Why it happens:** Many glyphs (especially accented) are defined as composites referencing base glyphs with transform matrices. Some parsers fail to resolve these.

**How to avoid:** Verify opentype.js returns resolved paths for composite glyphs. Test with "cafe", "naive", "resume" (accented characters).

**Warning signs:** Accented characters missing diacritics; works for ASCII, fails for extended Latin.

### Pitfall 5: CFF (PostScript) Font Handling

**What goes wrong:** Modern OpenType fonts fail to parse or render incorrectly.

**Why it happens:** OpenType fonts contain either TrueType outlines (glyf table, quadratic curves) or CFF outlines (CFF table, cubic curves). Many Google Fonts use CFF.

**How to avoid:** Verify opentype.js 2.0 handles both outline types. Test with both TrueType fonts (e.g., Arial) and CFF fonts (e.g., Source Sans Pro).

**Warning signs:** Some fonts work, others don't. Thin-stroke fonts or fonts with complex curves fail.

## Code Examples

### Complete Font Loading Example

```typescript
// src/font/FontParser.ts
import opentype from 'opentype.js';
import { Shape } from '../core/shape/Shape';
import { Contour } from '../core/shape/Contour';
import { EdgeHolder } from '../core/shape/EdgeHolder';
import { Vector2 } from '../core/types/Vector2';

const WOFF2_MAGIC = 0x774F4632;

export interface FontMetrics {
  unitsPerEm: number;
  ascender: number;
  descender: number;
  lineGap: number;
}

export interface GlyphMetrics {
  advanceWidth: number;
  leftSideBearing: number;
}

export interface ParsedFont {
  metrics: FontMetrics;
  getGlyph(char: string): { shape: Shape; metrics: GlyphMetrics } | null;
  hasGlyph(char: string): boolean;
}

async function decompressWoff2(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const wawoff2 = await import('wawoff2');
  const result = await wawoff2.decompress(new Uint8Array(buffer));
  return result.buffer;
}

export async function parseFont(buffer: ArrayBuffer): Promise<ParsedFont> {
  // Check for WOFF2 and decompress if needed
  const view = new DataView(buffer);
  const magic = view.getUint32(0, false);

  let fontBuffer = buffer;
  if (magic === WOFF2_MAGIC) {
    fontBuffer = await decompressWoff2(buffer);
  }

  const font = opentype.parse(fontBuffer);

  return {
    metrics: {
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      lineGap: font.tables?.os2?.sTypoLineGap ?? 0,
    },

    getGlyph(char: string) {
      const glyph = font.charToGlyph(char);
      if (!glyph || glyph.index === 0) return null;

      const shape = glyphPathToShape(glyph, font);
      return {
        shape,
        metrics: {
          advanceWidth: glyph.advanceWidth ?? 0,
          leftSideBearing: glyph.leftSideBearing ?? 0,
        },
      };
    },

    hasGlyph(char: string) {
      const glyph = font.charToGlyph(char);
      return glyph && glyph.index !== 0;
    },
  };
}

function glyphPathToShape(glyph: opentype.Glyph, font: opentype.Font): Shape {
  const path = glyph.getPath(0, 0, font.unitsPerEm);
  const shape = new Shape();

  let currentContour: Contour | null = null;
  let contourStart: Vector2 | null = null;
  let currentPoint: Vector2 | null = null;

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        currentContour = shape.addEmptyContour();
        contourStart = new Vector2(cmd.x!, cmd.y!);
        currentPoint = contourStart;
        break;

      case 'L':
        if (currentContour && currentPoint) {
          const endPoint = new Vector2(cmd.x!, cmd.y!);
          currentContour.addEdge(new EdgeHolder(currentPoint, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'Q':
        if (currentContour && currentPoint) {
          const control = new Vector2(cmd.x1!, cmd.y1!);
          const endPoint = new Vector2(cmd.x!, cmd.y!);
          currentContour.addEdge(new EdgeHolder(currentPoint, control, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'C':
        if (currentContour && currentPoint) {
          const control1 = new Vector2(cmd.x1!, cmd.y1!);
          const control2 = new Vector2(cmd.x2!, cmd.y2!);
          const endPoint = new Vector2(cmd.x!, cmd.y!);
          currentContour.addEdge(new EdgeHolder(currentPoint, control1, control2, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'Z':
        if (currentContour && currentPoint && contourStart) {
          const dx = currentPoint.x - contourStart.x;
          const dy = currentPoint.y - contourStart.y;
          if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
            currentContour.addEdge(new EdgeHolder(currentPoint, contourStart));
          }
        }
        currentContour = null;
        break;
    }
  }

  // Normalize winding order for correct fill
  shape.normalize();

  return shape;
}
```

### Test Character Set

```typescript
// Characters that expose common parsing issues
const TEST_CHARACTERS = {
  // Compound counters - expose winding order issues
  counters: ['8', 'B', '%', '@', '&', 'O', 'Q'],

  // Sharp corners - expose edge coloring issues (Phase 2)
  sharpCorners: ['M', 'W', 'V', 'A', 'N', '7', '#'],

  // Accented - expose composite glyph handling
  accented: ['e', 'a', 'u', 'c', 'o'],

  // Descenders - expose metric handling
  descenders: ['g', 'y', 'p', 'j', 'q'],

  // Basic set for quick validation
  basic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| opentype.js 1.x | opentype.js 2.0 | 2024 | ESM-first, improved CFF support |
| Custom WOFF2 | wawoff2 WASM | 2022 | Native-speed decompression in browser |
| fontkit | opentype.js | N/A | fontkit's 7+ deps make it unsuitable for zero-dep goal |

**Deprecated/outdated:**
- typr.js: Unmaintained since 2021, no TypeScript support

## Open Questions

1. **Composite Glyph Validation**
   - What we know: opentype.js should resolve composite glyphs automatically
   - What's unclear: Need to verify with actual accented character test
   - Recommendation: Test with "cafe", "naive", "resume" in Wave 0 validation

2. **wawoff2 Browser Bundling**
   - What we know: It's a WASM module, ~450KB
   - What's unclear: Exact Vite configuration needed for lazy loading
   - Recommendation: Test dynamic import in demo environment

3. **CFF vs TrueType Path Differences**
   - What we know: Both use different curve types (cubic vs quadratic)
   - What's unclear: Whether opentype.js always uses cubic output or preserves original
   - Recommendation: Test with both font types, verify path command types

## Sources

### Primary (HIGH confidence)

- opentype.js GitHub README: https://github.com/opentypejs/opentype.js
  - Font parsing API, glyph access, metrics extraction
- opentype.js official site: https://opentype.js.org/
  - Path command structure (M, L, Q, C, Z), glyph methods
- npm registry verification (2026-05-06):
  - opentype.js: 2.0.0
  - wawoff2: 2.0.1
  - @types/opentype.js: 1.3.9

### Secondary (MEDIUM confidence)

- wawoff2 GitHub: https://github.com/fontello/wawoff2
  - WASM decompression API
- Existing codebase analysis:
  - Shape, Contour, EdgeHolder implementations
  - Vector2, EdgeSegment interfaces

### Tertiary (LOW confidence)

- Training data patterns for MSDF glyph conversion (verify with actual implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - npm versions verified, opentype.js well-established
- Architecture: HIGH - Clear mapping from path commands to existing Shape/EdgeHolder
- Pitfalls: MEDIUM - Based on domain knowledge, verify during implementation

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (30 days - stable domain)
