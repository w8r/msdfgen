import { YAxisOrientation, DEFAULT_Y_AXIS_ORIENTATION } from './YAxisOrientation'
import type { BitmapArrayType } from './Bitmap'

/**
 * Non-owning reference to a 2D image bitmap.
 * Does not manage pixel storage - the referenced data must remain valid.
 *
 * TypeScript port of msdfgen::BitmapRef from core/BitmapRef.hpp
 * @author Viktor Chlumsky (original C++)
 *
 * @template T - The typed array type (Float32Array, Float64Array, Uint8Array, Uint8ClampedArray)
 * @template N - Number of channels per pixel
 */
export class BitmapRef<T extends BitmapArrayType = Float32Array, N extends number = 1> {
  readonly pixels: T
  readonly width: number
  readonly height: number
  readonly channels: N
  readonly yOrientation: YAxisOrientation

  constructor(
    pixels: T,
    width: number,
    height: number,
    channels: N,
    yOrientation: YAxisOrientation = DEFAULT_Y_AXIS_ORIENTATION
  ) {
    this.pixels = pixels
    this.width = width
    this.height = height
    this.channels = channels
    this.yOrientation = yOrientation
  }

  /**
   * Returns a view to the pixel at (x, y)
   * The returned view has length N (number of channels)
   */
  getPixel(x: number, y: number): T {
    const index = this.channels * (this.width * y + x)
    return this.pixels.subarray(index, index + this.channels) as T
  }

  /**
   * Gets a single channel value at (x, y)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param channel - Channel index (0 to N-1)
   */
  getChannel(x: number, y: number, channel: number): number {
    const index = this.channels * (this.width * y + x) + channel
    return this.pixels[index]
  }

  /**
   * Sets the pixel value at (x, y)
   * Note: This modifies the referenced data
   */
  setPixel(x: number, y: number, values: number[] | ArrayLike<number>): void {
    const index = this.channels * (this.width * y + x)
    for (let i = 0; i < this.channels; i++) {
      this.pixels[index + i] = values[i]
    }
  }

  /**
   * Sets a single channel value at (x, y)
   * Note: This modifies the referenced data
   */
  setChannel(x: number, y: number, channel: number, value: number): void {
    const index = this.channels * (this.width * y + x) + channel
    this.pixels[index] = value
  }
}
