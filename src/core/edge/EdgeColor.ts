/**
 * Edge color specifies which color channels an edge belongs to.
 * Colors are represented as bitwise flags where:
 * - Bit 0 (1) = RED
 * - Bit 1 (2) = GREEN
 * - Bit 2 (4) = BLUE
 *
 * Combinations of these bits create the other colors.
 *
 * TypeScript port of msdfgen::EdgeColor from core/EdgeColor.h
 * @author Viktor Chlumsky (original C++)
 */
export enum EdgeColor {
  /** No color (0b000) */
  BLACK = 0,
  /** Red channel only (0b001) */
  RED = 1,
  /** Green channel only (0b010) */
  GREEN = 2,
  /** Red + Green (0b011) */
  YELLOW = 3,
  /** Blue channel only (0b100) */
  BLUE = 4,
  /** Red + Blue (0b101) */
  MAGENTA = 5,
  /** Green + Blue (0b110) */
  CYAN = 6,
  /** All channels (0b111) */
  WHITE = 7,
}

/**
 * Returns the number of color channels in an EdgeColor
 */
export function numChannels(color: EdgeColor): number {
  let count = 0;
  if (color & EdgeColor.RED) count++;
  if (color & EdgeColor.GREEN) count++;
  if (color & EdgeColor.BLUE) count++;
  return count;
}

/**
 * Checks if a color contains the red channel
 */
export function hasRed(color: EdgeColor): boolean {
  return (color & EdgeColor.RED) !== 0;
}

/**
 * Checks if a color contains the green channel
 */
export function hasGreen(color: EdgeColor): boolean {
  return (color & EdgeColor.GREEN) !== 0;
}

/**
 * Checks if a color contains the blue channel
 */
export function hasBlue(color: EdgeColor): boolean {
  return (color & EdgeColor.BLUE) !== 0;
}

/**
 * Combines two colors using bitwise OR
 */
export function combineColors(a: EdgeColor, b: EdgeColor): EdgeColor {
  return (a | b) as EdgeColor;
}

/**
 * Returns the intersection of two colors using bitwise AND
 */
export function intersectColors(a: EdgeColor, b: EdgeColor): EdgeColor {
  return (a & b) as EdgeColor;
}

/**
 * Returns the complement of a color (inverts all channels)
 */
export function complementColor(color: EdgeColor): EdgeColor {
  return (color ^ EdgeColor.WHITE) as EdgeColor;
}

/**
 * Returns a string representation of the color for debugging
 */
export function colorToString(color: EdgeColor): string {
  switch (color) {
    case EdgeColor.BLACK: return 'BLACK';
    case EdgeColor.RED: return 'RED';
    case EdgeColor.GREEN: return 'GREEN';
    case EdgeColor.YELLOW: return 'YELLOW';
    case EdgeColor.BLUE: return 'BLUE';
    case EdgeColor.MAGENTA: return 'MAGENTA';
    case EdgeColor.CYAN: return 'CYAN';
    case EdgeColor.WHITE: return 'WHITE';
    default: return `UNKNOWN(${color})`;
  }
}
