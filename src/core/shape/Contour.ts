import { EdgeHolder } from './EdgeHolder';
import type { Point2 } from '../types/Vector2';
import { crossProduct, dotProduct } from '../types/Vector2';
import type { BoundingBox } from '../edge/EdgeSegment';

/**
 * Shoelace formula for calculating signed area contribution
 */
function shoelace(a: Point2, b: Point2): number {
  return (b.x - a.x) * (a.y + b.y);
}

/**
 * A single closed contour of a shape.
 * A contour is a sequence of connected edge segments that form a closed loop.
 *
 * TypeScript port of msdfgen::Contour from core/Contour.h/cpp
 * @author Viktor Chlumsky (original C++)
 */
export class Contour {
  /** The sequence of edges that make up the contour */
  edges: EdgeHolder[];

  constructor() {
    this.edges = [];
  }

  /**
   * Adds an edge to the contour
   */
  addEdge(edge: EdgeHolder): void {
    this.edges.push(edge);
  }

  /**
   * Creates and adds a new empty edge holder to the contour
   * @returns The newly created edge holder
   */
  addEmptyEdge(): EdgeHolder {
    const holder = new EdgeHolder();
    this.edges.push(holder);
    return holder;
  }

  /**
   * Returns the bounding box of the contour
   */
  bound(): BoundingBox {
    if (this.edges.length === 0) {
      return { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
    }

    let xMin = Infinity;
    let yMin = Infinity;
    let xMax = -Infinity;
    let yMax = -Infinity;

    for (const edgeHolder of this.edges) {
      const edge = edgeHolder.getOrNull();
      if (edge) {
        const b = edge.bound();
        xMin = Math.min(xMin, b.xMin);
        yMin = Math.min(yMin, b.yMin);
        xMax = Math.max(xMax, b.xMax);
        yMax = Math.max(yMax, b.yMax);
      }
    }

    return { xMin, yMin, xMax, yMax };
  }

  /**
   * Adjusts the bounding box to fit the contour border's mitered corners
   * @param border - Border width
   * @param miterLimit - Maximum miter length multiplier
   * @param polarity - Direction polarity (1 or -1)
   */
  boundMiters(
    border: number,
    miterLimit: number,
    polarity: number,
  ): BoundingBox {
    if (this.edges.length === 0) {
      return { xMin: 0, yMin: 0, xMax: 0, yMax: 0 };
    }

    let xMin = Infinity;
    let yMin = Infinity;
    let xMax = -Infinity;
    let yMax = -Infinity;

    const updateBounds = (p: Point2) => {
      xMin = Math.min(xMin, p.x);
      yMin = Math.min(yMin, p.y);
      xMax = Math.max(xMax, p.x);
      yMax = Math.max(yMax, p.y);
    };

    const lastEdge = this.edges[this.edges.length - 1].getOrNull();
    let prevDir = lastEdge ? lastEdge.direction(1).normalize(true) : null;

    for (const edgeHolder of this.edges) {
      const edge = edgeHolder.getOrNull();
      if (!edge || !prevDir) continue;

      const dir = edge.direction(0).normalize(true).scale(-1);
      if (polarity * crossProduct(prevDir, dir) >= 0) {
        let miterLength = miterLimit;
        const q = 0.5 * (1 - dotProduct(prevDir, dir));
        if (q > 0) {
          miterLength = Math.min(1 / Math.sqrt(q), miterLimit);
        }
        const miter = edge.point(0).add(
          prevDir
            .add(dir)
            .normalize(true)
            .scale(border * miterLength),
        );
        updateBounds(miter);
      }
      prevDir = edge.direction(1).normalize(true);
    }

    return { xMin, yMin, xMax, yMax };
  }

  /**
   * Computes the winding of the contour using the shoelace formula.
   * @returns 1 if positive (counterclockwise), -1 if negative (clockwise), 0 if degenerate
   */
  winding(): number {
    if (this.edges.length === 0) {
      return 0;
    }

    let total = 0;

    if (this.edges.length === 1) {
      const edge = this.edges[0].get();
      const a = edge.point(0);
      const b = edge.point(1 / 3);
      const c = edge.point(2 / 3);
      total += shoelace(a, b);
      total += shoelace(b, c);
      total += shoelace(c, a);
    } else if (this.edges.length === 2) {
      const edge0 = this.edges[0].get();
      const edge1 = this.edges[1].get();
      const a = edge0.point(0);
      const b = edge0.point(0.5);
      const c = edge1.point(0);
      const d = edge1.point(0.5);
      total += shoelace(a, b);
      total += shoelace(b, c);
      total += shoelace(c, d);
      total += shoelace(d, a);
    } else {
      const lastEdge = this.edges[this.edges.length - 1].get();
      let prev = lastEdge.point(0);
      for (const edgeHolder of this.edges) {
        const edge = edgeHolder.get();
        const cur = edge.point(0);
        total += shoelace(prev, cur);
        prev = cur;
      }
    }

    return Math.sign(total);
  }

  /**
   * Reverses the sequence of edges on the contour
   */
  reverse(): void {
    // Reverse each individual edge first
    for (const edgeHolder of this.edges) {
      const edge = edgeHolder.getOrNull();
      if (edge) {
        edge.reverse();
      }
    }

    // Reverse the array
    this.edges.reverse();
  }
}
