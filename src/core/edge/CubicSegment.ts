import {
  Vector2,
  type Point2,
  dotProduct,
  crossProduct,
  mix,
} from '../types/Vector2';
import { SignedDistance } from '../types/SignedDistance';
import { EdgeColor } from './EdgeColor';
import {
  EdgeSegment,
  type SignedDistanceResult,
  type BoundingBox,
  type ScanlineIntersection,
} from './EdgeSegment';
import { solveCubic } from './equation-solver';

/**
 * Returns 1 for non-negative values and -1 for negative values
 */
function nonZeroSign(n: number): number {
  return 2 * (n > 0 ? 1 : 0) - 1;
}

// Parameters for iterative search of closest point on a cubic Bezier curve
const CUBIC_SEARCH_STARTS = 4;
const CUBIC_SEARCH_STEPS = 4;

/**
 * A cubic Bezier curve edge segment.
 *
 * TypeScript port of msdfgen::CubicSegment from core/edge-segments.cpp
 * @author Viktor Chlumsky (original C++)
 */
export class CubicSegment extends EdgeSegment {
  static readonly EDGE_TYPE = 3;

  /** Control points: [start, control1, control2, end] */
  p: [Point2, Point2, Point2, Point2];

  constructor(
    p0: Point2,
    p1: Point2,
    p2: Point2,
    p3: Point2,
    color: EdgeColor = EdgeColor.WHITE,
  ) {
    super(color);
    this.p = [p0, p1, p2, p3];
  }

  clone(): CubicSegment {
    return new CubicSegment(
      this.p[0],
      this.p[1],
      this.p[2],
      this.p[3],
      this.color,
    );
  }

  type(): number {
    return CubicSegment.EDGE_TYPE;
  }

  controlPoints(): Point2[] {
    return [this.p[0], this.p[1], this.p[2], this.p[3]];
  }

  point(t: number): Point2 {
    const p12 = mix(this.p[1], this.p[2], t);
    return mix(
      mix(mix(this.p[0], this.p[1], t), p12, t),
      mix(p12, mix(this.p[2], this.p[3], t), t),
      t,
    );
  }

  direction(t: number): Vector2 {
    const tangent = mix(
      mix(this.p[1].subtract(this.p[0]), this.p[2].subtract(this.p[1]), t),
      mix(this.p[2].subtract(this.p[1]), this.p[3].subtract(this.p[2]), t),
      t,
    );
    if (!tangent.x && !tangent.y) {
      if (t === 0) return this.p[2].subtract(this.p[0]);
      if (t === 1) return this.p[3].subtract(this.p[1]);
    }
    return tangent;
  }

  directionChange(t: number): Vector2 {
    return mix(
      this.p[2].subtract(this.p[1]).subtract(this.p[1].subtract(this.p[0])),
      this.p[3].subtract(this.p[2]).subtract(this.p[2].subtract(this.p[1])),
      t,
    );
  }

  length(): number {
    // Approximate length using adaptive subdivision
    const numSegments = 16;
    let length = 0;
    let prevPoint = this.p[0];

    for (let i = 1; i <= numSegments; i++) {
      const t = i / numSegments;
      const currentPoint = this.point(t);
      length += currentPoint.subtract(prevPoint).length();
      prevPoint = currentPoint;
    }

    return length;
  }

  signedDistance(origin: Point2): SignedDistanceResult {
    const qa = this.p[0].subtract(origin);
    const ab = this.p[1].subtract(this.p[0]);
    const br = this.p[2].subtract(this.p[1]).subtract(ab);
    const as = this.p[3]
      .subtract(this.p[2])
      .subtract(this.p[2].subtract(this.p[1]))
      .subtract(br);

    let epDir = this.direction(0);
    let minDistance = nonZeroSign(crossProduct(epDir, qa)) * qa.length(); // distance from A
    let param = -dotProduct(qa, epDir) / dotProduct(epDir, epDir);

    {
      const distance = this.p[3].subtract(origin).length(); // distance from B
      if (distance < Math.abs(minDistance)) {
        epDir = this.direction(1);
        minDistance =
          nonZeroSign(crossProduct(epDir, this.p[3].subtract(origin))) *
          distance;
        param =
          dotProduct(epDir.subtract(this.p[3].subtract(origin)), epDir) /
          dotProduct(epDir, epDir);
      }
    }

    // Iterative minimum distance search
    for (let i = 0; i <= CUBIC_SEARCH_STARTS; i++) {
      let t = (1 / CUBIC_SEARCH_STARTS) * i;
      let qe = qa
        .add(ab.multiply(3 * t))
        .add(br.multiply(3 * t * t))
        .add(as.multiply(t * t * t));
      let d1 = ab
        .multiply(3)
        .add(br.multiply(6 * t))
        .add(as.multiply(3 * t * t));
      let d2 = br.multiply(6).add(as.multiply(6 * t));
      let improvedT =
        t - dotProduct(qe, d1) / (dotProduct(d1, d1) + dotProduct(qe, d2));

      if (improvedT > 0 && improvedT < 1) {
        let remainingSteps = CUBIC_SEARCH_STEPS;
        do {
          t = improvedT;
          qe = qa
            .add(ab.multiply(3 * t))
            .add(br.multiply(3 * t * t))
            .add(as.multiply(t * t * t));
          d1 = ab
            .multiply(3)
            .add(br.multiply(6 * t))
            .add(as.multiply(3 * t * t));
          if (!--remainingSteps) break;
          d2 = br.multiply(6).add(as.multiply(6 * t));
          improvedT =
            t - dotProduct(qe, d1) / (dotProduct(d1, d1) + dotProduct(qe, d2));
        } while (improvedT > 0 && improvedT < 1);

        const distance = qe.length();
        if (distance < Math.abs(minDistance)) {
          minDistance = nonZeroSign(crossProduct(d1, qe)) * distance;
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
          Math.abs(
            dotProduct(
              this.direction(1).normalize(),
              this.p[3].subtract(origin).normalize(),
            ),
          ),
        ),
        param,
      };
    }
  }

  scanlineIntersections(y: number): ScanlineIntersection[] {
    const intersections: ScanlineIntersection[] = [];

    const a = -this.p[0].y + 3 * this.p[1].y - 3 * this.p[2].y + this.p[3].y;
    const b = 3 * this.p[0].y - 6 * this.p[1].y + 3 * this.p[2].y;
    const c = -3 * this.p[0].y + 3 * this.p[1].y;
    const d = this.p[0].y - y;
    const solutions = solveCubic(a, b, c, d);

    for (const t of solutions) {
      if (t >= 0 && t <= 1) {
        const p12 = mix(this.p[1], this.p[2], t);
        const x = mix(
          mix(mix(this.p[0].x, this.p[1].x, t), p12.x, t),
          mix(p12.x, mix(this.p[2].x, this.p[3].x, t), t),
          t,
        );
        const dy = Math.sign(
          mix(
            mix(this.p[1].y - this.p[0].y, this.p[2].y - this.p[1].y, t),
            mix(this.p[2].y - this.p[1].y, this.p[3].y - this.p[2].y, t),
            t,
          ),
        );
        intersections.push({ x, dy });
      }
    }

    return intersections;
  }

  bound(): BoundingBox {
    let xMin = Math.min(this.p[0].x, this.p[3].x);
    let yMin = Math.min(this.p[0].y, this.p[3].y);
    let xMax = Math.max(this.p[0].x, this.p[3].x);
    let yMax = Math.max(this.p[0].y, this.p[3].y);

    // Find extrema for x
    const ax =
      -3 * this.p[0].x + 9 * this.p[1].x - 9 * this.p[2].x + 3 * this.p[3].x;
    const bx = 6 * this.p[0].x - 12 * this.p[1].x + 6 * this.p[2].x;
    const cx = -3 * this.p[0].x + 3 * this.p[1].x;

    if (ax !== 0) {
      const discriminant = bx * bx - 4 * ax * cx;
      if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-bx + sqrtD) / (2 * ax);
        const t2 = (-bx - sqrtD) / (2 * ax);
        if (t1 > 0 && t1 < 1) {
          const x = this.point(t1).x;
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
        }
        if (t2 > 0 && t2 < 1) {
          const x = this.point(t2).x;
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
        }
      }
    } else if (bx !== 0) {
      const t = -cx / bx;
      if (t > 0 && t < 1) {
        const x = this.point(t).x;
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
      }
    }

    // Find extrema for y
    const ay =
      -3 * this.p[0].y + 9 * this.p[1].y - 9 * this.p[2].y + 3 * this.p[3].y;
    const by = 6 * this.p[0].y - 12 * this.p[1].y + 6 * this.p[2].y;
    const cy = -3 * this.p[0].y + 3 * this.p[1].y;

    if (ay !== 0) {
      const discriminant = by * by - 4 * ay * cy;
      if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-by + sqrtD) / (2 * ay);
        const t2 = (-by - sqrtD) / (2 * ay);
        if (t1 > 0 && t1 < 1) {
          const y = this.point(t1).y;
          yMin = Math.min(yMin, y);
          yMax = Math.max(yMax, y);
        }
        if (t2 > 0 && t2 < 1) {
          const y = this.point(t2).y;
          yMin = Math.min(yMin, y);
          yMax = Math.max(yMax, y);
        }
      }
    } else if (by !== 0) {
      const t = -cy / by;
      if (t > 0 && t < 1) {
        const y = this.point(t).y;
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
    }

    return { xMin, yMin, xMax, yMax };
  }

  reverse(): void {
    [this.p[0], this.p[3]] = [this.p[3], this.p[0]];
    [this.p[1], this.p[2]] = [this.p[2], this.p[1]];
  }

  moveStartPoint(to: Point2): void {
    this.p[1] = this.p[1].add(to.subtract(this.p[0]));
    this.p[0] = to;
  }

  moveEndPoint(to: Point2): void {
    this.p[2] = this.p[2].add(to.subtract(this.p[3]));
    this.p[3] = to;
  }

  splitInThirds(): [CubicSegment, CubicSegment, CubicSegment] {
    // Use de Casteljau's algorithm to split at t=1/3 and t=2/3
    const t1 = 1 / 3;

    // First split at t=1/3
    const p01_1 = mix(this.p[0], this.p[1], t1);
    const p12_1 = mix(this.p[1], this.p[2], t1);
    const p23_1 = mix(this.p[2], this.p[3], t1);
    const p012_1 = mix(p01_1, p12_1, t1);
    const p123_1 = mix(p12_1, p23_1, t1);
    const p0123_1 = mix(p012_1, p123_1, t1);

    // Second split the right part at adjusted t = (2/3 - 1/3) / (1 - 1/3) = 1/2
    const tAdjusted = 0.5;
    const p01_2 = mix(p0123_1, p123_1, tAdjusted);
    const p12_2 = mix(p123_1, p23_1, tAdjusted);
    const p23_2 = mix(p23_1, this.p[3], tAdjusted);
    const p012_2 = mix(p01_2, p12_2, tAdjusted);
    const p123_2 = mix(p12_2, p23_2, tAdjusted);
    const p0123_2 = mix(p012_2, p123_2, tAdjusted);

    return [
      new CubicSegment(this.p[0], p01_1, p012_1, p0123_1, this.color),
      new CubicSegment(p0123_1, p01_2, p012_2, p0123_2, this.color),
      new CubicSegment(p0123_2, p123_2, p23_2, this.p[3], this.color),
    ];
  }
}
