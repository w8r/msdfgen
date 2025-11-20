import { describe, it, expect } from 'vitest';
import { Scanline } from './Scanline';
import { SimpleContourCombiner } from './SimpleContourCombiner';
import { OverlappingContourCombiner } from './OverlappingContourCombiner';
import { TrueDistanceSelector } from './TrueDistanceSelector';
import { MultiDistanceSelector } from './MultiDistanceSelector';
import { Contour } from '../shape/Contour';
import { EdgeHolder } from '../shape/EdgeHolder';
import { Vector2 } from '../types/Vector2';
import { EdgeColor } from '../edge/EdgeColor';

describe('Scanline', () => {
  describe('constructor', () => {
    it('should create empty scanline', () => {
      const scanline = new Scanline();
      expect(scanline.getIntersectionCount()).toBe(0);
    });
  });

  describe('addIntersection', () => {
    it('should add intersections', () => {
      const scanline = new Scanline();
      scanline.addIntersection(5, 1);
      scanline.addIntersection(10, -1);
      expect(scanline.getIntersectionCount()).toBe(2);
    });

    it('should ignore tangent intersections (direction = 0)', () => {
      const scanline = new Scanline();
      scanline.addIntersection(5, 0);
      expect(scanline.getIntersectionCount()).toBe(0);
    });

    it('should add multiple intersections', () => {
      const scanline = new Scanline();
      scanline.addIntersection(1, 1);
      scanline.addIntersection(3, 1);
      scanline.addIntersection(5, -1);
      scanline.addIntersection(7, -1);
      expect(scanline.getIntersectionCount()).toBe(4);
    });
  });

  describe('sort', () => {
    it('should sort intersections by x coordinate', () => {
      const scanline = new Scanline();
      scanline.addIntersection(10, 1);
      scanline.addIntersection(5, -1);
      scanline.addIntersection(7, 1);
      scanline.sort();

      const intersections = scanline.getIntersections();
      expect(intersections[0].x).toBe(5);
      expect(intersections[1].x).toBe(7);
      expect(intersections[2].x).toBe(10);
    });
  });

  describe('countWinding', () => {
    it('should return 0 for no intersections', () => {
      const scanline = new Scanline();
      scanline.sort();
      expect(scanline.countWinding(5)).toBe(0);
    });

    it('should count winding for single upward crossing', () => {
      const scanline = new Scanline();
      scanline.addIntersection(3, 1);
      scanline.sort();
      expect(scanline.countWinding(5)).toBe(1);
    });

    it('should count winding for single downward crossing', () => {
      const scanline = new Scanline();
      scanline.addIntersection(3, -1);
      scanline.sort();
      expect(scanline.countWinding(5)).toBe(-1);
    });

    it('should sum multiple crossings', () => {
      const scanline = new Scanline();
      scanline.addIntersection(1, 1);
      scanline.addIntersection(2, 1);
      scanline.addIntersection(3, -1);
      scanline.sort();
      expect(scanline.countWinding(5)).toBe(1); // 1 + 1 - 1 = 1
    });

    it('should not count intersections to the right', () => {
      const scanline = new Scanline();
      scanline.addIntersection(10, 1);
      scanline.addIntersection(15, 1);
      scanline.sort();
      expect(scanline.countWinding(5)).toBe(0);
    });
  });

  describe('filled', () => {
    it('should return false for winding 0 (outside)', () => {
      const scanline = new Scanline();
      scanline.sort();
      expect(scanline.filled(5)).toBe(false);
    });

    it('should return true for positive winding (inside)', () => {
      const scanline = new Scanline();
      scanline.addIntersection(3, 1);
      scanline.sort();
      expect(scanline.filled(5)).toBe(true);
    });

    it('should return true for negative winding (inside)', () => {
      const scanline = new Scanline();
      scanline.addIntersection(3, -1);
      scanline.sort();
      expect(scanline.filled(5)).toBe(true);
    });

    it('should handle rectangle case', () => {
      const scanline = new Scanline();
      // Rectangle from x=2 to x=8
      scanline.addIntersection(2, 1);
      scanline.addIntersection(8, -1);
      scanline.sort();

      expect(scanline.filled(1)).toBe(false); // Before rect
      expect(scanline.filled(5)).toBe(true); // Inside rect
      expect(scanline.filled(10)).toBe(false); // After second crossing, winding = 0 (outside)
    });
  });

  describe('reset', () => {
    it('should clear all intersections', () => {
      const scanline = new Scanline();
      scanline.addIntersection(5, 1);
      scanline.addIntersection(10, -1);
      scanline.reset();
      expect(scanline.getIntersectionCount()).toBe(0);
    });
  });
});

describe('SimpleContourCombiner', () => {
  describe('constructor', () => {
    it('should create with selector factory', () => {
      const combiner = new SimpleContourCombiner(() => new TrueDistanceSelector());
      expect(combiner.getSelector()).toBeInstanceOf(TrueDistanceSelector);
    });
  });

  describe('distance', () => {
    it('should return distance for empty contours', () => {
      const combiner = new SimpleContourCombiner(() => new TrueDistanceSelector());
      const contours: Contour[] = [];
      const origin = new Vector2(0, 0);

      const result = combiner.distance(origin, contours);
      expect(result).toBeDefined();
    });

    it('should find minimum distance from single contour', () => {
      const combiner = new SimpleContourCombiner(() => new TrueDistanceSelector());

      const contour = new Contour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.WHITE,
        ),
      );

      const origin = new Vector2(0, 0);
      const result = combiner.distance(origin, [contour]);

      // Distance is negative when outside
      expect(Math.abs(result.distance)).toBeCloseTo(5, 1);
    });

    it('should find minimum across multiple edges', () => {
      const combiner = new SimpleContourCombiner(() => new TrueDistanceSelector());

      const contour = new Contour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(10, 0),
          new Vector2(15, 0),
          EdgeColor.WHITE,
        ),
      );
      contour.addEdge(
        new EdgeHolder(
          new Vector2(3, 0),
          new Vector2(5, 0),
          EdgeColor.WHITE,
        ),
      );

      const origin = new Vector2(0, 0);
      const result = combiner.distance(origin, [contour]);

      // Should find the closer edge at x=3
      expect(Math.abs(result.distance)).toBeCloseTo(3, 1);
    });

    it('should work with MultiDistanceSelector', () => {
      const combiner = new SimpleContourCombiner(() => new MultiDistanceSelector());

      const contour = new Contour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.RED,
        ),
      );

      const origin = new Vector2(0, 0);
      const result = combiner.distance(origin, [contour]);

      expect(Math.abs(result.r)).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset selector state', () => {
      const combiner = new SimpleContourCombiner(() => new TrueDistanceSelector());
      const origin = new Vector2(0, 0);

      combiner.reset(origin);
      expect(combiner.getSelector().hasDistance()).toBe(false);
    });
  });
});

describe('OverlappingContourCombiner', () => {
  describe('constructor', () => {
    it('should create with selector factory', () => {
      const combiner = new OverlappingContourCombiner(() => new TrueDistanceSelector());
      expect(combiner.getSelector()).toBeInstanceOf(TrueDistanceSelector);
      expect(combiner.getScanline()).toBeInstanceOf(Scanline);
    });
  });

  describe('distance', () => {
    it('should return distance for empty contours', () => {
      const combiner = new OverlappingContourCombiner(() => new TrueDistanceSelector());
      const contours: Contour[] = [];
      const origin = new Vector2(0, 0);

      const result = combiner.distance(origin, contours);
      expect(result).toBeDefined();
    });

    it('should handle single contour', () => {
      const combiner = new OverlappingContourCombiner(() => new TrueDistanceSelector());

      const contour = new Contour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.WHITE,
        ),
      );

      const origin = new Vector2(0, 0);
      const result = combiner.distance(origin, [contour]);

      expect(result.distance).toBeGreaterThan(0);
    });

    it('should update scanline when Y changes', () => {
      const combiner = new OverlappingContourCombiner(() => new TrueDistanceSelector());

      const contour = new Contour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(0, 0),
          new Vector2(10, 0),
          EdgeColor.WHITE,
        ),
      );

      // Query at y=0
      combiner.distance(new Vector2(5, 0), [contour]);

      // Query at different y
      combiner.distance(new Vector2(5, 5), [contour]);

      // Scanline should have been updated
      expect(combiner.getScanline()).toBeDefined();
    });

    it('should work with multi-distance selector', () => {
      const combiner = new OverlappingContourCombiner(() => new MultiDistanceSelector());

      const contour = new Contour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(5, 0),
          new Vector2(10, 0),
          EdgeColor.GREEN,
        ),
      );

      const origin = new Vector2(0, 0);
      const result = combiner.distance(origin, [contour]);

      expect(Math.abs(result.g)).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const combiner = new OverlappingContourCombiner(() => new TrueDistanceSelector());
      const origin = new Vector2(0, 0);

      combiner.reset(origin);
      expect(combiner.getSelector().hasDistance()).toBe(false);
      expect(combiner.getScanline().getIntersectionCount()).toBe(0);
    });
  });
});
