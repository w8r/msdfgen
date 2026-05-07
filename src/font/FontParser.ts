import type { Font, Glyph, FontMetrics, GlyphMetrics } from './types';
import { glyphPathToShape, type PathCommand } from './GlyphConverter';
import { Shape } from '../core/shape/Shape';

/**
 * Parse a font file buffer and return a Font object
 * @param buffer - ArrayBuffer containing TTF or OTF font data
 * @returns Promise resolving to Font object
 * @throws Error if opentype.js is not installed or font parsing fails
 */
export async function parseFont(buffer: ArrayBuffer): Promise<Font> {
  // Dynamic import to make opentype.js optional
  const opentype = await import('opentype.js');
  const otFont = opentype.parse(buffer);

  return new OpentypeFont(otFont);
}

/**
 * Load a font from a URL
 * @param url - URL to fetch font from
 * @returns Promise resolving to Font object
 */
export async function loadFont(url: string): Promise<Font> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return parseFont(buffer);
}

/**
 * Internal Font implementation wrapping opentype.js
 */
class OpentypeFont implements Font {
  private readonly otFont: import('opentype.js').Font;

  readonly metrics: FontMetrics;

  constructor(otFont: import('opentype.js').Font) {
    this.otFont = otFont;
    this.metrics = {
      unitsPerEm: otFont.unitsPerEm,
      ascender: otFont.ascender,
      descender: otFont.descender,
      lineGap: (otFont.tables as unknown as { os2?: { sTypoLineGap?: number } })?.os2?.sTypoLineGap ?? 0,
    };
  }

  getGlyph(char: string): Glyph | null {
    const glyph = this.otFont.charToGlyph(char);
    // Index 0 is .notdef (missing glyph)
    if (!glyph || glyph.index === 0) {
      return null;
    }
    return new OpentypeGlyph(glyph, this.otFont);
  }

  hasGlyph(char: string): boolean {
    const glyph = this.otFont.charToGlyph(char);
    return glyph && glyph.index !== 0;
  }
}

/**
 * Internal Glyph implementation wrapping opentype.js Glyph
 */
class OpentypeGlyph implements Glyph {
  private readonly otGlyph: import('opentype.js').Glyph;
  private readonly otFont: import('opentype.js').Font;

  readonly metrics: GlyphMetrics;

  constructor(otGlyph: import('opentype.js').Glyph, otFont: import('opentype.js').Font) {
    this.otGlyph = otGlyph;
    this.otFont = otFont;
    this.metrics = {
      advanceWidth: otGlyph.advanceWidth ?? 0,
      leftSideBearing: otGlyph.leftSideBearing ?? 0,
    };
  }

  toShape(): Shape {
    // Get path at 1:1 scale (font units)
    const path = this.otGlyph.getPath(0, 0, this.otFont.unitsPerEm);
    const commands = path.commands as PathCommand[];
    return glyphPathToShape(commands);
  }
}
