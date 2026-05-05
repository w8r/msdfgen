# Feature Landscape

**Domain:** WebGPU MSDF text rendering demo
**Researched:** 2026-05-04
**Confidence:** MEDIUM (based on established MSDF rendering patterns and WebGPU best practices)

## Table Stakes

Features users expect. Missing = demo feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Editable text input** | Core interaction - users expect to type and see results | Low | Standard textarea/input + reactivity |
| **Live MSDF rendering** | Core value proposition - see text rendered via MSDF in real-time | Medium | Requires atlas generation + WebGPU pipeline |
| **Zoom controls** | Must demonstrate "infinitely zoomable" claim | Low | Transform matrix, wheel events |
| **Font loading** | Users want to try their own fonts | Medium | TTF/OTF/WOFF2 parsing, glyph extraction |
| **WebGPU MSDF shader** | Core rendering - the median(r,g,b) + smoothstep pattern | Low | Well-documented standard pattern |
| **Sharp text at all scales** | The whole point of MSDF | Medium | Proper shader smoothing calculation |
| **Basic error states** | WebGPU not supported, font load failure | Low | Graceful degradation messages |
| **Performance stats** | Generation time, FPS - proves library is fast | Low | Already exists in current demo |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Comparison mode (SDF vs MSDF)** | Shows why MSDF is better - side-by-side quality | Medium | Two render pipelines, split view |
| **Distance field visualization toggle** | Educational - see raw MSDF data vs rendered output | Low | Toggle between atlas view and rendered text |
| **Color picker for text/background** | Makes demo visually appealing, shows flexibility | Low | Color uniform in shader |
| **Font metrics overlay** | Educational - shows baseline, ascender, descender | Medium | Requires font metrics extraction |
| **Subpixel rendering toggle** | Shows advanced MSDF technique (LCD subpixel) | High | Separate shader variant, display-dependent |
| **Export PNG/SVG** | Lets users capture output for presentations | Medium | Canvas toBlob + SVG generation |
| **Atlas debug view** | Shows generated glyph atlas texture | Low | Render texture to separate canvas |
| **Outline/stroke effect** | Shows MSDF can do effects beyond fill | Medium | Shader modification, adjustable width |
| **Drop shadow effect** | Popular text effect, easy with SDF | Low | Offset + blur in shader |
| **Glyph-level animation** | "Wow factor" - per-character transforms | Medium | Instance data, time uniform |
| **Heatmap distance visualization** | Color-coded distance field (rainbow gradient) | Low | Different shader output mode |
| **Multiple font comparison** | Load 2+ fonts and compare rendering | High | Multiple atlas management |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full text layout engine** | Out of scope per PROJECT.md, huge complexity | Suggest external layouter, single line or simple multiline only |
| **RTL/BiDi text support** | Complex text layout problem | Document as out of scope, render LTR only |
| **Text selection/cursor** | Editor feature creep, not a rendering demo | Focus on rendering, not editing UX |
| **Font subsetting** | Separate concern per PROJECT.md | Load full font, let users subset externally |
| **WebGL fallback** | WebGPU-only per PROJECT.md, adds complexity | Clear "WebGPU required" message |
| **Server-side rendering** | Library focus per PROJECT.md | Browser-only demo |
| **Kerning/ligatures** | Requires OpenType feature parsing | Basic letter spacing only, document limitation |
| **Emoji rendering** | Color fonts are a different problem | Text-only demo, document limitation |
| **Word wrapping** | Layout engine territory | Manual newlines only |
| **Undo/redo** | Editor feature creep | Simple text replacement |

## Feature Dependencies

```
Font loading → Glyph extraction → MSDF generation → Atlas creation → WebGPU texture
                                                                          ↓
                                                            WebGPU shader pipeline
                                                                          ↓
Editable text input → Character → Position data → Instance buffer → Rendered text
                      layout

Zoom controls → Transform uniform → Shader → Smoothing adjustment (scale-aware)

Color picker → Color uniform → Shader

Comparison mode → SDF pipeline (parallel to MSDF)
               → Split view rendering

Distance field toggle → Atlas texture → Separate render pass / toggle shader mode

Effects (outline, shadow) → Modified shader → Additional uniforms
```

## Key Technical Requirements

### WebGPU MSDF Shader Pattern (Table Stakes)

The standard MSDF rendering shader computes the median of RGB channels and applies smoothstep:

```wgsl
// Fragment shader core
let msdf = textureSample(msdfTexture, msdfSampler, uv);
let r = msdf.r;
let g = msdf.g;
let b = msdf.b;
let median = max(min(r, g), min(max(r, g), b));

// Screen-space derivative for proper smoothing at any zoom
let screenTexSize = 1.0 / fwidth(uv);
let smoothing = clamp(0.5 / (pxRange * screenTexSize), 0.0, 0.5);

let alpha = smoothstep(0.5 - smoothing, 0.5 + smoothing, median);
return vec4(textColor.rgb, alpha * textColor.a);
```

### Atlas Generation Requirements

- Pack glyphs efficiently (shelf or rectangle packing)
- Store glyph metrics (bearing, advance, size)
- Generate MSDF for each glyph using existing library
- Upload combined atlas to WebGPU texture

### Instance Rendering Pattern

Efficient text rendering uses instanced quads:
- One quad geometry (4 vertices, 6 indices)
- Per-glyph instance data: position, UV bounds, size
- Single draw call for all visible glyphs

## MVP Recommendation

**Phase 1 - Core Demo (Table Stakes):**
1. Editable text input (textarea)
2. Single font loading (TTF via opentype.js or custom parser)
3. MSDF atlas generation for typed characters
4. WebGPU rendering pipeline with standard MSDF shader
5. Zoom via mouse wheel
6. Performance stats display

**Phase 2 - Polish (Select Differentiators):**
1. Color picker (text/background)
2. Distance field visualization toggle
3. Atlas debug view
4. Comparison mode (SDF vs MSDF quality)

**Defer:**
- Subpixel rendering (complex, display-dependent)
- Multiple fonts (atlas management complexity)
- Advanced effects (outline, shadow - nice-to-have)
- Animations (impressive but non-essential)

## Complexity Notes

| Feature | Why This Complexity Level |
|---------|---------------------------|
| Font loading (Medium) | WOFF2 requires Brotli decompression; TTF parsing is moderately complex but well-documented |
| Live MSDF rendering (Medium) | Requires coordinating atlas generation, WebGPU pipeline setup, and instance buffer updates |
| Comparison mode (Medium) | Need two parallel pipelines but can share most infrastructure |
| Subpixel rendering (High) | Requires detecting display subpixel layout, separate RGB handling, platform-specific |
| Font metrics overlay (Medium) | Need to extract and render ascender/descender/baseline from parsed font |

## Sources

- MSDF shader patterns: Based on Chlumsky's msdfgen documentation and established rendering techniques
- WebGPU best practices: Based on WebGPU specification and common text rendering implementations
- Instance rendering patterns: Standard GPU text rendering approach used in game engines and UI frameworks
- Project constraints: /Users/amilevski/Projects/msdfgen/.planning/PROJECT.md

**Note:** Web searches were unavailable during research. Recommendations are based on established MSDF text rendering patterns and WebGPU best practices from training data. Confidence is MEDIUM - core patterns are well-established but specific WebGPU API details should be verified against current documentation during implementation.
