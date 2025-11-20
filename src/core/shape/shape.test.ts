import { describe, it, expect } from 'vitest';
import { EdgeHolder } from './EdgeHolder';
import { Contour } from './Contour';
import { Shape, YAxisOrientation } from './Shape';
import { LinearSegment } from '../edge/LinearSegment';
import { QuadraticSegment } from '../edge/QuadraticSegment';
import { CubicSegment } from '../edge/CubicSegment';
import { EdgeColor } from '../edge/EdgeColor';
import { Vector2 } from '../types/Vector2';

describe('EdgeHolder', () => {
  describe('constructor', () => {
    it('should create empty edge holder', () => {
      const holder = new EdgeHolder();
      expect(holder.hasEdge()).toBe(false);
      expect(holder.getOrNull()).toBeNull();
    });

    it('should create holder with existing segment', () => {
      const segment = new LinearSegment(
        new Vector2(0, 0),
        new Vector2(1, 1),
        EdgeColor.WHITE,
      );
      const holder = new EdgeHolder(segment);
      expect(holder.hasEdge()).toBe(true);
      expect(holder.get()).toBe(segment);
    });

    it('should create holder with linear segment from points', () => {
      const holder = new EdgeHolder(
        new Vector2(0, 0),
        new Vector2(1, 1),
        EdgeColor.RED,
      );
      const segment = holder.get();
      expect(segment).toBeInstanceOf(LinearSegment);
      expect(segment.color).toBe(EdgeColor.RED);
    });

    it('should create holder with quadratic segment from points', () => {
      const holder = new EdgeHolder(
        new Vector2(0, 0),
        new Vector2(0.5, 1),
        new Vector2(1, 0),
        EdgeColor.GREEN,
      );
      const segment = holder.get();
      expect(segment).toBeInstanceOf(QuadraticSegment);
      expect(segment.color).toBe(EdgeColor.GREEN);
    });

    it('should create holder with cubic segment from points', () => {
      const holder = new EdgeHolder(
        new Vector2(0, 0),
        new Vector2(0, 1),
        new Vector2(1, 1),
        new Vector2(1, 0),
        EdgeColor.BLUE,
      );
      const segment = holder.get();
      expect(segment).toBeInstanceOf(CubicSegment);
      expect(segment.color).toBe(EdgeColor.BLUE);
    });

    it('should default to WHITE color when not specified', () => {
      const holder = new EdgeHolder(new Vector2(0, 0), new Vector2(1, 1));
      const segment = holder.get();
      expect(segment.color).toBe(EdgeColor.WHITE);
    });
  });

  describe('get/set', () => {
    it('should get and set segments', () => {
      const holder = new EdgeHolder();
      const segment = new LinearSegment(
        new Vector2(0, 0),
        new Vector2(1, 1),
        EdgeColor.WHITE,
      );
      holder.set(segment);
      expect(holder.get()).toBe(segment);
    });

    it('should allow setting to null', () => {
      const holder = new EdgeHolder(new Vector2(0, 0), new Vector2(1, 1));
      expect(holder.hasEdge()).toBe(true);
      holder.set(null);
      expect(holder.hasEdge()).toBe(false);
    });

    it('should throw when getting null segment', () => {
      const holder = new EdgeHolder();
      expect(() => holder.get()).toThrow('EdgeHolder: No edge segment set');
    });

    it('should return null with getOrNull when segment is null', () => {
      const holder = new EdgeHolder();
      expect(holder.getOrNull()).toBeNull();
    });
  });

  describe('swap', () => {
    it('should swap edges between two holders', () => {
      const segment1 = new LinearSegment(
        new Vector2(0, 0),
        new Vector2(1, 0),
        EdgeColor.RED,
      );
      const segment2 = new LinearSegment(
        new Vector2(1, 0),
        new Vector2(1, 1),
        EdgeColor.GREEN,
      );
      const holder1 = new EdgeHolder(segment1);
      const holder2 = new EdgeHolder(segment2);

      EdgeHolder.swap(holder1, holder2);

      expect(holder1.get()).toBe(segment2);
      expect(holder2.get()).toBe(segment1);
    });

    it('should swap with empty holder', () => {
      const segment = new LinearSegment(
        new Vector2(0, 0),
        new Vector2(1, 1),
        EdgeColor.WHITE,
      );
      const holder1 = new EdgeHolder(segment);
      const holder2 = new EdgeHolder();

      EdgeHolder.swap(holder1, holder2);

      expect(holder1.getOrNull()).toBeNull();
      expect(holder2.get()).toBe(segment);
    });
  });
});

describe('Contour', () => {
  describe('constructor', () => {
    it('should create empty contour', () => {
      const contour = new Contour();
      expect(contour.edges).toHaveLength(0);
    });
  });

  describe('addEdge', () => {
    it('should add edge holder to contour', () => {
      const contour = new Contour();
      const holder = new EdgeHolder(new Vector2(0, 0), new Vector2(1, 1));
      contour.addEdge(holder);
      expect(contour.edges).toHaveLength(1);
      expect(contour.edges[0]).toBe(holder);
    });

    it('should add multiple edges', () => {
      const contour = new Contour();
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 0), new Vector2(1, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 1), new Vector2(0, 0)));
      expect(contour.edges).toHaveLength(3);
    });
  });

  describe('addEmptyEdge', () => {
    it('should create and add empty edge holder', () => {
      const contour = new Contour();
      const holder = contour.addEmptyEdge();
      expect(contour.edges).toHaveLength(1);
      expect(contour.edges[0]).toBe(holder);
      expect(holder.hasEdge()).toBe(false);
    });
  });

  describe('bound', () => {
    it('should return zero bounds for empty contour', () => {
      const contour = new Contour();
      const bounds = contour.bound();
      expect(bounds).toEqual({ xMin: 0, yMin: 0, xMax: 0, yMax: 0 });
    });

    it('should compute bounds for single edge', () => {
      const contour = new Contour();
      contour.addEdge(new EdgeHolder(new Vector2(1, 2), new Vector2(3, 4)));
      const bounds = contour.bound();
      expect(bounds.xMin).toBe(1);
      expect(bounds.yMin).toBe(2);
      expect(bounds.xMax).toBe(3);
      expect(bounds.yMax).toBe(4);
    });

    it('should compute bounds for multiple edges', () => {
      const contour = new Contour();
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(2, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(2, 1), new Vector2(1, 3)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 3), new Vector2(-1, 2)));
      const bounds = contour.bound();
      expect(bounds.xMin).toBe(-1);
      expect(bounds.yMin).toBe(0);
      expect(bounds.xMax).toBe(2);
      expect(bounds.yMax).toBe(3);
    });

    it('should handle empty edge holders', () => {
      const contour = new Contour();
      contour.addEmptyEdge();
      contour.addEdge(new EdgeHolder(new Vector2(1, 1), new Vector2(2, 2)));
      const bounds = contour.bound();
      expect(bounds.xMin).toBe(1);
      expect(bounds.xMax).toBe(2);
    });
  });

  describe('winding', () => {
    it('should return 0 for empty contour', () => {
      const contour = new Contour();
      expect(contour.winding()).toBe(0);
    });

    it('should compute winding for counterclockwise square', () => {
      const contour = new Contour();
      // Counterclockwise square (math convention: goes left to form positive area)
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(0, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(0, 1), new Vector2(1, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 1), new Vector2(1, 0)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 0), new Vector2(0, 0)));
      expect(contour.winding()).toBe(1);
    });

    it('should compute winding for clockwise square', () => {
      const contour = new Contour();
      // Clockwise square (math convention: goes right to form negative area)
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 0), new Vector2(1, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 1), new Vector2(0, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(0, 1), new Vector2(0, 0)));
      expect(contour.winding()).toBe(-1);
    });

    it('should handle single edge case', () => {
      const contour = new Contour();
      contour.addEdge(
        new EdgeHolder(
          new Vector2(0, 0),
          new Vector2(0.5, 1),
          new Vector2(1, 0),
        ),
      );
      const winding = contour.winding();
      expect(winding).toBeGreaterThanOrEqual(-1);
      expect(winding).toBeLessThanOrEqual(1);
    });

    it('should handle two edge case', () => {
      const contour = new Contour();
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 0), new Vector2(0, 0)));
      const winding = contour.winding();
      expect(winding).toBeGreaterThanOrEqual(-1);
      expect(winding).toBeLessThanOrEqual(1);
    });
  });

  describe('reverse', () => {
    it('should reverse edge order', () => {
      const contour = new Contour();
      const holder1 = new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0));
      const holder2 = new EdgeHolder(new Vector2(1, 0), new Vector2(1, 1));
      const holder3 = new EdgeHolder(new Vector2(1, 1), new Vector2(0, 0));
      contour.addEdge(holder1);
      contour.addEdge(holder2);
      contour.addEdge(holder3);

      contour.reverse();

      expect(contour.edges[0]).toBe(holder3);
      expect(contour.edges[1]).toBe(holder2);
      expect(contour.edges[2]).toBe(holder1);
    });

    it('should reverse each edge direction', () => {
      const contour = new Contour();
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0)));
      const originalStart = contour.edges[0].get().point(0);
      const originalEnd = contour.edges[0].get().point(1);

      contour.reverse();

      const newStart = contour.edges[0].get().point(0);
      const newEnd = contour.edges[0].get().point(1);
      expect(newStart.x).toBeCloseTo(originalEnd.x, 10);
      expect(newStart.y).toBeCloseTo(originalEnd.y, 10);
      expect(newEnd.x).toBeCloseTo(originalStart.x, 10);
      expect(newEnd.y).toBeCloseTo(originalStart.y, 10);
    });

    it('should flip winding direction', () => {
      const contour = new Contour();
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 0), new Vector2(1, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 1), new Vector2(0, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(0, 1), new Vector2(0, 0)));

      const originalWinding = contour.winding();
      contour.reverse();
      const newWinding = contour.winding();

      expect(newWinding).toBe(-originalWinding);
    });
  });
});

describe('Shape', () => {
  describe('constructor', () => {
    it('should create empty shape', () => {
      const shape = new Shape();
      expect(shape.contours).toHaveLength(0);
      expect(shape.inverseYAxis).toBe(false);
    });
  });

  describe('addContour', () => {
    it('should add contour to shape', () => {
      const shape = new Shape();
      const contour = new Contour();
      shape.addContour(contour);
      expect(shape.contours).toHaveLength(1);
      expect(shape.contours[0]).toBe(contour);
    });

    it('should add multiple contours', () => {
      const shape = new Shape();
      shape.addContour(new Contour());
      shape.addContour(new Contour());
      expect(shape.contours).toHaveLength(2);
    });
  });

  describe('addEmptyContour', () => {
    it('should create and add empty contour', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      expect(shape.contours).toHaveLength(1);
      expect(shape.contours[0]).toBe(contour);
      expect(contour.edges).toHaveLength(0);
    });
  });

  describe('bound', () => {
    it('should return zero bounds for empty shape', () => {
      const shape = new Shape();
      const bounds = shape.bound();
      expect(bounds).toEqual({ xMin: 0, yMin: 0, xMax: 0, yMax: 0 });
    });

    it('should compute bounds for single contour', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      contour.addEdge(new EdgeHolder(new Vector2(1, 2), new Vector2(3, 4)));
      const bounds = shape.bound();
      expect(bounds.xMin).toBe(1);
      expect(bounds.yMin).toBe(2);
      expect(bounds.xMax).toBe(3);
      expect(bounds.yMax).toBe(4);
    });

    it('should compute bounds for multiple contours', () => {
      const shape = new Shape();
      const contour1 = shape.addEmptyContour();
      contour1.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(2, 2)));
      const contour2 = shape.addEmptyContour();
      contour2.addEdge(new EdgeHolder(new Vector2(3, 1), new Vector2(5, 4)));
      const bounds = shape.bound();
      expect(bounds.xMin).toBe(0);
      expect(bounds.yMin).toBe(0);
      expect(bounds.xMax).toBe(5);
      expect(bounds.yMax).toBe(4);
    });
  });

  describe('getBounds', () => {
    it('should return bounds without border', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      contour.addEdge(new EdgeHolder(new Vector2(1, 2), new Vector2(3, 4)));
      const bounds = shape.getBounds();
      expect(bounds.l).toBe(1);
      expect(bounds.b).toBe(2);
      expect(bounds.r).toBe(3);
      expect(bounds.t).toBe(4);
    });

    it('should return bounds with border', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      contour.addEdge(new EdgeHolder(new Vector2(1, 2), new Vector2(3, 4)));
      const bounds = shape.getBounds(0.5);
      expect(bounds.l).toBe(0.5);
      expect(bounds.b).toBe(1.5);
      expect(bounds.r).toBe(3.5);
      expect(bounds.t).toBe(4.5);
    });
  });

  describe('normalize', () => {
    it('should reverse clockwise contours', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      // Clockwise square (negative winding)
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 0), new Vector2(1, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 1), new Vector2(0, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(0, 1), new Vector2(0, 0)));

      expect(contour.winding()).toBe(-1);
      shape.normalize();
      expect(contour.winding()).toBe(1);
    });

    it('should leave counterclockwise contours unchanged', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      // Counterclockwise square (positive winding)
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(0, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(0, 1), new Vector2(1, 1)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 1), new Vector2(1, 0)));
      contour.addEdge(new EdgeHolder(new Vector2(1, 0), new Vector2(0, 0)));

      expect(contour.winding()).toBe(1);
      shape.normalize();
      expect(contour.winding()).toBe(1);
    });

    it('should normalize all contours', () => {
      const shape = new Shape();

      // Add counterclockwise contour (positive winding, should stay)
      const contour1 = shape.addEmptyContour();
      contour1.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(0, 1)));
      contour1.addEdge(new EdgeHolder(new Vector2(0, 1), new Vector2(1, 1)));
      contour1.addEdge(new EdgeHolder(new Vector2(1, 1), new Vector2(1, 0)));
      contour1.addEdge(new EdgeHolder(new Vector2(1, 0), new Vector2(0, 0)));

      // Add clockwise contour (negative winding, should flip)
      const contour2 = shape.addEmptyContour();
      contour2.addEdge(new EdgeHolder(new Vector2(2, 0), new Vector2(3, 0)));
      contour2.addEdge(new EdgeHolder(new Vector2(3, 0), new Vector2(3, 1)));
      contour2.addEdge(new EdgeHolder(new Vector2(3, 1), new Vector2(2, 1)));
      contour2.addEdge(new EdgeHolder(new Vector2(2, 1), new Vector2(2, 0)));

      shape.normalize();

      expect(contour1.winding()).toBe(1);
      expect(contour2.winding()).toBe(1);
    });
  });

  describe('getYAxisOrientation', () => {
    it('should return TOP_UP when inverseYAxis is false', () => {
      const shape = new Shape();
      expect(shape.getYAxisOrientation()).toBe(YAxisOrientation.TOP_UP);
    });

    it('should return TOP_DOWN when inverseYAxis is true', () => {
      const shape = new Shape();
      shape.inverseYAxis = true;
      expect(shape.getYAxisOrientation()).toBe(YAxisOrientation.TOP_DOWN);
    });
  });

  describe('validate', () => {
    it('should return false for empty shape', () => {
      const shape = new Shape();
      expect(shape.validate()).toBe(false);
    });

    it('should return false for shape with empty contour', () => {
      const shape = new Shape();
      shape.addEmptyContour();
      expect(shape.validate()).toBe(false);
    });

    it('should return true for valid shape', () => {
      const shape = new Shape();
      const contour = shape.addEmptyContour();
      contour.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(1, 1)));
      expect(shape.validate()).toBe(true);
    });

    it('should return true for multiple valid contours', () => {
      const shape = new Shape();
      const contour1 = shape.addEmptyContour();
      contour1.addEdge(new EdgeHolder(new Vector2(0, 0), new Vector2(1, 1)));
      const contour2 = shape.addEmptyContour();
      contour2.addEdge(new EdgeHolder(new Vector2(2, 2), new Vector2(3, 3)));
      expect(shape.validate()).toBe(true);
    });
  });
});
