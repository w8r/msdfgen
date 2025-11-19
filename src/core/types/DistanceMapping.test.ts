import { describe, it, expect } from 'vitest'
import { DistanceMapping, Delta } from './DistanceMapping'
import { Range } from './Range'

describe('DistanceMapping', () => {
  describe('constructor', () => {
    it('should create identity mapping with no args', () => {
      const mapping = new DistanceMapping()
      expect(mapping.map(5)).toBe(5)
      expect(mapping.map(-3)).toBe(-3)
    })

    it('should create mapping from range', () => {
      // Maps [-4, 4] to [0, 1]
      const range = new Range(-4, 4)
      const mapping = new DistanceMapping(range)

      expect(mapping.map(-4)).toBeCloseTo(0)
      expect(mapping.map(0)).toBeCloseTo(0.5)
      expect(mapping.map(4)).toBeCloseTo(1)
    })

    it('should handle asymmetric range', () => {
      const range = new Range(10, 20)
      const mapping = new DistanceMapping(range)

      expect(mapping.map(10)).toBeCloseTo(0)
      expect(mapping.map(15)).toBeCloseTo(0.5)
      expect(mapping.map(20)).toBeCloseTo(1)
    })
  })

  describe('map', () => {
    it('should map absolute distance values', () => {
      const range = new Range(-2, 2)
      const mapping = new DistanceMapping(range)

      expect(mapping.map(-2)).toBeCloseTo(0)
      expect(mapping.map(-1)).toBeCloseTo(0.25)
      expect(mapping.map(0)).toBeCloseTo(0.5)
      expect(mapping.map(1)).toBeCloseTo(0.75)
      expect(mapping.map(2)).toBeCloseTo(1)
    })

    it('should handle values outside range', () => {
      const range = new Range(0, 10)
      const mapping = new DistanceMapping(range)

      expect(mapping.map(-5)).toBeCloseTo(-0.5)
      expect(mapping.map(15)).toBeCloseTo(1.5)
    })
  })

  describe('mapDelta', () => {
    it('should map delta without translation', () => {
      const range = new Range(-4, 4)
      const mapping = new DistanceMapping(range)

      // Delta mapping only applies scale, not translation
      expect(mapping.mapDelta(1)).toBeCloseTo(0.125) // 1/8
      expect(mapping.mapDelta(2)).toBeCloseTo(0.25)  // 2/8
      expect(mapping.mapDelta(4)).toBeCloseTo(0.5)   // 4/8
    })

    it('should handle negative deltas', () => {
      const range = new Range(-4, 4)
      const mapping = new DistanceMapping(range)

      expect(mapping.mapDelta(-2)).toBeCloseTo(-0.25)
    })

    it('should differ from map for non-zero ranges', () => {
      const range = new Range(10, 20)
      const mapping = new DistanceMapping(range)

      const mappedAbsolute = mapping.map(2)
      const mappedDelta = mapping.mapDelta(2)

      // For non-zero-centered range, these will differ
      expect(mappedAbsolute).not.toBeCloseTo(mappedDelta)
    })
  })

  describe('getInverse', () => {
    it('should create inverse mapping', () => {
      const range = new Range(-4, 4)
      const mapping = new DistanceMapping(range)
      const inverse = mapping.getInverse()

      // Forward then inverse should return original value
      const original = 2.5
      const mapped = mapping.map(original)
      const unmapped = inverse.map(mapped)

      expect(unmapped).toBeCloseTo(original)
    })

    it('should reverse the transformation for various values', () => {
      const range = new Range(10, 20)
      const mapping = new DistanceMapping(range)
      const inverse = mapping.getInverse()

      const testValues = [10, 12.5, 15, 17.5, 20]
      for (const value of testValues) {
        const mapped = mapping.map(value)
        const unmapped = inverse.map(mapped)
        expect(unmapped).toBeCloseTo(value)
      }
    })

    it('should handle identity mapping', () => {
      const mapping = new DistanceMapping()
      const inverse = mapping.getInverse()

      expect(inverse.map(5)).toBeCloseTo(5)
      expect(inverse.map(-3)).toBeCloseTo(-3)
    })
  })

  describe('DistanceMapping.inverse static method', () => {
    it('should create inverse mapping from range', () => {
      // Inverse mapping goes from [0, 1] back to the range
      const range = new Range(-4, 4)
      const inverse = DistanceMapping.inverse(range)

      expect(inverse.map(0)).toBeCloseTo(-4)
      expect(inverse.map(0.5)).toBeCloseTo(0)
      expect(inverse.map(1)).toBeCloseTo(4)
    })

    it('should handle zero-width range safely', () => {
      const range = new Range(0, 0)
      const inverse = DistanceMapping.inverse(range)

      // Should not throw and should handle gracefully
      expect(inverse.map(0)).toBeCloseTo(0)
    })
  })

  describe('use case: typical MSDF workflow', () => {
    it('should map shape distances to normalized pixel values', () => {
      // Typical workflow: 4-pixel distance range
      const pixelRange = new Range(4) // [-2, 2] pixels
      const mapping = new DistanceMapping(pixelRange)

      // Distance of -2 pixels (inside) -> 0
      expect(mapping.map(-2)).toBeCloseTo(0)

      // Distance of 0 pixels (on edge) -> 0.5
      expect(mapping.map(0)).toBeCloseTo(0.5)

      // Distance of +2 pixels (outside) -> 1
      expect(mapping.map(2)).toBeCloseTo(1)
    })

    it('should roundtrip through mapping and inverse', () => {
      const range = new Range(-8, 8)
      const forward = new DistanceMapping(range)
      const backward = forward.getInverse()

      const distances = [-8, -4, 0, 4, 8]
      for (const dist of distances) {
        const normalized = forward.map(dist)
        const restored = backward.map(normalized)
        expect(restored).toBeCloseTo(dist)
      }
    })
  })
})

describe('Delta', () => {
  it('should wrap distance delta value', () => {
    const delta = new Delta(2.5)
    expect(delta.value).toBe(2.5)
    expect(delta.toNumber()).toBe(2.5)
  })

  it('should handle negative deltas', () => {
    const delta = new Delta(-1.5)
    expect(delta.value).toBe(-1.5)
  })

  it('should be used for delta mapping', () => {
    const range = new Range(-4, 4)
    const mapping = new DistanceMapping(range)
    const delta = new Delta(2)

    // Using Delta class to document intent (though we call mapDelta directly)
    expect(mapping.mapDelta(delta.value)).toBeCloseTo(0.25)
  })
})
