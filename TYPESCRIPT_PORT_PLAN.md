# MSDFGEN TypeScript Port - Complete Plan

## Project Overview

Port of the MSDFGEN (Multi-channel Signed Distance Field Generator) library from C++ to TypeScript. This will be a single-threaded, pure TypeScript implementation focusing on algorithm accuracy and maintainability over raw performance.

**Target**: High-quality, type-safe TypeScript library for generating distance fields from vector shapes and fonts.

## Current Progress

**Phase 1: Core Data Structures** ✅ **COMPLETED** (225 tests passing)
- ✅ 1.1 Basic Geometry (55 tests)
- ✅ 1.2 Distance and Range Types (57 tests)
- ✅ 1.3 Multi-Channel Distance Types (59 tests)
- ✅ 1.4 Bitmap System (54 tests)

**Phase 2: Edge Segments and Shape** ✅ **COMPLETED** (102 tests passing)
- ✅ 2.1 Edge Color System (28 tests)
- ✅ 2.2 Equation Solvers (28 tests)
- ✅ 2.3 EdgeSegment Hierarchy (0 tests - covered by integration)
- ✅ 2.4 Contour and Shape (46 tests)

**Phase 3: Distance Calculation Algorithms** ✅ **COMPLETED** (72 tests passing)
- ✅ 3.1 Edge Selectors (32 tests)
- ✅ 3.2 Contour Combiners + Scanline (27 tests)
- ✅ 3.3 Shape Distance Finder (13 tests)

**Phase 4: Edge Coloring** ✅ **COMPLETED** (24 tests passing)
- ✅ 4.1 Edge Coloring Algorithms (24 tests)

**Phase 6: Main Generators** ✅ **COMPLETED** (15 tests passing)
- ✅ 6.1 SDFTransformation (0 tests - simple wrapper class)
- ✅ 6.2 GeneratorConfig (0 tests - configuration classes)
- ✅ 6.3 Main Generator Functions (15 tests)
  - generateSDF - Single-channel signed distance field
  - generatePSDF - Perpendicular signed distance field
  - generateMSDF - Multi-channel signed distance field
  - generateMTSDF - Multi-channel + true distance field

**Demo: Manual Shape Visualization** ✅ **COMPLETED**
- ✅ Canvas Utilities (Bitmap to ImageData conversion)
- ✅ 6 Demo Shapes (Square, Triangle, Circle, Heart, Star, Letter A)
- ✅ Browser Demo Runner with visualization and timing
- ✅ HTML Demo Page with dark theme UI

**Total: 438 tests passing** | **Next: Font Loading Demo (Phase 7.1) & MSDF Error Correction (Phase 5)**

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

### 1.4 Bitmap System (Priority: HIGH) ✅ COMPLETED
**Files**: `Bitmap.ts`, `BitmapRef.ts`, `BitmapSection.ts`, `YAxisOrientation.ts`

- [x] Bitmap<T, N> generic class
  - TypedArray backing (Float32Array, Float64Array, Uint8Array, Uint8ClampedArray)
  - width, height, channelCount properties
  - N = number of channels (1, 3, 4)
  - T = typed array type
  - getPixel(x, y): TypedArrayView, setPixel(x, y, values)
  - getChannel/setChannel for individual channel access
  - fill() and fillChannels() operations
  - copyFrom(), copyFromRef(), copyFromSection()
  - ref() and section() conversions
  - getSection(xMin, yMin, xMax, yMax) for subsections
- [x] BitmapRef<T, N> class
  - Non-owning reference to bitmap data
  - Read/write pixel access through reference
  - Shares underlying data with source bitmap
- [x] BitmapSection<T, N> class
  - Non-owning reference with rowStride support
  - Can represent sections, padded rows, or flipped bitmaps
  - rowStride can be negative for Y-flip
  - reorient(newOrientation) for coordinate reorientation
  - Nested subsections via getSection()
  - Internal pixelOffset tracking for proper indexing
- [x] YAxisOrientation enum (Y_UPWARD, Y_DOWNWARD)
  - Default: Y_UPWARD (mathematical convention)
- [x] 54 tests passing (28 Bitmap, 26 BitmapRef+BitmapSection)

**C++ Reference**: `core/Bitmap.h`, `core/Bitmap.hpp`, `core/BitmapRef.hpp`, `core/YAxisOrientation.h`

## Phase 2: Edge Segments and Shape

### 2.1 Edge Color System (Priority: HIGH) ✅ COMPLETED
**Files**: `EdgeColor.ts`

- [x] EdgeColor enum with bitwise values
  - BLACK = 0
  - RED = 1
  - GREEN = 2
  - YELLOW = 3 (RED | GREEN)
  - BLUE = 4
  - MAGENTA = 5 (RED | BLUE)
  - CYAN = 6 (GREEN | BLUE)
  - WHITE = 7 (RED | GREEN | BLUE)
- [x] Helper functions
  - numChannels(color): number of active channels
  - hasRed/hasGreen/hasBlue(color): channel detection
  - combineColors(a, b): bitwise OR
  - intersectColors(a, b): bitwise AND
  - complementColor(color): bitwise XOR with WHITE
  - colorToString(color): debug string
- [x] 28 tests passing

**C++ Reference**: `core/EdgeColor.h`

### 2.2 Equation Solvers (Priority: HIGH) ✅ COMPLETED
**Files**: `equation-solver.ts`

- [x] solveQuadratic(a, b, c): number[]
  - Handles linear fallback when a ≈ 0
  - Returns 0-2 real roots
  - Numerical stability for edge cases
- [x] solveCubic(a, b, c, d): number[]
  - Cardano's formula with trigonometric method
  - Returns 0-3 real roots
  - Falls back to quadratic for stability
- [x] 28 tests passing (comprehensive coverage)

**C++ Reference**: `core/equation-solver.h`, `core/equation-solver.cpp`

### 2.3 EdgeSegment Hierarchy (Priority: HIGH) ✅ COMPLETED
**Files**: `EdgeSegment.ts`, `LinearSegment.ts`, `QuadraticSegment.ts`, `CubicSegment.ts`

- [x] EdgeSegment abstract base class
  - color: EdgeColor property
  - point(t): Point2 - Bezier evaluation
  - direction(t): Vector2 - First derivative/tangent
  - directionChange(t): Vector2 - Second derivative
  - signedDistance(origin): {distance, param} - Closest point search
  - distanceToPerpendicularDistance() - Optional conversion
  - length(): number - Arc length
  - bound(): BoundingBox - Axis-aligned bounding box
  - scanlineIntersections(y): ScanlineIntersection[] - Horizontal line crossings
  - clone(), reverse(), moveStartPoint(), moveEndPoint()
  - splitInThirds(): [EdgeSegment, EdgeSegment, EdgeSegment]

- [x] LinearSegment extends EdgeSegment
  - p: [Point2, Point2] (start, end)
  - Direct geometric distance calculation
  - Orthogonal distance for interior points
  - Endpoint distance with dot product alignment

- [x] QuadraticSegment extends EdgeSegment
  - p: [Point2, Point2, Point2] (start, control, end)
  - Quadratic Bezier curve implementation
  - Uses cubic equation solver for signed distance
  - Extrema detection for bounding box
  - de Casteljau subdivision for splitInThirds()

- [x] CubicSegment extends EdgeSegment
  - p: [Point2, Point2, Point2, Point2] (start, control1, control2, end)
  - Cubic Bezier curve implementation
  - Iterative Newton-Raphson search (4 starts × 4 refinement steps)
  - Derivative-based extrema for tight bounding boxes
  - Approximate length via adaptive subdivision

**C++ Reference**: `core/edge-segments.h`, `core/edge-segments.cpp` (500+ lines)

### 2.4 Contour and Shape (Priority: HIGH) ✅ COMPLETED
**Files**: `Contour.ts`, `Shape.ts`, `EdgeHolder.ts`

- [x] EdgeHolder wrapper
  - Holds EdgeSegment reference
  - Provides indirection (like C++ pointer)
  - Multiple constructors (empty, segment, 2-4 points for linear/quadratic/cubic)
  - get(), set(), getOrThrow(), hasEdge()
  - static swap(a, b) for array reversal

- [x] Contour class
  - edges: EdgeHolder[]
  - addEdge(holder), addEmptyEdge()
  - bound(): BoundingBox (union of all edge bounds)
  - boundMiters(border, miterLimit, polarity): BoundingBox for mitered corners
  - winding(): number (shoelace formula for orientation: 1=CCW, -1=CW, 0=degenerate)
  - reverse(): void (reverses edge order and individual edges)

- [x] Shape class
  - contours: Contour[]
  - inverseYAxis: boolean
  - addContour(contour), addEmptyContour()
  - normalize(): void (ensures all contours have positive winding)
  - bound(): BoundingBox (union of all contour bounds)
  - boundMiters(border, miterLimit, polarity): BoundingBox
  - getBounds(border): {l, b, r, t}
  - getYAxisOrientation(): YAxisOrientation
  - validate(): boolean (checks shape has valid contours)

- [x] 46 tests passing (EdgeHolder, Contour, Shape)

**C++ Reference**: `core/Contour.h`, `core/Shape.h`, `core/Shape.cpp`

## Phase 3: Distance Calculation Algorithms

### 3.1 Edge Selectors (Priority: HIGH) ✅ COMPLETED
**Files**: `TrueDistanceSelector.ts`, `PerpendicularDistanceSelector.ts`, `MultiDistanceSelector.ts`, `MultiAndTrueDistanceSelector.ts`

- [x] TrueDistanceSelector
  - DistanceType = SignedDistance
  - reset(p): void - resets selector state
  - addEdge(distance, edge, origin, param): void - considers an edge
  - distance(): SignedDistance - returns minimum distance
  - static merge(a, b): SignedDistance - merges two distances
  - EdgeCache structure for optimization (point, absDistance)
  - getCached(edge): EdgeCache - retrieves cached distance

- [x] PerpendicularDistanceSelector
  - Like TrueDistanceSelector but converts to perpendicular distance
  - Calls distanceToPerpendicularDistance() on each edge
  - Same interface: reset, addEdge, distance, merge, getCached
  - Falls back to true distance if perpendicular conversion unavailable

- [x] MultiDistanceSelector
  - DistanceType = MultiDistance (r, g, b channels)
  - Tracks minimum distance per color channel independently
  - addEdge() updates channels based on edge color (bitwise AND with EdgeColor)
  - distance(): MultiDistance - returns per-channel distances
  - static merge(a, b): MultiDistance - minimum per channel

- [x] MultiAndTrueDistanceSelector
  - DistanceType = MultiAndTrueDistance (r, g, b, a channels)
  - Combines multi-channel (RGB) + true distance (alpha)
  - Alpha channel tracks overall minimum regardless of color
  - RGB channels track color-specific minimums
  - static merge(a, b): MultiAndTrueDistance - minimum per channel

- [x] 32 tests passing (comprehensive edge selector coverage)

**C++ Reference**: `core/edge-selectors.h`

### 3.2 Contour Combiners (Priority: HIGH) ✅ COMPLETED
**Files**: `SimpleContourCombiner.ts`, `OverlappingContourCombiner.ts`, `Scanline.ts`

- [x] Scanline class
  - addIntersection(x, direction) - tracks edge crossings
  - sort() - sorts intersections by x coordinate
  - countWinding(x) - counts winding number at x
  - filled(x) - determines if point is inside (non-zero winding rule)
  - filledSequential(x) - optimized for sequential queries
  - Used by OverlappingContourCombiner for fill detection

- [x] EdgeSelector<T> interface
  - Generic interface for all selector types
  - reset(p), addEdge(distance, edge, origin, param), distance()
  - Allows type-safe selector usage in combiners

- [x] SimpleContourCombiner<T, Selector>
  - Generic contour combiner using any EdgeSelector
  - distance(origin, contours) - finds minimum distance across all contours
  - No fill/winding handling - just raw minimum distance
  - Used for simple non-overlapping shapes

- [x] OverlappingContourCombiner<T, Selector>
  - Handles overlapping/self-intersecting shapes
  - Uses Scanline to compute fill at each query point
  - Flips distance sign based on inside/outside status
  - Non-zero winding rule support
  - Caches scanline per Y coordinate for performance
  - updateScanline() - collects all edge intersections at Y

- [x] 27 tests passing (Scanline + combiners)

**C++ Reference**: `core/contour-combiners.h`, `core/Scanline.h/cpp`

### 3.3 Shape Distance Finder (Priority: HIGH) ✅ COMPLETED
**Files**: `ShapeDistanceFinder.ts`

- [x] ContourCombiner<T> interface
  - Generic interface for any combiner type
  - distance(origin, contours), reset(p)
  - Allows type-safe combiner usage

- [x] ShapeDistanceFinder<T, Combiner>
  - High-level API for shape distance queries
  - Constructor(shape, combinerFactory)
  - distance(origin): T - computes distance using combiner
  - reset(p) - resets combiner state
  - getShape(), getCombiner() - accessors
  - Works with any combiner (Simple or Overlapping)
  - Works with any selector (True, Perpendicular, Multi, MultiAndTrue)

- [x] Static methods
  - oneShotDistance(shape, origin, combinerFactory) - one-shot queries
  - createShapeDistanceFinder(shape, combinerFactory) - convenience factory

- [x] 13 tests passing (comprehensive coverage)

**C++ Reference**: `core/ShapeDistanceFinder.h`, `core/ShapeDistanceFinder.hpp`

## Phase 4: Edge Coloring ✅ COMPLETED

### 4.1 Edge Coloring Algorithms (Priority: MEDIUM) ✅ COMPLETED
**Files**: `edge-coloring.ts`, `edge-coloring.test.ts`

- [x] edgeColoringSimple(shape, angleThreshold, seed)
  - Fast heuristic-based 3-coloring
  - Segments edges into chains by angle
  - Assigns colors to minimize adjacent same-color edges
  - Tests: 8 passing

- [x] edgeColoringInkTrap(shape, angleThreshold, seed)
  - Ink trap-aware coloring for typography
  - Detects sharp corners and narrow features
  - Tests: 8 passing

- [x] edgeColoringByDistance(shape, angleThreshold, seed)
  - Optimal but slower approach
  - Uses distance-based graph coloring
  - Tests: 8 passing

- [x] Helper functions: isCorner, estimateEdgeLength, symmetricalTrichotomy, colorSecondDegreeGraph
- [x] Distance calculation: edgeToEdgeDistance, splineToSplineDistance
- [x] Graph coloring utilities: vertexPossibleColors, uncolorSameNeighbors, tryAddEdge

**C++ Reference**: `core/edge-coloring.h`, `core/edge-coloring.cpp` (531 lines)

**Status**: All three algorithms implemented and tested with 24/24 tests passing. Verifies 3-color constraint (no adjacent edges with same color) for all algorithms.

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

## Demo: Manual Shape Visualization ✅ COMPLETED

### Demo Purpose
Interactive browser-based demo that showcases the MSDF generation pipeline without requiring font loading or error correction. Demonstrates all four distance field types (SDF, PSDF, MSDF, MTSDF) on hand-crafted vector shapes.

### Demo Structure
**Files**: `demo/shape-demo.ts`, `demo/demo-browser.ts`, `demo/msdf-demo.html`, `demo/README.md`, `src/utils/canvas-utils.ts`

**Canvas Utilities** (`src/utils/canvas-utils.ts`):
- [x] sdfToImageData(bitmap) - Converts single-channel SDF to grayscale ImageData
- [x] msdfToImageData(bitmap) - Converts 3-channel MSDF to RGB ImageData
- [x] mtsdfToImageData(bitmap) - Converts 4-channel MTSDF to RGBA ImageData
- [x] renderMSDFMedian(bitmap) - Renders MSDF median for visualization
- [x] renderToCanvas(imageData, canvas, scale) - Renders ImageData to canvas with scaling

**Demo Shapes** (`demo/shape-demo.ts`):
- [x] createSquare() - Simple 4-sided polygon with linear edges
- [x] createTriangle() - Equilateral triangle
- [x] createCircle() - Approximated using 4 quadratic Bezier curves
- [x] createHeart() - Complex shape using cubic Bezier curves
- [x] createStar() - 5-pointed star with 10 linear edges
- [x] createLetterA() - Letter with inner and outer contours (demonstrates holes)
- [x] generateAllDistanceFields(shape, size) - Generates SDF, PSDF, MSDF, MTSDF for a shape
- [x] getAllDemoShapes() - Returns all 6 demo shapes with descriptions

**Browser Demo Runner** (`demo/demo-browser.ts`):
- [x] Generates distance fields for all shapes in browser
- [x] Renders each shape with all 4 algorithms side-by-side
- [x] Measures and displays total generation time
- [x] Updates stats (shape count, generation time, test count)
- [x] Error handling and loading states

**HTML Demo Page** (`demo/msdf-demo.html`):
- [x] Dark theme UI with gradient headers
- [x] Responsive grid layout for shape cards
- [x] Stats display (438 tests passing, shape count, generation time)
- [x] Info section explaining each algorithm
- [x] Algorithm comparison cards (SDF vs PSDF vs MSDF vs MTSDF)

### Running the Demo
```bash
npm run dev
# Navigate to http://localhost:5173/demo/msdf-demo.html
```

### Demo Features
✅ Manual Shape Creation - All shapes hand-coded using the MSDF API
✅ Live Generation - Distance fields generated in the browser
✅ Visual Comparison - Side-by-side comparison of all algorithms
✅ Educational - Info sections explain each algorithm
✅ Responsive - Works on desktop and tablet screens
✅ Performance Tracking - Real-time generation timing

### Next Steps
After this demo, the plan is to:
1. **Font Loading Demo (Phase 7.1)** - Load TrueType/OpenType fonts and generate glyphs
2. **Font Atlas Generation** - Pack multiple glyphs into texture atlas
3. **WebGPU Rendering** - Real-time text rendering with distance fields
4. **Error Correction (Phase 5)** - Optional quality improvement (not required for demos)

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

## Phase 11: Documentation

### 11.1 Layman's Guide (Priority: MEDIUM)
**Goal**: Explain the entire MSDFGEN algorithm and implementation in simple, accessible terms

- [ ] Overview: What is MSDF and why does it exist?
  - Traditional font rendering vs. SDF rendering
  - Single-channel SDF limitations
  - Multi-channel SDF advantages

- [ ] Algorithm Breakdown (in simple terms):
  - [ ] How shapes are represented (vectors, curves, contours)
  - [ ] What signed distance fields are
  - [ ] Edge coloring: Why we need 3 colors
  - [ ] Distance calculation: Finding the nearest edge
  - [ ] Error correction: Fixing artifacts

- [ ] Code Architecture Guide:
  - [ ] Project structure walkthrough
  - [ ] How data flows through the system
  - [ ] Key abstractions and why they exist

- [ ] Use Cases and Examples:
  - [ ] When to use SDF vs MSDF vs MTSDF
  - [ ] Real-world applications (games, UI, web)
  - [ ] Performance characteristics

**Note**: This documentation should be accessible to developers who are not experts in computational geometry or typography. Use diagrams, analogies, and concrete examples throughout.

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
