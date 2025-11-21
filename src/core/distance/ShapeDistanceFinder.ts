import type { Point2 } from '../types/Vector2';
import type { Shape } from '../shape/Shape';
import type { Contour } from '../shape/Contour';

/**
 * Interface for contour combiners that can be used with ShapeDistanceFinder.
 */
export interface ContourCombiner<T> {
  distance(origin: Point2, contours: Contour[]): T;
  reset(p: Point2): void;
}

/**
 * High-level API for computing signed distances from a point to a shape.
 * Uses a contour combiner to aggregate distances from all contours in the shape.
 *
 * This class provides:
 * - Efficient distance queries with caching
 * - Support for any contour combiner (Simple or Overlapping)
 * - Static one-shot method for single queries
 *
 * TypeScript port of msdfgen::ShapeDistanceFinder from core/ShapeDistanceFinder.h
 * @author Viktor Chlumsky (original C++)
 */
export class ShapeDistanceFinder<T, Combiner extends ContourCombiner<T>> {
  /** The shape to compute distances from */
  private shape: Shape;

  /** The contour combiner used to aggregate distances */
  private combiner: Combiner;

  /**
   * Creates a shape distance finder for the given shape.
   * @param shape - The shape to compute distances from
   * @param combinerFactory - Factory function that creates the combiner
   */
  constructor(shape: Shape, combinerFactory: () => Combiner) {
    this.shape = shape;
    this.combiner = combinerFactory();
  }

  /**
   * Computes the signed distance from a point to the shape.
   * Uses the contour combiner to aggregate distances from all contours.
   *
   * @param origin - The point to measure distance from
   * @returns The signed distance (type depends on combiner's selector)
   */
  distance(origin: Point2): T {
    return this.combiner.distance(origin, this.shape.contours);
  }

  /**
   * Resets the internal state of the combiner.
   * @param p - Point to reset at
   */
  reset(p: Point2): void {
    this.combiner.reset(p);
  }

  /**
   * Returns the shape
   */
  getShape(): Shape {
    return this.shape;
  }

  /**
   * Returns the combiner
   */
  getCombiner(): Combiner {
    return this.combiner;
  }

  /**
   * Static utility method for one-shot distance queries.
   * Creates a temporary ShapeDistanceFinder and computes the distance.
   *
   * @param shape - The shape to compute distance from
   * @param origin - The point to measure distance from
   * @param combinerFactory - Factory function that creates the combiner
   * @returns The signed distance
   */
  static oneShotDistance<T, C extends ContourCombiner<T>>(
    shape: Shape,
    origin: Point2,
    combinerFactory: () => C,
  ): T {
    const finder = new ShapeDistanceFinder(shape, combinerFactory);
    return finder.distance(origin);
  }
}

/**
 * Convenience function to create a ShapeDistanceFinder with a simple combiner.
 * @param shape - The shape to compute distances from
 * @param combinerFactory - Factory that creates the combiner
 * @returns A new ShapeDistanceFinder instance
 */
export function createShapeDistanceFinder<T, C extends ContourCombiner<T>>(
  shape: Shape,
  combinerFactory: () => C,
): ShapeDistanceFinder<T, C> {
  return new ShapeDistanceFinder(shape, combinerFactory);
}
