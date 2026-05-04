# msdfgen-ts

## What This Is

A TypeScript MSDF (Multi-channel Signed Distance Field) generation library for rendering crisp, resolution-independent text and vector graphics. Processes font files on-the-fly and renders super-sharp zoomable text via WebGPU. Built for perfection with a minimalist philosophy — small bundle, near-zero dependencies.

## Core Value

Generate pixel-perfect MSDF atlases from font files instantly, enabling infinitely zoomable sharp text rendering in real-time applications.

## Requirements

### Validated

- ✓ Shape modeling with contours (linear, quadratic, cubic segments) — existing
- ✓ Signed distance field generation (SDF, MSDF, MTSDF, PseudoSDF) — existing
- ✓ Configurable bitmap output with multiple channel types — existing
- ✓ Edge coloring algorithms — existing
- ✓ Distance calculation strategies (true, perpendicular, multi-distance) — existing
- ✓ Contour combining (simple, overlapping) — existing
- ✓ Zero runtime dependencies — existing

### Active

- [ ] Font file parsing (TTF, OTF, WOFF2 formats)
- [ ] On-the-fly glyph-to-shape conversion
- [ ] WebGPU text rendering pipeline
- [ ] Interactive demo (editable text, font selection, zoom/pan, color controls)
- [ ] Comprehensive unit test coverage for core algorithms
- [ ] Performance optimization (<100ms font processing)
- [ ] Small bundle size optimization

### Out of Scope

- Native desktop application — web-first
- Server-side rendering API — library focus
- Font subsetting/optimization — separate concern
- Text layout engine (line breaking, bidi) — use external layouter
- WebGL fallback — WebGPU only for demo

## Context

This is a TypeScript port inspired by the original C++ msdfgen library by Chlumsky. The core distance field generation is complete and working. The next phase adds font processing and a WebGPU showcase.

**Existing architecture:**
- Layered domain-driven design (core types → shape → distance → bitmap → generators)
- Strategy pattern for distance selectors and contour combiners
- Immutable geometric types
- Pure TypeScript, ES2022 target

**Technical environment:**
- TypeScript 5.9, Vite 7.2, Vitest 2.1
- Node.js 22+ for development
- Browser ES2022+ for runtime
- WebGPU for demo rendering

## Constraints

- **Dependencies**: Minimal — allow small focused library for font parsing (e.g., opentype.js) if truly needed, otherwise build minimal parser
- **Bundle size**: As small as possible — tree-shakeable, no bloat
- **Performance**: Interactive font processing (<100ms for typical font)
- **Browser support**: Modern browsers with WebGPU support (Chrome 113+, Edge 113+, Safari 18+)
- **Philosophy**: Perfect and complete, but minimalistic where possible

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Zero/minimal runtime deps | Bundle size, simplicity, fewer failure points | — Pending |
| WebGPU-only demo | Modern API, best performance, future-focused | — Pending |
| Allow tiny font parsing dep | WOFF2 Brotli + OTF complexity vs. build time | — Pending |
| Interactive editor demo | Shows real-world use case, impressive showcase | — Pending |

---
*Last updated: 2026-05-04 after initialization*
