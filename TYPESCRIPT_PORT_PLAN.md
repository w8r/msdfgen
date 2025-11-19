# MSDFGEN TypeScript Port - Complete Plan

## Project Overview

Port of the MSDFGEN (Multi-channel Signed Distance Field Generator) library from C++ to TypeScript. This will be a single-threaded, pure TypeScript implementation focusing on algorithm accuracy and maintainability over raw performance.

**Target**: High-quality, type-safe TypeScript library for generating distance fields from vector shapes and fonts.

## Core Principles

1. **Single-threaded execution** - No parallelism complexity, simpler debugging
2. **Faithful algorithm translation** - Match C++ math and logic exactly
3. **Strong typing** - Leverage TypeScript generics for template patterns
4. **TypedArrays for performance** - Use Float64Array/Float32Array for all numeric buffers
5. **Modular architecture** - Keep the clean separation: core → algorithms → generators

## Project Structure

```
msdfgen-ts/
├── src/
│   ├── core/
│   │   ├── types/           # Basic types and geometry
│   │   ├── bitmap/          # Bitmap and pixel data structures
│   │   ├── shape/           # Shape, Contour, EdgeSegment hierarchy
│   │   ├── distance/        # Distance calculation algorithms
│   │   ├── edge-coloring/   # Edge coloring algorithms
│   │   ├── error-correction/# MSDF error correction
│   │   └── generators/      # Main generation functions
│   ├── ext/                 # Extensions (font/SVG loading)
│   └── index.ts            # Public API exports
├── tests/
└── package.json
```

## Phase 1: Core Data Structures

### 1.1 Basic Geometry (Priority: HIGH) ✅ COMPLETED
**Files**: `Vector2.ts`, `Point2.ts`, `Projection.ts`

- [x] Vector2 class with arithmetic operations
  - x, y properties
  - add, subtract, multiply, divide
  - dot product, cross product
  - length, normalize
  - getOrthonormal
- [x] Point2 type alias (Vector2)
- [x] Projection class
  - scale, translate vectors
  - project(point): Point2
  - unproject(point): Point2
  - projectVector(vec): Vector2
  - unprojectVector(vec): Vector2
- [x] 55 tests passing (38 Vector2, 17 Projection)

**C++ Reference**: `core/Vector2.hpp`, `core/Projection.h`

### 1.2 Distance and Range Types (Priority: HIGH) ✅ COMPLETED
**Files**: `SignedDistance.ts`, `Range.ts`, `DistanceMapping.ts`

- [x] SignedDistance class
  - distance: number (double precision)
  - dot: number (alignment indicator)
  - Comparison operators (<, >, <=, >=)
- [x] Range class
  - lower, upper bounds
  - scale and divide operations
- [x] DistanceMapping class
  - Maps world-space distances to pixel values
  - map(value): number, mapDelta(value): number
  - inverse distance mapping
- [x] Delta wrapper class for type safety
- [x] 57 tests passing (21 SignedDistance, 18 Range, 18 DistanceMapping)

**C++ Reference**: `core/SignedDistance.hpp`, `core/Range.hpp`, `core/DistanceMapping.h`

### 1.3 Multi-Channel Distance Types (Priority: MEDIUM) ✅ COMPLETED
**Files**: `MultiDistance.ts`, `MultiAndTrueDistance.ts`

- [x] MultiDistance class (3-channel: R, G, B)
  - r, g, b: number (distance values)
  - median computation
  - Comparison operators (lessThan, greaterThan, etc.)
- [x] MultiAndTrueDistance class (4-channel: R, G, B + true distance)
  - Extends MultiDistance
  - Additional alpha channel for true distance
- [x] 59 tests passing (37 MultiDistance, 22 MultiAndTrueDistance)

**C++ Reference**: `core/edge-selectors.h` (MultiDistance, MultiAndTrueDistance structs)

### 1.4 Bitmap System (Priority: HIGH)
**Files**: `Bitmap.ts`, `BitmapRef.ts`

- [ ] Bitmap<T, N> generic class
  - TypedArray backing (Float32Array, Float64Array, Uint8Array)
  - width, height properties
  - N = number of channels (1, 3, 4)
  - T = data type (number/byte)
  - indexing: get(x, y, channel?): T
  - setPixel(x, y, values: T[]): void
- [ ] BitmapSection (view/slice)
  - Non-owning reference to bitmap region
  - rowStride support (can be negative for Y-flip)
  - Coordinate reorientation
- [ ] YAxisOrientation enum (TOP_DOWN, BOTTOM_UP)

**C++ Reference**: `core/Bitmap.h`, `core/BitmapRef.hpp`

## Phase 2: Edge Segments and Shape

### 2.1 Edge Color System (Priority: HIGH)
**Files**: `EdgeColor.ts`

- [ ] EdgeColor enum/constants
  - BLACK = 0
  - RED = 1
  - GREEN = 2
  - YELLOW = 3 (RED | GREEN)
  - BLUE = 4
  - MAGENTA = 5 (RED | BLUE)
  - CYAN = 6 (GREEN | BLUE)
  - WHITE = 7 (RED | GREEN | BLUE)

**C++ Reference**: `core/EdgeColor.h`

### 2.2 EdgeSegment Hierarchy (Priority: HIGH)
**Files**: `EdgeSegment.ts`, `LinearSegment.ts`, `QuadraticSegment.ts`, `CubicSegment.ts`

- [ ] EdgeSegment abstract base class
  - color: EdgeColor
  - point(param: number): Point2
  - direction(param: number): Vector2
  - directionChange(param: number): Vector2
  - signedDistance(origin: Point2): {distance: SignedDistance, param: number}
  - distanceToPerpendicularDistance(...)
  - length(): number
  - bound(): {xMin, yMin, xMax, yMax}
  - scanlineIntersections(y: number): {x: number, dy: number}[]
  - clone(): EdgeSegment
  - reverse(): void
  - splitInThirds(): [EdgeSegment, EdgeSegment, EdgeSegment]

- [ ] LinearSegment extends EdgeSegment
  - p[2]: Point2[] (start, end)
  - Implements all abstract methods

- [ ] QuadraticSegment extends EdgeSegment
  - p[3]: Point2[] (start, control, end)
  - Bezier quadratic curve implementation
  - Uses quadratic equation solver

- [ ] CubicSegment extends EdgeSegment
  - p[4]: Point2[] (start, control1, control2, end)
  - Bezier cubic curve implementation
  - Iterative closest point search (4 starts × 4 refinement steps)

**C++ Reference**: `core/edge-segments.h`, `core/edge-segments.cpp`

### 2.3 Equation Solvers (Priority: HIGH)
**Files**: `equation-solver.ts`

- [ ] solveQuadratic(a, b, c): number[]
  - Returns 0-2 solutions
  - Handles edge cases (a=0, discriminant)
- [ ] solveCubic(a, b, c, d): number[]
  - Returns 0-3 solutions
  - Cardano's formula with numerical stability

**C++ Reference**: `core/equation-solver.h`, `core/equation-solver.cpp`

### 2.4 Contour and Shape (Priority: HIGH)
**Files**: `Contour.ts`, `Shape.ts`, `EdgeHolder.ts`

- [ ] EdgeHolder wrapper
  - Holds EdgeSegment reference
  - Provides indirection (like C++ pointer)

- [ ] Contour class
  - edges: EdgeHolder[]
  - addEdge(segment: EdgeSegment): void
  - bound(): {xMin, yMin, xMax, yMax}
  - winding(): number (orientation detection)

- [ ] Shape class
  - contours: Contour[]
  - inverseYAxis: boolean
  - addContour(contour: Contour): void
  - normalize(): void (ensures proper orientation)
  - bound(): {xMin, yMin, xMax, yMax}
  - getBounds(border: number): {l, b, r, t}
  - getYAxisOrientation(): YAxisOrientation

**C++ Reference**: `core/Contour.h`, `core/Shape.h`, `core/Shape.cpp`

## Phase 3: Distance Calculation Algorithms

### 3.1 Edge Selectors (Priority: HIGH)
**Files**: `TrueDistanceSelector.ts`, `PerpendicularDistanceSelector.ts`, `MultiDistanceSelector.ts`

- [ ] TrueDistanceSelector
  - DistanceType = SignedDistance
  - distance(minDistance, edge, origin, param): void
  - merge(a, b): SignedDistance
  - EdgeCache structure for optimization

- [ ] PerpendicularDistanceSelector
  - Like TrueDistanceSelector
  - Calls distanceToPerpendicularDistance after finding nearest edge

- [ ] MultiDistanceSelector
  - DistanceType = MultiDistance
  - Tracks distance per color channel
  - merge(a, b): MultiDistance

- [ ] MultiAndTrueDistanceSelector
  - DistanceType = MultiAndTrueDistance
  - Combines multi-channel + true distance

**C++ Reference**: `core/edge-selectors.h`

### 3.2 Contour Combiners (Priority: HIGH)
**Files**: `SimpleContourCombiner.ts`, `OverlappingContourCombiner.ts`

- [ ] SimpleContourCombiner<EdgeSelectorType>
  - Uses provided EdgeSelector
  - Selects minimum distance across all contours

- [ ] OverlappingContourCombiner<EdgeSelectorType>
  - Handles overlapping contours
  - Non-zero winding rule support
  - Uses Scanline for fill computation

**C++ Reference**: `core/contour-combiners.h`

### 3.3 Shape Distance Finder (Priority: HIGH)
**Files**: `ShapeDistanceFinder.ts`

- [ ] ShapeDistanceFinder<ContourCombiner>
  - Constructor(shape: Shape)
  - distance(origin: Point2): DistanceType
  - Edge cache per contour for optimization
  - Static oneShotDistance() for single queries

**C++ Reference**: `core/ShapeDistanceFinder.h`, `core/ShapeDistanceFinder.hpp`

### 3.4 Scanline System (Priority: MEDIUM)
**Files**: `Scanline.ts`

- [ ] Scanline class
  - Tracks horizontal line intersections with contours
  - Computes fill using winding numbers
  - filled(): boolean (determines if point is inside shape)
  - lastIndex optimization for sequential queries

**C++ Reference**: `core/Scanline.h`, `core/Scanline.cpp`

## Phase 4: Edge Coloring

### 4.1 Edge Coloring Algorithms (Priority: MEDIUM)
**Files**: `edge-coloring.ts`

- [ ] edgeColoringSimple(shape, angleThreshold, seed)
  - Fast heuristic-based 3-coloring
  - Segments edges into chains by angle
  - Assigns colors to minimize adjacent same-color edges

- [ ] edgeColoringInkTrap(shape, angleThreshold, seed)
  - Ink trap-aware coloring for typography
  - Detects sharp corners and narrow features

- [ ] edgeColoringByDistance(shape, angleThreshold, seed)
  - Optimal but slower approach
  - Uses distance-based graph coloring

**C++ Reference**: `core/edge-coloring.h`, `core/edge-coloring.cpp` (531 lines - complex)

**Note**: This is the most sophisticated algorithm module. May require iterative refinement.

## Phase 5: MSDF Error Correction

### 5.1 Error Correction System (Priority: MEDIUM)
**Files**: `MSDFErrorCorrection.ts`, `ErrorCorrectionConfig.ts`

- [ ] ErrorCorrectionConfig class
  - mode: ErrorCorrectionMode enum
  - minDeviationRatio: number (default 1.11111...)
  - minImproveRatio: number (default 1.11111...)
  - distanceCheckMode: DistanceCheckMode enum

- [ ] MSDFErrorCorrection class
  - Constructor(stencil: Bitmap, transformation: SDFTransformation)
  - protectCorners(shape: Shape): void
  - protectEdges(sdf: Bitmap): void
  - findErrors(sdf: Bitmap, shape?: Shape): void
  - apply(sdf: Bitmap): void
  - Artifact classification (linear, diagonal interpolation checks)

**Substeps**:
- [ ] BaseArtifactClassifier (interpolation discontinuity detection)
- [ ] ShapeDistanceChecker (optional expensive exact distance check)
- [ ] Linear artifact detection (horizontal/vertical neighbors)
- [ ] Diagonal artifact detection (bilinear interpolation)
- [ ] Stencil bitmap (PROTECTED, ERROR flags)

**C++ Reference**: `core/MSDFErrorCorrection.h`, `core/MSDFErrorCorrection.cpp` (506 lines - complex)

## Phase 6: Main Generators

### 6.1 SDFTransformation (Priority: HIGH)
**Files**: `SDFTransformation.ts`

- [ ] SDFTransformation class
  - Combines Projection + DistanceMapping
  - project(point): Point2
  - unproject(point): Point2
  - distanceMapping: DistanceMapping

**C++ Reference**: `core/SDFTransformation.h`

### 6.2 Generator Configs (Priority: MEDIUM)
**Files**: `GeneratorConfig.ts`

- [ ] GeneratorConfig class
  - overlapSupport: boolean

- [ ] MSDFGeneratorConfig extends GeneratorConfig
  - errorCorrection: ErrorCorrectionConfig

**C++ Reference**: `core/generator-config.h`

### 6.3 Core Generation Functions (Priority: HIGH)
**Files**: `msdfgen.ts`

- [ ] generateSDF(output: Bitmap, shape: Shape, transformation: SDFTransformation, config: GeneratorConfig)
  - Single-channel signed distance field

- [ ] generatePSDF(output: Bitmap, shape: Shape, transformation: SDFTransformation, config: GeneratorConfig)
  - Perpendicular signed distance field

- [ ] generateMSDF(output: Bitmap, shape: Shape, transformation: SDFTransformation, config: MSDFGeneratorConfig)
  - Multi-channel signed distance field (3 channels)
  - Includes error correction

- [ ] generateMTSDF(output: Bitmap, shape: Shape, transformation: SDFTransformation, config: MSDFGeneratorConfig)
  - Multi-channel + true distance (4 channels)
  - Includes error correction

**Algorithm**: For each pixel (x, y):
1. Unproject pixel coords to shape space
2. Find signed distance using ShapeDistanceFinder
3. Map distance to pixel value range
4. Write to output bitmap
5. (MSDF only) Apply error correction

**C++ Reference**: `core/msdfgen.cpp`

### 6.4 Pixel Conversion (Priority: MEDIUM)
**Files**: `pixel-conversion.ts`

- [ ] Conversion functions between types
  - floatToByteRange(value): number (0-255)
  - byteToFloatRange(value): number (0.0-1.0)
- [ ] Template-based conversion for different bitmap types

**C++ Reference**: `core/pixel-conversion.hpp`

## Phase 7: Extensions (Optional, Post-MVP)

### 7.1 Font Loading
**Files**: `ext/font-loader.ts`

- [ ] Load TrueType/OpenType fonts
  - Use opentype.js or similar library
  - Convert font glyph outlines to Shape
- [ ] loadGlyph(font, char): Shape

**C++ Reference**: `ext/import-font.h`, `ext/import-font.cpp` (uses FreeType)

### 7.2 SVG Loading
**Files**: `ext/svg-loader.ts`

- [ ] Parse SVG paths to Shape
  - Use existing SVG path parser library
  - Convert path commands to EdgeSegments
- [ ] loadSvg(svgString): Shape

**C++ Reference**: `ext/import-svg.h`, `ext/import-svg.cpp` (uses TinyXML2)

### 7.3 Image Output
**Files**: `ext/save-png.ts`, `ext/save-bmp.ts`

- [ ] savePNG(bitmap, filename): void (Node.js)
- [ ] saveBMP(bitmap, filename): void
- [ ] toImageData(bitmap): ImageData (browser)
- [ ] toCanvas(bitmap, canvas): void

**C++ Reference**: `ext/save-png.h`, `ext/save-bmp.h`

## Phase 8: Testing and Validation

### 8.1 Unit Tests (Priority: HIGH)
- [ ] Vector2 operations
- [ ] EdgeSegment distance calculations
- [ ] Equation solvers (edge cases)
- [ ] Bitmap indexing and slicing
- [ ] Edge coloring (verify 3-color constraint)

### 8.2 Integration Tests (Priority: HIGH)
- [ ] Generate simple shapes (square, circle, triangle)
- [ ] Compare output with C++ reference implementation
- [ ] Test edge cases (degenerate curves, overlapping contours)

### 8.3 Visual Validation (Priority: MEDIUM)
- [ ] Generate distance field images
- [ ] Visualize error correction effects
- [ ] Side-by-side comparison with C++ output

### 8.4 Numerical Accuracy Tests (Priority: HIGH)
- [ ] Verify floating-point precision matches C++
- [ ] Test boundary conditions (epsilon comparisons)
- [ ] Validate distance field continuity

## Phase 9: API and Documentation

### 9.1 Public API (Priority: HIGH)
**Files**: `index.ts`

```typescript
export {
  // Core types
  Vector2, Point2, Shape, Contour, EdgeSegment,
  LinearSegment, QuadraticSegment, CubicSegment,

  // Bitmap
  Bitmap, BitmapSection, YAxisOrientation,

  // Configuration
  GeneratorConfig, MSDFGeneratorConfig, ErrorCorrectionConfig,

  // Generators
  generateSDF, generatePSDF, generateMSDF, generateMTSDF,

  // Utilities
  edgeColoringSimple, edgeColoringInkTrap,

  // Extensions (if implemented)
  loadGlyph, loadSvg, savePNG
}
```

### 9.2 Documentation (Priority: MEDIUM)
- [ ] README.md with usage examples
- [ ] API reference (TSDoc comments)
- [ ] Migration guide from C++ API
- [ ] Performance benchmarks vs C++

### 9.3 Examples (Priority: LOW)
- [ ] Generate font atlas example
- [ ] SVG to distance field example
- [ ] Browser canvas rendering example
- [ ] Node.js batch processing example

## Phase 10: Optimization (Post-MVP)

### 10.1 Performance Profiling
- [ ] Identify hot loops
- [ ] Benchmark against C++ implementation
- [ ] Optimize TypedArray usage

### 10.2 Optional Features
- [ ] Web Worker parallelism (if needed)
- [ ] WebAssembly version (if needed)
- [ ] Streaming API for large batches

## Implementation Order (Recommended)

1. **Phase 1.1-1.2**: Basic geometry and distance types (foundation)
2. **Phase 2.2-2.3**: EdgeSegment hierarchy and equation solvers (core algorithms)
3. **Phase 1.4**: Bitmap system (data structures)
4. **Phase 2.4**: Contour and Shape (shape representation)
5. **Phase 3.1-3.3**: Distance calculation pipeline (the main algorithm)
6. **Phase 6.1-6.3**: Main generators (tie it all together)
7. **Phase 8**: Basic testing (validate correctness)
8. **Phase 4**: Edge coloring (required for MSDF quality)
9. **Phase 5**: Error correction (polish MSDF output)
10. **Phase 7+**: Extensions, docs, optimization (enhancement)

## Success Criteria

- [ ] Generates pixel-identical output to C++ for simple shapes
- [ ] Generates visually identical output for complex shapes (allowing for floating-point differences)
- [ ] Passes all unit tests
- [ ] Performance within 3x of C++ single-threaded (acceptable for most use cases)
- [ ] Clean, maintainable TypeScript code with strong typing
- [ ] Comprehensive API documentation

## Non-Goals (Out of Scope)

- Multi-threaded execution (keep it simple)
- Real-time generation (offline generation is fine)
- GPU acceleration (pure CPU implementation)
- 100% bit-identical output to C++ (floating-point differences acceptable)
- CLI tool (library only, CLI can be separate package)

## Dependencies

### Required
- TypeScript 5.x
- No runtime dependencies for core library

### Development
- Jest or Vitest (testing)
- ESLint, Prettier (code quality)

### Optional (Extensions)
- opentype.js (font loading)
- svg-path-parser (SVG loading)
- pngjs (PNG output in Node.js)

## Estimated Complexity by Phase

| Phase | Lines of Code (est.) | Complexity | Time Estimate |
|-------|---------------------|------------|---------------|
| Phase 1 | ~500 | Low | 2-3 days |
| Phase 2 | ~1200 | Medium-High | 5-7 days |
| Phase 3 | ~800 | High | 5-7 days |
| Phase 4 | ~600 | High | 3-5 days |
| Phase 5 | ~700 | High | 4-6 days |
| Phase 6 | ~400 | Medium | 2-3 days |
| Phase 7 | ~500 | Medium | 3-4 days |
| Phase 8 | ~800 | Medium | 4-5 days |
| **Total Core** | **~5500** | **-** | **~30-40 days** |

## Notes

- Keep C++ reference comments in the code for traceability
- Use TSDoc for all public APIs
- Maintain a CHANGELOG.md as we go
- Consider creating a comparison tool to validate against C++ output
- Edge coloring and error correction are complex - budget extra time for debugging

---

**This is a living document** - Update as we discover new requirements or simplifications during implementation.
