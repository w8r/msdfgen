import { YAxisOrientation, DEFAULT_Y_AXIS_ORIENTATION } from './YAxisOrientation';
import { BitmapRef } from './BitmapRef';
import { BitmapSection } from './BitmapSection';

/**
 * Type for typed arrays that can be used as bitmap storage
 */
export type BitmapArrayType = Float32Array | Float64Array | Uint8Array | Uint8ClampedArray

/**
 * Constructor type for typed arrays
 */
export type BitmapArrayConstructor = Float32ArrayConstructor | Float64ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor

/**
 * A 2D image bitmap with N channels. Pixel memory is managed by the class using TypedArrays.
 *
 * TypeScript port of msdfgen::Bitmap from core/Bitmap.h/hpp
 * @author Viktor Chlumsky (original C++)
 *
 * @template T - The typed array type for storage (Float32Array, Float64Array, Uint8Array, Uint8ClampedArray)
 * @template N - Number of channels per pixel (1, 3, or 4)
 */
export class Bitmap<T extends BitmapArrayType = Float32Array, N extends number = 1> {
  private pixels: T;
  private w: number;
  private h: number;
  private channels: N;
  private yOrientation: YAxisOrientation;
  private ArrayConstructor: BitmapArrayConstructor;

  /**
   * Creates an empty bitmap (0x0)
   */
  constructor(
    ArrayType: BitmapArrayConstructor,
    channels: N,
    width?: number,
    height?: number,
    yOrientation?: YAxisOrientation
  )

  /**
   * Creates a bitmap with specified dimensions
   */
  constructor(
    ArrayType: BitmapArrayConstructor,
    channels: N,
    width: number,
    height: number,
    yOrientation?: YAxisOrientation,
  ) {
    this.ArrayConstructor = ArrayType;
    this.channels = channels;
    this.w = width ?? 0;
    this.h = height ?? 0;
    this.yOrientation = yOrientation ?? DEFAULT_Y_AXIS_ORIENTATION;
    this.pixels = new ArrayType(this.channels * this.w * this.h) as T;
  }

  /**
   * Returns bitmap width in pixels
   */
  width(): number {
    return this.w;
  }

  /**
   * Returns bitmap height in pixels
   */
  height(): number {
    return this.h;
  }

  /**
   * Returns the number of channels per pixel
   */
  channelCount(): N {
    return this.channels;
  }

  /**
   * Returns the Y-axis orientation of the bitmap
   */
  getYOrientation(): YAxisOrientation {
    return this.yOrientation;
  }

  /**
   * Returns a pointer (typed array view) to the pixel at (x, y)
   * The returned view has length N (number of channels)
   */
  getPixel(x: number, y: number): T {
    const index = this.channels * (this.w * y + x);
    return this.pixels.subarray(index, index + this.channels) as T;
  }

  /**
   * Sets the pixel value at (x, y)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param values - Array of channel values (length must equal N)
   */
  setPixel(x: number, y: number, values: number[] | ArrayLike<number>): void {
    const index = this.channels * (this.w * y + x);
    for (let i = 0; i < this.channels; i++) {
      this.pixels[index + i] = values[i];
    }
  }

  /**
   * Gets a single channel value at (x, y)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param channel - Channel index (0 to N-1)
   */
  getChannel(x: number, y: number, channel: number): number {
    const index = this.channels * (this.w * y + x) + channel;
    return this.pixels[index];
  }

  /**
   * Sets a single channel value at (x, y)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param channel - Channel index (0 to N-1)
   * @param value - Value to set
   */
  setChannel(x: number, y: number, channel: number, value: number): void {
    const index = this.channels * (this.w * y + x) + channel;
    this.pixels[index] = value;
  }

  /**
   * Returns the underlying typed array
   */
  data(): T {
    return this.pixels;
  }

  /**
   * Converts this bitmap to a BitmapRef (non-owning reference)
   */
  ref(): BitmapRef<T, N> {
    return new BitmapRef<T, N>(this.pixels, this.w, this.h, this.channels, this.yOrientation);
  }

  /**
   * Converts this bitmap to a BitmapSection (supports rowStride)
   */
  section(): BitmapSection<T, N> {
    return new BitmapSection<T, N>(this.pixels, this.w, this.h, this.channels, this.channels * this.w, this.yOrientation, 0);
  }

  /**
   * Returns a BitmapSection representing a rectangular region
   * @param xMin - Left boundary (inclusive)
   * @param yMin - Top boundary (inclusive)
   * @param xMax - Right boundary (exclusive)
   * @param yMax - Bottom boundary (exclusive)
   */
  getSection(xMin: number, yMin: number, xMax: number, yMax: number): BitmapSection<T, N> {
    const startIndex = this.channels * (this.w * yMin + xMin);
    return new BitmapSection<T, N>(
      this.pixels,
      xMax - xMin,
      yMax - yMin,
      this.channels,
      this.channels * this.w,
      this.yOrientation,
      startIndex,
    );
  }

  /**
   * Copies data from another bitmap
   */
  copyFrom(other: Bitmap<T, N>): void {
    if (this.w !== other.w || this.h !== other.h || this.channels !== other.channels) {
      // Reallocate
      this.w = other.w;
      this.h = other.h;
      this.channels = other.channels;
      this.pixels = new this.ArrayConstructor(this.channels * this.w * this.h) as T;
    }
    this.yOrientation = other.yOrientation;
    this.pixels.set(other.pixels);
  }

  /**
   * Copies data from a BitmapRef
   */
  copyFromRef(ref: BitmapRef<T, N>): void {
    if (this.w !== ref.width || this.h !== ref.height || this.channels !== ref.channels) {
      // Reallocate
      this.w = ref.width;
      this.h = ref.height;
      this.channels = ref.channels;
      this.pixels = new this.ArrayConstructor(this.channels * this.w * this.h) as T;
    }
    this.yOrientation = ref.yOrientation;
    this.pixels.set(ref.pixels);
  }

  /**
   * Copies data from a BitmapSection (handles non-contiguous rows)
   */
  copyFromSection(section: BitmapSection<T, N>): void {
    if (this.w !== section.width || this.h !== section.height || this.channels !== section.channels) {
      // Reallocate
      this.w = section.width;
      this.h = section.height;
      this.channels = section.channels;
      this.pixels = new this.ArrayConstructor(this.channels * this.w * this.h) as T;
    }
    this.yOrientation = section.yOrientation;

    // Copy row by row due to potential non-contiguous storage
    const rowLength = this.channels * this.w;
    let dstIndex = 0;
    let srcIndex = 0;

    for (let y = 0; y < this.h; y++) {
      for (let i = 0; i < rowLength; i++) {
        this.pixels[dstIndex + i] = section.pixels[srcIndex + i];
      }
      dstIndex += rowLength;
      srcIndex += section.rowStride;
    }
  }

  /**
   * Fills the entire bitmap with a single value for all channels
   */
  fill(value: number): void {
    this.pixels.fill(value);
  }

  /**
   * Fills the entire bitmap with specified channel values
   */
  fillChannels(values: number[] | ArrayLike<number>): void {
    for (let i = 0; i < this.pixels.length; i += this.channels) {
      for (let c = 0; c < this.channels; c++) {
        this.pixels[i + c] = values[c];
      }
    }
  }
}
