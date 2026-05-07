import { Shape } from '../core/shape/Shape';
import { Contour } from '../core/shape/Contour';
import { EdgeHolder } from '../core/shape/EdgeHolder';
import { Vector2 } from '../core/types/Vector2';

/**
 * Path command types from opentype.js
 */
export interface PathCommand {
  type: 'M' | 'L' | 'Q' | 'C' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

const EPSILON = 0.001;

/**
 * Convert a sequence of path commands to a Shape
 * @param commands - Path commands from opentype.js glyph.getPath()
 * @returns Shape ready for MSDF generation
 */
export function glyphPathToShape(commands: PathCommand[]): Shape {
  const shape = new Shape();

  let currentContour: Contour | null = null;
  let contourStart: Vector2 | null = null;
  let currentPoint: Vector2 | null = null;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        // Start new contour
        currentContour = shape.addEmptyContour();
        contourStart = new Vector2(cmd.x!, cmd.y!);
        currentPoint = contourStart;
        break;

      case 'L':
        // Linear segment
        if (currentContour && currentPoint) {
          const endPoint = new Vector2(cmd.x!, cmd.y!);
          currentContour.addEdge(new EdgeHolder(currentPoint, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'Q':
        // Quadratic Bezier
        if (currentContour && currentPoint) {
          const control = new Vector2(cmd.x1!, cmd.y1!);
          const endPoint = new Vector2(cmd.x!, cmd.y!);
          currentContour.addEdge(new EdgeHolder(currentPoint, control, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'C':
        // Cubic Bezier
        if (currentContour && currentPoint) {
          const control1 = new Vector2(cmd.x1!, cmd.y1!);
          const control2 = new Vector2(cmd.x2!, cmd.y2!);
          const endPoint = new Vector2(cmd.x!, cmd.y!);
          currentContour.addEdge(new EdgeHolder(currentPoint, control1, control2, endPoint));
          currentPoint = endPoint;
        }
        break;

      case 'Z':
        // Close path - add closing edge if not already at start
        if (currentContour && currentPoint && contourStart) {
          const dx = Math.abs(currentPoint.x - contourStart.x);
          const dy = Math.abs(currentPoint.y - contourStart.y);
          if (dx > EPSILON || dy > EPSILON) {
            currentContour.addEdge(new EdgeHolder(currentPoint, contourStart));
          }
        }
        currentContour = null;
        break;
    }
  }

  // Normalize winding order for correct fill
  shape.normalize();

  return shape;
}
