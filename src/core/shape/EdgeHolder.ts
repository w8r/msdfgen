import { EdgeSegment } from '../edge/EdgeSegment';
import { LinearSegment } from '../edge/LinearSegment';
import { QuadraticSegment } from '../edge/QuadraticSegment';
import { CubicSegment } from '../edge/CubicSegment';
import { EdgeColor } from '../edge/EdgeColor';
import type { Point2, Vector2 } from '../types/Vector2';

/**
 * Container for a single edge segment of dynamic type.
 * Provides a simple wrapper around EdgeSegment references.
 *
 * TypeScript port of msdfgen::EdgeHolder from core/EdgeHolder.h
 * @author Viktor Chlumsky (original C++)
 */
export class EdgeHolder {
  private edgeSegment: EdgeSegment | null;

  /**
   * Creates an empty edge holder
   */
  constructor();

  /**
   * Creates an edge holder with an existing edge segment
   */
  constructor(segment: EdgeSegment);

  /**
   * Creates an edge holder with a linear segment
   */
  constructor(p0: Point2, p1: Point2, color?: EdgeColor);

  /**
   * Creates an edge holder with a quadratic segment
   */
  constructor(p0: Point2, p1: Point2, p2: Point2, color?: EdgeColor);

  /**
   * Creates an edge holder with a cubic segment
   */
  constructor(
    p0: Point2,
    p1: Point2,
    p2: Point2,
    p3: Point2,
    color?: EdgeColor
  );

  constructor(
    p0OrSegment?: EdgeSegment | Point2,
    p1?: Point2,
    p2?: Point2 | EdgeColor,
    p3OrColor?: Point2 | EdgeColor,
  ) {
    if (p0OrSegment === undefined) {
      // Empty constructor
      this.edgeSegment = null;
    } else if (p0OrSegment instanceof EdgeSegment) {
      // Constructor with existing segment
      this.edgeSegment = p0OrSegment;
    } else if (
      p1 !== undefined &&
      p2 !== undefined &&
      p3OrColor !== undefined
    ) {
      // Check if it's a cubic or quadratic with color
      if (p3OrColor instanceof Object && 'x' in p3OrColor && 'y' in p3OrColor) {
        // Cubic segment (4 points)
        const color = arguments[4] as EdgeColor | undefined;
        this.edgeSegment = new CubicSegment(
          p0OrSegment,
          p1,
          p2 as Vector2,
          p3OrColor,
          color ?? EdgeColor.WHITE,
        );
      } else {
        // Quadratic segment (3 points + color)
        this.edgeSegment = new QuadraticSegment(
          p0OrSegment,
          p1,
          p2 as Vector2,
          (p3OrColor as EdgeColor) ?? EdgeColor.WHITE,
        );
      }
    } else if (p1 !== undefined) {
      // Linear segment (2 points, optional color)
      const color = p2 as EdgeColor | undefined;
      this.edgeSegment = new LinearSegment(
        p0OrSegment,
        p1,
        color ?? EdgeColor.WHITE,
      );
    } else {
      this.edgeSegment = null;
    }
  }

  /**
   * Returns the held edge segment, or null if none is set
   */
  getOrNull(): EdgeSegment | null {
    return this.edgeSegment;
  }

  /**
   * Returns the held edge segment, throws if none is set
   */
  get(): EdgeSegment {
    if (!this.edgeSegment) {
      throw new Error('EdgeHolder: No edge segment set');
    }
    return this.edgeSegment;
  }

  /**
   * Sets the edge segment
   */
  set(segment: EdgeSegment | null): void {
    this.edgeSegment = segment;
  }

  /**
   * Checks if the holder contains an edge
   */
  hasEdge(): boolean {
    return this.edgeSegment !== null;
  }

  /**
   * Swaps the edges held by two EdgeHolders
   */
  static swap(a: EdgeHolder, b: EdgeHolder): void {
    const temp = a.edgeSegment;
    a.edgeSegment = b.edgeSegment;
    b.edgeSegment = temp;
  }
}
