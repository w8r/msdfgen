# Codebase Structure

**Analysis Date:** 2026-05-04

## Directory Layout

```
msdfgen/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Public API entry point
│   ├── core/                     # Core library functionality
│   │   ├── types/                # Geometric types and values
│   │   ├── shape/                # Shape and contour models
│   │   ├── edge/                 # Edge segments and colors
│   │   ├── distance/             # Distance calculation algorithms
│   │   ├── bitmap/               # 2D image bitmap storage
│   │   ├── generators/           # Distance field generation
│   │   └── edge-coloring/        # Edge coloring algorithm
│   └── utils/                    # Utility functions (canvas)
├── demo/                         # Demo application
├── dist/                         # Compiled output (generated)
├── dist-demo/                    # Demo app build output (generated)
├── node_modules/                 # Dependencies (generated)
├── package.json                  # Project manifest
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
└── eslint.config.mjs             # ESLint configuration
```

## Directory Purposes

**src/:**
- Purpose: All TypeScript source code for the library
- Contains: TypeScript files organized by domain concern
- Key files: `index.ts` is the public API entry point

**src/core/types/:**
- Purpose: Fundamental geometric and distance value types
- Contains: Vector2, SignedDistance, Range, Projection, DistanceMapping, MultiDistance, MultiAndTrueDistance
- Key files:
  - `Vector2.ts`: 2D vector/point operations (dot product, cross product, normalization)
  - `SignedDistance.ts`: Signed distance with dot product tiebreaker for edge selection
  - `Projection.ts`: Coordinate space transformation (shape to pixel)
  - `Range.ts`: Min/max range representation
  - `DistanceMapping.ts`: Value mapping from shape distance to output range
  - `index.ts`: Barrel export of all types

**src/core/shape/:**
- Purpose: Vector shape representation model
- Contains: Shape, Contour, EdgeHolder classes
- Key files:
  - `Shape.ts`: Top-level shape container with contours, bounds, normalization
  - `Contour.ts`: Single closed contour loop with edges, winding number
  - `EdgeHolder.ts`: Wrapper for optional edge references
  - `index.ts`: Barrel export

**src/core/edge/:**
- Purpose: Edge segment implementations and color handling
- Contains: Abstract EdgeSegment, LinearSegment, QuadraticSegment, CubicSegment, EdgeColor
- Key files:
  - `EdgeSegment.ts`: Abstract base class defining segment interface (point, direction, distance)
  - `LinearSegment.ts`: Straight line segment
  - `QuadraticSegment.ts`: Quadratic Bézier curve
  - `CubicSegment.ts`: Cubic Bézier curve
  - `EdgeColor.ts`: Multi-channel color for MSDF (Red, Green, Blue channels)
  - `equation-solver.ts`: Quadratic and cubic equation solvers
  - `index.ts`: Barrel export

**src/core/distance/:**
- Purpose: Distance calculation algorithms
- Contains: Distance selectors, contour combiners, shape distance finder, scanline utilities
- Key files:
  - `ShapeDistanceFinder.ts`: Main API for computing distance from point to shape using selectors
  - `SimpleContourCombiner.ts`: Basic distance aggregation (minimum distance)
  - `OverlappingContourCombiner.ts`: Fill-rule aware distance for overlapping contours
  - `TrueDistanceSelector.ts`: Selects true Euclidean distance to closest edge
  - `PerpendicularDistanceSelector.ts`: Perpendicular distance (faster, less accurate)
  - `MultiDistanceSelector.ts`: Selects per-channel distances for MSDF
  - `MultiAndTrueDistanceSelector.ts`: Combines multi-channel + true distance for MTSDF
  - `Scanline.ts`: Horizontal scanline intersection detection
  - `index.ts`: Barrel export

**src/core/bitmap/:**
- Purpose: 2D image storage and access
- Contains: Generic bitmap with configurable typed arrays and channel counts
- Key files:
  - `Bitmap.ts`: Main 2D image class supporting Float32Array, Uint8Array, etc.
  - `BitmapRef.ts`: Reference view into bitmap data
  - `BitmapSection.ts`: Rectangular section of bitmap
  - `YAxisOrientation.ts`: Y-axis direction (TOP_UP vs TOP_DOWN)
  - `index.ts`: Barrel export

**src/core/generators/:**
- Purpose: Distance field generation orchestration
- Contains: Generator functions, configuration, transformation
- Key files:
  - `msdfgen.ts`: Main functions: `generateSDF()`, `generateMSDF()`, `generateMTSDF()`, `generatePseudoSDF()`
  - `GeneratorConfig.ts`: Configuration enums (ErrorCorrectionMode, DistanceCheckMode) and config classes
  - `SDFTransformation.ts`: Combines Projection + DistanceMapping for full spatial+value transformation
  - `index.ts`: Barrel export

**src/core/edge-coloring/:**
- Purpose: Multi-channel edge coloring for MSDF
- Contains: Edge coloring algorithm implementation
- Key files:
  - `edge-coloring.ts`: Assigns red/green/blue channels to edges for improved MSDF quality

**src/utils/:**
- Purpose: Utility functions and helpers
- Contains: Canvas drawing and manipulation helpers
- Key files:
  - `canvas-utils.ts`: Helpers for converting between bitmap and canvas/image data

**demo/:**
- Purpose: Interactive demonstration application
- Contains: HTML, TypeScript demo code
- Key files:
  - `msdf-demo.html`: HTML demo interface
  - `demo-browser.ts`: Browser-based demo application

## Key File Locations

**Entry Points:**
- `src/index.ts`: Library public API (export all types, classes, functions)
- `demo/demo-browser.ts`: Demo application entry point

**Configuration:**
- `package.json`: NPM metadata, scripts, dependencies
- `tsconfig.json`: TypeScript compiler options (ES2022, strict mode, noUnusedLocals)
- `vite.config.ts`: Vite build config (demo root, dist-demo output)
- `eslint.config.mjs`: ESLint rules for code quality

**Core Logic:**
- `src/core/shape/Shape.ts`: Shape container and model
- `src/core/distance/ShapeDistanceFinder.ts`: Distance computation facade
- `src/core/generators/msdfgen.ts`: Generation pipeline orchestration
- `src/core/edge/EdgeSegment.ts`: Edge interface and implementations
- `src/core/types/Vector2.ts`: Fundamental geometric type

**Testing:**
- `src/core/**/*.test.ts`: Co-located test files
  - `src/core/types/*.test.ts`: Type tests (Vector2, SignedDistance, Range, etc.)
  - `src/core/distance/*.test.ts`: Distance calculation tests
  - `src/core/shape/shape.test.ts`: Shape validation tests
  - `src/core/generators/msdfgen.test.ts`: Generator function tests
  - `src/core/edge/*.test.ts`: Edge segment and solver tests
  - `src/core/bitmap/*.test.ts`: Bitmap storage tests

## Naming Conventions

**Files:**
- PascalCase for classes: `Vector2.ts`, `Shape.ts`, `EdgeSegment.ts`, `ShapeDistanceFinder.ts`
- kebab-case for functions/utilities: `equation-solver.ts`, `edge-coloring.ts`, `canvas-utils.ts`
- `.test.ts` suffix for test files: `Vector2.test.ts`, `shape.test.ts`, `msdfgen.test.ts`
- `index.ts` for barrel exports in each directory

**Directories:**
- kebab-case: `src/core/edge-coloring/`, `src/utils/`
- PascalCase-like for domain concepts: `src/core/types/`, `src/core/shape/`, `src/core/edge/`, `src/core/distance/`

**Classes and Interfaces:**
- PascalCase: `Vector2`, `Shape`, `Contour`, `EdgeSegment`, `LinearSegment`
- Enum values: UPPER_SNAKE_CASE: `ErrorCorrectionMode.EDGE_PRIORITY`, `YAxisOrientation.TOP_DOWN`

**Functions:**
- camelCase: `generateSDF()`, `generateMSDF()`, `dotProduct()`, `crossProduct()`
- Private functions: same camelCase, prefixed with underscore in some cases

**Exports:**
- Barrel files (`index.ts`) export related items together
- Example from `src/core/distance/index.ts`:
  ```typescript
  export { TrueDistanceSelector, EdgeCache } from './TrueDistanceSelector';
  export { SimpleContourCombiner, type EdgeSelector } from './SimpleContourCombiner';
  export { ShapeDistanceFinder, type ContourCombiner } from './ShapeDistanceFinder';
  ```

## Where to Add New Code

**New Distance Selector Algorithm:**
- Implementation: `src/core/distance/YourSelector.ts`
- Tests: `src/core/distance/YourSelector.test.ts` or add to `edge-selectors.test.ts`
- Export: Add to `src/core/distance/index.ts`
- Usage: Pass factory to contour combiner constructor

**New Edge Segment Type:**
- Implementation: `src/core/edge/YourSegment.ts` extending `EdgeSegment`
- Tests: Add to `src/core/edge/*.test.ts`
- Export: Add to `src/core/edge/index.ts`
- Integration: Update edge type codes in EdgeSegment.type() documentation

**New Generator Function:**
- Implementation: Add function to `src/core/generators/msdfgen.ts`
- Tests: Add to `src/core/generators/msdfgen.test.ts`
- Export: Add to `src/core/generators/index.ts` and `src/index.ts`
- Config: Extend `GeneratorConfig` or `MSDFGeneratorConfig` if needed

**Utility Function:**
- Shared helpers: `src/utils/` directory
- Canvas-specific: `src/utils/canvas-utils.ts`
- Type-specific: Consider co-locating with related type module

**New Data Type:**
- Implementation: `src/core/types/YourType.ts`
- Tests: `src/core/types/YourType.test.ts`
- Export: Add to `src/core/types/index.ts`
- Usage: Import from barrel export in other modules

## Special Directories

**dist/ (Generated):**
- Purpose: Compiled JavaScript output from TypeScript compilation
- Generated: By `npm run build` via tsc
- Committed: No (in .gitignore)
- Contents: ES2022 JavaScript modules

**dist-demo/ (Generated):**
- Purpose: Built demo application
- Generated: By `vite build` from demo/ root
- Committed: No (in .gitignore)
- Contents: HTML, JavaScript bundle, assets

**node_modules/ (Generated):**
- Purpose: Installed npm dependencies
- Generated: By `npm install` from package-lock.json
- Committed: No (in .gitignore)
- Contents: All transitive dependencies

**test Coverage (Tests co-located):**
- Pattern: `*.test.ts` files sit alongside implementation in same directory
- Run with: `npm test` (vitest runner)
- Coverage: `npm run test:ui` for interactive view
- Files: No separate test directory; tests imported and excluded from build via tsconfig

---

*Structure analysis: 2026-05-04*
