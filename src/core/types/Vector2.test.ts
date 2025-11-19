import { describe, it, expect } from 'vitest'
import { Vector2, dotProduct, crossProduct, mix } from './Vector2'
import type { Point2 } from './Vector2'

describe('Vector2', () => {
  describe('constructor', () => {
    it('should create zero vector with no args', () => {
      const v = new Vector2()
      expect(v.x).toBe(0)
      expect(v.y).toBe(0)
    })

    it('should create vector with single value for both components', () => {
      const v = new Vector2(5)
      expect(v.x).toBe(5)
      expect(v.y).toBe(5)
    })

    it('should create vector with x and y', () => {
      const v = new Vector2(3, 4)
      expect(v.x).toBe(3)
      expect(v.y).toBe(4)
    })
  })

  describe('reset and set', () => {
    it('should reset to zero', () => {
      const v = new Vector2(3, 4)
      v.reset()
      expect(v.x).toBe(0)
      expect(v.y).toBe(0)
    })

    it('should set new values', () => {
      const v = new Vector2()
      v.set(5, 7)
      expect(v.x).toBe(5)
      expect(v.y).toBe(7)
    })
  })

  describe('length calculations', () => {
    it('should calculate squared length', () => {
      const v = new Vector2(3, 4)
      expect(v.squaredLength()).toBe(25)
    })

    it('should calculate length', () => {
      const v = new Vector2(3, 4)
      expect(v.length()).toBe(5)
    })

    it('should handle zero vector length', () => {
      const v = new Vector2(0, 0)
      expect(v.length()).toBe(0)
    })
  })

  describe('normalize', () => {
    it('should normalize non-zero vector', () => {
      const v = new Vector2(3, 4)
      const normalized = v.normalize()
      expect(normalized.x).toBeCloseTo(0.6)
      expect(normalized.y).toBeCloseTo(0.8)
      expect(normalized.length()).toBeCloseTo(1)
    })

    it('should return (0, 1) for zero vector when allowZero=false', () => {
      const v = new Vector2(0, 0)
      const normalized = v.normalize(false)
      expect(normalized.x).toBe(0)
      expect(normalized.y).toBe(1)
    })

    it('should return (0, 0) for zero vector when allowZero=true', () => {
      const v = new Vector2(0, 0)
      const normalized = v.normalize(true)
      expect(normalized.x).toBe(0)
      expect(normalized.y).toBe(0)
    })
  })

  describe('orthogonal vectors', () => {
    it('should get orthogonal vector (counterclockwise)', () => {
      const v = new Vector2(1, 0)
      const ortho = v.getOrthogonal(true)
      expect(ortho.x).toBeCloseTo(0)
      expect(ortho.y).toBe(1)
    })

    it('should get orthogonal vector (clockwise)', () => {
      const v = new Vector2(1, 0)
      const ortho = v.getOrthogonal(false)
      expect(ortho.x).toBe(0)
      expect(ortho.y).toBe(-1)
    })

    it('should get orthonormal vector', () => {
      const v = new Vector2(3, 4)
      const ortho = v.getOrthonormal(true)
      expect(ortho.length()).toBeCloseTo(1)
      expect(dotProduct(v, ortho)).toBeCloseTo(0)
    })

    it('should handle zero vector in getOrthonormal with allowZero=false', () => {
      const v = new Vector2(0, 0)
      const ortho = v.getOrthonormal(true, false)
      expect(ortho.x).toBe(0)
      expect(ortho.y).toBe(1)
    })
  })

  describe('zero checks', () => {
    it('should detect non-zero vector', () => {
      expect(new Vector2(1, 0).isNonZero()).toBe(true)
      expect(new Vector2(0, 1).isNonZero()).toBe(true)
      expect(new Vector2(0, 0).isNonZero()).toBe(false)
    })

    it('should detect zero vector', () => {
      expect(new Vector2(0, 0).isZero()).toBe(true)
      expect(new Vector2(1, 0).isZero()).toBe(false)
      expect(new Vector2(0, 1).isZero()).toBe(false)
    })
  })

  describe('arithmetic operations', () => {
    it('should add vectors', () => {
      const a = new Vector2(1, 2)
      const b = new Vector2(3, 4)
      const sum = a.add(b)
      expect(sum.x).toBe(4)
      expect(sum.y).toBe(6)
    })

    it('should subtract vectors', () => {
      const a = new Vector2(5, 7)
      const b = new Vector2(2, 3)
      const diff = a.sub(b)
      expect(diff.x).toBe(3)
      expect(diff.y).toBe(4)
    })

    it('should multiply vectors component-wise', () => {
      const a = new Vector2(2, 3)
      const b = new Vector2(4, 5)
      const product = a.mul(b)
      expect(product.x).toBe(8)
      expect(product.y).toBe(15)
    })

    it('should divide vectors component-wise', () => {
      const a = new Vector2(8, 15)
      const b = new Vector2(2, 3)
      const quotient = a.div(b)
      expect(quotient.x).toBe(4)
      expect(quotient.y).toBe(5)
    })

    it('should scale by scalar', () => {
      const v = new Vector2(3, 4)
      const scaled = v.scale(2)
      expect(scaled.x).toBe(6)
      expect(scaled.y).toBe(8)
    })

    it('should divide by scalar', () => {
      const v = new Vector2(6, 8)
      const divided = v.divideScalar(2)
      expect(divided.x).toBe(3)
      expect(divided.y).toBe(4)
    })

    it('should negate vector', () => {
      const v = new Vector2(3, -4)
      const negated = v.negate()
      expect(negated.x).toBe(-3)
      expect(negated.y).toBe(4)
    })
  })

  describe('comparison', () => {
    it('should test equality', () => {
      const a = new Vector2(1, 2)
      const b = new Vector2(1, 2)
      const c = new Vector2(1, 3)
      expect(a.equals(b)).toBe(true)
      expect(a.equals(c)).toBe(false)
    })

    it('should test inequality', () => {
      const a = new Vector2(1, 2)
      const b = new Vector2(1, 2)
      const c = new Vector2(1, 3)
      expect(a.notEquals(b)).toBe(false)
      expect(a.notEquals(c)).toBe(true)
    })
  })

  describe('clone', () => {
    it('should create independent copy', () => {
      const a = new Vector2(3, 4)
      const b = a.clone()
      expect(b.x).toBe(3)
      expect(b.y).toBe(4)
      b.set(5, 6)
      expect(a.x).toBe(3)
      expect(a.y).toBe(4)
    })
  })
})

describe('Point2', () => {
  it('should be an alias for Vector2', () => {
    const p: Point2 = new Vector2(3, 4)
    expect(p.x).toBe(3)
    expect(p.y).toBe(4)
  })
})

describe('dotProduct', () => {
  it('should calculate dot product', () => {
    const a = new Vector2(2, 3)
    const b = new Vector2(4, 5)
    expect(dotProduct(a, b)).toBe(23) // 2*4 + 3*5 = 8 + 15 = 23
  })

  it('should return zero for perpendicular vectors', () => {
    const a = new Vector2(1, 0)
    const b = new Vector2(0, 1)
    expect(dotProduct(a, b)).toBe(0)
  })
})

describe('crossProduct', () => {
  it('should calculate 2D cross product', () => {
    const a = new Vector2(2, 3)
    const b = new Vector2(4, 5)
    expect(crossProduct(a, b)).toBe(-2) // 2*5 - 3*4 = 10 - 12 = -2
  })

  it('should return zero for parallel vectors', () => {
    const a = new Vector2(2, 3)
    const b = new Vector2(4, 6)
    expect(crossProduct(a, b)).toBe(0)
  })

  it('should be positive for counterclockwise rotation', () => {
    const a = new Vector2(1, 0)
    const b = new Vector2(0, 1)
    expect(crossProduct(a, b)).toBeGreaterThan(0)
  })

  it('should be negative for clockwise rotation', () => {
    const a = new Vector2(0, 1)
    const b = new Vector2(1, 0)
    expect(crossProduct(a, b)).toBeLessThan(0)
  })
})

describe('mix', () => {
  it('should interpolate at t=0', () => {
    const a = new Vector2(0, 0)
    const b = new Vector2(10, 10)
    const result = mix(a, b, 0)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('should interpolate at t=1', () => {
    const a = new Vector2(0, 0)
    const b = new Vector2(10, 10)
    const result = mix(a, b, 1)
    expect(result.x).toBe(10)
    expect(result.y).toBe(10)
  })

  it('should interpolate at t=0.5', () => {
    const a = new Vector2(0, 0)
    const b = new Vector2(10, 20)
    const result = mix(a, b, 0.5)
    expect(result.x).toBe(5)
    expect(result.y).toBe(10)
  })

  it('should interpolate at arbitrary t', () => {
    const a = new Vector2(2, 4)
    const b = new Vector2(6, 8)
    const result = mix(a, b, 0.25)
    expect(result.x).toBe(3)
    expect(result.y).toBe(5)
  })
})
