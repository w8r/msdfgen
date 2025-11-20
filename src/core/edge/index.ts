/**
 * Edge-related types and utilities for MSDFGEN
 */

export {
  EdgeColor,
  numChannels,
  hasRed,
  hasGreen,
  hasBlue,
  combineColors,
  intersectColors,
  complementColor,
  colorToString,
} from './EdgeColor';

export { solveQuadratic, solveCubic } from './equation-solver';

export {
  EdgeSegment,
  type SignedDistanceResult,
  type BoundingBox,
  type ScanlineIntersection,
} from './EdgeSegment';

export { LinearSegment } from './LinearSegment';
export { QuadraticSegment } from './QuadraticSegment';
export { CubicSegment } from './CubicSegment';
