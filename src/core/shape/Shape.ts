import { Contour } from './Contour';
import type { BoundingBox } from '../edge/EdgeSegment';

/**
 * Y-axis orientation for shape coordinate system
 */
export enum YAxisOrientation {
  /** Y-axis points upward (standard mathematical convention) */
  TOP_UP = 1,
  /** Y-axis points downward (common in graphics APIs) */
  TOP_DOWN = -1,
}

/**
 * A complete vector shape consisting of one or more contours.
 * Each contour is a closed loop of edge segments.
 *
 * TypeScript port of msdfgen::Shape from core/Shape.h/cpp
 * @author Viktor Chlumsky (original C++)
 */
export class Shape {
  /** The contours that make up the shape */
  contours: Contour[];

  /** Whether the Y-axis should be inverted */
  inverseYAxis: boolean;

  constructor() {
    this.contours = [];
    this.inverseYAxis = false;
  }

  /**
   * Adds a contour to the shape
   */
  addContour(contour: Contour): void {
    this.contours.push(contour);
  }

  /**
   * Creates and adds a new empty contour to the shape
   * @returns The newly created contour
   */
  addEmptyContour(): Contour {
    const contour = new Contour();
    this.contours.push(contour);
    return contour;
  }

  /**
   * Returns the bounding box of the entire shape
   */
  bound(): BoundingBox {
    if (this.contours.length === 0) {
      return { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
    }

    let xMin = Infinity;
    let yMin = Infinity;
    let xMax = -Infinity;
    let yMax = -Infinity;

    for (const contour of this.contours) {
      const b = contour.bound();
      xMin = Math.min(xMin, b.xMin);
      yMin = Math.min(yMin, b.yMin);
      xMax = Math.max(xMax, b.xMax);
      yMax = Math.max(yMax, b.yMax);
    }

    return { xMin, yMin, xMax, yMax };
  }

  /**
   * Returns the bounding box of the shape with a border
   * @param border - Border width to add around the shape
   * @returns Bounding box with {l: left, b: bottom, r: right, t: top}
   */
  getBounds(border: number = 0): { l: number; b: number; r: number; t: number } {
    const bbox = this.bound();
    return {
      l: bbox.xMin - border,
      b: bbox.yMin - border,
      r: bbox.xMax + border,
      t: bbox.yMax + border,
    };
  }

  /**
   * Adjusts the bounding box to fit the shape border's mitered corners
   * @param border - Border width
   * @param miterLimit - Maximum miter length multiplier
   * @param polarity - Direction polarity (1 or -1)
   */
  boundMiters(border: number, miterLimit: number, polarity: number): BoundingBox {
    if (this.contours.length === 0) {
      return { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
    }

    let xMin = Infinity;
    let yMin = Infinity;
    let xMax = -Infinity;
    let yMax = -Infinity;

    for (const contour of this.contours) {
      const b = contour.boundMiters(border, miterLimit, polarity);
      xMin = Math.min(xMin, b.xMin);
      yMin = Math.min(yMin, b.yMin);
      xMax = Math.max(xMax, b.xMax);
      yMax = Math.max(yMax, b.yMax);
    }

    return { xMin, yMin, xMax, yMax };
  }

  /**
   * Normalizes the shape by ensuring proper contour orientations.
   * After normalization, outer contours will be counterclockwise
   * and inner contours (holes) will be clockwise.
   */
  normalize(): void {
    for (const contour of this.contours) {
      const w = contour.winding();
      if (w < 0) {
        contour.reverse();
      }
    }
  }

  /**
   * Returns the Y-axis orientation of the shape
   */
  getYAxisOrientation(): YAxisOrientation {
    return this.inverseYAxis ? YAxisOrientation.TOP_DOWN : YAxisOrientation.TOP_UP;
  }

  /**
   * Validates the shape by checking for common issues
   * @returns true if the shape is valid, false otherwise
   */
  validate(): boolean {
    // A valid shape must have at least one contour
    if (this.contours.length === 0) {
      return false;
    }

    // Each contour must have at least one edge
    for (const contour of this.contours) {
      if (contour.edges.length === 0) {
        return false;
      }
    }

    return true;
  }
}
