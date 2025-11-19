import { Range } from './Range'

/**
 * Linear transformation of signed distance values.
 * Maps distance values from shape space to normalized [0, 1] range (or vice versa).
 *
 * TypeScript port of msdfgen::DistanceMapping from core/DistanceMapping.h
 * @author Viktor Chlumsky (original C++)
 */
export class DistanceMapping {
  private scale: number
  private translate: number

  /**
   * Creates an inverse distance mapping from a range.
   * This maps from [0, 1] normalized values back to the original range.
   */
  static inverse(range: Range): DistanceMapping {
    const rangeWidth = range.upper - range.lower
    return new DistanceMapping(rangeWidth, range.lower / (rangeWidth || 1), true)
  }

  /**
   * Creates a distance mapping.
   * @param range If provided, maps the given range to [0, 1]
   */
  constructor(range?: Range)
  constructor(scale: number, translate: number, isPrivate: true)
  constructor(rangeOrScale?: Range | number, translate?: number, isPrivate?: true) {
    if (isPrivate && typeof rangeOrScale === 'number') {
      // Private constructor for creating with explicit scale/translate
      this.scale = rangeOrScale
      this.translate = translate!
    } else if (rangeOrScale instanceof Range) {
      // Create from range: maps [range.lower, range.upper] to [0, 1]
      const rangeWidth = rangeOrScale.upper - rangeOrScale.lower
      this.scale = 1 / rangeWidth
      this.translate = -rangeOrScale.lower
    } else {
      // Default: identity mapping
      this.scale = 1
      this.translate = 0
    }
  }

  /**
   * Maps an absolute distance value.
   * For a range-based mapping: transforms distance from shape space to [0, 1].
   */
  map(distance: number): number {
    return this.scale * (distance + this.translate)
  }

  /**
   * Maps a distance delta (difference between distances).
   * Only applies scale, no translation.
   */
  mapDelta(delta: number): number {
    return this.scale * delta
  }

  /**
   * Returns the inverse mapping (reverses the transformation).
   */
  getInverse(): DistanceMapping {
    return new DistanceMapping(1 / this.scale, -this.scale * this.translate, true)
  }
}

/**
 * Wrapper class to explicitly mark a value as a distance delta rather than absolute distance.
 * Used for type safety when calling mapDelta vs map.
 */
export class Delta {
  value: number

  constructor(distanceDelta: number) {
    this.value = distanceDelta
  }

  toNumber(): number {
    return this.value
  }
}
