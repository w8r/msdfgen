import { SignedDistance } from '../types/SignedDistance';
import type { EdgeSegment } from '../edge/EdgeSegment';
import { Vector2, type Point2 } from '../types/Vector2';

/**
 * Edge cache to store the signed distance to an edge for optimization.
 * Allows reusing distance calculations when the same edge is queried multiple times.
 */
export class EdgeCache {
  point: Point2;
  absDistance: number;

  constructor(point: Point2 = new Vector2(0, 0), absDistance: number = 0) {
    this.point = point;
    this.absDistance = absDistance;
  }
}

/**
 * Selects the nearest edge by true distance (not perpendicular distance).
 * Used for generating standard single-channel signed distance fields (SDF).
 *
 * The true distance is the actual Euclidean distance from the point to the
 * closest point on the edge, accounting for the edge's endpoints.
 *
 * TypeScript port of msdfgen::TrueDistanceSelector from core/edge-selectors.h
 * @author Viktor Chlumsky (original C++)
 */
export class TrueDistanceSelector {
  /** The minimum signed distance found so far */
  private minDistance: SignedDistance;

  /** Cache for distance calculations */
  private cache: Map<EdgeSegment, EdgeCache>;

  constructor() {
    this.minDistance = new SignedDistance();
    this.cache = new Map();
  }

  /**
   * Resets the selector state for a new point query
   */
  reset(_p: Point2): void {
    // Convert double.MaxValue equivalent - very large positive number
    const MAX_VAL = Number.MAX_VALUE;
    this.minDistance = new SignedDistance(-MAX_VAL, 0);
    this.cache.clear();
  }

  /**
   * Returns the current minimum distance
   */
  distance(): SignedDistance {
    return this.minDistance;
  }

  /**
   * Considers an edge for the minimum distance calculation.
   * Updates minDistance if this edge is closer.
   *
   * @param distance - The signed distance to this edge
   * @param edge - The edge segment being considered
   * @param origin - The point we're measuring from
   * @param param - Parameter along edge where closest point was found
   */
  addEdge(
    distance: SignedDistance,
    edge: EdgeSegment,
    origin: Point2,
    param: number,
  ): void {
    if (distance.lessThan(this.minDistance)) {
      this.minDistance = distance;
    }

    // Store in cache for potential reuse
    const cached = new EdgeCache();
    cached.point = edge.point(param);
    cached.absDistance = Math.abs(distance.distance);
    this.cache.set(edge, cached);
  }

  /**
   * Merges two distance values, returning the one with smaller absolute distance.
   * This is used when combining distances from different selectors.
   *
   * @param a - First signed distance
   * @param b - Second signed distance
   * @returns The distance with smaller absolute value
   */
  static merge(a: SignedDistance, b: SignedDistance): SignedDistance {
    return Math.abs(a.distance) < Math.abs(b.distance) ? a : b;
  }

  /**
   * Returns true if the selector has a valid distance computed
   */
  hasDistance(): boolean {
    return this.minDistance.distance > -Number.MAX_VALUE;
  }

  /**
   * Gets the cached distance for a specific edge, if available
   */
  getCached(edge: EdgeSegment): EdgeCache | undefined {
    return this.cache.get(edge);
  }
}
