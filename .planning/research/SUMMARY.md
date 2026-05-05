# Project Research Summary

**Project:** msdfgen-ts (Font parsing + WebGPU rendering milestone)
**Domain:** Multi-channel Signed Distance Field (MSDF) text rendering with WebGPU
**Researched:** 2026-05-04
**Confidence:** MEDIUM

## Executive Summary

This project integrates font parsing (TTF/OTF/WOFF2) with existing MSDF generation code to create a WebGPU-powered text rendering demo. Experts build MSDF text renderers through a five-stage pipeline: font parsing -> shape conversion -> MSDF generation -> atlas packing -> GPU rendering. The existing codebase already handles MSDF generation; the new work focuses on the integration points.

The recommended approach prioritizes risk reduction by tackling the unknowns first: start with font parsing and shape conversion (highest uncertainty), then atlas packing (moderate complexity), and finally WebGPU rendering (well-documented, lowest risk). Use opentype.js for font parsing rather than building a custom parser — the 90KB bundle cost is acceptable given the 2-3 week development effort saved. Lazy-load wawoff2 for WOFF2 support to keep initial bundle under 100KB.

The critical risks are font metric misinterpretation (wrong scaling, clipped glyphs), glyph contour winding order confusion (inverted renders), and MSDF shader implementation errors (blurry or incorrectly antialiased text). These pitfalls manifest during integration testing and can require significant rework if caught late. Prevent them through comprehensive test character sets ("8", "B", "M", "W", accented characters) and early validation of the font-to-shape conversion pipeline before moving to GPU rendering.

## Key Findings

### Recommended Stack

The stack prioritizes zero dependencies where practical while accepting strategic compromises. Core font parsing uses opentype.js (90KB, zero runtime dependencies) rather than weeks of custom development for TTF/OTF parsing. WOFF2 support via wawoff2 (450KB WASM) loads lazily only when needed. WebGPU uses the native API directly without wrapper libraries — the API is already well-designed and adding abstraction creates friction for an educational demo.

**Core technologies:**
- **opentype.js (^1.3.4+)**: TTF/OTF parsing — mature library, zero dependencies, extracts glyph paths directly as commands (moveTo, lineTo, curveTo, closePath)
- **wawoff2 (^2.0.1+)**: WOFF2 decompression — WASM Brotli decoder, lazy-loaded to avoid 450KB in initial bundle
- **Native WebGPU API**: GPU rendering — no wrapper needed, direct API use is cleaner and more educational for demo purposes
- **@types/opentype.js, @webgpu/types**: TypeScript definitions — development-only, zero runtime cost

**Critical decision:** Reject fontkit despite popularity due to 7+ dependency tree and 300KB+ total bundle size. Reject custom TTF parser despite zero-dependency appeal due to 2-3 week implementation effort with worse results.

### Expected Features

Users expect an interactive demo proving MSDF text rendering quality at any scale. Table stakes include editable text input, live MSDF rendering, zoom controls, font loading (at minimum TTF), and the core MSDF shader with proper median calculation. Missing any of these makes the demo feel incomplete or fails to demonstrate the technology's value proposition.

**Must have (table stakes):**
- Editable text input — core interaction, users need to type and see results
- Live MSDF rendering — WebGPU pipeline with median(r,g,b) shader pattern
- Zoom controls — demonstrates "infinitely zoomable" claim, the whole point of MSDF
- Font loading — at minimum TTF/OTF via opentype.js, users want to try their fonts
- Sharp text at all scales — proper screen-space derivative calculation in shader
- Performance stats — FPS and generation time to prove the library is fast

**Should have (competitive):**
- Comparison mode (SDF vs MSDF) — side-by-side quality demonstration showing why MSDF is better
- Distance field visualization toggle — educational value, shows raw MSDF data vs rendered output
- Color picker — visual appeal, demonstrates rendering flexibility
- Atlas debug view — shows generated glyph atlas texture for educational purposes

**Defer (v2+):**
- Subpixel rendering — complex, display-dependent, separate shader variant required
- Multiple fonts — atlas management complexity not justified for demo
- Advanced effects (outline, shadow, animations) — impressive but non-essential "wow factor"
- Full text layout engine — explicitly out of scope per PROJECT.md

### Architecture Approach

The architecture follows a linear five-component pipeline with well-defined data transformations at each stage. Font Parser extracts glyph outlines from binary font files, Shape Converter transforms font path commands into MSDF-compatible Shape objects, MSDF Generator (existing code) creates distance fields, Atlas Packer bins glyphs into a single texture, and WebGPU Renderer displays text using instanced quads. This separation allows independent development and testing of each component.

**Major components:**
1. **Font Parser** — Parses font binary (ArrayBuffer) into Font object with glyph access API, extracts metrics (unitsPerEm, ascender, descender) and per-glyph path commands
2. **Shape Converter** — Transforms glyph path commands (moveTo, lineTo, quadraticCurveTo, bezierCurveTo) into Shape with LinearSegment, QuadraticSegment, CubicSegment edges
3. **MSDF Generator** — Existing code, no changes needed, generates multi-channel distance fields from Shape input
4. **Atlas Packer** — Shelf-packing algorithm to combine glyph bitmaps into single GPU texture with UV mapping and metrics metadata
5. **WebGPU Renderer** — Instanced quad rendering with MSDF fragment shader, handles texture sampling, median calculation, and screen-space antialiasing

**Key patterns:** Lazy glyph generation (generate MSDF on-demand rather than pre-generating entire character set), instanced quad rendering (single draw call for all text), proper font unit to pixel projection (respecting unitsPerEm scaling).

### Critical Pitfalls

**1. Incorrect screen-space derivative calculation in shader** — Text appears blurry or has stepping artifacts. MSDF rendering requires calculating threshold width from screen-space derivatives (dpdx/dpdy in WGSL) after median calculation, not before. Using fixed thresholds or wrong derivative calculation produces inconsistent sharpness across zoom levels. Prevention: Calculate derivatives on median result, not input channels.

**2. Glyph contour winding order confusion** — Glyphs render inverted or letters with counters (8, B, O, e, a) appear as solid blobs. TrueType uses clockwise outer/counter-clockwise inner; PostScript/CFF uses opposite. Font parsers may or may not normalize. Prevention: Compute signed area to determine winding, normalize all contours to consistent convention, test with "8", "B", "@", "%".

**3. Edge coloring failures at sharp corners** — Sharp corners (M, W, V, N) show color bleeding or notches. MSDF edge coloring must assign different channels to edges meeting at corners. Prevention: Use proven angle threshold (~3.0 radians / 171 degrees), implement robust coloring algorithm (Chlumsky's, not simple alternation), test with sharp-cornered characters.

**4. Font metric misinterpretation (unitsPerEm)** — Text appears wrong size, glyphs clipped, line spacing incorrect. Font files express metrics in font units (typically 1000 or 2048 per em). Must scale by fontSize / unitsPerEm. Prevention: Always extract and use unitsPerEm from font, never assume 1000 or 2048, test with multiple fonts.

**5. Texture atlas glyph bleeding** — Characters show fragments of adjacent glyphs, especially when zoomed out. Insufficient padding between glyphs in atlas allows texture filtering to sample beyond boundaries. Prevention: Add padding equal to MSDF distance range (4+ pixels), use clamp sampling, calculate UVs with half-texel insets.

## Implications for Roadmap

Based on research, the work naturally divides into three phases ordered by risk and dependency. Start with the unknowns (font parsing), validate end-to-end integration before GPU complexity (atlas), then add rendering with well-documented patterns (WebGPU).

### Phase 1: Font Parser + Shape Converter
**Rationale:** Highest uncertainty and technical risk. Font parsing is the critical unknown — getting glyph paths from font binaries into Shape objects determines success of entire milestone. If this fails or produces incorrect data, nothing downstream works. Tackle risky work first.

**Delivers:**
- Font file loading (TTF/OTF via opentype.js)
- Glyph path extraction as commands
- GlyphOutline to Shape conversion
- Validation: Shape objects match MSDF generator expectations

**Addresses features:**
- Font loading (table stakes)
- Lays groundwork for all rendering features

**Avoids pitfalls:**
- Glyph contour winding order confusion (#2) — normalize winding during conversion
- Font metric misinterpretation (#6) — extract unitsPerEm, ascender, descender correctly
- Composite glyph failures (#7) — handle accented characters with transform matrices
- Missing CFF support (#11) — verify opentype.js handles both TrueType and CFF

**Validation strategy:** Test with diverse character set ("8", "B", "M", "cafe", "gyp") across multiple fonts (system font, Google Font TrueType, Google Font CFF). Verify Shape output visually by rendering with existing Canvas2D demo before proceeding.

### Phase 2: Atlas Generator + Packer
**Rationale:** Moderate complexity, depends on Phase 1 output. Atlas generation integrates font parsing, shape conversion, and existing MSDF generator into single end-to-end pipeline. Validates the data pipeline before adding GPU complexity. Can verify output visually using Canvas2D.

**Delivers:**
- MSDF generation for character set
- Shelf-packing algorithm
- Atlas texture with UV mapping
- Glyph metrics extraction and storage
- Atlas debug visualization (canvas rendering)

**Uses stack:**
- opentype.js for glyph metrics (advanceWidth, bearings)
- Existing MSDF generator (no changes)

**Implements architecture:**
- Atlas Packer component with GlyphMetrics and PackedAtlas interfaces
- Font unit to pixel projection pattern
- Lazy glyph generation pattern (optional optimization)

**Avoids pitfalls:**
- Edge coloring at corners (#3) — test with "M", "W", "V", "N"
- Distance range calculation (#8) — calculate and store range metadata with atlas
- Texture atlas glyph bleeding (#5) — implement proper padding and UV calculation

**Validation strategy:** Render generated atlas to Canvas2D, verify glyph quality and packing, measure generation performance.

### Phase 3: WebGPU Renderer + Interactive Demo
**Rationale:** Lowest technical risk (well-documented patterns), depends on Phase 2 atlas. WebGPU text rendering is established with clear examples. By this phase, data pipeline is validated and work focuses on shader implementation and interactivity.

**Delivers:**
- WebGPU render pipeline with MSDF shader
- Texture upload and binding
- Instanced quad rendering
- Text input and live update
- Zoom controls
- Performance stats display
- Polish: color picker, distance field toggle, comparison mode

**Uses stack:**
- Native WebGPU API (no wrapper)
- @webgpu/types for development

**Implements architecture:**
- WebGPU Renderer component
- Instanced quad rendering pattern
- Screen-space derivative antialiasing

**Avoids pitfalls:**
- Incorrect screen-space derivatives (#1) — implement proper median + derivatives calculation
- WebGPU texture format/sRGB (#4) — use rgba8unorm (linear), not rgba8unorm-srgb
- Buffer alignment violations (#9) — explicit WGSL struct alignment annotations
- Bind group layout mismatch (#15) — define layouts once, reuse
- Instancing stride miscalculation (#16) — calculate from WGSL perspective

**Validation strategy:** Test zoom from 8px to 128px, verify sharp edges at all scales, measure FPS, compare visually to reference MSDF implementations.

### Phase Ordering Rationale

- **Risk-first approach:** Font parsing is the unknown with highest chance of blocking progress. Discovering fundamental issues (e.g., opentype.js doesn't extract paths as expected) early prevents wasted work.
- **Validation at each stage:** Each phase produces verifiable output. Phase 1 outputs Shapes (validate with existing canvas demo). Phase 2 outputs atlas (validate with Canvas2D render). Phase 3 adds final rendering.
- **Dependency flow:** Clean unidirectional dependencies. Phase 2 needs Phase 1 output. Phase 3 needs Phase 2 output. No circular dependencies.
- **Deferring complexity:** WebGPU rendering is deferred to Phase 3 when data pipeline is validated. If data pipeline has issues, debugging without GPU complexity is easier.

### Research Flags

**Phases with standard patterns (skip phase research):**
- **Phase 2 (Atlas):** Shelf-packing is standard bin-packing problem, MSDF generation already understood from existing code
- **Phase 3 (WebGPU):** Text rendering with instanced quads is established pattern, MSDF shader formula is documented

**Phases that may need validation research:**
- **Phase 1 (Font Parser):** If opentype.js API doesn't match expectations, may need research into alternative approaches or API workarounds. However, opentype.js is mature with good documentation, so likelihood is low.

**Overall assessment:** Standard patterns dominate. No phases require deep domain research beyond what's already captured in these research files.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | opentype.js recommendation is HIGH confidence (well-established, verifiable), but specific version numbers and bundle sizes based on training data need npm verification before implementation |
| Features | MEDIUM-HIGH | Table stakes features based on established MSDF demo patterns (HIGH confidence). Differentiator recommendations based on observed demo patterns (MEDIUM confidence). Anti-features align with PROJECT.md constraints (HIGH confidence). |
| Architecture | MEDIUM-HIGH | Pipeline structure matches observed patterns in MSDF implementations and existing codebase analysis. Component boundaries are clear. Patterns are established. Uncertainty is in specific API details (opentype.js path command format, WebGPU exact API calls). |
| Pitfalls | MEDIUM | Critical pitfalls based on domain knowledge from training data about MSDF rendering, font parsing, and WebGPU. Specific solutions are established patterns but should be verified against current WebGPU spec and opentype.js docs during implementation. |

**Overall confidence:** MEDIUM

Research is based on training data (no web verification available). Core patterns and pitfalls are well-established in MSDF domain. Recommendations are actionable but specific details (package versions, exact APIs) should be verified during implementation. No fundamental unknowns that would block progress.

### Gaps to Address

**During planning/implementation:**

- **opentype.js API verification:** Confirm path command format matches expected structure (moveTo, lineTo, qCurveTo, curveTo, closePath). Verify CFF font support. Check if composite glyphs are resolved automatically or require manual handling.

- **Package version verification:** Check npm for current stable versions of opentype.js, wawoff2, @types/opentype.js, @webgpu/types. Verify bundle sizes stated in STACK.md (90KB for opentype.js, 450KB for wawoff2 WASM).

- **WebGPU API specifics:** Verify current WebGPU API for texture formats (rgba8unorm vs rgba8unorm-srgb), bind group layout creation, buffer alignment requirements. API may have evolved since training data.

- **WGSL derivative functions:** Confirm exact syntax for screen-space derivatives (dpdx/dpdy vs fwidth) in current WGSL specification.

**How to handle:**

- Phase 1 kickoff: Spend 30-60 minutes verifying opentype.js API with simple test (load font, extract one glyph, inspect path commands)
- Phase 3 kickoff: Review current WebGPU documentation for API changes, especially texture formats and shader syntax
- Throughout: Treat research recommendations as high-confidence starting points, not absolute requirements. Adjust based on actual API behavior discovered during implementation.

## Sources

### Primary (aggregated from research files)

**STACK.md sources:**
- opentype.js GitHub: https://github.com/opentypejs/opentype.js
- fontkit GitHub: https://github.com/foliojs/fontkit (evaluated and rejected)
- wawoff2 GitHub: https://github.com/nicolo-ribaudo/nicolo-ribaudo
- WebGPU specification: https://www.w3.org/TR/webgpu/
- Training data: package ecosystem knowledge, bundle size analysis

**FEATURES.md sources:**
- MSDF rendering technique: Chlumsky's msdfgen paper and implementation
- WebGPU best practices: Training data from specification and implementations
- Project constraints: /Users/amilevski/Projects/msdfgen/.planning/PROJECT.md
- Instance rendering patterns: Standard GPU text rendering approaches

**ARCHITECTURE.md sources:**
- Existing codebase: src/core/generators/msdfgen.ts, src/core/shape/Shape.ts
- Current demos: demo/shape-demo.ts, demo/demo-browser.ts
- Original msdfgen C++ architecture (training data)
- WebGPU text rendering best practices (training data)

**PITFALLS.md sources:**
- Training data: MSDF implementations (msdfgen, msdf-bmfont-xml, three-msdf-text)
- Training data: WebGPU specification and tutorials
- Training data: OpenType/TrueType font specifications

### Confidence Notes

All research based on training data (web searches unavailable during research session). Recommendations reflect established patterns in MSDF text rendering, font parsing, and WebGPU domains. Core concepts are stable and well-documented. Specific implementation details (exact API calls, current package versions) should be verified during implementation against current documentation.

---
*Research completed: 2026-05-04*
*Ready for roadmap: yes*
