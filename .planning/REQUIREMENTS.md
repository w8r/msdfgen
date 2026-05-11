# Requirements: msdfgen-ts

**Defined:** 2026-05-04
**Core Value:** Generate pixel-perfect MSDF atlases from font files instantly, enabling infinitely zoomable sharp text rendering

## v1 Requirements

### Font Processing

- [x] **FONT-01**: Library can load TTF font files and extract glyph outlines
- [x] **FONT-02**: Library can load OTF font files and extract glyph outlines
- [x] **FONT-03**: Library can load WOFF2 font files (with Brotli decompression)
- [x] **FONT-04**: Library extracts font metrics (ascender, descender, units per em)
- [x] **FONT-05**: Library converts glyph outlines to Shape objects compatible with MSDF generator

### MSDF Generation

- [x] **MSDF-01**: Library generates MSDF atlas for a set of glyphs on demand
- [x] **MSDF-02**: Library stores glyph metrics (bearing, advance, atlas position) alongside atlas
- [x] **MSDF-03**: Atlas generation completes in <100ms for typical character sets (A-Z, a-z, 0-9, punctuation)

### WebGPU Rendering

- [ ] **GPU-01**: Demo renders text using WebGPU with standard MSDF shader (median RGB + smoothstep)
- [ ] **GPU-02**: Demo uses instanced quad rendering for efficient text display
- [ ] **GPU-03**: Text remains sharp at any zoom level (scale-aware smoothing)
- [ ] **GPU-04**: Demo displays helpful error when WebGPU is not supported
- [ ] **GPU-05**: Demo uses pretext (chenglou/pretext) for text layout and positioning

### Interactivity

- [ ] **INT-01**: User can type/edit text in an input field and see it rendered live
- [ ] **INT-02**: User can zoom with mouse wheel (smooth, centered on cursor)
- [ ] **INT-03**: User can pan the viewport by dragging
- [ ] **INT-04**: User can pick text color via color selector
- [ ] **INT-05**: User can pick background color via color selector
- [ ] **INT-06**: User can load a custom font file (drag-drop or file picker)

### Visualization

- [ ] **VIS-01**: User can toggle distance field visualization (show raw MSDF data vs rendered text)
- [ ] **VIS-02**: User can view the generated glyph atlas texture
- [ ] **VIS-03**: User can toggle heatmap mode (color-coded distance gradient)

### Quality

- [ ] **QUAL-01**: Demo displays generation time for atlas
- [ ] **QUAL-02**: Demo displays current FPS
- [x] **QUAL-03**: Core distance calculations have unit test coverage
- [x] **QUAL-04**: Font parsing has unit test coverage for edge cases
- [x] **QUAL-05**: Library has zero runtime dependencies (font parser allowed as optional peer dep)

## v2 Requirements

### Effects

- **FX-01**: User can apply outline/stroke effect to text
- **FX-02**: User can apply drop shadow effect to text
- **FX-03**: User can compare SDF vs MSDF quality side-by-side

### Advanced

- **ADV-01**: Font metrics overlay (baseline, ascender, descender lines)
- **ADV-02**: Glyph-level animation support
- **ADV-03**: Export rendered text as PNG

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom text layout engine | Using pretext (chenglou/pretext) as external layouter |
| RTL/BiDi text support | Complex layout problem — LTR only |
| Text selection/cursor | Editor feature creep — rendering demo only |
| Font subsetting | Separate concern — load full font |
| WebGL fallback | WebGPU-only per project goals |
| Server-side rendering | Library focus — browser only |
| Kerning/ligatures | OpenType feature complexity — basic spacing only |
| Emoji/color fonts | Different problem domain — text only |
| Word wrapping | Layout engine territory — manual newlines |
| Undo/redo | Editor feature creep |
| Native mobile app | Web-first |
| Multiple simultaneous fonts | Atlas management complexity — one font at a time |
| Subpixel rendering | Display-dependent complexity |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FONT-01 | Phase 1 | Complete |
| FONT-02 | Phase 1 | Complete |
| FONT-03 | Phase 1 | Complete |
| FONT-04 | Phase 1 | Complete |
| FONT-05 | Phase 1 | Complete |
| MSDF-01 | Phase 2 | Complete |
| MSDF-02 | Phase 2 | Complete |
| MSDF-03 | Phase 2 | Complete |
| GPU-01 | Phase 3 | Pending |
| GPU-02 | Phase 3 | Pending |
| GPU-03 | Phase 3 | Pending |
| GPU-04 | Phase 3 | Pending |
| GPU-05 | Phase 3 | Pending |
| INT-01 | Phase 3 | Pending |
| INT-02 | Phase 3 | Pending |
| INT-03 | Phase 3 | Pending |
| INT-04 | Phase 3 | Pending |
| INT-05 | Phase 3 | Pending |
| INT-06 | Phase 3 | Pending |
| VIS-01 | Phase 3 | Pending |
| VIS-02 | Phase 3 | Pending |
| VIS-03 | Phase 3 | Pending |
| QUAL-01 | Phase 3 | Pending |
| QUAL-02 | Phase 3 | Pending |
| QUAL-03 | Phase 1 | Complete |
| QUAL-04 | Phase 1 | Complete |
| QUAL-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-07 - Phase 1 complete (FONT-01-05, QUAL-03-05)*
