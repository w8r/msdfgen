/**
 * Represents a signed distance and alignment, which together can be compared to uniquely determine the closest edge segment.
 *
 * TypeScript port of msdfgen::SignedDistance from core/SignedDistance.hpp
 * @author Viktor Chlumsky (original C++)
 */
export class SignedDistance {
  /** The signed distance value (positive = outside, negative = inside) */
  distance: number;

  /** Dot product with edge direction, used as tiebreaker when distances are equal */
  dot: number;

  constructor(distance: number = -Number.MAX_VALUE, dot: number = 0) {
    this.distance = distance;
    this.dot = dot;
  }

  /**
   * Compares based on absolute distance, with dot product as tiebreaker.
   * Returns true if this distance is less than (closer than) the other.
   */
  lessThan(other: SignedDistance): boolean {
    const absA = Math.abs(this.distance);
    const absB = Math.abs(other.distance);
    return absA < absB || (absA === absB && this.dot < other.dot);
  }

  /**
   * Compares based on absolute distance, with dot product as tiebreaker.
   * Returns true if this distance is greater than (farther than) the other.
   */
  greaterThan(other: SignedDistance): boolean {
    const absA = Math.abs(this.distance);
    const absB = Math.abs(other.distance);
    return absA > absB || (absA === absB && this.dot > other.dot);
  }

  /**
   * Compares based on absolute distance, with dot product as tiebreaker.
   * Returns true if this distance is less than or equal to the other.
   */
  lessThanOrEqual(other: SignedDistance): boolean {
    const absA = Math.abs(this.distance);
    const absB = Math.abs(other.distance);
    return absA < absB || (absA === absB && this.dot <= other.dot);
  }

  /**
   * Compares based on absolute distance, with dot product as tiebreaker.
   * Returns true if this distance is greater than or equal to the other.
   */
  greaterThanOrEqual(other: SignedDistance): boolean {
    const absA = Math.abs(this.distance);
    const absB = Math.abs(other.distance);
    return absA > absB || (absA === absB && this.dot >= other.dot);
  }
}
