/**
 * MSDFGEN Demo - Manually Defined Shapes
 *
 * This demo creates various geometric shapes and generates their distance fields.
 * It demonstrates SDF, PSDF, MSDF, and MTSDF generation.
 */

import { Shape } from "../src/core/shape/Shape";
import { Contour } from "../src/core/shape/Contour";
import { EdgeHolder } from "../src/core/shape/EdgeHolder";
import { Vector2 } from "../src/core/types/Vector2";
import { EdgeColor } from "../src/core/edge/EdgeColor";
import { Bitmap } from "../src/core/bitmap/Bitmap";
import { Projection } from "../src/core/types/Projection";
import { Range } from "../src/core/types/Range";
import { SDFTransformation } from "../src/core/generators/SDFTransformation";
import {
  generateSDF,
  generatePSDF,
  generateMSDF,
  generateMTSDF,
} from "../src/core/generators/msdfgen";
import { edgeColoringSimple } from "../src/core/edge-coloring/edge-coloring";

/**
 * Creates a simple square shape (0,0) to (1,1)
 */
export function createSquare(): Shape {
  const shape = new Shape();
  const contour = new Contour();

  // Create a square with 4 linear segments
  contour.addEdge(
    new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0), EdgeColor.WHITE)
  );
  contour.addEdge(
    new EdgeHolder(new Vector2(1, 0), new Vector2(1, 1), EdgeColor.WHITE)
  );
  contour.addEdge(
    new EdgeHolder(new Vector2(1, 1), new Vector2(0, 1), EdgeColor.WHITE)
  );
  contour.addEdge(
    new EdgeHolder(new Vector2(0, 1), new Vector2(0, 0), EdgeColor.WHITE)
  );

  shape.addContour(contour);
  return shape;
}

/**
 * Creates a triangle shape
 */
export function createTriangle(): Shape {
  const shape = new Shape();
  const contour = new Contour();

  // Equilateral triangle centered at (0.5, 0.5)
  const cx = 0.5,
    cy = 0.5;
  const r = 0.4; // radius

  const p1 = new Vector2(cx, cy - r);
  const p2 = new Vector2(
    cx + r * Math.cos(Math.PI / 6),
    cy + r * Math.sin(Math.PI / 6)
  );
  const p3 = new Vector2(
    cx - r * Math.cos(Math.PI / 6),
    cy + r * Math.sin(Math.PI / 6)
  );

  contour.addEdge(new EdgeHolder(p1, p2, EdgeColor.WHITE));
  contour.addEdge(new EdgeHolder(p2, p3, EdgeColor.WHITE));
  contour.addEdge(new EdgeHolder(p3, p1, EdgeColor.WHITE));

  shape.addContour(contour);
  return shape;
}

/**
 * Creates a circle approximation using quadratic curves
 */
export function createCircle(): Shape {
  const shape = new Shape();
  const contour = new Contour();

  const cx = 0.5,
    cy = 0.5;
  const r = 0.4;
  const k = 0.552284749831; // Control point distance for circle approximation

  // Circle using 4 quadratic Bezier curves
  const segments = [
    {
      start: new Vector2(cx + r, cy),
      control: new Vector2(cx + r, cy + r * k),
      end: new Vector2(cx, cy + r),
    },
    {
      start: new Vector2(cx, cy + r),
      control: new Vector2(cx - r * k, cy + r),
      end: new Vector2(cx - r, cy),
    },
    {
      start: new Vector2(cx - r, cy),
      control: new Vector2(cx - r, cy - r * k),
      end: new Vector2(cx, cy - r),
    },
    {
      start: new Vector2(cx, cy - r),
      control: new Vector2(cx + r * k, cy - r),
      end: new Vector2(cx + r, cy),
    },
  ];

  for (const seg of segments) {
    contour.addEdge(
      new EdgeHolder(seg.start, seg.control, seg.end, EdgeColor.WHITE)
    );
  }

  shape.addContour(contour);
  return shape;
}

/**
 * Creates a heart shape using cubic curves
 */
export function createHeart(): Shape {
  const shape = new Shape();
  const contour = new Contour();

  const cx = 0.5,
    cy = 0.5;
  const scale = 0.4;

  // Heart shape using cubic Bezier curves
  // Top left curve
  contour.addEdge(
    new EdgeHolder(
      new Vector2(cx, cy - scale * 0.3),
      new Vector2(cx - scale * 0.8, cy - scale * 0.8),
      new Vector2(cx - scale * 0.8, cy - scale * 0.2),
      new Vector2(cx - scale * 0.4, cy),
      EdgeColor.WHITE
    )
  );

  // Bottom left curve
  contour.addEdge(
    new EdgeHolder(
      new Vector2(cx - scale * 0.4, cy),
      new Vector2(cx - scale * 0.2, cy + scale * 0.3),
      new Vector2(cx - scale * 0.1, cy + scale * 0.6),
      new Vector2(cx, cy + scale * 0.8),
      EdgeColor.WHITE
    )
  );

  // Bottom right curve
  contour.addEdge(
    new EdgeHolder(
      new Vector2(cx, cy + scale * 0.8),
      new Vector2(cx + scale * 0.1, cy + scale * 0.6),
      new Vector2(cx + scale * 0.2, cy + scale * 0.3),
      new Vector2(cx + scale * 0.4, cy),
      EdgeColor.WHITE
    )
  );

  // Top right curve
  contour.addEdge(
    new EdgeHolder(
      new Vector2(cx + scale * 0.4, cy),
      new Vector2(cx + scale * 0.8, cy - scale * 0.2),
      new Vector2(cx + scale * 0.8, cy - scale * 0.8),
      new Vector2(cx, cy - scale * 0.3),
      EdgeColor.WHITE
    )
  );

  shape.addContour(contour);
  return shape;
}

/**
 * Creates a star shape
 */
export function createStar(): Shape {
  const shape = new Shape();
  const contour = new Contour();

  const cx = 0.5,
    cy = 0.5;
  const outerR = 0.4;
  const innerR = 0.2;
  const points = 5;

  const vertices: Vector2[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    vertices.push(
      new Vector2(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
    );
  }

  // Create edges
  for (let i = 0; i < vertices.length; i++) {
    const next = (i + 1) % vertices.length;
    contour.addEdge(
      new EdgeHolder(vertices[i], vertices[next], EdgeColor.WHITE)
    );
  }

  shape.addContour(contour);
  return shape;
}

/**
 * Creates a letter-like shape (capital 'A')
 */
export function createLetterA(): Shape {
  const shape = new Shape();

  // Outer contour (main triangle)
  const outer = new Contour();
  outer.addEdge(
    new EdgeHolder(
      new Vector2(0.5, 0.1),
      new Vector2(0.9, 0.9),
      EdgeColor.WHITE
    )
  );
  outer.addEdge(
    new EdgeHolder(
      new Vector2(0.9, 0.9),
      new Vector2(0.1, 0.9),
      EdgeColor.WHITE
    )
  );
  outer.addEdge(
    new EdgeHolder(
      new Vector2(0.1, 0.9),
      new Vector2(0.5, 0.1),
      EdgeColor.WHITE
    )
  );
  shape.addContour(outer);

  // Inner contour (hole for the crossbar)
  const inner = new Contour();
  inner.addEdge(
    new EdgeHolder(
      new Vector2(0.4, 0.55),
      new Vector2(0.35, 0.7),
      EdgeColor.WHITE
    )
  );
  inner.addEdge(
    new EdgeHolder(
      new Vector2(0.35, 0.7),
      new Vector2(0.65, 0.7),
      EdgeColor.WHITE
    )
  );
  inner.addEdge(
    new EdgeHolder(
      new Vector2(0.65, 0.7),
      new Vector2(0.6, 0.55),
      EdgeColor.WHITE
    )
  );
  inner.addEdge(
    new EdgeHolder(
      new Vector2(0.6, 0.55),
      new Vector2(0.4, 0.55),
      EdgeColor.WHITE
    )
  );
  shape.addContour(inner);

  return shape;
}

/**
 * Generates all distance field types for a given shape
 */
export interface DistanceFieldSet {
  sdf: Bitmap<Float32Array, 1>;
  psdf: Bitmap<Float32Array, 1>;
  msdf: Bitmap<Float32Array, 3>;
  mtsdf: Bitmap<Float32Array, 4>;
}

export function generateAllDistanceFields(
  shape: Shape,
  size: number = 64
): DistanceFieldSet {
  // Apply edge coloring for MSDF
  edgeColoringSimple(shape, Math.PI, 0n);

  // Create transformation
  const padding = 2;
  const scale = size - padding * 2;
  const projection = new Projection(
    new Vector2(scale, scale),
    new Vector2(-padding / size, -padding / size)
  );
  const range = new Range(-2, 2);
  const transformation = new SDFTransformation(projection, range);

  // Generate all types
  const sdf = new Bitmap(Float32Array, 1, size, size);
  const psdf = new Bitmap(Float32Array, 1, size, size);
  const msdf = new Bitmap(Float32Array, 3, size, size);
  const mtsdf = new Bitmap(Float32Array, 4, size, size);

  generateSDF(sdf, shape, transformation);
  generatePSDF(psdf, shape, transformation);
  generateMSDF(msdf, shape, transformation);
  generateMTSDF(mtsdf, shape, transformation);

  return { sdf, psdf, msdf, mtsdf };
}

/**
 * Demo configuration
 */
export interface DemoShape {
  name: string;
  shape: Shape;
  description: string;
}

/**
 * Get all demo shapes
 */
export function getAllDemoShapes(): DemoShape[] {
  return [
    {
      name: "Square",
      shape: createSquare(),
      description: "Simple square with 4 linear edges",
    },
    {
      name: "Triangle",
      shape: createTriangle(),
      description: "Equilateral triangle with 3 linear edges",
    },
    {
      name: "Circle",
      shape: createCircle(),
      description: "Circle approximation using 4 quadratic Bezier curves",
    },
    {
      name: "Heart",
      shape: createHeart(),
      description: "Heart shape using cubic Bezier curves",
    },
    {
      name: "Star",
      shape: createStar(),
      description: "5-pointed star with 10 linear edges",
    },
    {
      name: "Letter A",
      shape: createLetterA(),
      description: "Letter A with inner and outer contours",
    },
  ];
}
