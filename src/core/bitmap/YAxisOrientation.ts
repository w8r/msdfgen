/**
 * Specifies whether the Y component of the coordinate system increases in the upward or downward direction.
 *
 * TypeScript port of msdfgen::YAxisOrientation from core/YAxisOrientation.h
 * @author Viktor Chlumsky (original C++)
 */
export const enum YAxisOrientation {
  /** Y coordinate increases upward (mathematical convention) */
  Y_UPWARD = 0,
  /** Y coordinate increases downward (screen/image convention) */
  Y_DOWNWARD = 1,
}

/** Default Y-axis orientation for bitmaps */
export const DEFAULT_Y_AXIS_ORIENTATION = YAxisOrientation.Y_UPWARD;
