# Codebase Concerns

**Analysis Date:** 2026-05-04

## Tech Debt

**Error Correction Not Implemented:**
- Issue: MSDF and MTSDF generators have TODO comments blocking error correction
- Files: `src/core/generators/msdfgen.ts` (lines 231, 280)
- Impact: Generated multi-channel distance fields lack artifact correction, resulting in suboptimal quality at sharp corners and thin features. This is a known limitation of MSDF that error correction addresses.
- Fix approach: Implement Phase 5 error correction system. Requires:
  - `src/core/error-correction/MSDFErrorCorrection.ts` - Main error correction class
  - `src/core/error-correction/ErrorCorrectionConfig.ts` - Configuration classes
  - Artifact classifiers for linear and diagonal interpolation discontinuities
  - Stencil bitmap for protecting corners and marking errors

**Large Edge-Coloring Module:**
- Issue: Edge coloring implementation spans 796 lines in single file
- Files: `src/core/edge-coloring/edge-coloring.ts`
- Impact: High cognitive load, difficult to maintain and test individual algorithms. Three distinct algorithms (simple, ink trap, by distance) could be more modular.
- Fix approach: Split into separate files:
  - `edgeColoringSimple.ts` - Simple heuristic algorithm
  - `edgeColoringInkTrap.ts` - Ink trap-aware coloring
  - `edgeColoringByDistance.ts` - Distance-based optimal coloring
  - `edgeColoringUtils.ts` - Shared helpers

**Missing Font Loading Support:**
- Issue: Font/SVG loading not implemented (Phase 7 in plan)
- Files: `src/ext/` directory exists but empty
- Impact: Library cannot load fonts or SVG files directly. Users must manually create Shape objects from vector data.
- Fix approach: Implement Phase 7 extensions:
  - Font file parser (TrueType/OpenType)
  - SVG path parser
  - Conversion to Shape and Contour objects

## Known Limitations

**Single-Threaded Execution:**
- Issue: No parallelization of distance field generation
- Files: `src/core/generators/msdfgen.ts` (generateDistanceField function, lines 64-105)
- Impact: Performance scales linearly with pixel count. Large bitmaps (>2K resolution) may be slow on single-threaded platforms.
- Current design: Intentional for simplicity (see TYPESCRIPT_PORT_PLAN.md). Acceptable for web deployment.
- Improvement path: Could add Web Worker support for parallel scanline processing

**No Epsilon/Tolerance Configuration:**
- Issue: Hardcoded precision constants throughout codebase
- Files: `src/core/edge-coloring/edge-coloring.ts` (lines 18-25: EDGE_LENGTH_PRECISION, EDGE_DISTANCE_PRECISION)
- Impact: Cannot adjust precision for different scale requirements. May cause issues with very small or very large shapes.
- Fix approach: Add configurable precision parameters to GeneratorConfig

## Performance Bottlenecks

**Distance Calculation on Each Pixel:**
- Problem: ShapeDistanceFinder.distance() called once per output pixel with full contour traversal
- Files: `src/core/generators/msdfgen.ts` (line 95), `src/core/distance/ShapeDistanceFinder.ts`
- Cause: Brute-force approach checks all contours and edges for minimum distance
- Improvement path:
  - Spatial acceleration structures (quadtree, grid) for large shapes
  - Caching/memoization of distance results
  - Early termination when distance exceeds certain threshold

**Overlapping Contour Combiner Scanline Updates:**
- Problem: Scanline rebuilt per query point when overlaps are enabled
- Files: `src/core/distance/OverlappingContourCombiner.ts` (updateScanline method)
- Cause: Conservative approach to handle arbitrary shape changes
- Improvement path:
  - Cache scanlines per Y coordinate (partial implementation exists with lastY check)
  - Consider sweep line algorithm for entire image at once

## Fragile Areas

**Vector2 and Numeric Operations:**
- Files: `src/core/types/Vector2.ts` (242 lines)
- Why fragile: Math operations use floating-point arithmetic with no special handling for edge cases
- Issues found:
  - Division by zero not protected in normalize() (line 111)
  - Length calculations can produce Infinity for very large vectors
  - No epsilon-based comparisons for near-zero values
- Safe modification:
  - Always verify vector is non-zero before normalizing
  - Add epsilon parameter to comparison functions
  - Test with extreme values (very small, very large, near-zero)

**CubicSegment and QuadraticSegment Math:**
- Files: `src/core/edge/CubicSegment.ts` (359 lines), `src/core/edge/QuadraticSegment.ts` (215 lines)
- Why fragile: Polynomial root finding with numerical stability concerns
- Issues: Equation solver can fail for degenerate cases (a=0, b=0, c=0)
- Safe modification:
  - Verify test coverage for degenerate polynomials
  - Check that solver returns consistent results
  - Add numerical tolerance checks

**Shape Bounding Box Calculation:**
- Files: `src/core/shape/Shape.ts` (lines 58-103), `src/core/shape/Contour.ts` (lines 53-90)
- Why fragile: Uses Infinity/-Infinity comparison, assumes contours have edges
- Issues: Empty shape or shape with no edges could produce invalid bounds
- Safe modification:
  - Check for empty contours before accessing edges
  - Validate bounds calculations in tests

**Edge Holder Null Access:**
- Files: `src/core/shape/EdgeHolder.ts` (line 111)
- Why fragile: Throws error if no edge segment is set, but caller may not check
- Safe modification:
  - Always verify segment is set before operations
  - Consider using optional types instead of throwing

## Test Coverage Gaps

**No Error Correction Tests:**
- What's not tested: MSDF error correction system
- Reason: Phase 5 (error correction) not implemented
- Files: `src/core/error-correction/` (directory doesn't exist)
- Risk: When implemented, correctness of artifact detection and correction is critical for output quality
- Priority: HIGH - Must add comprehensive tests before Phase 5 completion

**Minimal Integration Tests:**
- What's not tested: End-to-end generation of complex shapes with overlaps
- Files: `src/core/generators/msdfgen.test.ts` (349 lines) - focuses on simple shapes
- Test coverage: Only 15 tests for 4 main generator functions
- Risk: Complex shapes with self-intersecting contours may produce incorrect results
- Priority: MEDIUM - Add integration tests with overlapping/self-intersecting shapes

**No Performance Tests:**
- What's not tested: Bitmap generation speed, memory usage
- Reason: Performance benchmarking infrastructure not in place
- Risk: Performance regressions go undetected
- Priority: MEDIUM - Add benchmarks for common bitmap sizes

**Limited Edge Case Testing:**
- What's not tested:
  - Very large/small bitmaps
  - Degenerate shapes (single point, collinear edges)
  - Shapes with extreme aspect ratios
  - Numerical edge cases (near-zero distances, near-infinity values)
- Files: Various test files
- Priority: MEDIUM - Add edge case tests especially for vector math and polynomial solving

## Missing Critical Features

**Font Loading:**
- Problem: No built-in font file support
- Blocks: Users cannot directly generate distance fields from font files
- Workaround: Must manually parse fonts using external library, then construct Shape objects
- Priority: HIGH (planned as Phase 7)

**SVG Path Import:**
- Problem: No SVG path parsing
- Blocks: Cannot import shapes from SVG files directly
- Workaround: Must manually convert SVG paths to Contour/Shape objects
- Priority: MEDIUM (planned as Phase 7)

## Dependencies at Risk

**No Production Dependencies:**
- Status: Project is zero-dependency
- Impact: Excellent for portability and bundle size, but means all algorithms must be maintained in-house
- Risk: Potential security/performance improvements in external libraries cannot be leveraged

**Development Dependencies (DevDependencies):**
- TypeScript 5.9.3 - Stable, well-maintained
- Vite 7.2.2 - Modern build tool, active development
- Vitest 2.1.9 - Test runner, modern approach
- ESLint 9.39.1 + @typescript-eslint 8.47.0 - Linting maintained
- Status: All current versions, no known vulnerabilities

## Security Considerations

**Canvas API Exposure:**
- Risk: Canvas rendering functions in `src/utils/canvas-utils.ts` require DOM access
- Files: `renderToCanvas()` (lines 78-109), `renderMSDFAntialiased()` (lines 235-268)
- Current mitigation: Only available in browser environment, not executed server-side
- Recommendations:
  - Document that canvas utilities require browser DOM
  - Consider headless canvas alternative for Node.js (canvas library)
  - Add feature detection for DOM availability

**No Input Validation:**
- Risk: No explicit validation of Shape/Contour data integrity
- Files: All generators assume valid input shapes
- Current mitigation: Internal data structures enforce constraints through TypeScript types
- Recommendations:
  - Add optional validation mode for debugging malformed shapes
  - Document expected Shape invariants

## Numerical Stability Issues

**Floating-Point Precision in Distance Field:**
- Issue: Distance values mapped to 0-1 range using default DistanceMapping
- Files: `src/core/generators/msdfgen.ts` (lines 124, 164, 205, 254)
- Impact: Precision loss when converting to integer pixel values. Especially problematic for small bitmap sizes or shapes with high curvature.
- Mitigation: Tests verify all output is finite (not NaN/Infinity), but precision not validated

**Infinity Initialization in Bounds:**
- Issue: Bounding box calculations initialize to Infinity/-Infinity
- Files: `src/core/shape/Shape.ts` (lines 58-61), `src/core/shape/Contour.ts` (lines 53-56)
- Impact: If bounds are empty, result is invalid interval [Infinity, -Infinity]
- Current protection: Calling code should validate non-empty shapes

---

*Concerns audit: 2026-05-04*
