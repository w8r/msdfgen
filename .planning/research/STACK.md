# Technology Stack: Font Parsing & WebGPU Rendering

**Project:** msdfgen-ts (Font parsing + WebGPU milestone)
**Researched:** 2026-05-04
**Overall Confidence:** MEDIUM (based on training data, verify versions before use)

## Recommended Stack

### Font Parsing

| Technology | Version | Bundle Size | Purpose | Why |
|------------|---------|-------------|---------|-----|
| opentype.js | ^1.3.4+ | ~90KB min | TTF/OTF parsing | Zero dependencies, mature, active maintenance, full glyph path extraction |

**Rationale:** opentype.js is the clear winner for this use case:
- Zero runtime dependencies (aligns with project philosophy)
- Directly extracts glyph outlines as path commands (moveTo, lineTo, curveTo, closePath)
- Mature library with 8+ years of development
- TypeScript definitions available (@types/opentype.js)
- Supports all required glyph metrics (advance width, bearings, kerning)

### WOFF2 Decompression

| Technology | Version | Bundle Size | Purpose | Why |
|------------|---------|-------------|---------|-----|
| wawoff2 | ^2.0.1+ | ~450KB (WASM) | WOFF2 decode | WebAssembly Brotli decoder, fast, works in browser |

**Alternative approach - Conditional loading:**
```typescript
// Only load wawoff2 when WOFF2 file is detected
async function loadFont(buffer: ArrayBuffer): Promise<Font> {
  const header = new Uint32Array(buffer, 0, 1)[0];
  if (header === 0x774F4632) { // 'wOF2' magic
    const { decompress } = await import('wawoff2');
    buffer = await decompress(buffer);
  }
  return opentype.parse(buffer);
}
```

**Rationale:** WOFF2 uses Brotli compression which cannot be implemented efficiently in pure JS. The wawoff2 package provides a WASM-compiled Google Brotli decoder. The ~450KB WASM size is acceptable because:
1. It can be loaded lazily (only when WOFF2 is actually encountered)
2. WASM compresses well (gzip brings it to ~150KB transfer)
3. No pure-JS alternative exists with acceptable performance

### WebGPU Rendering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @webgpu/types | ^0.1.40+ | Type definitions | Official WebGPU TypeScript types |
| (native WebGPU) | - | Rendering | No wrapper library needed, direct API use |

**No WebGPU wrapper library recommended.** Reasons:
- WebGPU API is already well-designed and type-safe
- Wrapper libraries add abstraction over a stable, well-documented API
- Direct WebGPU code is more educational for the demo
- Avoids dependency for something the project can easily do directly

### Supporting Libraries

| Library | Version | Bundle Size | Purpose | When to Use |
|---------|---------|-------------|---------|-------------|
| @types/opentype.js | ^1.3.8+ | 0 (dev) | TypeScript types | Development only |
| @webgpu/types | ^0.1.40+ | 0 (dev) | WebGPU types | Development only |

## Alternatives Considered

### Font Parsing Alternatives

| Library | Bundle Size | Dependencies | Why Not |
|---------|-------------|--------------|---------|
| fontkit | ~150KB | 7+ deps (restructure, clone, brotli, etc.) | Heavy dependency tree, over-engineered for this use case |
| typr.js | ~45KB | 0 | Unmaintained (last update 2021), incomplete TypeScript support |
| fonteditor-core | ~200KB | 3+ deps | Focused on font editing, overkill for parsing |
| Custom parser | 0 | 0 | Massive effort for TTF/OTF, not worth it given opentype.js exists |

### Why NOT fontkit

fontkit is powerful but problematic for this project:

1. **Dependency explosion:** fontkit depends on restructure, clone, brotli-wasm, unicode-trie, unicode-properties, dfa, and more
2. **Bundle bloat:** Full dependency tree exceeds 300KB minified
3. **Overkill features:** Advanced typography (AAT, Graphite) not needed for MSDF generation
4. **Maintenance:** Less active than opentype.js in recent years

### Why NOT typr.js

Despite being smaller:
1. **Unmaintained:** Last meaningful update was 2021
2. **No TypeScript:** Requires manual type definitions
3. **API quirks:** Less intuitive glyph path extraction
4. **Missing features:** Incomplete kerning support

### WOFF2 Alternatives

| Library | Bundle Size | Why Not |
|---------|-------------|---------|
| brotli-wasm | ~400KB | Similar size, wawoff2 is WOFF2-specific and simpler API |
| pako + custom | N/A | Pako is zlib, not Brotli - won't work for WOFF2 |
| fontkit (built-in) | N/A | Pulls in entire fontkit for WOFF2 support |

## Zero-Dependency Analysis

**Can we avoid all dependencies?**

| Feature | Zero-dep feasible? | Effort | Recommendation |
|---------|-------------------|--------|----------------|
| TTF parsing | Partially | 2-3 weeks | Use opentype.js - not worth reinventing |
| OTF/CFF parsing | No | 4-6 weeks | CFF is complex, use opentype.js |
| WOFF2 decode | No | Impractical | Brotli requires WASM, use wawoff2 |
| WebGPU | Yes | 0 | Direct API use |

**Verdict:** Accept opentype.js (~90KB) and wawoff2 (~450KB lazy-loaded). The alternative is weeks of development for a worse result.

## Bundle Size Summary

| Scenario | Size (minified) | Size (gzip) |
|----------|----------------|-------------|
| TTF/OTF only | ~90KB | ~30KB |
| With WOFF2 support | ~540KB | ~180KB |
| WOFF2 lazy-loaded | ~90KB initial + 450KB on demand | ~30KB + 150KB |

**Recommendation:** Implement WOFF2 as lazy-loaded optional feature. Most use cases will use TTF/OTF directly.

## Installation

```bash
# Core font parsing
npm install opentype.js

# TypeScript support (dev only)
npm install -D @types/opentype.js @webgpu/types

# WOFF2 support (optional, can be lazy-loaded)
npm install wawoff2
```

## Integration Pattern

```typescript
// src/font/parser.ts
import opentype from 'opentype.js';
import type { Shape } from '../core/Shape';

export async function parseFont(buffer: ArrayBuffer): Promise<opentype.Font> {
  // Check for WOFF2 magic number
  const view = new DataView(buffer);
  const magic = view.getUint32(0, false);

  if (magic === 0x774F4632) { // 'wOF2'
    const { decompress } = await import('wawoff2');
    buffer = await decompress(buffer);
  }

  return opentype.parse(buffer);
}

export function glyphToShape(glyph: opentype.Glyph): Shape {
  const path = glyph.getPath(0, 0, 1);
  // Convert opentype path commands to msdfgen Shape
  // path.commands contains: moveTo, lineTo, qCurveTo, curveTo, closePath
  // Map to Shape's LinearSegment, QuadraticSegment, CubicSegment
}
```

## API Surface Needed from opentype.js

```typescript
// What we actually use from opentype.js
interface OpentypeUsage {
  // Font loading
  parse(buffer: ArrayBuffer): Font;
  load(url: string, callback): void;

  // Font properties
  font.glyphs: GlyphSet;
  font.unitsPerEm: number;
  font.getKerningValue(left, right): number;

  // Glyph access
  font.charToGlyph(char: string): Glyph;
  font.stringToGlyphs(str: string): Glyph[];

  // Glyph properties
  glyph.advanceWidth: number;
  glyph.getPath(x, y, fontSize): Path;
  glyph.getBoundingBox(): BoundingBox;

  // Path commands (what we convert to Shape)
  path.commands: PathCommand[]; // moveTo, lineTo, qCurveTo, curveTo, closePath
}
```

## WebGPU Shader Pattern

```wgsl
// MSDF text rendering shader
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    let msd = textureSample(msdfTexture, msdfSampler, in.uv).rgb;
    let sd = median(msd.r, msd.g, msd.b);
    let screenPxDistance = screenPxRange * (sd - 0.5);
    let opacity = clamp(screenPxDistance + 0.5, 0.0, 1.0);
    return vec4f(textColor.rgb, textColor.a * opacity);
}

fn median(r: f32, g: f32, b: f32) -> f32 {
    return max(min(r, g), min(max(r, g), b));
}
```

## Confidence Assessment

| Recommendation | Confidence | Reason |
|---------------|------------|--------|
| opentype.js for TTF/OTF | HIGH | Well-established, used by major projects, zero deps |
| wawoff2 for WOFF2 | MEDIUM | Best available option, verify current version and WASM size |
| No WebGPU wrapper | HIGH | Direct API is clean, no abstraction needed |
| Lazy-load WOFF2 | HIGH | Standard pattern, reduces initial bundle |
| @types/opentype.js | MEDIUM | Verify types match current opentype.js version |
| fontkit rejection | HIGH | Dependency tree is objectively larger |
| typr.js rejection | HIGH | Verifiable unmaintained status |

## Verification Needed Before Implementation

1. **Confirm opentype.js version:** Check npm for latest stable release
2. **Test wawoff2 in browser:** Ensure WASM loads correctly in Vite dev server
3. **Verify @types/opentype.js:** Ensure types match the opentype.js version being used
4. **Test glyph path extraction:** Verify commands array format matches expectations

## Sources

- opentype.js GitHub: https://github.com/opentypejs/opentype.js
- fontkit GitHub: https://github.com/foliojs/fontkit
- wawoff2 GitHub: https://github.com/nicolo-ribaudo/nicolo-ribaudo
- WebGPU specification: https://www.w3.org/TR/webgpu/
- MSDF rendering technique: Chlumsky's msdfgen paper and implementation

**Note:** Package versions and bundle sizes should be verified against npm before finalizing implementation. Training data may be 6-18 months stale.

---

*Stack research: 2026-05-04*
