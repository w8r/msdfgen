/**
 * Edge coloring algorithms for multi-channel signed distance field generation.
 *
 * These algorithms assign colors to edges of a shape to ensure that adjacent edges
 * (edges sharing a corner) have different colors, which is essential for MSDF quality.
 *
 * TypeScript port of msdfgen edge-coloring from core/edge-coloring.h/cpp
 * @author Viktor Chlumsky (original C++)
 */

import type { Shape } from '../shape/Shape';
import { EdgeColor } from '../edge/EdgeColor';
import type { Vector2 } from '../types/Vector2';
import { dotProduct, crossProduct } from '../types/Vector2';
import type { EdgeSegment } from '../edge/EdgeSegment';
import { EdgeHolder } from '../shape/EdgeHolder';

/** Precision for edge length estimation (number of samples) */
const EDGE_LENGTH_PRECISION = 4;

/** Precision for edge-to-edge distance calculation */
const EDGE_DISTANCE_PRECISION = 16;

/** Maximum recoloring iterations for graph coloring */
const MAX_RECOLOR_STEPS = 16;

/**
 * For each position < n, this function will return -1, 0, or 1,
 * depending on whether the position is closer to the beginning, middle, or end, respectively.
 * It is guaranteed that the output will be balanced in that the total for positions 0 through n-1 will be zero.
 */
function symmetricalTrichotomy(position: number, n: number): number {
  return Math.floor(3 + 2.875 * position / (n - 1) - 1.4375 + 0.5) - 3;
}

/**
 * Determines if two direction vectors form a corner
 * @param aDir - First direction vector
 * @param bDir - Second direction vector
 * @param crossThreshold - Threshold for cross product magnitude
 * @returns true if the vectors form a corner
 */
function isCorner(aDir: Vector2, bDir: Vector2, crossThreshold: number): boolean {
  return dotProduct(aDir, bDir) <= 0 || Math.abs(crossProduct(aDir, bDir)) > crossThreshold;
}

/**
 * Estimates the arc length of an edge segment using linear approximation
 * @param edge - The edge segment to measure
 * @returns Estimated length
 */
function estimateEdgeLength(edge: EdgeSegment): number {
  let len = 0;
  let prev = edge.point(0);
  for (let i = 1; i <= EDGE_LENGTH_PRECISION; i++) {
    const cur = edge.point(i / EDGE_LENGTH_PRECISION);
    len += cur.subtract(prev).length();
    prev = cur;
  }
  return len;
}

/**
 * Extracts a single bit from the seed (0 or 1) and advances the seed
 */
function seedExtract2(seed: { value: bigint }): number {
  const v = Number(seed.value & 1n);
  seed.value >>= 1n;
  return v;
}

/**
 * Extracts a trit from the seed (0, 1, or 2) and advances the seed
 */
function seedExtract3(seed: { value: bigint }): number {
  const v = Number(seed.value % 3n);
  seed.value /= 3n;
  return v;
}

/**
 * Initializes a color from the seed
 */
function initColor(seed: { value: bigint }): EdgeColor {
  const colors = [EdgeColor.CYAN, EdgeColor.MAGENTA, EdgeColor.YELLOW];
  return colors[seedExtract3(seed)];
}

/**
 * Switches the current color using the seed
 */
function switchColor(seed: { value: bigint }, currentColor: EdgeColor, banned?: EdgeColor): EdgeColor {
  if (banned !== undefined) {
    const combined = currentColor & banned;
    if (combined === EdgeColor.RED || combined === EdgeColor.GREEN || combined === EdgeColor.BLUE) {
      return (combined ^ EdgeColor.WHITE) as EdgeColor;
    }
  }

  const shifted = currentColor << (1 + seedExtract2(seed));
  return ((shifted | (shifted >> 3)) & EdgeColor.WHITE) as EdgeColor;
}

/**
 * Assigns colors to edges of the shape using a simple heuristic algorithm.
 * This is the fastest edge coloring strategy, suitable for most use cases.
 *
 * The algorithm identifies corners by angle threshold and assigns colors to ensure
 * that adjacent edges (meeting at corners) have different colors.
 *
 * @param shape - The shape to color (modified in place)
 * @param angleThreshold - Maximum angle in radians to be considered a corner (e.g., 3 ≈ 172°)
 * @param seed - Random seed for color selection (default: 0)
 */
export function edgeColoringSimple(shape: Shape, angleThreshold: number, seed: bigint = 0n): void {
  const crossThreshold = Math.sin(angleThreshold);
  const seedObj = { value: seed };
  let color = initColor(seedObj);
  const corners: number[] = [];

  for (const contour of shape.contours) {
    if (contour.edges.length === 0) {
      continue;
    }

    // Identify corners
    corners.length = 0;
    const lastEdge = contour.edges[contour.edges.length - 1].get();
    let prevDirection = lastEdge.direction(1);
    let index = 0;

    for (const edgeHolder of contour.edges) {
      const edge = edgeHolder.get();
      if (isCorner(prevDirection.normalize(true), edge.direction(0).normalize(true), crossThreshold)) {
        corners.push(index);
      }
      prevDirection = edge.direction(1);
      index++;
    }

    // Smooth contour (no corners)
    if (corners.length === 0) {
      color = switchColor(seedObj, color);
      for (const edgeHolder of contour.edges) {
        edgeHolder.get().color = color;
      }
    }
    // "Teardrop" case (single corner)
    else if (corners.length === 1) {
      const colors: EdgeColor[] = new Array(3);
      color = switchColor(seedObj, color);
      colors[0] = color;
      colors[1] = EdgeColor.WHITE;
      color = switchColor(seedObj, color);
      colors[2] = color;
      const corner = corners[0];

      if (contour.edges.length >= 3) {
        const m = contour.edges.length;
        for (let i = 0; i < m; i++) {
          contour.edges[(corner + i) % m].get().color = colors[1 + symmetricalTrichotomy(i, m)];
        }
      } else if (contour.edges.length >= 1) {
        // Less than three edge segments for three colors => edges must be split
        const parts: (EdgeSegment | null)[] = new Array(7).fill(null);
        const edge0Parts = contour.edges[0].get().splitInThirds();
        parts[0 + 3 * corner] = edge0Parts[0];
        parts[1 + 3 * corner] = edge0Parts[1];
        parts[2 + 3 * corner] = edge0Parts[2];

        if (contour.edges.length >= 2) {
          const edge1Parts = contour.edges[1].get().splitInThirds();
          parts[3 - 3 * corner] = edge1Parts[0];
          parts[4 - 3 * corner] = edge1Parts[1];
          parts[5 - 3 * corner] = edge1Parts[2];
          parts[0]!.color = parts[1]!.color = colors[0];
          parts[2]!.color = parts[3]!.color = colors[1];
          parts[4]!.color = parts[5]!.color = colors[2];
        } else {
          parts[0]!.color = colors[0];
          parts[1]!.color = colors[1];
          parts[2]!.color = colors[2];
        }

        contour.edges = [];
        for (const part of parts) {
          if (part) {
            contour.edges.push(new EdgeHolder(part));
          }
        }
      }
    }
    // Multiple corners
    else {
      const cornerCount = corners.length;
      let spline = 0;
      const start = corners[0];
      const m = contour.edges.length;
      color = switchColor(seedObj, color);
      const initialColor = color;

      for (let i = 0; i < m; i++) {
        const idx = (start + i) % m;
        if (spline + 1 < cornerCount && corners[spline + 1] === idx) {
          spline++;
          const bannedColor = (spline === cornerCount - 1) ? initialColor : EdgeColor.BLACK;
          color = switchColor(seedObj, color, bannedColor);
        }
        contour.edges[idx].get().color = color;
      }
    }
  }
}

/**
 * Corner data structure for ink trap coloring algorithm
 */
interface InkTrapCorner {
  /** Index of the corner in the contour */
  index: number;
  /** Estimated length of the edge segment before this corner */
  prevEdgeLengthEstimate: number;
  /** Whether this corner is a "minor" corner (ink trap) */
  minor: boolean;
  /** Color assigned to this corner */
  color: EdgeColor;
}

/**
 * The "ink trap" coloring strategy is designed for better results with typefaces
 * that use ink traps as a design feature.
 *
 * It guarantees that even if all edges that are shorter than both their neighboring
 * edges are removed, the coloring remains consistent with the established rules.
 * This prevents color conflicts when small details disappear at low resolutions.
 *
 * @param shape - The shape to color (modified in place)
 * @param angleThreshold - Maximum angle in radians to be considered a corner
 * @param seed - Random seed for color selection (default: 0)
 */
export function edgeColoringInkTrap(shape: Shape, angleThreshold: number, seed: bigint = 0n): void {
  const crossThreshold = Math.sin(angleThreshold);
  const seedObj = { value: seed };
  let color = initColor(seedObj);
  const corners: InkTrapCorner[] = [];

  for (const contour of shape.contours) {
    if (contour.edges.length === 0) {
      continue;
    }

    let splineLength = 0;

    // Identify corners
    corners.length = 0;
    const lastEdge = contour.edges[contour.edges.length - 1].get();
    let prevDirection = lastEdge.direction(1);
    let index = 0;

    for (const edgeHolder of contour.edges) {
      const edge = edgeHolder.get();
      if (isCorner(prevDirection.normalize(true), edge.direction(0).normalize(true), crossThreshold)) {
        corners.push({
          index,
          prevEdgeLengthEstimate: splineLength,
          minor: false,
          color: EdgeColor.BLACK,
        });
        splineLength = 0;
      }
      splineLength += estimateEdgeLength(edge);
      prevDirection = edge.direction(1);
      index++;
    }

    // Smooth contour (no corners)
    if (corners.length === 0) {
      color = switchColor(seedObj, color);
      for (const edgeHolder of contour.edges) {
        edgeHolder.get().color = color;
      }
    }
    // "Teardrop" case (single corner)
    else if (corners.length === 1) {
      const colors: EdgeColor[] = new Array(3);
      color = switchColor(seedObj, color);
      colors[0] = color;
      colors[1] = EdgeColor.WHITE;
      color = switchColor(seedObj, color);
      colors[2] = color;
      const corner = corners[0].index;

      if (contour.edges.length >= 3) {
        const m = contour.edges.length;
        for (let i = 0; i < m; i++) {
          contour.edges[(corner + i) % m].get().color = colors[1 + symmetricalTrichotomy(i, m)];
        }
      } else if (contour.edges.length >= 1) {
        // Less than three edge segments for three colors => edges must be split
        const parts: (EdgeSegment | null)[] = new Array(7).fill(null);
        const edge0Parts = contour.edges[0].get().splitInThirds();
        parts[0 + 3 * corner] = edge0Parts[0];
        parts[1 + 3 * corner] = edge0Parts[1];
        parts[2 + 3 * corner] = edge0Parts[2];

        if (contour.edges.length >= 2) {
          const edge1Parts = contour.edges[1].get().splitInThirds();
          parts[3 - 3 * corner] = edge1Parts[0];
          parts[4 - 3 * corner] = edge1Parts[1];
          parts[5 - 3 * corner] = edge1Parts[2];
          parts[0]!.color = parts[1]!.color = colors[0];
          parts[2]!.color = parts[3]!.color = colors[1];
          parts[4]!.color = parts[5]!.color = colors[2];
        } else {
          parts[0]!.color = colors[0];
          parts[1]!.color = colors[1];
          parts[2]!.color = colors[2];
        }

        contour.edges = [];
        for (const part of parts) {
          if (part) {
            contour.edges.push(new EdgeHolder(part));
          }
        }
      }
    }
    // Multiple corners
    else {
      const cornerCount = corners.length;
      let majorCornerCount = cornerCount;

      // Identify minor corners (ink traps)
      if (cornerCount > 3) {
        corners[0].prevEdgeLengthEstimate += splineLength;
        for (let i = 0; i < cornerCount; i++) {
          const prev = corners[i].prevEdgeLengthEstimate;
          const next = corners[(i + 1) % cornerCount].prevEdgeLengthEstimate;
          const nextNext = corners[(i + 2) % cornerCount].prevEdgeLengthEstimate;

          if (prev > next && next < nextNext) {
            corners[(i + 1) % cornerCount].minor = true;
            majorCornerCount--;
          }
        }
      }

      // Color major corners first
      let initialColor = EdgeColor.BLACK;
      for (let i = 0; i < cornerCount; i++) {
        if (!corners[i].minor) {
          majorCornerCount--;
          const bannedColor = majorCornerCount === 0 ? initialColor : EdgeColor.BLACK;
          color = switchColor(seedObj, color, bannedColor);
          corners[i].color = color;
          if (initialColor === EdgeColor.BLACK) {
            initialColor = color;
          }
        }
      }

      // Color minor corners based on adjacent major corners
      for (let i = 0; i < cornerCount; i++) {
        if (corners[i].minor) {
          const nextColor = corners[(i + 1) % cornerCount].color;
          corners[i].color = ((color & nextColor) ^ EdgeColor.WHITE) as EdgeColor;
        } else {
          color = corners[i].color;
        }
      }

      // Apply colors to edges
      let spline = 0;
      const start = corners[0].index;
      color = corners[0].color;
      const m = contour.edges.length;

      for (let i = 0; i < m; i++) {
        const idx = (start + i) % m;
        if (spline + 1 < cornerCount && corners[spline + 1].index === idx) {
          color = corners[++spline].color;
        }
        contour.edges[idx].get().color = color;
      }
    }
  }
}

/**
 * Calculates the minimum distance between two edge segments
 * @param a - First edge segment
 * @param b - Second edge segment
 * @param precision - Number of sample points to test
 * @returns Minimum distance between the edges
 */
function edgeToEdgeDistance(a: EdgeSegment, b: EdgeSegment, precision: number): number {
  // Edges sharing an endpoint have zero distance
  const a0 = a.point(0);
  const a1 = a.point(1);
  const b0 = b.point(0);
  const b1 = b.point(1);

  if (a0.equals(b0) || a0.equals(b1) || a1.equals(b0) || a1.equals(b1)) {
    return 0;
  }

  const iFac = 1 / precision;
  let minDistance = b0.subtract(a0).length();

  // Sample points on edge b and find distance to edge a
  for (let i = 0; i <= precision; i++) {
    const t = iFac * i;
    const d = Math.abs(a.signedDistance(b.point(t)).distance.distance);
    minDistance = Math.min(minDistance, d);
  }

  // Sample points on edge a and find distance to edge b
  for (let i = 0; i <= precision; i++) {
    const t = iFac * i;
    const d = Math.abs(b.signedDistance(a.point(t)).distance.distance);
    minDistance = Math.min(minDistance, d);
  }

  return minDistance;
}

/**
 * Calculates the minimum distance between two splines (sequences of edges)
 */
function splineToSplineDistance(
  edgeSegments: EdgeSegment[],
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  precision: number
): number {
  let minDistance = Number.MAX_VALUE;

  for (let ai = aStart; ai < aEnd; ai++) {
    for (let bi = bStart; bi < bEnd && minDistance > 0; bi++) {
      const d = edgeToEdgeDistance(edgeSegments[ai], edgeSegments[bi], precision);
      minDistance = Math.min(minDistance, d);
    }
  }

  return minDistance;
}

/**
 * Colors a graph where vertices can have edges to other vertices that share an edge with them.
 * Uses a greedy coloring algorithm with 3 colors (0, 1, 2).
 */
function colorSecondDegreeGraph(
  coloring: number[],
  edgeMatrix: number[][],
  vertexCount: number,
  seed: { value: bigint }
): void {
  for (let i = 0; i < vertexCount; i++) {
    let possibleColors = 7; // All 3 colors available (0b111)

    // Remove colors used by neighbors
    for (let j = 0; j < i; j++) {
      if (edgeMatrix[i][j]) {
        possibleColors &= ~(1 << coloring[j]);
      }
    }

    let color = 0;
    switch (possibleColors) {
      case 1: // Only color 0 available
        color = 0;
        break;
      case 2: // Only color 1 available
        color = 1;
        break;
      case 3: // Colors 0 or 1 available
        color = seedExtract2(seed);
        break;
      case 4: // Only color 2 available
        color = 2;
        break;
      case 5: // Colors 0 or 2 available
        color = seedExtract2(seed) === 0 ? 0 : 2;
        break;
      case 6: // Colors 1 or 2 available
        color = seedExtract2(seed) + 1;
        break;
      case 7: // All colors available
        color = (seedExtract3(seed) + i) % 3;
        break;
    }

    coloring[i] = color;
  }
}

/**
 * Returns which colors are still available for a vertex given its neighbors' colors
 */
function vertexPossibleColors(coloring: number[], edgeVector: number[], vertexCount: number): number {
  let usedColors = 0;
  for (let i = 0; i < vertexCount; i++) {
    if (edgeVector[i]) {
      usedColors |= 1 << coloring[i];
    }
  }
  return 7 & ~usedColors;
}

/**
 * Uncolors all neighbors of a vertex that have the same color
 */
function uncolorSameNeighbors(
  uncolored: number[],
  coloring: number[],
  edgeMatrix: number[][],
  vertex: number,
  vertexCount: number
): void {
  for (let i = vertex + 1; i < vertexCount; i++) {
    if (edgeMatrix[vertex][i] && coloring[i] === coloring[vertex]) {
      coloring[i] = -1;
      uncolored.push(i);
    }
  }
  for (let i = 0; i < vertex; i++) {
    if (edgeMatrix[vertex][i] && coloring[i] === coloring[vertex]) {
      coloring[i] = -1;
      uncolored.push(i);
    }
  }
}

/**
 * Tries to add an edge to the graph and recolor if necessary
 */
function tryAddEdge(
  coloring: number[],
  edgeMatrix: number[][],
  vertexCount: number,
  vertexA: number,
  vertexB: number,
  coloringBuffer: number[]
): boolean {
  const FIRST_POSSIBLE_COLOR = [-1, 0, 1, 0, 2, 2, 1, 0];

  edgeMatrix[vertexA][vertexB] = 1;
  edgeMatrix[vertexB][vertexA] = 1;

  if (coloring[vertexA] !== coloring[vertexB]) {
    return true;
  }

  const bPossibleColors = vertexPossibleColors(coloring, edgeMatrix[vertexB], vertexCount);
  if (bPossibleColors !== 0) {
    coloring[vertexB] = FIRST_POSSIBLE_COLOR[bPossibleColors];
    return true;
  }

  // Copy coloring to buffer for trial recoloring
  for (let i = 0; i < vertexCount; i++) {
    coloringBuffer[i] = coloring[i];
  }

  const uncolored: number[] = [];
  coloringBuffer[vertexB] = FIRST_POSSIBLE_COLOR[7 & ~(1 << coloringBuffer[vertexA])];
  uncolorSameNeighbors(uncolored, coloringBuffer, edgeMatrix, vertexB, vertexCount);

  let step = 0;
  while (uncolored.length > 0 && step < MAX_RECOLOR_STEPS) {
    const i = uncolored.shift()!;
    const possibleColors = vertexPossibleColors(coloringBuffer, edgeMatrix[i], vertexCount);

    if (possibleColors !== 0) {
      coloringBuffer[i] = FIRST_POSSIBLE_COLOR[possibleColors];
      continue;
    }

    do {
      coloringBuffer[i] = step++ % 3;
    } while (edgeMatrix[i][vertexA] && coloringBuffer[i] === coloringBuffer[vertexA]);

    uncolorSameNeighbors(uncolored, coloringBuffer, edgeMatrix, i, vertexCount);
  }

  if (uncolored.length > 0) {
    // Failed to recolor, remove the edge
    edgeMatrix[vertexA][vertexB] = 0;
    edgeMatrix[vertexB][vertexA] = 0;
    return false;
  }

  // Success, commit the recoloring
  for (let i = 0; i < vertexCount; i++) {
    coloring[i] = coloringBuffer[i];
  }
  return true;
}

/**
 * The alternative coloring by distance tries to use different colors for edges
 * that are close together.
 *
 * This should theoretically be the best strategy on average. However, since it needs
 * to compute the distance between all pairs of edges and perform a graph optimization
 * task, it is much slower than the other methods.
 *
 * @param shape - The shape to color (modified in place)
 * @param angleThreshold - Maximum angle in radians to be considered a corner
 * @param seed - Random seed for color selection (default: 0)
 */
export function edgeColoringByDistance(shape: Shape, angleThreshold: number, seed: bigint = 0n): void {
  const edgeSegments: EdgeSegment[] = [];
  const splineStarts: number[] = [];
  const crossThreshold = Math.sin(angleThreshold);
  const corners: number[] = [];

  // Segment the shape into splines (edge sequences between corners)
  for (const contour of shape.contours) {
    if (contour.edges.length === 0) {
      continue;
    }

    // Identify corners
    corners.length = 0;
    const lastEdge = contour.edges[contour.edges.length - 1].get();
    let prevDirection = lastEdge.direction(1);
    let index = 0;

    for (const edgeHolder of contour.edges) {
      const edge = edgeHolder.get();
      if (isCorner(prevDirection.normalize(true), edge.direction(0).normalize(true), crossThreshold)) {
        corners.push(index);
      }
      prevDirection = edge.direction(1);
      index++;
    }

    splineStarts.push(edgeSegments.length);

    // Smooth contour
    if (corners.length === 0) {
      for (const edgeHolder of contour.edges) {
        edgeSegments.push(edgeHolder.get());
      }
    }
    // "Teardrop" case
    else if (corners.length === 1) {
      const corner = corners[0];
      if (contour.edges.length >= 3) {
        const m = contour.edges.length;
        for (let i = 0; i < m; i++) {
          if (i === Math.floor(m / 2)) {
            splineStarts.push(edgeSegments.length);
          }
          const tri = symmetricalTrichotomy(i, m);
          if (tri !== 0) {
            edgeSegments.push(contour.edges[(corner + i) % m].get());
          } else {
            contour.edges[(corner + i) % m].get().color = EdgeColor.WHITE;
          }
        }
      } else if (contour.edges.length >= 1) {
        // Less than three edge segments for three colors => edges must be split
        const parts: (EdgeSegment | null)[] = new Array(7).fill(null);
        const edge0Parts = contour.edges[0].get().splitInThirds();
        parts[0 + 3 * corner] = edge0Parts[0];
        parts[1 + 3 * corner] = edge0Parts[1];
        parts[2 + 3 * corner] = edge0Parts[2];

        if (contour.edges.length >= 2) {
          const edge1Parts = contour.edges[1].get().splitInThirds();
          parts[3 - 3 * corner] = edge1Parts[0];
          parts[4 - 3 * corner] = edge1Parts[1];
          parts[5 - 3 * corner] = edge1Parts[2];
          edgeSegments.push(parts[0]!);
          edgeSegments.push(parts[1]!);
          parts[2]!.color = parts[3]!.color = EdgeColor.WHITE;
          splineStarts.push(edgeSegments.length);
          edgeSegments.push(parts[4]!);
          edgeSegments.push(parts[5]!);
        } else {
          edgeSegments.push(parts[0]!);
          parts[1]!.color = EdgeColor.WHITE;
          splineStarts.push(edgeSegments.length);
          edgeSegments.push(parts[2]!);
        }

        contour.edges = [];
        for (const part of parts) {
          if (part) {
            contour.edges.push(new EdgeHolder(part));
          }
        }
      }
    }
    // Multiple corners
    else {
      const cornerCount = corners.length;
      let spline = 0;
      const start = corners[0];
      const m = contour.edges.length;

      for (let i = 0; i < m; i++) {
        const idx = (start + i) % m;
        if (spline + 1 < cornerCount && corners[spline + 1] === idx) {
          splineStarts.push(edgeSegments.length);
          spline++;
        }
        edgeSegments.push(contour.edges[idx].get());
      }
    }
  }

  splineStarts.push(edgeSegments.length);

  const segmentCount = edgeSegments.length;
  const splineCount = splineStarts.length - 1;

  if (splineCount === 0) {
    return;
  }

  // Build distance matrix between all splines
  const distanceMatrix: number[][] = [];
  for (let i = 0; i < splineCount; i++) {
    distanceMatrix[i] = new Array(splineCount);
  }

  for (let i = 0; i < splineCount; i++) {
    distanceMatrix[i][i] = -1;
    for (let j = i + 1; j < splineCount; j++) {
      const dist = splineToSplineDistance(
        edgeSegments,
        splineStarts[i],
        splineStarts[i + 1],
        splineStarts[j],
        splineStarts[j + 1],
        EDGE_DISTANCE_PRECISION
      );
      distanceMatrix[i][j] = dist;
      distanceMatrix[j][i] = dist;
    }
  }

  // Distance matrix is now computed correctly with adjacent splines having zero distance

  // Create sorted list of graph edges by distance
  const graphEdgeDistances: { distance: number; i: number; j: number }[] = [];
  for (let i = 0; i < splineCount; i++) {
    for (let j = i + 1; j < splineCount; j++) {
      graphEdgeDistances.push({ distance: distanceMatrix[i][j], i, j });
    }
  }

  graphEdgeDistances.sort((a, b) => a.distance - b.distance);

  // Build adjacency matrix
  const edgeMatrix: number[][] = [];
  for (let i = 0; i < splineCount; i++) {
    edgeMatrix[i] = new Array(splineCount).fill(0);
  }

  // Add zero-distance edges first (these must be in the graph)
  let nextEdge = 0;
  while (nextEdge < graphEdgeDistances.length && graphEdgeDistances[nextEdge].distance === 0) {
    const { i, j } = graphEdgeDistances[nextEdge];
    edgeMatrix[i][j] = 1;
    edgeMatrix[j][i] = 1;
    nextEdge++;
  }

  // Initial coloring
  const seedObj = { value: seed };
  const coloring = new Array(splineCount).fill(0);
  const coloringBuffer = new Array(splineCount).fill(0);
  colorSecondDegreeGraph(coloring, edgeMatrix, splineCount, seedObj);

  // Try to add remaining edges in order of distance
  for (; nextEdge < graphEdgeDistances.length; nextEdge++) {
    const { i, j } = graphEdgeDistances[nextEdge];
    tryAddEdge(coloring, edgeMatrix, splineCount, i, j, coloringBuffer);
  }

  // Apply colors to edge segments
  const colors = [EdgeColor.YELLOW, EdgeColor.CYAN, EdgeColor.MAGENTA];
  let spline = -1;
  for (let i = 0; i < segmentCount; i++) {
    if (splineStarts[spline + 1] === i) {
      spline++;
    }
    edgeSegments[i].color = colors[coloring[spline]];
  }
}
