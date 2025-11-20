import { Vector2, type Point2, dotProduct, crossProduct, mix } from '../types/Vector2';
import { SignedDistance } from '../types/SignedDistance';
import { EdgeColor } from './EdgeColor';
import {
  EdgeSegment,
  type SignedDistanceResult,
  type BoundingBox,
  type ScanlineIntersection,
} from './EdgeSegment';
import { solveCubic, solveQuadratic } from './equation-solver';

/**
 * Returns 1 for non-negative values and -1 for negative values
 */
function nonZeroSign(n: number): number {
  return 2 * (n > 0 ? 1 : 0) - 1;
}

/**
 * A quadratic Bezier curve edge segment.
 *
 * TypeScript port of msdfgen::QuadraticSegment from core/edge-segments.cpp
 * @author Viktor Chlumsky (original C++)
 */
export class QuadraticSegment extends EdgeSegment {
  static readonly EDGE_TYPE = 2;

  /** Control points: [start, control, end] */
  p: [Point2, Point2, Point2];

  constructor(p0: Point2, p1: Point2, p2: Point2, color: EdgeColor = EdgeColor.WHITE) {
    super(color);
    this.p = [p0, p1, p2];
  }

  clone(): QuadraticSegment {
    return new QuadraticSegment(this.p[0], this.p[1], this.p[2], this.color);
  }

  type(): number {
    return QuadraticSegment.EDGE_TYPE;
  }

  controlPoints(): Point2[] {
    return [this.p[0], this.p[1], this.p[2]];
  }

  point(t: number): Point2 {
    return mix(mix(this.p[0], this.p[1], t), mix(this.p[1], this.p[2], t), t);
  }

  direction(t: number): Vector2 {
    const tangent = mix(this.p[1].subtract(this.p[0]), this.p[2].subtract(this.p[1]), t);
    if (!tangent.x && !tangent.y) {
      return this.p[2].subtract(this.p[0]);
    }
    return tangent;
  }

  directionChange(_t: number): Vector2 {
    return this.p[2].subtract(this.p[1]).subtract(this.p[1].subtract(this.p[0]));
  }

  length(): number {
    const ab = this.p[1].subtract(this.p[0]);
    const br = this.p[2].subtract(this.p[1]).subtract(ab);
    const abab = dotProduct(ab, ab);
    const abbr = dotProduct(ab, br);
    const brbr = dotProduct(br, br);
    const abLen = Math.sqrt(abab);
    const brLen = Math.sqrt(brbr);
    const crs = crossProduct(ab, br);
    const h = Math.sqrt(abab + abbr + abbr + brbr);
    return (
      (brLen * ((abbr + brbr) * h - abbr * abLen) +
        crs * crs * Math.log((brLen * h + abbr + brbr) / (brLen * abLen + abbr))) /
      (brbr * brLen)
    );
  }

  signedDistance(origin: Point2): SignedDistanceResult {
    const qa = this.p[0].subtract(origin);
    const ab = this.p[1].subtract(this.p[0]);
    const br = this.p[2].subtract(this.p[1]).subtract(ab);
    const a = dotProduct(br, br);
    const b = 3 * dotProduct(ab, br);
    const c = 2 * dotProduct(ab, ab) + dotProduct(qa, br);
    const d = dotProduct(qa, ab);
    const solutions = solveCubic(a, b, c, d);

    let epDir = this.direction(0);
    let minDistance = nonZeroSign(crossProduct(epDir, qa)) * qa.length(); // distance from A
    let param = -dotProduct(qa, epDir) / dotProduct(epDir, epDir);

    {
      const distance = this.p[2].subtract(origin).length(); // distance from B
      if (distance < Math.abs(minDistance)) {
        epDir = this.direction(1);
        minDistance = nonZeroSign(crossProduct(epDir, this.p[2].subtract(origin))) * distance;
        param = dotProduct(origin.subtract(this.p[1]), epDir) / dotProduct(epDir, epDir);
      }
    }

    for (const t of solutions) {
      if (t > 0 && t < 1) {
        const qe = qa.add(ab.multiply(2 * t)).add(br.multiply(t * t));
        const distance = qe.length();
        if (distance <= Math.abs(minDistance)) {
          minDistance = nonZeroSign(crossProduct(ab.add(br.multiply(t)), qe)) * distance;
          param = t;
        }
      }
    }

    if (param >= 0 && param <= 1) {
      return {
        distance: new SignedDistance(minDistance, 0),
        param,
      };
    }
    if (param < 0.5) {
      return {
        distance: new SignedDistance(
          minDistance,
          Math.abs(dotProduct(this.direction(0).normalize(), qa.normalize())),
        ),
        param,
      };
    } else {
      return {
        distance: new SignedDistance(
          minDistance,
          Math.abs(dotProduct(this.direction(1).normalize(), this.p[2].subtract(origin).normalize())),
        ),
        param,
      };
    }
  }

  scanlineIntersections(y: number): ScanlineIntersection[] {
    const intersections: ScanlineIntersection[] = [];

    const a = this.p[0].y - 2 * this.p[1].y + this.p[2].y;
    const b = 2 * (this.p[1].y - this.p[0].y);
    const c = this.p[0].y - y;
    const solutions = solveQuadratic(a, b, c);

    for (const t of solutions) {
      if (t >= 0 && t <= 1) {
        const x = mix(mix(this.p[0].x, this.p[1].x, t), mix(this.p[1].x, this.p[2].x, t), t);
        const dy = Math.sign(mix(this.p[1].y - this.p[0].y, this.p[2].y - this.p[1].y, t));
        intersections.push({ x, dy });
      }
    }

    return intersections;
  }

  bound(): BoundingBox {
    let xMin = Math.min(this.p[0].x, this.p[2].x);
    let yMin = Math.min(this.p[0].y, this.p[2].y);
    let xMax = Math.max(this.p[0].x, this.p[2].x);
    let yMax = Math.max(this.p[0].y, this.p[2].y);

    // Check for extrema in x
    const tx = (this.p[0].x - this.p[1].x) / (this.p[0].x - 2 * this.p[1].x + this.p[2].x);
    if (tx > 0 && tx < 1) {
      const x = this.point(tx).x;
      xMin = Math.min(xMin, x);
      xMax = Math.max(xMax, x);
    }

    // Check for extrema in y
    const ty = (this.p[0].y - this.p[1].y) / (this.p[0].y - 2 * this.p[1].y + this.p[2].y);
    if (ty > 0 && ty < 1) {
      const y = this.point(ty).y;
      yMin = Math.min(yMin, y);
      yMax = Math.max(yMax, y);
    }

    return { xMin, yMin, xMax, yMax };
  }

  reverse(): void {
    [this.p[0], this.p[2]] = [this.p[2], this.p[0]];
  }

  moveStartPoint(to: Point2): void {
    const orig = this.p[0];
    this.p[1] = this.p[1].add(to.subtract(orig));
    this.p[0] = to;
  }

  moveEndPoint(to: Point2): void {
    const orig = this.p[2];
    this.p[1] = this.p[1].add(to.subtract(orig));
    this.p[2] = to;
  }

  splitInThirds(): [QuadraticSegment, QuadraticSegment, QuadraticSegment] {
    const p0 = this.p[0];
    const p1 = mix(this.p[0], this.p[1], 1 / 3);
    const p2 = this.point(1 / 3);
    const p3 = mix(mix(this.p[0], this.p[1], 5 / 9), mix(this.p[1], this.p[2], 4 / 9), 1 / 2);
    const p4 = this.point(2 / 3);
    const p5 = mix(this.p[1], this.p[2], 2 / 3);
    const p6 = this.p[2];

    return [
      new QuadraticSegment(p0, p1, p2, this.color),
      new QuadraticSegment(p2, p3, p4, this.color),
      new QuadraticSegment(p4, p5, p6, this.color),
    ];
  }
}
