import { Vector2, Point2 } from './Vector2'

/**
 * A transformation from shape coordinates to pixel coordinates.
 *
 * TypeScript port of msdfgen::Projection from core/Projection.h
 * @author Viktor Chlumsky (original C++)
 */
export class Projection {
  private scale: Vector2
  private translate: Vector2

  constructor(scale?: Vector2, translate?: Vector2) {
    this.scale = scale ?? new Vector2(1)
    this.translate = translate ?? new Vector2(0)
  }

  /**
   * Converts the shape coordinate to pixel coordinate.
   */
  project(coord: Point2): Point2 {
    return this.scale.mul(coord.add(this.translate))
  }

  /**
   * Converts the pixel coordinate to shape coordinate.
   */
  unproject(coord: Point2): Point2 {
    return coord.div(this.scale).sub(this.translate)
  }

  /**
   * Converts the vector to pixel coordinate space.
   */
  projectVector(vector: Vector2): Vector2 {
    return this.scale.mul(vector)
  }

  /**
   * Converts the vector from pixel coordinate space.
   */
  unprojectVector(vector: Vector2): Vector2 {
    return vector.div(this.scale)
  }

  /**
   * Converts the X-coordinate from shape to pixel coordinate space.
   */
  projectX(x: number): number {
    return this.scale.x * (x + this.translate.x)
  }

  /**
   * Converts the Y-coordinate from shape to pixel coordinate space.
   */
  projectY(y: number): number {
    return this.scale.y * (y + this.translate.y)
  }

  /**
   * Converts the X-coordinate from pixel to shape coordinate space.
   */
  unprojectX(x: number): number {
    return x / this.scale.x - this.translate.x
  }

  /**
   * Converts the Y-coordinate from pixel to shape coordinate space.
   */
  unprojectY(y: number): number {
    return y / this.scale.y - this.translate.y
  }
}
