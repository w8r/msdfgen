# Testing Patterns

**Analysis Date:** 2026-05-04

## Test Framework

**Runner:**
- Vitest 2.1.9
- Config: `vitest.config.ts`
- Environment: Node.js

**Assertion Library:**
- Vitest built-in `expect()` (compatible with Jest)

**Run Commands:**
```bash
npm test                # Run all tests
npm test -- --ui       # Run with interactive UI
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting issues
```

**Config Details from `vitest.config.ts`:**
```typescript
export default defineConfig({
  test: {
    globals: true,      // Global test functions without imports
    environment: 'node', // Node.js environment for all tests
  },
})
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)
- Pattern: `src/core/[module]/[ClassName].test.ts` mirrors `[ClassName].ts`

**Directory examples:**
- Source: `src/core/types/Vector2.ts` → Test: `src/core/types/Vector2.test.ts`
- Source: `src/core/bitmap/Bitmap.ts` → Test: `src/core/bitmap/Bitmap.test.ts`
- Source: `src/core/edge-coloring/edge-coloring.ts` → Test: `src/core/edge-coloring/edge-coloring.test.ts`

**Naming:**
- Suffix `.test.ts` for test files
- Class names match source exactly: `Vector2.test.ts` tests `Vector2` class

**Structure:**
```
src/core/
├── types/
│   ├── Vector2.ts
│   ├── Vector2.test.ts
│   ├── Range.ts
│   ├── Range.test.ts
│   └── index.ts
├── bitmap/
│   ├── Bitmap.ts
│   ├── Bitmap.test.ts
│   └── index.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';
import { Vector2, dotProduct, crossProduct, mix } from './Vector2';
import type { Point2 } from './Vector2';

describe('Vector2', () => {
  describe('constructor', () => {
    it('should create zero vector with no args', () => {
      const v = new Vector2();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should create vector with single value for both components', () => {
      const v = new Vector2(5);
      expect(v.x).toBe(5);
      expect(v.y).toBe(5);
    });
  });

  describe('reset and set', () => {
    it('should reset to zero', () => {
      const v = new Vector2(3, 4);
      v.reset();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('arithmetic operations', () => {
    it('should add vectors', () => {
      const a = new Vector2(1, 2);
      const b = new Vector2(3, 4);
      const sum = a.add(b);
      expect(sum.x).toBe(4);
      expect(sum.y).toBe(6);
    });
  });
});

describe('dotProduct', () => {
  it('should calculate dot product', () => {
    const a = new Vector2(2, 3);
    const b = new Vector2(4, 5);
    expect(dotProduct(a, b)).toBe(23);
  });
});
```

**Patterns:**
- Top-level `describe()` blocks per major class or module
- Nested `describe()` blocks for method groups or features
- One `it()` per behavior/assertion group
- Test names describe what should happen: "should X when Y"
- Setup in `it()` block directly (no beforeEach needed for simple cases)

## Mocking

**Framework:** Not used
- No mocking library integrated
- Tests use real object instantiation
- All dependencies are deterministic (pure functions, in-memory data structures)

**Example from `src/core/bitmap/Bitmap.test.ts:137-147`:**
```typescript
it('should copy from another bitmap of same size', () => {
  const bmp1 = new Bitmap(Float32Array, 3, 5, 5);
  bmp1.setPixel(2, 2, [1, 2, 3]);

  const bmp2 = new Bitmap(Float32Array, 3, 5, 5);
  bmp2.copyFrom(bmp1);

  expect(bmp2.getChannel(2, 2, 0)).toBe(1);
  expect(bmp2.getChannel(2, 2, 1)).toBe(2);
  expect(bmp2.getChannel(2, 2, 2)).toBe(3);
});
```

**What to Mock:**
- Nothing in current codebase—all tests are unit tests with real objects

**What NOT to Mock:**
- Don't mock geometry/shape objects—test with actual Shape, Contour, EdgeHolder
- Don't mock bitmap operations—use real Bitmap instances with Float32Array
- Tests should validate actual algorithm behavior

## Fixtures and Factories

**Test Data:**
- Helper functions create test objects within test files
- Example from `src/core/generators/msdfgen.test.ts:19-39`:
```typescript
function createSquareShape(): Shape {
  const shape = new Shape();
  const contour = new Contour();

  contour.addEdge(
    new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0), EdgeColor.WHITE)
  );
  contour.addEdge(
    new EdgeHolder(new Vector2(1, 0), new Vector2(1, 1), EdgeColor.WHITE)
  );
  contour.addEdge(
    new EdgeHolder(new Vector2(1, 1), new Vector2(0, 1), EdgeColor.WHITE)
  );
  contour.addEdge(
    new EdgeHolder(new Vector2(0, 1), new Vector2(0, 0), EdgeColor.WHITE)
  );

  shape.addContour(contour);
  return shape;
}
```

- Helper functions for common scenarios (colored square, empty shape, etc.)
- Example from `src/core/generators/msdfgen.test.ts:44-48`:
```typescript
function createColoredSquare(): Shape {
  const shape = createSquareShape();
  edgeColoringSimple(shape, Math.PI, 0n);
  return shape;
}
```

**Location:**
- Fixture/factory functions defined at top of test file, below imports
- Used by multiple tests to create consistent test data

## Coverage

**Requirements:** No coverage target enforced
- Config file present but no coverage settings
- Coverage monitoring not part of CI/build

**View Coverage:**
```bash
# Not currently configured, but would use:
npm test -- --coverage
```

## Test Types

**Unit Tests:**
- Class method testing in isolation
- Pure function testing (dotProduct, crossProduct, mix functions)
- Example: `src/core/types/Vector2.test.ts` tests all Vector2 methods individually
- Scope: Single class or function behavior
- Approach: Direct instantiation and method calls

**Integration Tests:**
- Generator function testing with full shape/bitmap workflows
- Example from `src/core/generators/msdfgen.test.ts:244-269`:
```typescript
describe('Integration tests', () => {
  it('should produce different results for SDF vs PSDF', () => {
    const shape = createSquareShape();
    const sdfBitmap = new Bitmap(Float32Array, 1, 32, 32);
    const psdfBitmap = new Bitmap(Float32Array, 1, 32, 32);

    const projection = new Projection(new Vector2(28, 28), new Vector2(-0.5, -0.5));
    const transformation = new SDFTransformation(projection, new Range(-2, 2));

    generateSDF(sdfBitmap, shape, transformation);
    generatePSDF(psdfBitmap, shape, transformation);

    // Verify different outputs
    const sdfPixels = sdfBitmap.data();
    const psdfPixels = psdfBitmap.data();
    // ... assertions
  });
});
```
- Multiple components working together
- Validates algorithm correctness end-to-end

**E2E Tests:**
- Not present in codebase
- Would require file I/O or canvas rendering (outside current scope)

## Common Patterns

**Numeric Testing:**
```typescript
// Exact comparison for integers
expect(v.x).toBe(0);
expect(v.y).toBe(5);

// Approximate comparison for floats
expect(normalized.x).toBeCloseTo(0.6);
expect(normalized.y).toBeCloseTo(0.8);

// Range checks for algorithm outputs
expect(centerPixel).toBeGreaterThan(0.5);
expect(cornerPixel).toBeLessThan(0.5);
```

**Array/Data Testing:**
```typescript
// Check array type
expect(bmp.data()).toBeInstanceOf(Float32Array);

// Bulk validation
expect(pixels.every((p) => !isNaN(p) && isFinite(p))).toBe(true);

// Individual element access
expect(bmp.getChannel(2, 2, 0)).toBe(1.0);
```

**Object State Testing:**
```typescript
// Constructor validation
const v = new Vector2(3, 4);
expect(v.x).toBe(3);
expect(v.y).toBe(4);

// Mutation validation
const original = new Vector2(3, 4);
const negated = original.negate();
expect(original.x).toBe(3); // Original unchanged
expect(negated.x).toBe(-3); // New object created
```

**Immutability Testing:**
```typescript
it('should create independent copy', () => {
  const a = new Vector2(3, 4);
  const b = a.clone();
  expect(b.x).toBe(3);
  expect(b.y).toBe(4);
  b.set(5, 6);
  expect(a.x).toBe(3); // Original untouched
  expect(a.y).toBe(4);
});
```

**Error Testing:**
```typescript
it('should throw when invalid input provided', () => {
  expect(() => {
    mix('invalid' as any, 'also invalid' as any, 0);
  }).toThrow();
});

// No-throw validation
expect(() => generateSDF(bitmap, shape, transformation)).not.toThrow();
```

**Edge Case Testing:**
- Zero vectors: `new Vector2(0, 0)`
- Boundary conditions: corner pixels `(0, 0)` and `(9, 9)` in 10x10 bitmap
- Large inputs: 100x100 bitmaps (see `src/core/bitmap/Bitmap.test.ts:235-240`)
- Empty inputs: empty shapes (see `src/core/generators/msdfgen.test.ts:326-335`)

## Test Coverage by Module

**Type Tests:**
- `src/core/types/Vector2.test.ts`: 293 lines, comprehensive coverage
  - Constructor, reset, set, length, normalize, orthogonal, arithmetic, comparison, clone
  - Helper functions: dotProduct, crossProduct, mix (all overloads)

- `src/core/types/Range.test.ts`: 142 lines
  - Constructor variants (no args, single arg, two args)
  - Mutation methods (scaleInPlace, divideInPlace)
  - Immutable methods (scale, divide)

- Other type modules: DistanceMapping, MultiDistance, MultiAndTrueDistance, SignedDistance, Projection all have corresponding `.test.ts` files

**Bitmap Tests:**
- `src/core/bitmap/Bitmap.test.ts`: 250 lines
  - Constructor with various typed arrays (Float32Array, Float64Array, Uint8Array, Uint8ClampedArray)
  - Pixel/channel access (get/set operations)
  - Fill operations
  - Copy operations with reallocation
  - Ref/section conversion

- `src/core/bitmap/BitmapRef.test.ts`: Similar coverage for non-owning reference type

**Generator Tests:**
- `src/core/generators/msdfgen.test.ts`: 349 lines
  - generateSDF, generatePSDF, generateMSDF, generateMTSDF functions
  - Helper factory functions (createSquareShape, createColoredSquare)
  - Edge coloring validation
  - Range variations
  - Empty shapes and single-pixel bitmaps

**Edge/Color Tests:**
- `src/core/edge/EdgeColor.test.ts`: 216 lines
  - Enum values and bitwise representations
  - Channel detection (hasRed, hasGreen, hasBlue)
  - Color combination and intersection
  - Complement operations
  - String representation

**Algorithm Tests:**
- `src/core/distance/edge-selectors.test.ts`: Edge selection algorithm validation
- `src/core/distance/contour-combiners.test.ts`: Contour combination logic
- `src/core/distance/ShapeDistanceFinder.test.ts`: Distance calculation core
- `src/core/edge-coloring/edge-coloring.test.ts`: Edge coloring algorithm

---

*Testing analysis: 2026-05-04*
