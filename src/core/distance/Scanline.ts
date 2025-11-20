/**
 * Represents an intersection of an edge with a horizontal scanline.
 */
export interface ScanlineIntersection {
  /** X coordinate of intersection */
  x: number;
  /** Direction: 1 for upward crossing, -1 for downward crossing */
  direction: number;
}

/**
 * Tracks horizontal scanline intersections with shape contours to determine fill.
 * Uses winding number algorithm to determine if a point is inside or outside the shape.
 *
 * The scanline tracks all intersections to the left of a point. If the sum of
 * crossing directions (winding number) is non-zero, the point is inside the shape.
 *
 * TypeScript port of msdfgen::Scanline from core/Scanline.h/cpp
 * @author Viktor Chlumsky (original C++)
 */
export class Scanline {
  /** Array of intersection x-coordinates and their directions */
  private intersections: ScanlineIntersection[];

  /** Cached index for optimization of sequential queries */
  private lastIndex: number;

  constructor() {
    this.intersections = [];
    this.lastIndex = 0;
  }

  /**
   * Adds an intersection point to the scanline
   * @param x - X coordinate of intersection
   * @param direction - Direction of crossing (1 = up, -1 = down, 0 = tangent)
   */
  addIntersection(x: number, direction: number): void {
    if (direction === 0) return; // Ignore tangent intersections

    this.intersections.push({ x, direction });
  }

  /**
   * Sets the intersections directly (replaces existing)
   * @param intersections - Array of intersection points
   */
  setIntersections(intersections: ScanlineIntersection[]): void {
    this.intersections = intersections;
    this.lastIndex = 0;
  }

  /**
   * Sorts intersections by x coordinate (must be called before querying fill)
   */
  sort(): void {
    this.intersections.sort((a, b) => a.x - b.x);
    this.lastIndex = 0;
  }

  /**
   * Counts the winding number at a given x coordinate.
   * @param x - X coordinate to query
   * @returns Winding number (sum of crossing directions to the left of x)
   */
  countWinding(x: number): number {
    let winding = 0;

    // Count all intersections to the left of x
    for (const intersection of this.intersections) {
      if (intersection.x < x) {
        winding += intersection.direction;
      } else {
        break; // Since sorted, no more intersections to the left
      }
    }

    return winding;
  }

  /**
   * Determines if a point at x coordinate is filled (inside the shape).
   * Uses non-zero winding rule: filled if winding number is non-zero.
   *
   * @param x - X coordinate to query
   * @returns true if filled (inside), false if not filled (outside)
   */
  filled(x: number): boolean {
    return this.countWinding(x) !== 0;
  }

  /**
   * Optimized version of filled() that uses cached last index.
   * Assumes queries are sequential (x values increase).
   *
   * @param x - X coordinate to query
   * @returns true if filled (inside), false if not filled (outside)
   */
  filledSequential(x: number): boolean {
    let winding = 0;

    // Start from cached index
    for (let i = this.lastIndex; i < this.intersections.length; i++) {
      if (this.intersections[i].x < x) {
        winding += this.intersections[i].direction;
        this.lastIndex = i + 1;
      } else {
        break;
      }
    }

    return winding !== 0;
  }

  /**
   * Resets the scanline state
   */
  reset(): void {
    this.intersections = [];
    this.lastIndex = 0;
  }

  /**
   * Returns the number of intersections
   */
  getIntersectionCount(): number {
    return this.intersections.length;
  }

  /**
   * Returns all intersections (for debugging/testing)
   */
  getIntersections(): ScanlineIntersection[] {
    return this.intersections;
  }
}
