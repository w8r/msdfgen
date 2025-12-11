import { Projection } from '../types/Projection';
import { DistanceMapping } from '../types/DistanceMapping';
import { Range } from '../types/Range';
import type { Point2, Vector2 } from '../types/Vector2';

/**
 * Full signed distance field transformation specifies both spatial transformation (Projection)
 * as well as distance value transformation (DistanceMapping).
 *
 * TypeScript port of msdfgen::SDFTransformation from core/SDFTransformation.h
 * @author Viktor Chlumsky (original C++)
 */
export class SDFTransformation extends Projection {
  public readonly distanceMapping: DistanceMapping;

  /**
   * Creates an empty SDFTransformation
   */
  constructor();

  /**
   * Creates an SDFTransformation from projection and distance mapping
   */
  constructor(projection: Projection, distanceMapping: DistanceMapping);

  /**
   * Creates an SDFTransformation from projection and range
   */
  constructor(projection: Projection, range: Range);

  constructor(
    projection?: Projection,
    distanceMappingOrRange?: DistanceMapping | Range
  ) {
    if (projection) {
      super(projection.scale, projection.translate);
      if (distanceMappingOrRange instanceof DistanceMapping) {
        this.distanceMapping = distanceMappingOrRange;
      } else if (distanceMappingOrRange) {
        this.distanceMapping = new DistanceMapping(distanceMappingOrRange);
      } else {
        this.distanceMapping = new DistanceMapping(new Range());
      }
    } else {
      super();
      this.distanceMapping = new DistanceMapping(new Range());
    }
  }

  /**
   * Projects a point from shape space to pixel space
   */
  override project(point: Point2): Point2 {
    return super.project(point);
  }

  /**
   * Unprojects a point from pixel space to shape space
   */
  override unproject(point: Point2): Point2 {
    return super.unproject(point);
  }

  /**
   * Projects a vector from shape space to pixel space
   */
  override projectVector(vector: Vector2): Vector2 {
    return super.projectVector(vector);
  }

  /**
   * Unprojects a vector from pixel space to shape space
   */
  override unprojectVector(vector: Vector2): Vector2 {
    return super.unprojectVector(vector);
  }

  /**
   * Projects an X coordinate
   */
  override projectX(x: number): number {
    return super.projectX(x);
  }

  /**
   * Projects a Y coordinate
   */
  override projectY(y: number): number {
    return super.projectY(y);
  }

  /**
   * Unprojects an X coordinate
   */
  override unprojectX(x: number): number {
    return super.unprojectX(x);
  }

  /**
   * Unprojects a Y coordinate
   */
  override unprojectY(y: number): number {
    return super.unprojectY(y);
  }
}
