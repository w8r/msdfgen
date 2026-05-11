import type { Bitmap } from '../core/bitmap/Bitmap';

/**
 * Configuration for atlas generation
 */
export interface AtlasConfig {
  /** Glyph bitmap size in pixels (default: 32) */
  glyphSize?: number;
  /** Padding between glyphs in pixels (default: 2) */
  padding?: number;
  /** SDF distance range in pixels (default: 4) */
  distanceRange?: number;
}

/**
 * Information about a single glyph in the atlas
 */
export interface GlyphInfo {
  /** Atlas position in pixels */
  atlasBounds: {
    left: number;
    bottom: number;
    right: number;
    top: number;
  };
  /** Normalized UV coordinates (0-1 range, GPU-ready) */
  uvBounds: {
    u0: number;
    v0: number;
    u1: number;
    v1: number;
  };
  /** Glyph bounds in em units (normalized to unitsPerEm) */
  planeBounds: {
    left: number;
    bottom: number;
    right: number;
    top: number;
  };
  /** Advance width in font units */
  advanceWidth: number;
  /** Left side bearing in font units */
  leftSideBearing: number;
}

/**
 * Result of atlas generation
 */
export interface AtlasResult {
  /** The generated MSDF atlas bitmap */
  atlas: Bitmap<Float32Array, 3>;
  /** Glyph information keyed by character */
  glyphs: Map<string, GlyphInfo>;
  /** Time taken to generate the atlas in milliseconds */
  generationTimeMs: number;
  /** Atlas width in pixels */
  atlasWidth: number;
  /** Atlas height in pixels */
  atlasHeight: number;
}
