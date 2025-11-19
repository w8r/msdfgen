/**
 * Represents a multi-channel signed distance for MSDF generation.
 * Contains separate distance values for red, green, and blue channels.
 *
 * TypeScript port of msdfgen::MultiDistance from core/edge-selectors.h
 * @author Viktor Chlumsky (original C++)
 */
export class MultiDistance {
  /** Red channel distance */
  r: number

  /** Green channel distance */
  g: number

  /** Blue channel distance */
  b: number

  constructor(r: number = 0, g: number = 0, b: number = 0) {
    this.r = r
    this.g = g
    this.b = b
  }

  /**
   * Returns the median of the three channel distances.
   * The median is used as the effective distance in MSDF rendering.
   *
   * Implementation: max(min(a, b), min(max(a, b), c))
   * This is mathematically equivalent to the middle value of three numbers.
   */
  median(): number {
    return Math.max(Math.min(this.r, this.g), Math.min(Math.max(this.r, this.g), this.b))
  }

  /**
   * Compares based on median values.
   * Returns true if this multi-distance's median is less than the other's median.
   */
  lessThan(other: MultiDistance): boolean {
    return this.median() < other.median()
  }

  /**
   * Compares based on median values.
   * Returns true if this multi-distance's median is greater than the other's median.
   */
  greaterThan(other: MultiDistance): boolean {
    return this.median() > other.median()
  }

  /**
   * Compares based on median values.
   * Returns true if this multi-distance's median is less than or equal to the other's median.
   */
  lessThanOrEqual(other: MultiDistance): boolean {
    return this.median() <= other.median()
  }

  /**
   * Compares based on median values.
   * Returns true if this multi-distance's median is greater than or equal to the other's median.
   */
  greaterThanOrEqual(other: MultiDistance): boolean {
    return this.median() >= other.median()
  }
}
