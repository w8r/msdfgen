import type { Point2 } from '../types/Vector2';
import type { Contour } from '../shape/Contour';
import { Scanline } from './Scanline';
import type { EdgeSelector } from './SimpleContourCombiner';

/**
 * Contour combiner that handles overlapping contours using winding fill rules.
 * Uses scanline algorithm to determine if a point is inside or outside the shape.
 *
 * This combiner properly handles:
 * - Self-intersecting shapes
 * - Shapes with holes (inner contours)
 * - Overlapping contours
 * - Non-zero winding rule
 *
 * TypeScript port of msdfgen::OverlappingContourCombiner from core/contour-combiners.h
 * @author Viktor Chlumsky (original C++)
 */
export class OverlappingContourCombiner<T, Selector extends EdgeSelector<T>> {
  /** The edge selector used to find minimum distances */
  private selector: Selector;

  /** Scanline for fill determination */
  private scanline: Scanline;

  /** Cached Y coordinate for scanline optimization */
  private lastY: number;

  constructor(selectorFactory: () => Selector) {
    this.selector = selectorFactory();
    this.scanline = new Scanline();
    this.lastY = NaN;
  }

  /**
   * Returns the edge selector
   */
  getSelector(): Selector {
    return this.selector;
  }

  /**
   * Computes the distance from a point to all edges, considering fill rules.
   * The sign of the distance is determined by whether the point is inside or outside.
   *
   * @param origin - The point to measure distance from
   * @param contours - Array of contours to consider
   * @returns The minimum distance with correct sign based on fill
   */
  distance(origin: Point2, contours: Contour[]): T {
    this.selector.reset(origin);

    // Update scanline if Y changed
    if (origin.y !== this.lastY) {
      this.updateScanline(origin.y, contours);
      this.lastY = origin.y;
    }

    // Consider all edges from all contours
    for (const contour of contours) {
      if (contour.edges.length === 0) continue;

      for (const edgeHolder of contour.edges) {
        const edge = edgeHolder.getOrNull();
        if (!edge) continue;

        const result = edge.signedDistance(origin);
        this.selector.addEdge(result.distance, edge, origin, result.param);
      }
    }

    // Get the minimum distance
    const dist = this.selector.distance();

    // Determine if point is filled based on winding rule
    const filled = this.scanline.filled(origin.x);

    // Flip sign if inside/outside status doesn't match distance sign
    // If filled and distance is negative, or not filled and distance is positive, flip it
    if (typeof dist === 'object' && 'distance' in dist) {
      const isInside = filled;
      const distanceIsNegative = dist.distance < 0;

      if (isInside !== distanceIsNegative) {
        // Need to flip the sign
        if ('r' in dist && 'g' in dist && 'b' in dist) {
          // MultiDistance or MultiAndTrueDistance
          dist.r = -dist.r;
          dist.g = -dist.g;
          dist.b = -dist.b;
          if ('a' in dist) {
            dist.a = -dist.a;
          }
        } else {
          // SignedDistance
          dist.distance = -dist.distance;
        }
      }
    }

    return dist;
  }

  /**
   * Updates the scanline with all edge intersections at the given Y coordinate
   * @param y - Y coordinate of the scanline
   * @param contours - Contours to scan
   */
  private updateScanline(y: number, contours: Contour[]): void {
    this.scanline.reset();

    // Collect all intersections from all contours
    for (const contour of contours) {
      if (contour.edges.length === 0) continue;

      for (const edgeHolder of contour.edges) {
        const edge = edgeHolder.getOrNull();
        if (!edge) continue;

        const intersections = edge.scanlineIntersections(y);
        for (const intersection of intersections) {
          this.scanline.addIntersection(intersection.x, intersection.direction);
        }
      }
    }

    // Sort intersections by x coordinate
    this.scanline.sort();
  }

  /**
   * Resets the combiner state
   */
  reset(p: Point2): void {
    this.selector.reset(p);
    this.lastY = NaN;
    this.scanline.reset();
  }

  /**
   * Returns the scanline (for debugging/testing)
   */
  getScanline(): Scanline {
    return this.scanline;
  }
}
