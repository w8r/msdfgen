# Phase 2: Atlas Generation - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate MSDF texture atlases containing multiple glyphs with proper packing, metrics storage, and <100ms performance for typical character sets. This phase builds on Phase 1's font parsing and glyph-to-Shape conversion.

</domain>

<decisions>
## Implementation Decisions

### API Design
- Character input via string (e.g., `"ABCabc0123"`) — simple, auto-dedupes, readable
- Return single object: `{ atlas: Bitmap, glyphs: Map<string, GlyphInfo>, generationTimeMs: number }`
- Synchronous API only — no Promise wrapper needed
- Minimal configuration options: glyph size (px), padding

### Metrics Format
- Plain objects for glyph info — JSON-serializable, easy to inspect
- Normalized UV coordinates (0-1 range) — GPU-ready, resolution independent
- Include both font-unit values AND atlas-space values — useful for different rendering contexts
- Map keyed by character string — `glyphs.get('A')`

### Packing Algorithm
- Use potpack (Mapbox library) for bin packing — fast, simple, proven for font atlases
- Padding between glyphs: configurable (user-specified)
- Overflow handling: split into multiple atlases if needed
- Atlas dimensions: power-of-two (512x512, 1024x1024, etc.) for GPU compatibility

### Performance Approach
- Single-threaded first — measure actual perf before optimizing
- Default glyph size: 32px — good quality/speed balance
- Include `generationTimeMs` in returned result — useful for debugging and demo display
- No caching of individual glyph MSDFs — generate fresh each time, fast enough

### Claude's Discretion
- Internal bitmap copying/composition strategy
- Error handling for missing glyphs
- Exact potpack integration details
- Multiple atlas splitting threshold and strategy

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Bitmap<Float32Array, 3>`: Ready for MSDF atlas storage with getSection/copyFromSection support
- `generateMSDF(output, shape, transformation)`: Single glyph generation works
- `Font.getGlyph(char).toShape()`: Glyph → Shape pipeline complete from Phase 1
- `GlyphMetrics`: Has `advanceWidth` and `leftSideBearing` in font units
- `SDFTransformation`: Handles coordinate mapping from shape space to pixel space

### Established Patterns
- Generators return void and write to pre-allocated Bitmap — atlas should follow this pattern
- Float32Array internally, convert to Uint8Array at boundaries if needed
- Co-located test files (`*.test.ts`) with vitest
- Barrel exports in `index.ts` files

### Integration Points
- New code goes in `src/core/generators/` or new `src/atlas/` directory
- Export through `src/index.ts` for public API
- Demo can use atlas API to replace single-glyph rendering

</code_context>

<specifics>
## Specific Ideas

- Use potpack from Mapbox for bin packing — user explicitly requested this library
- Support multiple atlases for large character sets — don't fail, split gracefully
- Power-of-two atlas dimensions for broad GPU compatibility

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-atlas-generation*
*Context gathered: 2026-05-07*
