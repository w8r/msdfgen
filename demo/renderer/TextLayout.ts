/**
 * TextLayout converts text strings to GPU-ready instance buffer data
 * using pretext for character positioning.
 */

import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';
import type { AtlasResult, GlyphInfo } from '../../src/atlas';

/**
 * Compute instance buffer data for rendering text
 *
 * @param text - Text string to render
 * @param fontSize - Font size in pixels
 * @param atlas - Generated MSDF atlas with glyph information
 * @param fontFamily - Font family name (e.g., "Inter", "OpenSans")
 * @returns Float32Array with instance data (20 floats per character: 16 for mat4 transform, 4 for uvBounds)
 */
export function computeTextInstances(
  text: string,
  fontSize: number,
  atlas: AtlasResult,
  fontFamily: string
): Float32Array {
  // Prepare text with pretext (expensive, should be cached)
  const fontString = `${fontSize}px ${fontFamily}`;
  const prepared = prepareWithSegments(text, fontString);

  // Layout text with unlimited width (single line for now)
  // Line height = fontSize * 1.2 (standard line spacing)
  const containerWidth = 10000; // Unlimited width for single-line layout
  const lineHeight = fontSize * 1.2;
  const { lines } = layoutWithLines(prepared, containerWidth, lineHeight);

  // Collect instance data for all characters
  const instances: number[] = [];

  for (const line of lines) {
    let cursorX = 0;
    const cursorY = 0; // Single line at Y=0 for now

    for (let i = 0; i < line.text.length; i++) {
      const char = line.text[i];

      // Skip whitespace or characters not in atlas
      if (char === ' ' || char === '\t' || char === '\n') {
        // Get space advance width if available, otherwise use fontSize * 0.25
        const spaceGlyph = atlas.glyphs.get(' ');
        const advanceWidth = spaceGlyph
          ? (spaceGlyph.advanceWidth / 1000) * fontSize
          : fontSize * 0.25;
        cursorX += advanceWidth;
        continue;
      }

      const glyphInfo = atlas.glyphs.get(char);
      if (!glyphInfo) {
        // Character not in atlas, skip
        continue;
      }

      // Get glyph bounds in em units (normalized to font's unitsPerEm)
      const { planeBounds, uvBounds, advanceWidth, leftSideBearing } =
        glyphInfo;

      // Calculate glyph dimensions in pixels
      // planeBounds are in normalized em units (0-1 range relative to font size)
      const glyphWidth =
        (planeBounds.right - planeBounds.left) * fontSize;
      const glyphHeight =
        (planeBounds.top - planeBounds.bottom) * fontSize;

      // Position glyph at cursor, accounting for glyph's origin
      // Apply left side bearing (horizontal offset)
      const posX = cursorX + planeBounds.left * fontSize;
      const posY = cursorY + planeBounds.bottom * fontSize;

      // Create transform matrix for this character
      // Column-major order for WebGPU:
      // [scaleX, 0, 0, 0, 0, scaleY, 0, 0, 0, 0, 1, 0, translateX, translateY, 0, 1]
      const transform = new Float32Array(16);

      // Column 0: X-axis scale
      transform[0] = glyphWidth;
      transform[1] = 0;
      transform[2] = 0;
      transform[3] = 0;

      // Column 1: Y-axis scale
      transform[4] = 0;
      transform[5] = glyphHeight;
      transform[6] = 0;
      transform[7] = 0;

      // Column 2: Z-axis (unused)
      transform[8] = 0;
      transform[9] = 0;
      transform[10] = 1;
      transform[11] = 0;

      // Column 3: Translation
      transform[12] = posX;
      transform[13] = posY;
      transform[14] = 0;
      transform[15] = 1;

      // Pack instance data: 16 floats (transform) + 4 floats (uvBounds)
      for (let j = 0; j < 16; j++) {
        instances.push(transform[j]);
      }

      instances.push(uvBounds.u0, uvBounds.v0, uvBounds.u1, uvBounds.v1);

      // Advance cursor by character's advance width
      // advanceWidth is in font units (unitsPerEm), convert to pixels
      cursorX += (advanceWidth / 1000) * fontSize;
    }
  }

  return new Float32Array(instances);
}
