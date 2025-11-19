import { YAxisOrientation, DEFAULT_Y_AXIS_ORIENTATION } from './YAxisOrientation'
import type { BitmapArrayType } from './Bitmap'
import { BitmapRef } from './BitmapRef'

/**
 * Non-owning reference to a 2D image bitmap with non-contiguous rows.
 * Can represent a section of a larger bitmap, bitmap with padded rows,
 * or vertically flipped bitmap (rowStride can be negative).
 *
 * TypeScript port of msdfgen::BitmapSection from core/BitmapRef.hpp
 * @author Viktor Chlumsky (original C++)
 *
 * @template T - The typed array type (Float32Array, Float64Array, Uint8Array, Uint8ClampedArray)
 * @template N - Number of channels per pixel
 */
export class BitmapSection<T extends BitmapArrayType = Float32Array, N extends number = 1> {
  pixels: T
  readonly width: number
  readonly height: number
  readonly channels: N
  /**
   * Specifies the difference between the beginnings of adjacent pixel rows
   * as the number of array elements. Can be negative for vertically flipped bitmaps.
   */
  rowStride: number
  yOrientation: YAxisOrientation
  /**
   * Offset into the pixels array where this section starts
   * Used for reorientation
   */
  private pixelOffset: number

  constructor(
    pixels: T,
    width: number,
    height: number,
    channels: N,
    rowStride?: number,
    yOrientation: YAxisOrientation = DEFAULT_Y_AXIS_ORIENTATION,
    pixelOffset: number = 0
  ) {
    this.pixels = pixels
    this.width = width
    this.height = height
    this.channels = channels
    this.rowStride = rowStride ?? channels * width
    this.yOrientation = yOrientation
    this.pixelOffset = pixelOffset
  }

  /**
   * Create a BitmapSection from a BitmapRef (contiguous storage)
   */
  static fromRef<T extends BitmapArrayType, N extends number>(
    ref: BitmapRef<T, N>
  ): BitmapSection<T, N> {
    return new BitmapSection<T, N>(
      ref.pixels,
      ref.width,
      ref.height,
      ref.channels,
      ref.channels * ref.width,
      ref.yOrientation
    )
  }

  /**
   * Returns a view to the pixel at (x, y)
   * Accounts for rowStride in indexing
   */
  getPixel(x: number, y: number): T {
    const index = this.pixelOffset + this.rowStride * y + this.channels * x
    return this.pixels.subarray(index, index + this.channels) as T
  }

  /**
   * Gets a single channel value at (x, y)
   */
  getChannel(x: number, y: number, channel: number): number {
    const index = this.pixelOffset + this.rowStride * y + this.channels * x + channel
    return this.pixels[index]
  }

  /**
   * Sets the pixel value at (x, y)
   * Note: This modifies the referenced data
   */
  setPixel(x: number, y: number, values: number[] | ArrayLike<number>): void {
    const index = this.pixelOffset + this.rowStride * y + this.channels * x
    for (let i = 0; i < this.channels; i++) {
      this.pixels[index + i] = values[i]
    }
  }

  /**
   * Sets a single channel value at (x, y)
   * Note: This modifies the referenced data
   */
  setChannel(x: number, y: number, channel: number, value: number): void {
    const index = this.pixelOffset + this.rowStride * y + this.channels * x + channel
    this.pixels[index] = value
  }

  /**
   * Returns a subsection of this section
   * @param xMin - Left boundary (inclusive)
   * @param yMin - Top boundary (inclusive)
   * @param xMax - Right boundary (exclusive)
   * @param yMax - Bottom boundary (exclusive)
   */
  getSection(xMin: number, yMin: number, xMax: number, yMax: number): BitmapSection<T, N> {
    const newOffset = this.pixelOffset + this.rowStride * yMin + this.channels * xMin
    return new BitmapSection<T, N>(
      this.pixels,
      xMax - xMin,
      yMax - yMin,
      this.channels,
      this.rowStride,
      this.yOrientation,
      newOffset
    )
  }

  /**
   * Reorients the section to match the specified Y-axis orientation
   * by potentially flipping rows (making rowStride negative).
   * This modifies the section in place.
   */
  reorient(newYAxisOrientation: YAxisOrientation): void {
    if (this.yOrientation !== newYAxisOrientation) {
      // Move to the last row and reverse direction
      const lastRowOffset = this.rowStride * (this.height - 1)
      this.pixelOffset += lastRowOffset
      this.rowStride = -this.rowStride
      this.yOrientation = newYAxisOrientation
    }
  }
}
