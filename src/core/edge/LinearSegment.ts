import { Vector2, type Point2, dotProduct, crossProduct, mix } from '../types/Vector2';
import { SignedDistance } from '../types/SignedDistance';
import { EdgeColor } from './EdgeColor';
import {
  EdgeSegment,
  type SignedDistanceResult,
  type BoundingBox,
  type ScanlineIntersection,
} from './EdgeSegment';

/**
 * Returns 1 for non-negative values and -1 for negative values
 */
function nonZeroSign(n: number): number {
  return 2 * (n > 0 ? 1 : 0) - 1;
}

/**
 * A line segment edge.
 *
 * TypeScript port of msdfgen::LinearSegment from core/edge-segments.cpp
 * @author Viktor Chlumsky (original C++)
 */
export class LinearSegment extends EdgeSegment {
  static readonly EDGE_TYPE = 1;

  /** Control points: [start, end] */
  p: [Point2, Point2];

  constructor(p0: Point2, p1: Point2, color: EdgeColor = EdgeColor.WHITE) {
    super(color);
    this.p = [p0, p1];
  }

  clone(): LinearSegment {
    return new LinearSegment(this.p[0], this.p[1], this.color);
  }

  type(): number {
    return LinearSegment.EDGE_TYPE;
  }

  controlPoints(): Point2[] {
    return [this.p[0], this.p[1]];
  }

  point(t: number): Point2 {
    return mix(this.p[0], this.p[1], t);
  }

  direction(_t: number): Vector2 {
    return this.p[1].subtract(this.p[0]);
  }

  directionChange(_t: number): Vector2 {
    return new Vector2(0, 0);
  }

  length(): number {
    return this.p[1].subtract(this.p[0]).length();
  }

  signedDistance(origin: Point2): SignedDistanceResult {
    const aq = origin.subtract(this.p[0]);
    const ab = this.p[1].subtract(this.p[0]);
    const param = dotProduct(aq, ab) / dotProduct(ab, ab);
    const eq = this.p[param > 0.5 ? 1 : 0].subtract(origin);
    const endpointDistance = eq.length();

    if (param > 0 && param < 1) {
      const orthoDistance = dotProduct(ab.getOrthonormal(false), aq);
      if (Math.abs(orthoDistance) < endpointDistance) {
        return {
          distance: new SignedDistance(orthoDistance, 0),
          param,
        };
      }
    }

    return {
      distance: new SignedDistance(
        nonZeroSign(crossProduct(aq, ab)) * endpointDistance,
        Math.abs(dotProduct(ab.normalize(), eq.normalize())),
      ),
      param,
    };
  }

  scanlineIntersections(y: number): ScanlineIntersection[] {
    const intersections: ScanlineIntersection[] = [];

    if ((y >= this.p[0].y && y < this.p[1].y) || (y >= this.p[1].y && y < this.p[0].y)) {
      const param = (y - this.p[0].y) / (this.p[1].y - this.p[0].y);
      const x = mix(this.p[0].x, this.p[1].x, param);
      const dy = Math.sign(this.p[1].y - this.p[0].y);
      intersections.push({ x, dy });
    }

    return intersections;
  }

  bound(): BoundingBox {
    return {
      xMin: Math.min(this.p[0].x, this.p[1].x),
      yMin: Math.min(this.p[0].y, this.p[1].y),
      xMax: Math.max(this.p[0].x, this.p[1].x),
      yMax: Math.max(this.p[0].y, this.p[1].y),
    };
  }

  reverse(): void {
    [this.p[0], this.p[1]] = [this.p[1], this.p[0]];
  }

  moveStartPoint(to: Point2): void {
    this.p[0] = to;
  }

  moveEndPoint(to: Point2): void {
    this.p[1] = to;
  }

  splitInThirds(): [LinearSegment, LinearSegment, LinearSegment] {
    const p0 = this.p[0];
    const p1 = this.point(1 / 3);
    const p2 = this.point(2 / 3);
    const p3 = this.p[1];

    return [
      new LinearSegment(p0, p1, this.color),
      new LinearSegment(p1, p2, this.color),
      new LinearSegment(p2, p3, this.color),
    ];
  }
}
