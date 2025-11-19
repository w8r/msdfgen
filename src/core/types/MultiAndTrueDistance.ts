import { MultiDistance } from './MultiDistance'

/**
 * Represents a multi-channel signed distance with an additional alpha channel
 * containing the true signed distance. Used for MTSDF (Multi-channel + True SDF) generation.
 *
 * TypeScript port of msdfgen::MultiAndTrueDistance from core/edge-selectors.h
 * @author Viktor Chlumsky (original C++)
 */
export class MultiAndTrueDistance extends MultiDistance {
  /** Alpha channel - contains the true signed distance */
  a: number

  constructor(r: number = 0, g: number = 0, b: number = 0, a: number = 0) {
    super(r, g, b)
    this.a = a
  }
}
