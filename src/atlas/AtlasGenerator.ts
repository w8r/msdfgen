import potpack from 'potpack';
import type { Font } from '../font/types';
import type { AtlasConfig, AtlasResult, GlyphInfo } from './types';
import { Bitmap } from '../core/bitmap/Bitmap';
import { generateMSDF } from '../core/generators/msdfgen';
import { SDFTransformation } from '../core/generators/SDFTransformation';
import { Projection } from '../core/types/Projection';
import { Range } from '../core/types/Range';
import { Vector2 } from '../core/types/Vector2';
import { edgeColoringSimple } from '../core/edge-coloring/edge-coloring';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<AtlasConfig> = {
  glyphSize: 32,
  padding: 2,
  distanceRange: 4,
};

/**
 * Box type for potpack (extended with character info)
 */
interface Box {
  w: number;
  h: number;
  x?: number;
  y?: number;
  char: string;
}

/**
 * Rounds up to the next power of two
 */
function nextPowerOfTwo(n: number): number {
  return 1 << Math.ceil(Math.log2(n));
}

/**
 * Generates a MSDF atlas for multiple glyphs from a font.
 *
 * Creates a texture atlas containing multi-channel signed distance field (MSDF)
 * representations of glyphs. The atlas uses power-of-two dimensions for GPU compatibility,
 * and includes normalized UV coordinates ready for shader sampling.
 *
 * @param font - The font to generate glyphs from (loaded via `loadFont` or `parseFont`)
 * @param chars - String containing characters to include in the atlas (duplicates are automatically removed)
 * @param config - Optional configuration for atlas generation
 * @param config.glyphSize - Size of each glyph in pixels (default: 32)
 * @param config.padding - Padding between glyphs in pixels (default: 2)
 * @param config.distanceRange - SDF distance range in pixels (default: 4)
 * @returns Atlas result containing the bitmap, glyph info, and metadata
 *
 * @example
 * ```typescript
 * import { loadFont, generateAtlas } from 'msdfgen-ts';
 *
 * const font = await loadFont('path/to/font.ttf');
 * const atlas = generateAtlas(font, 'ABCabc123', {
 *   glyphSize: 32,
 *   padding: 2,
 *   distanceRange: 4
 * });
 *
 * console.log(`Atlas: ${atlas.atlasWidth}x${atlas.atlasHeight}px`);
 * console.log(`Generated in ${atlas.generationTimeMs}ms`);
 *
 * // Access glyph info for rendering
 * const glyphA = atlas.glyphs.get('A');
 * console.log('UV bounds:', glyphA.uvBounds);
 * console.log('Advance width:', glyphA.advanceWidth);
 * ```
 */
export function generateAtlas(
  font: Font,
  chars: string,
  config: AtlasConfig = {}
): AtlasResult {
  const startTime = performance.now();

  // Merge with defaults
  const cfg: Required<AtlasConfig> = {
    glyphSize: config.glyphSize ?? DEFAULT_CONFIG.glyphSize,
    padding: config.padding ?? DEFAULT_CONFIG.padding,
    distanceRange: config.distanceRange ?? DEFAULT_CONFIG.distanceRange,
  };

  // 1. Deduplicate and validate characters
  const charSet = new Set<string>();
  for (let i = 0; i < chars.length; i++) {
    charSet.add(chars[i]);
  }
  const uniqueChars = Array.from(charSet).filter(char => font.hasGlyph(char));

  // 2. Prepare boxes for potpack
  const cellSize = cfg.glyphSize + cfg.padding * 2;
  const boxes: Box[] = uniqueChars.map(char => ({
    w: cellSize,
    h: cellSize,
    char,
  }));

  // Handle empty input
  if (boxes.length === 0) {
    return {
      atlas: new Bitmap(Float32Array, 3, 1, 1),
      glyphs: new Map(),
      generationTimeMs: performance.now() - startTime,
      atlasWidth: 1,
      atlasHeight: 1,
    };
  }

  // 3. Run potpack
  const { w: packedWidth, h: packedHeight } = potpack(boxes);

  // 4. Round to power of two
  const atlasWidth = nextPowerOfTwo(packedWidth);
  const atlasHeight = nextPowerOfTwo(packedHeight);

  // 5. Allocate atlas bitmap
  const atlas = new Bitmap(Float32Array, 3, atlasWidth, atlasHeight);
  // Fill with neutral SDF value (0.5)
  atlas.fill(0.5);

  // 6. Generate MSDFs and compose atlas
  const glyphs = new Map<string, GlyphInfo>();

  for (const box of boxes) {
    const glyph = font.getGlyph(box.char);
    if (!glyph) continue;

    const shape = glyph.toShape();
    const bounds = shape.getBounds();

    // Content area (excluding padding)
    const contentX = box.x! + cfg.padding;
    const contentY = box.y! + cfg.padding;

    // Check if glyph has contours (skip empty glyphs like space)
    const hasContours = shape.contours.length > 0;

    if (hasContours) {
      // Apply edge coloring for MSDF
      edgeColoringSimple(shape, Math.PI, BigInt(0));

      // Compute transformation to fit glyph in cell
      const margin = cfg.distanceRange;
      const availableSize = cfg.glyphSize - 2 * margin;
      const shapeWidth = bounds.r - bounds.l;
      const shapeHeight = bounds.t - bounds.b;

      // Handle zero-size shapes
      const scale = shapeWidth > 0 && shapeHeight > 0
        ? Math.min(availableSize / shapeWidth, availableSize / shapeHeight)
        : 1;

      // Center shape in glyph bitmap
      const translateX = margin / scale - bounds.l + (availableSize / scale - shapeWidth) / 2;
      const translateY = margin / scale - bounds.b + (availableSize / scale - shapeHeight) / 2;

      const projection = new Projection(
        new Vector2(scale, scale),
        new Vector2(translateX, translateY)
      );
      const range = new Range(-cfg.distanceRange / scale, cfg.distanceRange / scale);
      const transformation = new SDFTransformation(projection, range);

      // Generate MSDF into temporary bitmap
      const glyphBitmap = new Bitmap(Float32Array, 3, cfg.glyphSize, cfg.glyphSize);
      glyphBitmap.fill(0.5);
      generateMSDF(glyphBitmap, shape, transformation);

      // Copy to atlas
      for (let y = 0; y < cfg.glyphSize; y++) {
        for (let x = 0; x < cfg.glyphSize; x++) {
          const srcPixel = glyphBitmap.getPixel(x, y);
          atlas.setPixel(contentX + x, contentY + y, srcPixel);
        }
      }
    }

    // Create GlyphInfo
    const unitsPerEm = font.metrics.unitsPerEm;
    const glyphInfo: GlyphInfo = {
      atlasBounds: {
        left: contentX,
        bottom: contentY,
        right: contentX + cfg.glyphSize,
        top: contentY + cfg.glyphSize,
      },
      uvBounds: {
        u0: contentX / atlasWidth,
        v0: 1 - (contentY + cfg.glyphSize) / atlasHeight, // Flip Y for OpenGL
        u1: (contentX + cfg.glyphSize) / atlasWidth,
        v1: 1 - contentY / atlasHeight,
      },
      planeBounds: {
        left: bounds.l / unitsPerEm,
        bottom: bounds.b / unitsPerEm,
        right: bounds.r / unitsPerEm,
        top: bounds.t / unitsPerEm,
      },
      advanceWidth: glyph.metrics.advanceWidth,
      leftSideBearing: glyph.metrics.leftSideBearing,
    };

    glyphs.set(box.char, glyphInfo);
  }

  const generationTimeMs = performance.now() - startTime;

  return {
    atlas,
    glyphs,
    generationTimeMs,
    atlasWidth,
    atlasHeight,
  };
}
