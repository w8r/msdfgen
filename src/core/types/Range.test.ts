import { describe, it, expect } from 'vitest'
import { Range } from './Range'

describe('Range', () => {
  describe('constructor', () => {
    it('should create zero range with no args', () => {
      const range = new Range()
      expect(range.lower).toBeCloseTo(0)
      expect(range.upper).toBeCloseTo(0)
    })

    it('should create symmetrical range with single arg', () => {
      const range = new Range(10)
      expect(range.lower).toBe(-5)
      expect(range.upper).toBe(5)
    })

    it('should create explicit range with two args', () => {
      const range = new Range(2, 8)
      expect(range.lower).toBe(2)
      expect(range.upper).toBe(8)
    })

    it('should handle negative bounds', () => {
      const range = new Range(-5, -2)
      expect(range.lower).toBe(-5)
      expect(range.upper).toBe(-2)
    })
  })

  describe('width', () => {
    it('should calculate width correctly', () => {
      const range = new Range(2, 8)
      expect(range.width()).toBe(6)
    })

    it('should handle negative ranges', () => {
      const range = new Range(-5, -2)
      expect(range.width()).toBe(3)
    })

    it('should handle symmetrical range', () => {
      const range = new Range(10)
      expect(range.width()).toBe(10)
    })
  })

  describe('scaleInPlace', () => {
    it('should scale range in place', () => {
      const range = new Range(2, 8)
      const result = range.scaleInPlace(2)
      expect(range.lower).toBe(4)
      expect(range.upper).toBe(16)
      expect(result).toBe(range) // Should return this
    })

    it('should handle negative scaling', () => {
      const range = new Range(2, 8)
      range.scaleInPlace(-1)
      expect(range.lower).toBe(-2)
      expect(range.upper).toBe(-8)
    })

    it('should handle fractional scaling', () => {
      const range = new Range(4, 8)
      range.scaleInPlace(0.5)
      expect(range.lower).toBe(2)
      expect(range.upper).toBe(4)
    })
  })

  describe('divideInPlace', () => {
    it('should divide range in place', () => {
      const range = new Range(4, 8)
      const result = range.divideInPlace(2)
      expect(range.lower).toBe(2)
      expect(range.upper).toBe(4)
      expect(result).toBe(range) // Should return this
    })

    it('should handle negative division', () => {
      const range = new Range(4, 8)
      range.divideInPlace(-2)
      expect(range.lower).toBe(-2)
      expect(range.upper).toBe(-4)
    })
  })

  describe('scale', () => {
    it('should return new scaled range', () => {
      const range = new Range(2, 8)
      const scaled = range.scale(2)
      expect(scaled.lower).toBe(4)
      expect(scaled.upper).toBe(16)
      // Original should be unchanged
      expect(range.lower).toBe(2)
      expect(range.upper).toBe(8)
    })

    it('should handle negative scaling', () => {
      const range = new Range(2, 8)
      const scaled = range.scale(-1)
      expect(scaled.lower).toBe(-2)
      expect(scaled.upper).toBe(-8)
    })
  })

  describe('divide', () => {
    it('should return new divided range', () => {
      const range = new Range(4, 8)
      const divided = range.divide(2)
      expect(divided.lower).toBe(2)
      expect(divided.upper).toBe(4)
      // Original should be unchanged
      expect(range.lower).toBe(4)
      expect(range.upper).toBe(8)
    })

    it('should handle negative division', () => {
      const range = new Range(4, 8)
      const divided = range.divide(-2)
      expect(divided.lower).toBe(-2)
      expect(divided.upper).toBe(-4)
    })
  })

  describe('use case: distance field range', () => {
    it('should represent typical SDF range', () => {
      // Common range: 4 pixels of distance on each side
      const range = new Range(8)
      expect(range.lower).toBe(-4)
      expect(range.upper).toBe(4)
      expect(range.width()).toBe(8)
    })

    it('should scale to normalized [0, 1] range width', () => {
      const range = new Range(-4, 4)
      const normalized = range.scale(1 / range.width())
      expect(normalized.width()).toBeCloseTo(1)
    })
  })
})
