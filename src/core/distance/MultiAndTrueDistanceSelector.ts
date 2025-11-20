import { SignedDistance } from '../types/SignedDistance';
import { MultiAndTrueDistance } from '../types/MultiAndTrueDistance';
import type { EdgeSegment } from '../edge/EdgeSegment';
import { EdgeColor } from '../edge/EdgeColor';
import type { Point2 } from '../types/Vector2';
import { EdgeCache } from './TrueDistanceSelector';

/**
 * Selects the nearest edge per color channel PLUS tracks overall true distance.
 * Combines multi-channel distance (for sharp corners) with true distance (for overall shape).
 *
 * This selector is used for MTSDF (Multi-channel + True Signed Distance Field),
 * which uses 4 channels: RGB for multi-channel distance and Alpha for true distance.
 *
 * TypeScript port of msdfgen::MultiAndTrueDistanceSelector from core/edge-selectors.h
 * @author Viktor Chlumsky (original C++)
 */
export class MultiAndTrueDistanceSelector {
  /** Minimum distance for red channel */
  private r: SignedDistance;

  /** Minimum distance for green channel */
  private g: SignedDistance;

  /** Minimum distance for blue channel */
  private b: SignedDistance;

  /** Minimum true distance (overall closest edge, regardless of color) */
  private a: SignedDistance;

  /** Cache for distance calculations */
  private cache: Map<EdgeSegment, EdgeCache>;

  constructor() {
    this.r = new SignedDistance();
    this.g = new SignedDistance();
    this.b = new SignedDistance();
    this.a = new SignedDistance();
    this.cache = new Map();
  }

  /**
   * Resets the selector state for a new point query
   */
  reset(_p: Point2): void {
    const MAX_VAL = Number.MAX_VALUE;
    this.r = new SignedDistance(-MAX_VAL, 0);
    this.g = new SignedDistance(-MAX_VAL, 0);
    this.b = new SignedDistance(-MAX_VAL, 0);
    this.a = new SignedDistance(-MAX_VAL, 0);
    this.cache.clear();
  }

  /**
   * Returns the current multi-channel + true distance
   */
  distance(): MultiAndTrueDistance {
    return new MultiAndTrueDistance(
      this.r.distance,
      this.g.distance,
      this.b.distance,
      this.a.distance,
    );
  }

  /**
   * Considers an edge for the minimum distance calculation.
   * Updates the distance for each color channel AND the true distance.
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
    // Update each color channel if this edge has that color
    if (edge.color & EdgeColor.RED) {
      if (distance.lessThan(this.r)) {
        this.r = distance;
      }
    }
    if (edge.color & EdgeColor.GREEN) {
      if (distance.lessThan(this.g)) {
        this.g = distance;
      }
    }
    if (edge.color & EdgeColor.BLUE) {
      if (distance.lessThan(this.b)) {
        this.b = distance;
      }
    }

    // Always update true distance (alpha channel) regardless of color
    if (distance.lessThan(this.a)) {
      this.a = distance;
    }

    // Store in cache
    const cached = new EdgeCache();
    cached.point = edge.point(param);
    cached.absDistance = Math.abs(distance.distance);
    this.cache.set(edge, cached);
  }

  /**
   * Merges two multi+true distance values by taking the minimum distance per channel.
   *
   * @param a - First multi+true distance
   * @param b - Second multi+true distance
   * @returns Combined distance with minimum per channel
   */
  static merge(
    a: MultiAndTrueDistance,
    b: MultiAndTrueDistance,
  ): MultiAndTrueDistance {
    return new MultiAndTrueDistance(
      Math.abs(a.r) < Math.abs(b.r) ? a.r : b.r,
      Math.abs(a.g) < Math.abs(b.g) ? a.g : b.g,
      Math.abs(a.b) < Math.abs(b.b) ? a.b : b.b,
      Math.abs(a.a) < Math.abs(b.a) ? a.a : b.a,
    );
  }

  /**
   * Returns true if the selector has valid distances computed for all channels
   */
  hasDistance(): boolean {
    return (
      this.r.distance > -Number.MAX_VALUE &&
      this.g.distance > -Number.MAX_VALUE &&
      this.b.distance > -Number.MAX_VALUE &&
      this.a.distance > -Number.MAX_VALUE
    );
  }

  /**
   * Gets the cached distance for a specific edge, if available
   */
  getCached(edge: EdgeSegment): EdgeCache | undefined {
    return this.cache.get(edge);
  }
}
