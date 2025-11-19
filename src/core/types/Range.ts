/**
 * Represents the range between two real values.
 * For example, the range of representable signed distances.
 *
 * TypeScript port of msdfgen::Range from core/Range.hpp
 * @author Viktor Chlumsky (original C++)
 */
export class Range {
  lower: number
  upper: number

  /**
   * Creates a range.
   * @param lowerOrWidth If only one argument, creates symmetrical range [-width/2, width/2].
   *                     If two arguments, specifies lower bound explicitly.
   * @param upper Upper bound (only when two arguments provided)
   */
  constructor(lowerOrWidth: number = 0, upper?: number) {
    if (upper === undefined) {
      // Single argument: symmetrical width
      const halfWidth = lowerOrWidth * 0.5
      this.lower = -halfWidth
      this.upper = halfWidth
    } else {
      // Two arguments: explicit bounds
      this.lower = lowerOrWidth
      this.upper = upper
    }
  }

  /**
   * Scales the range by a factor (mutates this range).
   */
  scaleInPlace(factor: number): this {
    this.lower *= factor
    this.upper *= factor
    return this
  }

  /**
   * Divides the range by a divisor (mutates this range).
   */
  divideInPlace(divisor: number): this {
    this.lower /= divisor
    this.upper /= divisor
    return this
  }

  /**
   * Returns a new range scaled by a factor.
   */
  scale(factor: number): Range {
    return new Range(this.lower * factor, this.upper * factor)
  }

  /**
   * Returns a new range divided by a divisor.
   */
  divide(divisor: number): Range {
    return new Range(this.lower / divisor, this.upper / divisor)
  }

  /**
   * Returns the width of the range.
   */
  width(): number {
    return this.upper - this.lower
  }
}
