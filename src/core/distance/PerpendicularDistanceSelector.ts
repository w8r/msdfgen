import { SignedDistance } from '../types/SignedDistance';
import type { EdgeSegment } from '../edge/EdgeSegment';
import type { Point2 } from '../types/Vector2';
import { EdgeCache } from './TrueDistanceSelector';

/**
 * Selects the nearest edge by perpendicular distance.
 * Similar to TrueDistanceSelector, but uses perpendicular distance instead of true distance.
 *
 * Perpendicular distance measures the orthogonal distance to the edge's tangent line,
 * which can differ from true distance near sharp corners and endpoints.
 *
 * TypeScript port of msdfgen::PseudoDistanceSelector from core/edge-selectors.h
 * @author Viktor Chlumsky (original C++)
 */
export class PerpendicularDistanceSelector {
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
   * Converts true distance to perpendicular distance before comparing.
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
    // Convert to perpendicular distance
    const perpDistance = edge.distanceToPerpendicularDistance(
      distance,
      origin,
      param,
    );

    // distanceToPerpendicularDistance may return the same distance if conversion is not applicable
    const finalDistance = perpDistance || distance;

    if (finalDistance.lessThan(this.minDistance)) {
      this.minDistance = finalDistance;
    }

    // Cache uses the original point and distance
    const cached = new EdgeCache();
    cached.point = edge.point(param);
    cached.absDistance = Math.abs(distance.distance);
    this.cache.set(edge, cached);
  }

  /**
   * Merges two distance values, returning the one with smaller absolute distance.
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
