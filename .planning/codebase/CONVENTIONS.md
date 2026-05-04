# Coding Conventions

**Analysis Date:** 2026-05-04

## Naming Patterns

**Files:**
- PascalCase for classes: `Vector2.ts`, `EdgeColor.ts`, `Bitmap.ts`, `Range.ts`
- camelCase for utility/helper files: `edge-coloring.ts`, `equation-solver.ts`
- Test files mirror source with `.test.ts` suffix: `Vector2.test.ts`, `EdgeColor.test.ts`
- Index files use `index.ts` in directories for barrel exports

**Functions:**
- camelCase for all function names: `dotProduct()`, `crossProduct()`, `normalize()`, `getOrthogonal()`
- Verb prefix for action methods: `add()`, `subtract()`, `scale()`, `fill()`, `setPixel()`
- Boolean-returning functions use `is/has` prefix: `isZero()`, `isNonZero()`, `hasRed()`, `hasGreen()`
- Getter methods use explicit `get` prefix: `getPixel()`, `getChannel()`, `getOrthogonal()`, `getYOrientation()`
- In-place mutation methods use `InPlace` suffix: `scaleInPlace()`, `divideInPlace()`

**Variables:**
- camelCase for all variable declarations
- const preferred over let/var (enforced by ESLint rule `prefer-const`)
- Private class properties use underscore prefix: `_pixels`, `_w`, `_h`, `_channels`, `_yOrientation`
- Unused parameters prefixed with underscore to indicate intentional non-use

**Types:**
- PascalCase for type names: `Vector2`, `Point2`, `EdgeColor`, `BitmapArrayType`
- Semantic type aliases for clarity: `Point2` is alias for `Vector2` (see `src/core/types/Vector2.ts:192`)
- Export both class and type alias when semantically meaningful
- Generic type parameters use single uppercase letter: `T`, `N`

## Code Style

**Formatting:**
- 2-space indentation (TypeScript standard)
- Single quotes for strings (enforced by ESLint: `'single'` with `avoidEscape: true`)
- Semicolons always required (enforced by ESLint: `'semi': ['error', 'always']`)
- Trailing commas in multiline constructs (enforced: `'comma-dangle': ['error', 'always-multiline']`)
- Object properties have consistent spacing (enforced: `'object-curly-spacing': ['error', 'always']`)
- Array brackets have no spacing (enforced: `'array-bracket-spacing': ['error', 'never']`)

**Example from `src/core/types/Vector2.ts:105-106`:**
```typescript
add(other: Vector2): Vector2 {
  return new Vector2(this.x + other.x, this.y + other.y);
}
```

**Linting:**
- ESLint with `@typescript-eslint` parser (TypeScript 5.9.3)
- Config file: `eslint.config.mjs` (flat config format)
- Strict TypeScript checking: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- Unused variables warned but allow `_` prefix pattern to suppress

**Example ESLint rules (from `eslint.config.mjs`):**
- No console in source code (warn): `'no-console': 'warn'`
- No debugger statements (warn): `'no-debugger': 'warn'`
- Prefer const: `'prefer-const': 'error'`
- No var declarations: `'no-var': 'error'`
- Allow any type warning, not error: `'@typescript-eslint/no-explicit-any': 'warn'`

## Import Organization

**Order:**
1. External imports (vitest, typescript libraries)
2. Internal imports from sibling/parent directories
3. Type imports separated with `import type`

**Example from `src/core/types/Vector2.test.ts:1-3`:**
```typescript
import { describe, it, expect } from 'vitest';
import { Vector2, dotProduct, crossProduct, mix } from './Vector2';
import type { Point2 } from './Vector2';
```

**Path Aliases:**
- Relative imports used throughout (no path aliases configured)
- Barrel exports via `index.ts` files for cleaner imports
- Main export at `src/index.ts` exports all public types and functions

**Example from `src/core/types/index.ts`:**
```typescript
export { Vector2, dotProduct, crossProduct, mix } from './Vector2';
export type { Point2 } from './Vector2';
```

## Error Handling

**Patterns:**
- Throw Error objects with descriptive messages for invalid state
- Errors use constructor validation where possible
- Example from `src/core/types/Vector2.ts:239-242`:
```typescript
if (typeof a === "number" && typeof b === "number") {
  return a + t * (b - a);
}
// ... more type checks
throw new Error(
  "mix(): Both arguments must be of the same type (number or Vector2)"
);
```

- Optional chaining and nullish coalescing for safe defaults
- Example from `src/core/bitmap/Bitmap.ts:55-57`:
```typescript
this.w = width ?? 0;
this.h = height ?? 0;
this.yOrientation = yOrientation ?? DEFAULT_Y_AXIS_ORIENTATION;
```

**Error Recovery:**
- No try/catch blocks in core logic (explicit error handling preferred)
- Input validation happens at method boundaries
- Return values always valid (never implicit null)

## Logging

**Framework:** Console methods (no logging library)

**Patterns:**
- console.warn/log allowed in test files
- console.warn restricted in source code per ESLint
- No structured logging implemented
- Used for debugging/development only

## Comments

**When to Comment:**
- JSDoc comments on all public classes and methods
- Block comments for complex algorithms or non-obvious logic
- Inline comments rare—code should be self-documenting

**JSDoc/TSDoc:**
- All classes have description: `/** A 2-dimensional euclidean floating-point vector. */`
- Parameters documented with `@param` tags
- Return values documented with description (no explicit `@returns` tag)
- Author attribution for ports: `@author Viktor Chlumsky (original C++)`
- Generic parameters documented: `@template T - The typed array type for storage`

**Example from `src/core/types/Vector2.ts:1-6`:**
```typescript
/**
 * A 2-dimensional euclidean floating-point vector.
 *
 * TypeScript port of msdfgen::Vector2 from core/Vector2.hpp
 * @author Viktor Chlumsky (original C++)
 */
```

**Example from `src/core/types/Vector2.ts:47-49`:**
```typescript
/**
 * Returns the normalized vector - one that has the same direction but unit length.
 * @param allowZero If false and vector is zero, returns (0, 1) instead of (0, 0)
 */
```

## Function Design

**Size:** Functions 10-30 lines typical; larger functions break calculation into steps

**Parameters:**
- Required parameters first, optional parameters with defaults after
- Optional parameters use optional property syntax: `y?: number`
- Nullish coalescing for defaults: `y ?? x`
- Maximum 3-4 parameters; objects used for many related params

**Return Values:**
- Explicit return types always specified
- Immutable returns preferred (new objects, not mutations)
- Chainable methods return `this` for in-place operations
- Example from `src/core/types/Range.ts:34-38`:
```typescript
scaleInPlace(factor: number): this {
  this.lower *= factor;
  this.upper *= factor;
  return this;
}
```

- Methods creating new instances return new type: `scale(): Range`

## Module Design

**Exports:**
- Named exports for classes and functions
- Type exports use `export type` syntax for TypeScript clarity
- No default exports used in core library

**Example from `src/core/types/Vector2.ts:7,197,205,215-223`:**
```typescript
export class Vector2 { /* ... */ }
export type Point2 = Vector2;
export function dotProduct(a: Vector2, b: Vector2): number { /* ... */ }
export function mix(a: Vector2, b: Vector2, t: number): Vector2;  // Overload
```

**Barrel Files:**
- Used in all subdirectories: `src/core/types/index.ts`, `src/core/edge/index.ts`
- Collect and re-export public APIs from directory
- Enables `import { Vector2 } from './types'` instead of `'./types/Vector2'`

**Generic Classes:**
- Template parameters for array type and channel count
- Example from `src/core/bitmap/Bitmap.ts:24,46-59`:
```typescript
export class Bitmap<T extends BitmapArrayType = Float32Array, N extends number = 1> {
  constructor(
    ArrayType: BitmapArrayConstructor,
    channels: N,
    width: number,
    height: number,
    yOrientation?: YAxisOrientation,
  ) { /* ... */ }
}
```

---

*Convention analysis: 2026-05-04*
