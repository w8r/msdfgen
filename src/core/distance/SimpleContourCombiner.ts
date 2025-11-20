import type { Point2 } from '../types/Vector2';
import type { Contour } from '../shape/Contour';

import type { SignedDistance } from '../types/SignedDistance';
import type { EdgeSegment } from '../edge/EdgeSegment';

/**
 * Interface for edge selectors that can be used with contour combiners.
 * All edge selectors (True, Perpendicular, Multi, MultiAndTrue) implement this interface.
 */
export interface EdgeSelector<T> {
  reset(p: Point2): void;
  addEdge(distance: SignedDistance, edge: EdgeSegment, origin: Point2, param: number): void;
  distance(): T;
}

/**
 * Simple contour combiner that finds the minimum distance across all contours.
 * Does not handle overlapping contours or fill rules - just takes the closest edge.
 *
 * This is the basic combiner used for simple shapes without self-intersection.
 *
 * TypeScript port of msdfgen::SimpleContourCombiner from core/contour-combiners.h
 * @author Viktor Chlumsky (original C++)
 */
export class SimpleContourCombiner<T, Selector extends EdgeSelector<T>> {
  /** The edge selector used to find minimum distances */
  private selector: Selector;

  constructor(selectorFactory: () => Selector) {
    this.selector = selectorFactory();
  }

  /**
   * Returns the edge selector
   */
  getSelector(): Selector {
    return this.selector;
  }

  /**
   * Computes the distance from a point to all edges in all contours.
   *
   * @param origin - The point to measure distance from
   * @param contours - Array of contours to consider
   * @returns The minimum distance found by the selector
   */
  distance(origin: Point2, contours: Contour[]): T {
    this.selector.reset(origin);

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

    return this.selector.distance();
  }

  /**
   * Resets the combiner state
   */
  reset(p: Point2): void {
    this.selector.reset(p);
  }
}
