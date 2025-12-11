import { describe, it, expect } from 'vitest';
import { edgeColoringSimple, edgeColoringInkTrap, edgeColoringByDistance } from './edge-coloring';
import { Shape } from '../shape/Shape';
import { Contour } from '../shape/Contour';
import { EdgeHolder } from '../shape/EdgeHolder';
import { LinearSegment } from '../edge/LinearSegment';
import { QuadraticSegment } from '../edge/QuadraticSegment';
import { Vector2 } from '../types/Vector2';
import { EdgeColor } from '../edge/EdgeColor';

describe('Edge Coloring', () => {
  /**
   * Helper to create a simple square shape
   */
  function createSquare(): Shape {
    const shape = new Shape();
    const contour = new Contour();

    // Create a square from (0,0) to (1,1)
    contour.addEdge(new EdgeHolder(new LinearSegment(
      new Vector2(0, 0),
      new Vector2(1, 0),
      EdgeColor.WHITE
    )));
    contour.addEdge(new EdgeHolder(new LinearSegment(
      new Vector2(1, 0),
      new Vector2(1, 1),
      EdgeColor.WHITE
    )));
    contour.addEdge(new EdgeHolder(new LinearSegment(
      new Vector2(1, 1),
      new Vector2(0, 1),
      EdgeColor.WHITE
    )));
    contour.addEdge(new EdgeHolder(new LinearSegment(
      new Vector2(0, 1),
      new Vector2(0, 0),
      EdgeColor.WHITE
    )));

    shape.addContour(contour);
    return shape;
  }

  /**
   * Helper to create a triangle shape
   */
  function createTriangle(): Shape {
    const shape = new Shape();
    const contour = new Contour();

    // Create an equilateral-ish triangle
    contour.addEdge(new EdgeHolder(new LinearSegment(
      new Vector2(0, 0),
      new Vector2(1, 0),
      EdgeColor.WHITE
    )));
    contour.addEdge(new EdgeHolder(new LinearSegment(
      new Vector2(1, 0),
      new Vector2(0.5, 1),
      EdgeColor.WHITE
    )));
    contour.addEdge(new EdgeHolder(new LinearSegment(
      new Vector2(0.5, 1),
      new Vector2(0, 0),
      EdgeColor.WHITE
    )));

    shape.addContour(contour);
    return shape;
  }

  /**
   * Helper to create a smooth circle (no sharp corners)
   */
  function createCircle(): Shape {
    const shape = new Shape();
    const contour = new Contour();

    // Create a circle approximation with quadratic segments
    const segments = 8;
    const angleStep = (2 * Math.PI) / segments;

    for (let i = 0; i < segments; i++) {
      const angle1 = i * angleStep;
      const angle2 = (i + 1) * angleStep;
      const angleMid = (angle1 + angle2) / 2;

      const p0 = new Vector2(Math.cos(angle1), Math.sin(angle1));
      const p2 = new Vector2(Math.cos(angle2), Math.sin(angle2));
      const p1 = new Vector2(Math.cos(angleMid) * 1.1, Math.sin(angleMid) * 1.1);

      contour.addEdge(new EdgeHolder(new QuadraticSegment(
        p0, p1, p2,
        EdgeColor.WHITE
      )));
    }

    shape.addContour(contour);
    return shape;
  }

  /**
   * Helper to verify that adjacent edges have different colors
   */
  function verifyNoAdjacentSameColors(shape: Shape): boolean {
    for (const contour of shape.contours) {
      if (contour.edges.length === 0) continue;

      for (let i = 0; i < contour.edges.length; i++) {
        const currentEdge = contour.edges[i].get();
        const nextEdge = contour.edges[(i + 1) % contour.edges.length].get();

        // Skip if either edge is WHITE (uncolored)
        if (currentEdge.color === EdgeColor.WHITE || nextEdge.color === EdgeColor.WHITE) {
          continue;
        }

        // Adjacent edges should have different colors
        if (currentEdge.color === nextEdge.color) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Helper to count unique colors used in a shape
   */
  function countUniqueColors(shape: Shape): Set<EdgeColor> {
    const colors = new Set<EdgeColor>();
    for (const contour of shape.contours) {
      for (const edgeHolder of contour.edges) {
        const edge = edgeHolder.get();
        if (edge.color !== EdgeColor.WHITE) {
          colors.add(edge.color);
        }
      }
    }
    return colors;
  }

  describe('edgeColoringSimple', () => {
    it('should color a square with 3 colors', () => {
      const shape = createSquare();
      edgeColoringSimple(shape, Math.PI, 0n);

      // Square has 4 corners, so we need at least 2 colors (alternating)
      const colors = countUniqueColors(shape);
      expect(colors.size).toBeGreaterThanOrEqual(2);
      expect(colors.size).toBeLessThanOrEqual(3);

      // No adjacent edges should have the same color
      expect(verifyNoAdjacentSameColors(shape)).toBe(true);
    });

    it('should color a triangle with 3 colors', () => {
      const shape = createTriangle();
      edgeColoringSimple(shape, Math.PI, 0n);

      // Triangle has 3 corners, ideal for 3-coloring
      const colors = countUniqueColors(shape);
      expect(colors.size).toBe(3);

      // No adjacent edges should have the same color
      expect(verifyNoAdjacentSameColors(shape)).toBe(true);
    });

    it('should color a smooth circle with a single color', () => {
      const shape = createCircle();
      // Use a threshold that won't detect corners in the smooth curve
      edgeColoringSimple(shape, 3, 0n);

      // Smooth contour should use just one color
      const colors = countUniqueColors(shape);
      expect(colors.size).toBe(1);
    });

    it('should handle different random seeds', () => {
      const shape1 = createSquare();
      const shape2 = createSquare();

      edgeColoringSimple(shape1, Math.PI, 0n);
      edgeColoringSimple(shape2, Math.PI, 12345n);

      // Both should be valid colorings
      expect(verifyNoAdjacentSameColors(shape1)).toBe(true);
      expect(verifyNoAdjacentSameColors(shape2)).toBe(true);

      // Colors might differ due to random seed
      const colors1 = Array.from(shape1.contours[0].edges).map(e => e.get().color);
      const colors2 = Array.from(shape2.contours[0].edges).map(e => e.get().color);

      // At least verify they both have valid colorings (may or may not be different)
      expect(colors1.every(c => c !== EdgeColor.BLACK)).toBe(true);
      expect(colors2.every(c => c !== EdgeColor.BLACK)).toBe(true);
    });

    it('should handle empty shape', () => {
      const shape = new Shape();
      // Should not throw
      expect(() => edgeColoringSimple(shape, Math.PI, 0n)).not.toThrow();
    });

    it('should handle shape with empty contour', () => {
      const shape = new Shape();
      shape.addEmptyContour();
      // Should not throw
      expect(() => edgeColoringSimple(shape, Math.PI, 0n)).not.toThrow();
    });

    it('should assign colors from the primary color set', () => {
      const shape = createSquare();
      edgeColoringSimple(shape, Math.PI, 0n);

      const colors = countUniqueColors(shape);
      // All colors should be from the primary set: CYAN, MAGENTA, YELLOW
      const primaryColors = [EdgeColor.CYAN, EdgeColor.MAGENTA, EdgeColor.YELLOW];
      for (const color of colors) {
        expect(primaryColors).toContain(color);
      }
    });
  });

  describe('edgeColoringInkTrap', () => {
    it('should color a square with 3 colors', () => {
      const shape = createSquare();
      edgeColoringInkTrap(shape, Math.PI, 0n);

      // Square has 4 corners
      const colors = countUniqueColors(shape);
      expect(colors.size).toBeGreaterThanOrEqual(2);
      expect(colors.size).toBeLessThanOrEqual(3);

      // No adjacent edges should have the same color
      expect(verifyNoAdjacentSameColors(shape)).toBe(true);
    });

    it('should color a triangle with 3 colors', () => {
      const shape = createTriangle();
      edgeColoringInkTrap(shape, Math.PI, 0n);

      // Triangle has 3 corners
      const colors = countUniqueColors(shape);
      expect(colors.size).toBe(3);

      // No adjacent edges should have the same color
      expect(verifyNoAdjacentSameColors(shape)).toBe(true);
    });

    it('should color a smooth circle with a single color', () => {
      const shape = createCircle();
      edgeColoringInkTrap(shape, 3, 0n);

      // Smooth contour should use just one color
      const colors = countUniqueColors(shape);
      expect(colors.size).toBe(1);
    });

    it('should handle different random seeds', () => {
      const shape1 = createSquare();
      const shape2 = createSquare();

      edgeColoringInkTrap(shape1, Math.PI, 0n);
      edgeColoringInkTrap(shape2, Math.PI, 99999n);

      // Both should be valid colorings
      expect(verifyNoAdjacentSameColors(shape1)).toBe(true);
      expect(verifyNoAdjacentSameColors(shape2)).toBe(true);
    });

    it('should handle empty shape', () => {
      const shape = new Shape();
      expect(() => edgeColoringInkTrap(shape, Math.PI, 0n)).not.toThrow();
    });

    it('should assign colors from the primary color set', () => {
      const shape = createTriangle();
      edgeColoringInkTrap(shape, Math.PI, 0n);

      const colors = countUniqueColors(shape);
      const primaryColors = [EdgeColor.CYAN, EdgeColor.MAGENTA, EdgeColor.YELLOW];
      for (const color of colors) {
        expect(primaryColors).toContain(color);
      }
    });
  });

  describe('edgeColoringByDistance', () => {
    it('should color a square with 3 colors', () => {
      const shape = createSquare();
      edgeColoringByDistance(shape, Math.PI, 0n);

      // Square has 4 corners
      const colors = countUniqueColors(shape);
      expect(colors.size).toBeGreaterThanOrEqual(2);
      expect(colors.size).toBeLessThanOrEqual(3);

      // No adjacent edges should have the same color
      expect(verifyNoAdjacentSameColors(shape)).toBe(true);
    });

    it('should color a triangle with 3 colors', () => {
      const shape = createTriangle();
      edgeColoringByDistance(shape, Math.PI, 0n);

      // Triangle has 3 corners
      const colors = countUniqueColors(shape);
      expect(colors.size).toBe(3);

      // No adjacent edges should have the same color
      expect(verifyNoAdjacentSameColors(shape)).toBe(true);
    });

    it('should color a smooth circle with a single color', () => {
      const shape = createCircle();
      edgeColoringByDistance(shape, 3, 0n);

      // Smooth contour should use just one color
      const colors = countUniqueColors(shape);
      expect(colors.size).toBe(1);
    });

    it('should handle different random seeds', () => {
      const shape1 = createSquare();
      const shape2 = createSquare();

      edgeColoringByDistance(shape1, Math.PI, 0n);
      edgeColoringByDistance(shape2, Math.PI, 777n);

      // Both should be valid colorings
      expect(verifyNoAdjacentSameColors(shape1)).toBe(true);
      expect(verifyNoAdjacentSameColors(shape2)).toBe(true);
    });

    it('should handle empty shape', () => {
      const shape = new Shape();
      expect(() => edgeColoringByDistance(shape, Math.PI, 0n)).not.toThrow();
    });

    it('should assign colors from the primary color set', () => {
      const shape = createTriangle();
      edgeColoringByDistance(shape, Math.PI, 0n);

      const colors = countUniqueColors(shape);
      const primaryColors = [EdgeColor.CYAN, EdgeColor.MAGENTA, EdgeColor.YELLOW];
      for (const color of colors) {
        expect(primaryColors).toContain(color);
      }
    });

    it('should handle complex multi-contour shapes', () => {
      const shape = new Shape();

      // Add two separate contours (like a letter 'o' with a hole)
      const outer = new Contour();
      outer.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(0, 0), new Vector2(2, 0), EdgeColor.WHITE
      )));
      outer.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(2, 0), new Vector2(2, 2), EdgeColor.WHITE
      )));
      outer.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(2, 2), new Vector2(0, 2), EdgeColor.WHITE
      )));
      outer.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(0, 2), new Vector2(0, 0), EdgeColor.WHITE
      )));
      shape.addContour(outer);

      const inner = new Contour();
      inner.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(0.5, 0.5), new Vector2(1.5, 0.5), EdgeColor.WHITE
      )));
      inner.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(1.5, 0.5), new Vector2(1.5, 1.5), EdgeColor.WHITE
      )));
      inner.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(1.5, 1.5), new Vector2(0.5, 1.5), EdgeColor.WHITE
      )));
      inner.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(0.5, 1.5), new Vector2(0.5, 0.5), EdgeColor.WHITE
      )));
      shape.addContour(inner);

      edgeColoringByDistance(shape, Math.PI, 0n);

      // Both contours should be properly colored
      expect(verifyNoAdjacentSameColors(shape)).toBe(true);
    });
  });

  describe('Color consistency across algorithms', () => {
    it('all algorithms should produce valid 3-coloring for triangle', () => {
      const shape1 = createTriangle();
      const shape2 = createTriangle();
      const shape3 = createTriangle();

      edgeColoringSimple(shape1, Math.PI, 0n);
      edgeColoringInkTrap(shape2, Math.PI, 0n);
      edgeColoringByDistance(shape3, Math.PI, 0n);

      // All should produce valid colorings
      expect(verifyNoAdjacentSameColors(shape1)).toBe(true);
      expect(verifyNoAdjacentSameColors(shape2)).toBe(true);
      expect(verifyNoAdjacentSameColors(shape3)).toBe(true);

      // All should use exactly 3 colors for a triangle
      expect(countUniqueColors(shape1).size).toBe(3);
      expect(countUniqueColors(shape2).size).toBe(3);
      expect(countUniqueColors(shape3).size).toBe(3);
    });

    it('all algorithms should handle smooth contours identically', () => {
      const shape1 = createCircle();
      const shape2 = createCircle();
      const shape3 = createCircle();

      edgeColoringSimple(shape1, 3, 0n);
      edgeColoringInkTrap(shape2, 3, 0n);
      edgeColoringByDistance(shape3, 3, 0n);

      // All should produce single-color for smooth contour
      expect(countUniqueColors(shape1).size).toBe(1);
      expect(countUniqueColors(shape2).size).toBe(1);
      expect(countUniqueColors(shape3).size).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle single-edge contour', () => {
      const shape = new Shape();
      const contour = new Contour();
      contour.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(0, 0),
        new Vector2(1, 0),
        EdgeColor.WHITE
      )));
      shape.addContour(contour);

      // All algorithms should handle this gracefully
      expect(() => edgeColoringSimple(shape, Math.PI, 0n)).not.toThrow();
      expect(() => edgeColoringInkTrap(shape, Math.PI, 0n)).not.toThrow();
      expect(() => edgeColoringByDistance(shape, Math.PI, 0n)).not.toThrow();
    });

    it('should handle two-edge contour', () => {
      const shape = new Shape();
      const contour = new Contour();
      contour.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(0, 0),
        new Vector2(1, 0),
        EdgeColor.WHITE
      )));
      contour.addEdge(new EdgeHolder(new LinearSegment(
        new Vector2(1, 0),
        new Vector2(0, 0),
        EdgeColor.WHITE
      )));
      shape.addContour(contour);

      expect(() => edgeColoringSimple(shape, Math.PI, 0n)).not.toThrow();
      expect(() => edgeColoringInkTrap(shape, Math.PI, 0n)).not.toThrow();
      expect(() => edgeColoringByDistance(shape, Math.PI, 0n)).not.toThrow();
    });
  });
});
