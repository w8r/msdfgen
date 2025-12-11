/**
 * A 2-dimensional euclidean floating-point vector.
 *
 * TypeScript port of msdfgen::Vector2 from core/Vector2.hpp
 * @author Viktor Chlumsky (original C++)
 */
export class Vector2 {
  x: number;
  y: number;

  constructor(x: number = 0, y?: number) {
    this.x = x;
    this.y = y ?? x; // If y not provided, use x for both (matches C++ single-arg constructor)
  }

  /**
   * Sets the vector to zero.
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
  }

  /**
   * Sets individual elements of the vector.
   */
  set(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Returns the vector's squared length.
   */
  squaredLength(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Returns the vector's length.
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Returns the normalized vector - one that has the same direction but unit length.
   * @param allowZero If false and vector is zero, returns (0, 1) instead of (0, 0)
   */
  normalize(allowZero: boolean = false): Vector2 {
    const len = this.length();
    if (len !== 0) {
      return new Vector2(this.x / len, this.y / len);
    }
    return new Vector2(0, allowZero ? 0 : 1);
  }

  /**
   * Returns a vector with the same length that is orthogonal to this one.
   * @param polarity If true, rotates 90° counterclockwise; if false, clockwise
   */
  getOrthogonal(polarity: boolean = true): Vector2 {
    return polarity
      ? new Vector2(-this.y, this.x)
      : new Vector2(this.y, -this.x);
  }

  /**
   * Returns a vector with unit length that is orthogonal to this one.
   * @param polarity If true, rotates 90° counterclockwise; if false, clockwise
   * @param allowZero If false and vector is zero, returns a unit vector instead of zero
   */
  getOrthonormal(
    polarity: boolean = true,
    allowZero: boolean = false
  ): Vector2 {
    const len = this.length();
    if (len !== 0) {
      return polarity
        ? new Vector2(-this.y / len, this.x / len)
        : new Vector2(this.y / len, -this.x / len);
    }
    // When zero length, return a unit vector based on polarity
    const sign = allowZero ? 0 : 1;
    return polarity ? new Vector2(0, sign) : new Vector2(0, -sign);
  }

  /**
   * Tests if the vector is non-zero.
   */
  isNonZero(): boolean {
    return this.x !== 0 || this.y !== 0;
  }

  /**
   * Tests if the vector is zero.
   */
  isZero(): boolean {
    return this.x === 0 && this.y === 0;
  }

  /**
   * Returns a new vector that is the sum of this and another.
   */
  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  /**
   * Returns a new vector that is the difference of this and another.
   */
  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  /**
   * Returns a new vector that is the difference of this and another.
   * Alias for sub() for better readability.
   */
  sub(other: Vector2): Vector2 {
    return this.subtract(other);
  }

  /**
   * Returns a new vector with components multiplied by another vector.
   */
  mul(other: Vector2): Vector2 {
    return new Vector2(this.x * other.x, this.y * other.y);
  }

  /**
   * Returns a new vector with components divided by another vector.
   */
  div(other: Vector2): Vector2 {
    return new Vector2(this.x / other.x, this.y / other.y);
  }

  /**
   * Returns a new vector scaled by a scalar value.
   */
  scale(value: number): Vector2 {
    return new Vector2(this.x * value, this.y * value);
  }

  /**
   * Returns a new vector scaled by a scalar value.
   * Alias for scale() for better readability.
   */
  multiply(value: number): Vector2 {
    return this.scale(value);
  }

  /**
   * Returns a new vector divided by a scalar value.
   */
  divideScalar(value: number): Vector2 {
    return new Vector2(this.x / value, this.y / value);
  }

  /**
   * Returns the negation of this vector.
   */
  negate(): Vector2 {
    return new Vector2(-this.x, -this.y);
  }

  /**
   * Tests equality with another vector.
   */
  equals(other: Vector2): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Tests inequality with another vector.
   */
  notEquals(other: Vector2): boolean {
    return this.x !== other.x || this.y !== other.y;
  }

  /**
   * Creates a copy of this vector.
   */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }
}

/**
 * A vector may also represent a point, which shall be differentiated semantically using the alias Point2.
 */
export type Point2 = Vector2;

/**
 * Dot product of two vectors.
 */
export function dotProduct(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * A special version of the cross product for 2D vectors (returns scalar value).
 * Represents the z-component of the 3D cross product if vectors were in the xy-plane.
 */
export function crossProduct(a: Vector2, b: Vector2): number {
  return a.x * b.y - a.y * b.x;
}

/**
 * Linear interpolation between two numbers.
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor (0 = a, 1 = b)
 */
export function mix(a: number, b: number, t: number): number;

/**
 * Linear interpolation between two vectors.
 * @param a Start vector
 * @param b End vector
 * @param t Interpolation factor (0 = a, 1 = b)
 */
export function mix(a: Vector2, b: Vector2, t: number): Vector2;

/**
 * Implementation of linear interpolation for both numbers and vectors
 */
export function mix(
  a: number | Vector2,
  b: number | Vector2,
  t: number
): number | Vector2 {
  if (typeof a === "number" && typeof b === "number") {
    return a + t * (b - a);
  }
  if (a instanceof Vector2 && b instanceof Vector2) {
    return new Vector2(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y));
  }
  throw new Error(
    "mix(): Both arguments must be of the same type (number or Vector2)"
  );
}
