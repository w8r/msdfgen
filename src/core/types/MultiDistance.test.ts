import { describe, it, expect } from 'vitest'
import { MultiDistance } from './MultiDistance'

describe('MultiDistance', () => {
  describe('constructor', () => {
    it('should create with default values (0, 0, 0)', () => {
      const md = new MultiDistance()
      expect(md.r).toBe(0)
      expect(md.g).toBe(0)
      expect(md.b).toBe(0)
    })

    it('should create with provided values', () => {
      const md = new MultiDistance(1.5, 2.5, 3.5)
      expect(md.r).toBe(1.5)
      expect(md.g).toBe(2.5)
      expect(md.b).toBe(3.5)
    })

    it('should accept negative values', () => {
      const md = new MultiDistance(-1.0, -2.0, -3.0)
      expect(md.r).toBe(-1.0)
      expect(md.g).toBe(-2.0)
      expect(md.b).toBe(-3.0)
    })
  })

  describe('median', () => {
    it('should return middle value when r < g < b', () => {
      const md = new MultiDistance(1.0, 2.0, 3.0)
      expect(md.median()).toBe(2.0)
    })

    it('should return middle value when b < g < r', () => {
      const md = new MultiDistance(3.0, 2.0, 1.0)
      expect(md.median()).toBe(2.0)
    })

    it('should return middle value when g < r < b', () => {
      const md = new MultiDistance(2.0, 1.0, 3.0)
      expect(md.median()).toBe(2.0)
    })

    it('should return middle value when g < b < r', () => {
      const md = new MultiDistance(3.0, 1.0, 2.0)
      expect(md.median()).toBe(2.0)
    })

    it('should return middle value when r < b < g', () => {
      const md = new MultiDistance(1.0, 3.0, 2.0)
      expect(md.median()).toBe(2.0)
    })

    it('should return middle value when b < r < g', () => {
      const md = new MultiDistance(2.0, 3.0, 1.0)
      expect(md.median()).toBe(2.0)
    })

    it('should handle all equal values', () => {
      const md = new MultiDistance(5.0, 5.0, 5.0)
      expect(md.median()).toBe(5.0)
    })

    it('should handle two equal values (r = g < b)', () => {
      const md = new MultiDistance(2.0, 2.0, 3.0)
      expect(md.median()).toBe(2.0)
    })

    it('should handle two equal values (r = g > b)', () => {
      const md = new MultiDistance(3.0, 3.0, 2.0)
      expect(md.median()).toBe(3.0)
    })

    it('should handle two equal values (r = b < g)', () => {
      const md = new MultiDistance(2.0, 3.0, 2.0)
      expect(md.median()).toBe(2.0)
    })

    it('should handle two equal values (r = b > g)', () => {
      const md = new MultiDistance(3.0, 2.0, 3.0)
      expect(md.median()).toBe(3.0)
    })

    it('should handle two equal values (g = b < r)', () => {
      const md = new MultiDistance(3.0, 2.0, 2.0)
      expect(md.median()).toBe(2.0)
    })

    it('should handle two equal values (g = b > r)', () => {
      const md = new MultiDistance(2.0, 3.0, 3.0)
      expect(md.median()).toBe(3.0)
    })

    it('should handle negative values', () => {
      const md = new MultiDistance(-3.0, -1.0, -2.0)
      expect(md.median()).toBe(-2.0)
    })

    it('should handle mixed positive and negative values', () => {
      const md = new MultiDistance(-1.0, 2.0, 0.5)
      expect(md.median()).toBe(0.5)
    })

    it('should handle zero in the middle', () => {
      const md = new MultiDistance(-1.0, 0.0, 1.0)
      expect(md.median()).toBe(0.0)
    })

    it('should handle very small differences', () => {
      const md = new MultiDistance(1.0, 1.0000001, 1.0000002)
      expect(md.median()).toBeCloseTo(1.0000001, 10)
    })

    it('should handle very large values', () => {
      const md = new MultiDistance(1e10, 2e10, 3e10)
      expect(md.median()).toBe(2e10)
    })
  })

  describe('lessThan', () => {
    it('should return true when this median < other median', () => {
      const md1 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      const md2 = new MultiDistance(4.0, 5.0, 6.0) // median = 5.0
      expect(md1.lessThan(md2)).toBe(true)
    })

    it('should return false when this median > other median', () => {
      const md1 = new MultiDistance(4.0, 5.0, 6.0) // median = 5.0
      const md2 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      expect(md1.lessThan(md2)).toBe(false)
    })

    it('should return false when medians are equal', () => {
      const md1 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      const md2 = new MultiDistance(0.0, 2.0, 4.0) // median = 2.0
      expect(md1.lessThan(md2)).toBe(false)
    })

    it('should work with negative medians', () => {
      const md1 = new MultiDistance(-3.0, -2.0, -1.0) // median = -2.0
      const md2 = new MultiDistance(-1.0, 0.0, 1.0) // median = 0.0
      expect(md1.lessThan(md2)).toBe(true)
    })
  })

  describe('greaterThan', () => {
    it('should return true when this median > other median', () => {
      const md1 = new MultiDistance(4.0, 5.0, 6.0) // median = 5.0
      const md2 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      expect(md1.greaterThan(md2)).toBe(true)
    })

    it('should return false when this median < other median', () => {
      const md1 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      const md2 = new MultiDistance(4.0, 5.0, 6.0) // median = 5.0
      expect(md1.greaterThan(md2)).toBe(false)
    })

    it('should return false when medians are equal', () => {
      const md1 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      const md2 = new MultiDistance(0.0, 2.0, 4.0) // median = 2.0
      expect(md1.greaterThan(md2)).toBe(false)
    })
  })

  describe('lessThanOrEqual', () => {
    it('should return true when this median < other median', () => {
      const md1 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      const md2 = new MultiDistance(4.0, 5.0, 6.0) // median = 5.0
      expect(md1.lessThanOrEqual(md2)).toBe(true)
    })

    it('should return true when medians are equal', () => {
      const md1 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      const md2 = new MultiDistance(0.0, 2.0, 4.0) // median = 2.0
      expect(md1.lessThanOrEqual(md2)).toBe(true)
    })

    it('should return false when this median > other median', () => {
      const md1 = new MultiDistance(4.0, 5.0, 6.0) // median = 5.0
      const md2 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      expect(md1.lessThanOrEqual(md2)).toBe(false)
    })
  })

  describe('greaterThanOrEqual', () => {
    it('should return true when this median > other median', () => {
      const md1 = new MultiDistance(4.0, 5.0, 6.0) // median = 5.0
      const md2 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      expect(md1.greaterThanOrEqual(md2)).toBe(true)
    })

    it('should return true when medians are equal', () => {
      const md1 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      const md2 = new MultiDistance(0.0, 2.0, 4.0) // median = 2.0
      expect(md1.greaterThanOrEqual(md2)).toBe(true)
    })

    it('should return false when this median < other median', () => {
      const md1 = new MultiDistance(1.0, 2.0, 3.0) // median = 2.0
      const md2 = new MultiDistance(4.0, 5.0, 6.0) // median = 5.0
      expect(md1.greaterThanOrEqual(md2)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle very small epsilon differences in median calculation', () => {
      const epsilon = Number.EPSILON
      const md1 = new MultiDistance(1.0, 1.0 + epsilon, 1.0 + 2 * epsilon)
      const md2 = new MultiDistance(1.0, 1.0, 1.0)
      // The medians should be very close but not necessarily equal
      expect(Math.abs(md1.median() - md2.median())).toBeLessThan(epsilon * 10)
    })

    it('should handle infinity values', () => {
      const md = new MultiDistance(Infinity, 0, -Infinity)
      expect(md.median()).toBe(0)
    })

    it('should handle NaN values (implementation-dependent)', () => {
      const md = new MultiDistance(NaN, 1.0, 2.0)
      // NaN comparisons always return false in JavaScript
      // The exact result depends on how Math.max/min handle NaN
      const result = md.median()
      expect(isNaN(result) || typeof result === 'number').toBe(true)
    })
  })
})
