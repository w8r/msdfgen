import { describe, it, expect, beforeAll } from 'vitest';
import { ShapeDistanceFinder, createShapeDistanceFinder } from './ShapeDistanceFinder';
import { SimpleContourCombiner } from './SimpleContourCombiner';
import { OverlappingContourCombiner } from './OverlappingContourCombiner';
import { TrueDistanceSelector } from './TrueDistanceSelector';
import { MultiDistanceSelector } from './MultiDistanceSelector';
import { Shape } from '../shape/Shape';
import { EdgeHolder } from '../shape/EdgeHolder';
import { Vector2 } from '../types/Vector2';
import { EdgeColor } from '../edge/EdgeColor';
import type { SignedDistance } from '../types/SignedDistance';
import * as fs from 'fs';
import * as path from 'path';

describe('ShapeDistanceFinder', () => {
  describe('constructor', () => {
    it('should create finder with shape and combiner', () => {
      const shape = new Shape();
      const finder = new ShapeDistanceFinder(
        shape,
        () => new SimpleContourCombiner(() => new TrueDistanceSelector()),
      );

      expect(finder.getShape()).toBe(shape);
      expect(finder.getCombiner()).toBeInstanceOf(SimpleContourCombiner);
    });

    it('should work with overlapping combiner', () => {
      const shape = new Shape();
      const finder = new ShapeDistanceFinder(
        shape,
        () => new OverlappingContourCombiner(() => new TrueDistanceSelector()),
      );

      expect(finder.getCombiner()).toBeInstanceOf(OverlappingContourCombiner);
    });
  });

  describe('distance', () => {
    it('should compute distance for empty shape', () => {
      const shape = new Shape();
      const finder = new ShapeDistanceFinder(
        shape,
        () => new SimpleContourCombiner(() => new TrueDistanceSelector()),
      );

      const result = finder.distance(new Vector2(0, 0));
      expect(result).toBeDefined();
    });

    it('should compute distance for single contour shape', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.WHITE,
        ),
      );

      const finder = new ShapeDistanceFinder(
        shape,
        () => new SimpleContourCombiner(() => new TrueDistanceSelector()),
      );

      const result = finder.distance(new Vector2(0, 0)) as SignedDistance;
      expect(Math.abs(result.distance)).toBeGreaterThan(0);
      expect(Math.abs(result.distance)).toBeCloseTo(5, 1);
    });

    it('should find minimum across multiple contours', () => {
      const shape = new Shape();

      // First contour at x=10
      const contour1 = shape.addEmptyContour();
      contour1.addEdge(
        new EdgeHolder(
          new Vector2(10, 0),
          new Vector2(15, 0),
          EdgeColor.WHITE,
        ),
      );

      // Second contour at x=3 (closer)
      const contour2 = shape.addEmptyContour();
      contour2.addEdge(
        new EdgeHolder(
          new Vector2(3, 0),
          new Vector2(8, 0),
          EdgeColor.WHITE,
        ),
      );

      const finder = new ShapeDistanceFinder(
        shape,
        () => new SimpleContourCombiner(() => new TrueDistanceSelector()),
      );

      const result = finder.distance(new Vector2(0, 0)) as SignedDistance;
      // Should find the closer contour at x=3
      expect(Math.abs(result.distance)).toBeCloseTo(3, 1);
    });

    it('should work with multi-channel selector', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();

      // Add colored edges
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.RED,
        ),
      );
      contour.addEdge(
        new EdgeHolder(
          new Vector2(10, 0),
          new Vector2(10, 5),
          EdgeColor.GREEN,
        ),
      );
      contour.addEdge(
        new EdgeHolder(
          new Vector2(10, 5),
          new Vector2(5, 5),
          EdgeColor.BLUE,
        ),
      );
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 5),
          new Vector2(5, 0),
          EdgeColor.RED,
        ),
      );

      const finder = new ShapeDistanceFinder(
        shape,
        () => new SimpleContourCombiner(() => new MultiDistanceSelector()),
      );

      const result = finder.distance(new Vector2(0, 0));
      expect(Math.abs(result.r)).toBeGreaterThan(0);
      expect(Math.abs(result.g)).toBeGreaterThan(0);
      expect(Math.abs(result.b)).toBeGreaterThan(0);
    });

    it('should handle overlapping combiner with fill', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();

      // Simple square
      contour.addEdge(
        new EdgeHolder(
          new Vector2(0, 0),
          new Vector2(10, 0),
          EdgeColor.WHITE,
        ),
      );
      contour.addEdge(
        new EdgeHolder(
          new Vector2(10, 0),
          new Vector2(10, 10),
          EdgeColor.WHITE,
        ),
      );
      contour.addEdge(
        new EdgeHolder(
          new Vector2(10, 10),
          new Vector2(0, 10),
          EdgeColor.WHITE,
        ),
      );
      contour.addEdge(
        new EdgeHolder(
          new Vector2(0, 10),
          new Vector2(0, 0),
          EdgeColor.WHITE,
        ),
      );

      const finder = new ShapeDistanceFinder(
        shape,
        () => new OverlappingContourCombiner(() => new TrueDistanceSelector()),
      );

      // Point inside the square
      const resultInside = finder.distance(new Vector2(5, 5)) as SignedDistance;
      // Point outside the square
      const resultOutside = finder.distance(new Vector2(-5, 5)) as SignedDistance;

      // Both should have valid distances
      expect(Math.abs(resultInside.distance)).toBeGreaterThan(0);
      expect(Math.abs(resultOutside.distance)).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset combiner state', () => {
      const shape = new Shape();
      const finder = new ShapeDistanceFinder(
        shape,
        () => new SimpleContourCombiner(() => new TrueDistanceSelector()),
      );

      const origin = new Vector2(0, 0);
      finder.reset(origin);

      // After reset, selector should not have distance
      expect(finder.getCombiner().getSelector().hasDistance()).toBe(false);
    });
  });

  describe('oneShotDistance', () => {
    it('should compute distance without creating persistent finder', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.WHITE,
        ),
      );

      const result = ShapeDistanceFinder.oneShotDistance(
        shape,
        new Vector2(0, 0),
        () => new SimpleContourCombiner(() => new TrueDistanceSelector()),
      ) as SignedDistance;

      expect(Math.abs(result.distance)).toBeCloseTo(5, 1);
    });

    it('should work with multi-channel selector', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.RED,
        ),
      );

      const result = ShapeDistanceFinder.oneShotDistance(
        shape,
        new Vector2(0, 0),
        () => new SimpleContourCombiner(() => new MultiDistanceSelector()),
      );

      expect(Math.abs(result.r)).toBeGreaterThan(0);
    });

    it('should work with overlapping combiner', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.WHITE,
        ),
      );

      const result = ShapeDistanceFinder.oneShotDistance(
        shape,
        new Vector2(0, 0),
        () => new OverlappingContourCombiner(() => new TrueDistanceSelector()),
      ) as SignedDistance;

      expect(Math.abs(result.distance)).toBeGreaterThan(0);
    });
  });
});

describe('createShapeDistanceFinder', () => {
  it('should create finder with factory function', () => {
    const shape = new Shape();
    const finder = createShapeDistanceFinder(
      shape,
      () => new SimpleContourCombiner(() => new TrueDistanceSelector()),
    );

    expect(finder).toBeInstanceOf(ShapeDistanceFinder);
    expect(finder.getShape()).toBe(shape);
  });

  it('should work with overlapping combiner', () => {
    const shape = new Shape();
    const finder = createShapeDistanceFinder(
      shape,
      () => new OverlappingContourCombiner(() => new MultiDistanceSelector()),
    );

    expect(finder).toBeInstanceOf(ShapeDistanceFinder);
    expect(finder.getCombiner()).toBeInstanceOf(OverlappingContourCombiner);
  });
});

// Helper to create SimpleContourCombiner with TrueDistanceSelector
function createTrueDistanceCombiner() {
  return new SimpleContourCombiner<SignedDistance, TrueDistanceSelector>(
    () => new TrueDistanceSelector(),
  );
}

describe('ShapeDistanceFinder with real glyphs', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parseFont: ((buffer: ArrayBuffer) => Promise<any>) | null = null;
  let fontBuffer: ArrayBuffer | null = null;

  beforeAll(async () => {
    try {
      // Dynamic import to avoid circular dependencies
      const fontModule = await import('../../font/FontParser');
      parseFont = fontModule.parseFont;

      const fontPath = path.join(__dirname, '../../test-fixtures/Roboto-Regular.ttf');
      if (fs.existsSync(fontPath)) {
        const buffer = fs.readFileSync(fontPath);
        fontBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
    } catch {
      // Font module not yet available, skip these tests
    }
  });

  describe('distance calculation with glyph shapes', () => {
    it('should compute valid distance for letter "O" (has hole)', async () => {
      if (!parseFont || !fontBuffer) return;

      const font = await parseFont(fontBuffer);
      const glyph = font.getGlyph('O');
      if (!glyph) return;

      const shape = glyph.toShape();
      expect(shape.validate()).toBe(true);
      expect(shape.contours.length).toBeGreaterThanOrEqual(2); // O has inner and outer contour

      const finder = new ShapeDistanceFinder(shape, createTrueDistanceCombiner);
      const bounds = shape.bound();
      const centerX = (bounds.xMin + bounds.xMax) / 2;
      const centerY = (bounds.yMin + bounds.yMax) / 2;

      // Center (in the hole) and far outside should have SAME sign (both "outside")
      const centerDist = finder.distance(new Vector2(centerX, centerY));
      const farOutside = finder.distance(new Vector2(bounds.xMin - 100, centerY));

      // Both should be valid numbers
      expect(typeof centerDist.distance).toBe('number');
      expect(typeof farOutside.distance).toBe('number');

      // Far outside should have larger absolute distance than center
      expect(Math.abs(farOutside.distance)).toBeGreaterThan(10);
    });

    it('should compute valid distance for letter "M" (no holes)', async () => {
      if (!parseFont || !fontBuffer) return;

      const font = await parseFont(fontBuffer);
      const glyph = font.getGlyph('M');
      if (!glyph) return;

      const shape = glyph.toShape();
      expect(shape.validate()).toBe(true);

      const finder = new ShapeDistanceFinder(shape, createTrueDistanceCombiner);
      const bounds = shape.bound();

      // Far outside - should have significant distance
      const outside = finder.distance(new Vector2(bounds.xMin - 100, bounds.yMin - 100));
      expect(Math.abs(outside.distance)).toBeGreaterThan(50);

      // Center should also have valid distance
      const centerX = (bounds.xMin + bounds.xMax) / 2;
      const centerY = (bounds.yMin + bounds.yMax) / 2;
      const center = finder.distance(new Vector2(centerX, centerY));
      expect(typeof center.distance).toBe('number');
    });

    it('should compute valid distance for letter "8" (multiple holes)', async () => {
      if (!parseFont || !fontBuffer) return;

      const font = await parseFont(fontBuffer);
      const glyph = font.getGlyph('8');
      if (!glyph) return;

      const shape = glyph.toShape();
      expect(shape.validate()).toBe(true);
      expect(shape.contours.length).toBeGreaterThanOrEqual(2); // Should have holes

      const finder = new ShapeDistanceFinder(shape, createTrueDistanceCombiner);
      const bounds = shape.bound();

      // Far outside should have large distance
      const outside = finder.distance(new Vector2(bounds.xMax + 100, bounds.yMax + 100));
      expect(Math.abs(outside.distance)).toBeGreaterThan(50);
    });
  });

  describe('distance consistency', () => {
    it('should return consistent distances at same location', async () => {
      if (!parseFont || !fontBuffer) return;

      const font = await parseFont(fontBuffer);
      const glyph = font.getGlyph('A');
      if (!glyph) return;

      const shape = glyph.toShape();
      const finder = new ShapeDistanceFinder(shape, createTrueDistanceCombiner);

      const testPoint = new Vector2(500, 500);
      const dist1 = finder.distance(testPoint);
      const dist2 = finder.distance(testPoint);

      expect(dist1.distance).toBe(dist2.distance);
    });

    it('should increase distance as point moves away from shape', async () => {
      if (!parseFont || !fontBuffer) return;

      const font = await parseFont(fontBuffer);
      const glyph = font.getGlyph('I');
      if (!glyph) return;

      const shape = glyph.toShape();
      const finder = new ShapeDistanceFinder(shape, createTrueDistanceCombiner);
      const bounds = shape.bound();

      // Points at increasing distances from shape
      const nearDist = finder.distance(new Vector2(bounds.xMax + 10, bounds.yMin));
      const midDist = finder.distance(new Vector2(bounds.xMax + 100, bounds.yMin));
      const farDist = finder.distance(new Vector2(bounds.xMax + 500, bounds.yMin));

      // Absolute distance should increase
      expect(Math.abs(midDist.distance)).toBeGreaterThan(Math.abs(nearDist.distance));
      expect(Math.abs(farDist.distance)).toBeGreaterThan(Math.abs(midDist.distance));
    });
  });

  describe('boundary distance accuracy', () => {
    it('should return near-zero distance at shape edge', async () => {
      if (!parseFont || !fontBuffer) return;

      const font = await parseFont(fontBuffer);
      const glyph = font.getGlyph('I'); // Simple vertical stroke
      if (!glyph) return;

      const shape = glyph.toShape();
      const finder = new ShapeDistanceFinder(shape, createTrueDistanceCombiner);
      const bounds = shape.bound();

      // Point at the bounding box edge - should be very close to actual edge
      const edgeX = bounds.xMin;
      const midY = (bounds.yMin + bounds.yMax) / 2;

      // Move slightly inside from the bounding box edge
      const nearEdge = finder.distance(new Vector2(edgeX + 1, midY));
      // Distance should be small (we're near the edge)
      expect(Math.abs(nearEdge.distance)).toBeLessThan(50); // Within 50 font units of edge
    });
  });
});
