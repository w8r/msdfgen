import type { Point2, Vector2 } from '../types/Vector2';
import { dotProduct, crossProduct } from '../types/Vector2';
import { SignedDistance } from '../types/SignedDistance';
import { EdgeColor } from './EdgeColor';

/**
 * Result of signed distance calculation
 */
export interface SignedDistanceResult {
  /** The signed distance from origin to the edge */
  distance: SignedDistance;
  /** Parameter t (0-1) where the closest point on the edge occurs */
  param: number;
}

/**
 * Bounding box representation
 */
export interface BoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/**
 * Scanline intersection point
 */
export interface ScanlineIntersection {
  /** X coordinate of intersection */
  x: number;
  /** Direction of crossing: +1 for upward, -1 for downward, 0 for tangent */
  dy: number;
}

/**
 * Abstract base class for edge segments in a shape.
 * An edge segment represents a portion of a shape's outline.
 *
 * TypeScript port of msdfgen::EdgeSegment from core/edge-segments.h
 * @author Viktor Chlumsky (original C++)
 */
export abstract class EdgeSegment {
  /** The color channels this edge belongs to */
  color: EdgeColor;

  constructor(color: EdgeColor = EdgeColor.WHITE) {
    this.color = color;
  }

  /**
   * Creates a copy of the edge segment
   */
  abstract clone(): EdgeSegment;

  /**
   * Returns the numeric code of the edge segment's type
   * 1 = LinearSegment, 2 = QuadraticSegment, 3 = CubicSegment
   */
  abstract type(): number;

  /**
   * Returns the array of control points
   */
  abstract controlPoints(): Point2[];

  /**
   * Returns the point on the edge at parameter t (between 0 and 1)
   * @param t - Parameter along the curve (0 = start, 1 = end)
   */
  abstract point(t: number): Point2;

  /**
   * Returns the direction (tangent) the edge has at parameter t
   * @param t - Parameter along the curve (0 = start, 1 = end)
   */
  abstract direction(t: number): Vector2;

  /**
   * Returns the change of direction (second derivative) at parameter t
   * @param t - Parameter along the curve (0 = start, 1 = end)
   */
  abstract directionChange(t: number): Vector2;

  /**
   * Returns the length of the edge segment
   */
  abstract length(): number;

  /**
   * Returns the minimum signed distance between origin and the edge
   * @param origin - Point to measure distance from
   * @returns Object containing the signed distance and parameter where it occurs
   */
  abstract signedDistance(origin: Point2): SignedDistanceResult;

  /**
   * Converts a signed distance to perpendicular distance.
   * For linear segments, this returns the orthogonal distance.
   * For curves, this can differ from true distance at endpoints.
   * @param distance - The signed distance to convert
   * @param origin - The origin point
   * @param param - Parameter where the distance was measured
   * @returns The perpendicular distance, or the original distance if not applicable
   */
  distanceToPerpendicularDistance(
    distance: SignedDistance,
    origin: Point2,
    param: number,
  ): SignedDistance {
    // Default implementation: if the closest point is at an endpoint (param 0 or 1),
    // compute perpendicular distance to the tangent line at that endpoint
    if (param < 0.0001 || param > 0.9999) {
      const dir = param < 0.5 ? this.direction(0) : this.direction(1);
      const dirNorm = dir.normalize(true);
      const aq = origin.subtract(this.point(param));
      const ts = dotProduct(aq, dirNorm);
      const pseudoDistance = crossProduct(aq, dirNorm);

      if (Math.abs(pseudoDistance) < Math.abs(distance.distance)) {
        return new SignedDistance(pseudoDistance, ts);
      }
    }
    return distance;
  }

  /**
   * Returns intersections with a horizontal scanline at y
   * @param y - Y coordinate of the scanline
   * @returns Array of intersection points with their crossing directions
   */
  abstract scanlineIntersections(y: number): ScanlineIntersection[];

  /**
   * Returns the bounding box of the edge segment
   */
  abstract bound(): BoundingBox;

  /**
   * Reverses the edge (swaps start and end points)
   */
  abstract reverse(): void;

  /**
   * Moves the start point of the edge segment
   * @param to - New start point
   */
  abstract moveStartPoint(to: Point2): void;

  /**
   * Moves the end point of the edge segment
   * @param to - New end point
   */
  abstract moveEndPoint(to: Point2): void;

  /**
   * Splits the edge segment into thirds which together represent the original edge
   * @returns Array of three edge segments
   */
  abstract splitInThirds(): [EdgeSegment, EdgeSegment, EdgeSegment];
}
