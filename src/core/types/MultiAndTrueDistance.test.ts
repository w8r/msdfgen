import { describe, it, expect } from 'vitest'
import { MultiAndTrueDistance } from './MultiAndTrueDistance'

describe('MultiAndTrueDistance', () => {
  describe('constructor', () => {
    it('should create with default values (0, 0, 0, 0)', () => {
      const mtd = new MultiAndTrueDistance()
      expect(mtd.r).toBe(0)
      expect(mtd.g).toBe(0)
      expect(mtd.b).toBe(0)
      expect(mtd.a).toBe(0)
    })

    it('should create with provided values', () => {
      const mtd = new MultiAndTrueDistance(1.5, 2.5, 3.5, 4.5)
      expect(mtd.r).toBe(1.5)
      expect(mtd.g).toBe(2.5)
      expect(mtd.b).toBe(3.5)
      expect(mtd.a).toBe(4.5)
    })

    it('should accept negative values', () => {
      const mtd = new MultiAndTrueDistance(-1.0, -2.0, -3.0, -4.0)
      expect(mtd.r).toBe(-1.0)
      expect(mtd.g).toBe(-2.0)
      expect(mtd.b).toBe(-3.0)
      expect(mtd.a).toBe(-4.0)
    })

    it('should accept mixed positive and negative values', () => {
      const mtd = new MultiAndTrueDistance(1.0, -2.0, 3.0, -4.0)
      expect(mtd.r).toBe(1.0)
      expect(mtd.g).toBe(-2.0)
      expect(mtd.b).toBe(3.0)
      expect(mtd.a).toBe(-4.0)
    })
  })

  describe('inheritance from MultiDistance', () => {
    it('should inherit median method', () => {
      const mtd = new MultiAndTrueDistance(1.0, 2.0, 3.0, 10.0)
      expect(mtd.median()).toBe(2.0)
    })

    it('should inherit lessThan method', () => {
      const mtd1 = new MultiAndTrueDistance(1.0, 2.0, 3.0, 100.0) // median = 2.0
      const mtd2 = new MultiAndTrueDistance(4.0, 5.0, 6.0, 200.0) // median = 5.0
      expect(mtd1.lessThan(mtd2)).toBe(true)
    })

    it('should inherit greaterThan method', () => {
      const mtd1 = new MultiAndTrueDistance(4.0, 5.0, 6.0, 200.0) // median = 5.0
      const mtd2 = new MultiAndTrueDistance(1.0, 2.0, 3.0, 100.0) // median = 2.0
      expect(mtd1.greaterThan(mtd2)).toBe(true)
    })

    it('should inherit lessThanOrEqual method', () => {
      const mtd1 = new MultiAndTrueDistance(1.0, 2.0, 3.0, 100.0) // median = 2.0
      const mtd2 = new MultiAndTrueDistance(0.0, 2.0, 4.0, 200.0) // median = 2.0
      expect(mtd1.lessThanOrEqual(mtd2)).toBe(true)
    })

    it('should inherit greaterThanOrEqual method', () => {
      const mtd1 = new MultiAndTrueDistance(4.0, 5.0, 6.0, 200.0) // median = 5.0
      const mtd2 = new MultiAndTrueDistance(1.0, 5.0, 9.0, 100.0) // median = 5.0
      expect(mtd1.greaterThanOrEqual(mtd2)).toBe(true)
    })
  })

  describe('alpha channel independence', () => {
    it('should not affect median calculation', () => {
      const mtd1 = new MultiAndTrueDistance(1.0, 2.0, 3.0, 0.0)
      const mtd2 = new MultiAndTrueDistance(1.0, 2.0, 3.0, 100.0)
      expect(mtd1.median()).toBe(mtd2.median())
    })

    it('should not affect comparison methods', () => {
      const mtd1 = new MultiAndTrueDistance(1.0, 2.0, 3.0, 0.0)
      const mtd2 = new MultiAndTrueDistance(1.0, 2.0, 3.0, 100.0)
      expect(mtd1.lessThan(mtd2)).toBe(false)
      expect(mtd1.greaterThan(mtd2)).toBe(false)
      expect(mtd1.lessThanOrEqual(mtd2)).toBe(true)
      expect(mtd1.greaterThanOrEqual(mtd2)).toBe(true)
    })

    it('should allow different alpha values for same RGB', () => {
      const mtd = new MultiAndTrueDistance(1.0, 2.0, 3.0, 99.5)
      expect(mtd.r).toBe(1.0)
      expect(mtd.g).toBe(2.0)
      expect(mtd.b).toBe(3.0)
      expect(mtd.a).toBe(99.5)
    })
  })

  describe('typical MTSDF use cases', () => {
    it('should represent outside point (all positive)', () => {
      const mtd = new MultiAndTrueDistance(5.0, 6.0, 7.0, 5.5)
      expect(mtd.median()).toBe(6.0)
      expect(mtd.a).toBe(5.5)
    })

    it('should represent inside point (all negative)', () => {
      const mtd = new MultiAndTrueDistance(-5.0, -6.0, -7.0, -5.5)
      expect(mtd.median()).toBe(-6.0)
      expect(mtd.a).toBe(-5.5)
    })

    it('should represent edge crossing (mixed signs in RGB)', () => {
      const mtd = new MultiAndTrueDistance(-1.0, 0.5, 2.0, 0.1)
      expect(mtd.median()).toBe(0.5)
      expect(mtd.a).toBe(0.1)
    })

    it('should handle very close to zero distances', () => {
      const epsilon = 0.001
      const mtd = new MultiAndTrueDistance(-epsilon, epsilon, 0, epsilon / 2)
      expect(Math.abs(mtd.median())).toBeLessThan(epsilon)
      expect(mtd.a).toBeCloseTo(epsilon / 2, 6)
    })
  })

  describe('comparison with MultiDistance', () => {
    it('should be comparable with MultiDistance via inherited methods', () => {
      const mtd = new MultiAndTrueDistance(4.0, 5.0, 6.0, 100.0) // median = 5.0
      const md = new MultiAndTrueDistance(1.0, 2.0, 3.0, 0.0) // median = 2.0
      expect(mtd.greaterThan(md)).toBe(true)
      expect(md.lessThan(mtd)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle zero alpha with non-zero RGB', () => {
      const mtd = new MultiAndTrueDistance(1.0, 2.0, 3.0, 0.0)
      expect(mtd.a).toBe(0.0)
      expect(mtd.median()).toBe(2.0)
    })

    it('should handle zero RGB with non-zero alpha', () => {
      const mtd = new MultiAndTrueDistance(0.0, 0.0, 0.0, 5.0)
      expect(mtd.median()).toBe(0.0)
      expect(mtd.a).toBe(5.0)
    })

    it('should handle very large alpha values', () => {
      const mtd = new MultiAndTrueDistance(1.0, 2.0, 3.0, 1e10)
      expect(mtd.a).toBe(1e10)
      expect(mtd.median()).toBe(2.0)
    })

    it('should handle infinity in alpha', () => {
      const mtd = new MultiAndTrueDistance(1.0, 2.0, 3.0, Infinity)
      expect(mtd.a).toBe(Infinity)
      expect(mtd.median()).toBe(2.0)
    })

    it('should handle negative infinity in alpha', () => {
      const mtd = new MultiAndTrueDistance(1.0, 2.0, 3.0, -Infinity)
      expect(mtd.a).toBe(-Infinity)
      expect(mtd.median()).toBe(2.0)
    })
  })
})
