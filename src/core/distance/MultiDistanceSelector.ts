import { SignedDistance } from '../types/SignedDistance';
import { MultiDistance } from '../types/MultiDistance';
import type { EdgeSegment } from '../edge/EdgeSegment';
import { EdgeColor } from '../edge/EdgeColor';
import type { Point2 } from '../types/Vector2';
import { EdgeCache } from './TrueDistanceSelector';

/**
 * Selects the nearest edge per color channel for multi-channel signed distance fields (MSDF).
 *
 * This selector maintains separate distance values for red, green, and blue channels.
 * Each channel tracks the closest edge of its corresponding color. This is the key
 * to MSDF's ability to preserve sharp corners.
 *
 * TypeScript port of msdfgen::MultiDistanceSelector from core/edge-selectors.h
 * @author Viktor Chlumsky (original C++)
 */
export class MultiDistanceSelector {
  /** Minimum distance for red channel */
  private r: SignedDistance;

  /** Minimum distance for green channel */
  private g: SignedDistance;

  /** Minimum distance for blue channel */
  private b: SignedDistance;

  /** Cache for distance calculations */
  private cache: Map<EdgeSegment, EdgeCache>;

  constructor() {
    this.r = new SignedDistance();
    this.g = new SignedDistance();
    this.b = new SignedDistance();
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
    this.cache.clear();
  }

  /**
   * Returns the current multi-channel distance
   */
  distance(): MultiDistance {
    return new MultiDistance(
      this.r.distance,
      this.g.distance,
      this.b.distance,
    );
  }

  /**
   * Considers an edge for the minimum distance calculation.
   * Updates the distance for each channel that this edge's color contains.
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
    // Update each channel if this edge has that color
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

    // Store in cache
    const cached = new EdgeCache();
    cached.point = edge.point(param);
    cached.absDistance = Math.abs(distance.distance);
    this.cache.set(edge, cached);
  }

  /**
   * Merges two multi-distance values by taking the minimum distance per channel.
   *
   * @param a - First multi-distance
   * @param b - Second multi-distance
   * @returns Combined multi-distance with minimum per channel
   */
  static merge(a: MultiDistance, b: MultiDistance): MultiDistance {
    return new MultiDistance(
      Math.abs(a.r) < Math.abs(b.r) ? a.r : b.r,
      Math.abs(a.g) < Math.abs(b.g) ? a.g : b.g,
      Math.abs(a.b) < Math.abs(b.b) ? a.b : b.b,
    );
  }

  /**
   * Returns true if the selector has valid distances computed for all channels
   */
  hasDistance(): boolean {
    return (
      this.r.distance > -Number.MAX_VALUE &&
      this.g.distance > -Number.MAX_VALUE &&
      this.b.distance > -Number.MAX_VALUE
    );
  }

  /**
   * Gets the cached distance for a specific edge, if available
   */
  getCached(edge: EdgeSegment): EdgeCache | undefined {
    return this.cache.get(edge);
  }
}
