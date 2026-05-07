import type { Shape } from '../core/shape/Shape';

/**
 * Font metrics extracted from the font file
 */
export interface FontMetrics {
  /** Units per em (typically 1000 or 2048) */
  readonly unitsPerEm: number;
  /** Ascender height in font units */
  readonly ascender: number;
  /** Descender depth in font units (typically negative) */
  readonly descender: number;
  /** Line gap in font units */
  readonly lineGap: number;
}

/**
 * Metrics for an individual glyph
 */
export interface GlyphMetrics {
  /** Horizontal advance width in font units */
  readonly advanceWidth: number;
  /** Left side bearing in font units */
  readonly leftSideBearing: number;
}

/**
 * A glyph extracted from a font, ready for MSDF generation
 */
export interface Glyph {
  /** Glyph metrics */
  readonly metrics: GlyphMetrics;
  /** Convert glyph outline to Shape for MSDF generation */
  toShape(): Shape;
}

/**
 * A parsed font with glyph access
 */
export interface Font {
  /** Font-level metrics */
  readonly metrics: FontMetrics;

  /**
   * Get a glyph by character
   * @param char - Single character to look up
   * @returns Glyph if found, null if character not in font
   */
  getGlyph(char: string): Glyph | null;

  /**
   * Check if font contains a glyph for a character
   * @param char - Single character to check
   */
  hasGlyph(char: string): boolean;
}
