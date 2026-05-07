# Deferred Items - Phase 01

## Pre-existing TypeScript Errors

The following TypeScript errors exist in the codebase but are out of scope for Phase 01:

1. `src/core/distance/MultiAndTrueDistanceSelector.ts(78,5)` - unused 'origin' parameter
2. `src/core/distance/MultiDistanceSelector.ts(72,5)` - unused 'origin' parameter
3. `src/core/distance/OverlappingContourCombiner.ts` - multiple type safety issues with 'dist' variable
4. `src/core/distance/ShapeDistanceFinder.ts(90,5)` - generic type assignment issue
5. `src/core/distance/TrueDistanceSelector.ts(70,5)` - unused 'origin' parameter
6. `src/core/generators/msdfgen.ts` - generic type constraint issues
7. `src/core/generators/SDFTransformation.ts` - private property access issues

These should be addressed in a separate cleanup task.
