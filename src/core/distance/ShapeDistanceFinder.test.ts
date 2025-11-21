import { describe, it, expect } from 'vitest';
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
