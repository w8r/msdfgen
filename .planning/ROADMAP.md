# Roadmap: msdfgen-ts v1.0

**Milestone:** v1.0 - Font Processing and WebGPU Demo
**Created:** 2026-05-06
**Phases:** 3
**Coverage:** 26/26 requirements mapped

## Phases

- [x] **Phase 1: Font Parser Integration** - Load font files and convert glyphs to Shape objects
- [ ] **Phase 2: Atlas Generation** - Generate MSDF atlas with glyph metrics and packing
- [ ] **Phase 3: WebGPU Interactive Demo** - Render text with WebGPU, add interactivity and visualization

---

## Phase Details

### Phase 1: Font Parser Integration

**Goal:** Enable loading font files (TTF, OTF, WOFF2) and converting glyph outlines to Shape objects compatible with the existing MSDF generator.

**Depends on:** Nothing (builds on existing Shape infrastructure)

**Requirements:** [FONT-01, FONT-02, FONT-03, FONT-04, FONT-05, QUAL-03, QUAL-04, QUAL-05]

**Success Criteria** (what must be TRUE):
1. User can load a TTF or OTF font file and receive a parsed Font object with glyph access
2. User can load a WOFF2 font file (lazily decompressed) and receive the same Font interface
3. User can request any glyph by character and receive a Shape object ready for MSDF generation
4. Font metrics (unitsPerEm, ascender, descender) are correctly extracted and accessible
5. Unit tests verify font parsing with diverse character sets ("8", "B", "M", accented chars) across multiple fonts

**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md - Core font parsing and glyph-to-Shape conversion
- [x] 01-02-PLAN.md - WOFF2 support and comprehensive testing

---

### Phase 2: Atlas Generation

**Goal:** Generate MSDF texture atlases containing multiple glyphs with proper packing, metrics storage, and performance meeting the <100ms target.

**Depends on:** Phase 1 (requires font parsing and glyph-to-Shape conversion)

**Requirements:** [MSDF-01, MSDF-02, MSDF-03]

**Success Criteria** (what must be TRUE):
1. User can request an atlas for a character set and receive a single texture containing all glyphs
2. Each glyph in the atlas has associated metrics (UV coordinates, bearing, advance width) accessible via API
3. Atlas generation for standard ASCII character set (A-Z, a-z, 0-9, punctuation) completes in <100ms
4. Atlas uses potpack bin packing with proper padding to prevent glyph bleeding at texture boundaries

**Plans:** 2 plans

Plans:
- [ ] 02-01-PLAN.md - Types, AtlasGenerator implementation with potpack
- [ ] 02-02-PLAN.md - Comprehensive tests and performance verification

---

### Phase 3: WebGPU Interactive Demo

**Goal:** Deliver a fully interactive WebGPU demo that renders MSDF text with pretext layout, supporting zoom/pan, live text editing, custom fonts, and visualization toggles.

**Depends on:** Phase 2 (requires atlas generation with metrics)

**Requirements:**
- GPU-01: Demo renders text using WebGPU with standard MSDF shader (median RGB + smoothstep)
- GPU-02: Demo uses instanced quad rendering for efficient text display
- GPU-03: Text remains sharp at any zoom level (scale-aware smoothing)
- GPU-04: Demo displays helpful error when WebGPU is not supported
- GPU-05: Demo uses pretext (chenglou/pretext) for text layout and positioning
- INT-01: User can type/edit text in an input field and see it rendered live
- INT-02: User can zoom with mouse wheel (smooth, centered on cursor)
- INT-03: User can pan the viewport by dragging
- INT-04: User can pick text color via color selector
- INT-05: User can pick background color via color selector
- INT-06: User can load a custom font file (drag-drop or file picker)
- VIS-01: User can toggle distance field visualization (show raw MSDF data vs rendered text)
- VIS-02: User can view the generated glyph atlas texture
- VIS-03: User can toggle heatmap mode (color-coded distance gradient)
- QUAL-01: Demo displays generation time for atlas
- QUAL-02: Demo displays current FPS

**Success Criteria** (what must be TRUE):
1. User can type text in an input field and see it rendered live in the WebGPU canvas using pretext layout
2. User can zoom in/out with mouse wheel and text remains perfectly sharp at any scale (no blur, no pixelation)
3. User can pan the viewport by dragging and zoom centers on cursor position
4. User can change text and background colors via color pickers
5. User can drag-drop or select a custom font file and see text re-render with the new font
6. User can toggle between rendered text view, raw MSDF distance field view, and heatmap mode
7. User can view the generated atlas texture in a debug panel
8. Demo displays atlas generation time (ms) and current FPS
9. Demo shows a clear error message when WebGPU is not available in the browser

**Plans:** TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Font Parser Integration | 2/2 | Complete    | 2026-05-07 |
| 2. Atlas Generation | 0/2 | Planned | - |
| 3. WebGPU Interactive Demo | 0/? | Not started | - |

---

## Coverage Validation

| Requirement | Phase | Mapped |
|-------------|-------|--------|
| FONT-01 | Phase 1 | Yes |
| FONT-02 | Phase 1 | Yes |
| FONT-03 | Phase 1 | Yes |
| FONT-04 | Phase 1 | Yes |
| FONT-05 | Phase 1 | Yes |
| MSDF-01 | Phase 2 | Yes |
| MSDF-02 | Phase 2 | Yes |
| MSDF-03 | Phase 2 | Yes |
| GPU-01 | Phase 3 | Yes |
| GPU-02 | Phase 3 | Yes |
| GPU-03 | Phase 3 | Yes |
| GPU-04 | Phase 3 | Yes |
| GPU-05 | Phase 3 | Yes |
| INT-01 | Phase 3 | Yes |
| INT-02 | Phase 3 | Yes |
| INT-03 | Phase 3 | Yes |
| INT-04 | Phase 3 | Yes |
| INT-05 | Phase 3 | Yes |
| INT-06 | Phase 3 | Yes |
| VIS-01 | Phase 3 | Yes |
| VIS-02 | Phase 3 | Yes |
| VIS-03 | Phase 3 | Yes |
| QUAL-01 | Phase 3 | Yes |
| QUAL-02 | Phase 3 | Yes |
| QUAL-03 | Phase 1 | Yes |
| QUAL-04 | Phase 1 | Yes |
| QUAL-05 | Phase 1 | Yes |

**Summary:**
- Total v1 requirements: 26
- Mapped to phases: 26
- Unmapped: 0

---

*Roadmap created: 2026-05-06*
*Phase 1 completed: 2026-05-07*
*Phase 2 planned: 2026-05-07*
*Next step: `/gsd:execute-phase 02`*
