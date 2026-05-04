# Architecture

**Analysis Date:** 2026-05-04

## Pattern Overview

**Overall:** Layered domain-driven architecture following the original C++ msdfgen library structure, organized by geometric concerns rather than technical layers.

**Key Characteristics:**
- Domain-centric organization (shape modeling, distance calculations, bitmap rendering)
- Strategy pattern for pluggable distance selectors and contour combiners
- Immutable/functional geometric types (Vector2, SignedDistance)
- Generic type parameters for flexibility in distance field generation
- Separation between spatial representation (Shape) and distance computation (ShapeDistanceFinder)

## Layers

**Core Types Layer:**
- Purpose: Fundamental geometric and distance value types
- Location: `src/core/types/`
- Contains: Vector2, Point2 alias, SignedDistance, Range, Projection, DistanceMapping, MultiDistance, MultiAndTrueDistance
- Depends on: None (foundation layer)
- Used by: All other layers

**Shape Modeling Layer:**
- Purpose: Vector shape representation as contours and edge segments
- Location: `src/core/shape/` and `src/core/edge/`
- Contains: Shape, Contour, EdgeHolder, EdgeSegment (abstract base), LinearSegment, QuadraticSegment, CubicSegment, EdgeColor
- Depends on: Core Types
- Used by: Distance calculation layer, generators

**Distance Calculation Layer:**
- Purpose: Computing signed distances from points to shapes
- Location: `src/core/distance/`
- Contains: ShapeDistanceFinder (main facade), SimpleContourCombiner, OverlappingContourCombiner, TrueDistanceSelector, PerpendicularDistanceSelector, MultiDistanceSelector, MultiAndTrueDistanceSelector, Scanline
- Depends on: Shape Modeling, Core Types
- Used by: Generators

**Bitmap Layer:**
- Purpose: 2D image storage with configurable channels and data types
- Location: `src/core/bitmap/`
- Contains: Bitmap, BitmapRef, BitmapSection, YAxisOrientation
- Depends on: Core Types
- Used by: Generators

**Generation Layer:**
- Purpose: Orchestrates distance field generation to bitmap output
- Location: `src/core/generators/`
- Contains: msdfgen (main generation functions), GeneratorConfig, MSDFGeneratorConfig, ErrorCorrectionConfig, SDFTransformation
- Depends on: All lower layers
- Used by: Public API, demos

**Supporting Layer:**
- Purpose: Edge coloring and utility functions
- Location: `src/core/edge-coloring/` and `src/utils/`
- Contains: Edge coloring algorithm, canvas utilities
- Depends on: Shape, Bitmap layers
- Used by: Generators, demo applications

## Data Flow

**Distance Field Generation Pipeline:**

1. **Input Setup**
   - User creates or imports a `Shape` containing contours with edge segments
   - User specifies generation config: `MSDFGeneratorConfig` with error correction settings
   - User specifies spatial transform: `SDFTransformation` (combines `Projection` + `DistanceMapping`)

2. **Initialization**
   - Generator creates output `Bitmap` with specified dimensions and channels
   - `ShapeDistanceFinder` is instantiated with shape and appropriate contour combiner factory
   - Combiner strategy selected based on generation type: `SimpleContourCombiner` or `OverlappingContourCombiner`
   - Distance selector strategy chosen: `TrueDistanceSelector`, `PerpendicularDistanceSelector`, `MultiDistanceSelector`, or `MultiAndTrueDistanceSelector`

3. **Pixel Sampling Loop**
   - For each pixel in bitmap:
     a. Unproject pixel coordinates to shape space using `SDFTransformation.unproject()`
     b. Call `ShapeDistanceFinder.distance()` which:
        - Resets the edge selector at the sample point
        - Iterates through all contours in the shape
        - For each contour, iterates through all edges
        - Calls `EdgeSegment.signedDistance()` for each edge
        - Edge selector accumulates and selects minimum distance
     c. Convert distance value using `DistanceMapping`
     d. Write mapped value(s) to bitmap pixel

4. **Output**
   - Return populated `Bitmap<Float32Array>` with 1, 3, or 4 channels
   - Optionally apply error correction post-processing

**State Management:**
- Immutable: Vector2, SignedDistance, Range, shapes after construction
- Mutable during generation: Bitmap pixels, edge selector state (reset each pixel)
- Configuration objects are immutable after construction
- No global state; each generation maintains own ShapeDistanceFinder instance

## Key Abstractions

**EdgeSegment Hierarchy:**
- Purpose: Represent different curve types (line, quadratic, cubic) with unified distance interface
- Examples: `src/core/edge/LinearSegment.ts`, `src/core/edge/QuadraticSegment.ts`, `src/core/edge/CubicSegment.ts`
- Pattern: Abstract base class with virtual methods; polymorphic invocation in distance calculation
- Methods: `signedDistance(origin)`, `point(t)`, `direction(t)`, `length()`, `bound()`

**Distance Selector Strategy:**
- Purpose: Pluggable algorithm for selecting which edge's distance to report
- Examples: `TrueDistanceSelector`, `PerpendicularDistanceSelector`, `MultiDistanceSelector`, `MultiAndTrueDistanceSelector`
- Pattern: Implements interface with `reset()`, `addEdge()`, `distance()` methods
- Used by: Contour combiners to filter and combine edge distances

**Contour Combiner Strategy:**
- Purpose: Pluggable algorithm for combining distances from multiple contours
- Examples: `SimpleContourCombiner` (minimum distance), `OverlappingContourCombiner` (fill rule aware)
- Pattern: Generic class parameterized on edge selector type and distance result type
- Used by: ShapeDistanceFinder to aggregate contour distances

**Transformation Chain:**
- Purpose: Separate spatial (Projection) and value (DistanceMapping) transformations
- Examples: `src/core/generators/SDFTransformation.ts` composes Projection + DistanceMapping
- Pattern: Inheritance (SDFTransformation extends Projection), composition of DistanceMapping
- Used by: Distance field generator to unproject pixels and map distance values

## Entry Points

**Library Entry Point:**
- Location: `src/index.ts`
- Triggers: Module import/require
- Responsibilities: Exports public API (all types, shape classes, generators)

**Generation Functions:**
- Locations: `src/core/generators/msdfgen.ts`
- Triggers: Calling `generateSDF()`, `generateMSDF()`, `generateMTSDF()`, `generatePseudoSDF()`, etc.
- Responsibilities: Orchestrate full pipeline: validate shape, create bitmap, sample distances, return result

**ShapeDistanceFinder:**
- Location: `src/core/distance/ShapeDistanceFinder.ts`
- Triggers: Called from generator pixel loop
- Responsibilities: Coordinate distance computation across all shape contours

## Error Handling

**Strategy:** Minimal error handling with assertions and validation methods

**Patterns:**
- `Shape.validate()` checks for empty or malformed shapes before generation
- Edge segment implementations handle degenerate cases (zero-length segments, parallel lines)
- Equation solver functions return results even for edge cases (no real roots, etc.)
- Distance selectors initialize with `-Number.MAX_VALUE` as sentinel for uninitialized state
- No exceptions thrown; functions return safe defaults for invalid inputs

**Example from `src/core/types/Vector2.ts`:**
```typescript
normalize(allowZero: boolean = false): Vector2 {
  const len = this.length();
  if (len !== 0) {
    return new Vector2(this.x / len, this.y / len);
  }
  return new Vector2(0, allowZero ? 0 : 1);
}
```

## Cross-Cutting Concerns

**Logging:**
- Not implemented; relies on console if needed at call sites

**Validation:**
- `Shape.validate()` ensures shape integrity before generation
- `Bitmap` constructor validates dimensions
- Generator functions validate configuration parameters

**Coordinate System Handling:**
- `YAxisOrientation` enum (TOP_UP vs TOP_DOWN) manages graphics API compatibility
- `Shape.inverseYAxis` flag controls y-direction during bitmap generation
- `SDFTransformation` handles projection from shape space to pixel space

**Type Safety:**
- Generic parameters on Bitmap (array type, channel count) enforce type constraints
- EdgeSegment subclasses ensure correct segment type handling
- Contour combiner and edge selector generics enforce consistent distance result types

---

*Architecture analysis: 2026-05-04*
