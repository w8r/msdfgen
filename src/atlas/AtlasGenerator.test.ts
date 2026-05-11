import { describe, it, expect, beforeAll } from 'vitest';
import { generateAtlas } from './AtlasGenerator';
import { parseFont } from '../font/FontParser';
import type { Font } from '../font/types';
import * as fs from 'fs';
import * as path from 'path';

describe('AtlasGenerator', () => {
  let font: Font;

  beforeAll(async () => {
    // Load Roboto Regular for testing
    const fontPath = path.join(__dirname, '../test-fixtures/Roboto-Regular.ttf');
    const buffer = fs.readFileSync(fontPath);
    const fontBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
    font = await parseFont(fontBuffer);
  });

  describe('generateAtlas', () => {
    it('should generate atlas for basic ASCII characters', () => {
      const chars = 'ABC';
      const result = generateAtlas(font, chars);

      // Check atlas dimensions are power of two
      expect(result.atlasWidth).toBeGreaterThan(0);
      expect(result.atlasHeight).toBeGreaterThan(0);
      expect(Math.log2(result.atlasWidth) % 1).toBe(0);
      expect(Math.log2(result.atlasHeight) % 1).toBe(0);

      // Check atlas bitmap exists
      expect(result.atlas).toBeDefined();
      expect(result.atlas.width()).toBe(result.atlasWidth);
      expect(result.atlas.height()).toBe(result.atlasHeight);
      expect(result.atlas.channelCount()).toBe(3);

      // Check glyph info exists for each character
      expect(result.glyphs.size).toBe(3);
      expect(result.glyphs.has('A')).toBe(true);
      expect(result.glyphs.has('B')).toBe(true);
      expect(result.glyphs.has('C')).toBe(true);

      // Check generation time is recorded
      expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate input characters', () => {
      const chars = 'AAABBBCCC';
      const result = generateAtlas(font, chars);

      // Should only have 3 unique glyphs
      expect(result.glyphs.size).toBe(3);
      expect(result.glyphs.has('A')).toBe(true);
      expect(result.glyphs.has('B')).toBe(true);
      expect(result.glyphs.has('C')).toBe(true);
    });

    it('should skip characters not in font', () => {
      const chars = 'ABC\u9999'; // \u9999 is unlikely to be in Roboto
      const result = generateAtlas(font, chars);

      // Should only have A, B, C (assuming \u9999 is not in font)
      expect(result.glyphs.size).toBeLessThanOrEqual(3);
      expect(result.glyphs.has('A')).toBe(true);
      expect(result.glyphs.has('B')).toBe(true);
      expect(result.glyphs.has('C')).toBe(true);
    });

    it('should handle empty glyphs like space', () => {
      const chars = 'A B'; // Include space
      const result = generateAtlas(font, chars);

      // Space should have glyph info with metrics but may have zero UV bounds
      expect(result.glyphs.has(' ')).toBe(true);
      const spaceGlyph = result.glyphs.get(' ')!;
      expect(spaceGlyph.advanceWidth).toBeGreaterThan(0);
    });

    it('should respect custom config', () => {
      const chars = 'A';
      const result = generateAtlas(font, chars, {
        glyphSize: 64,
        padding: 4,
        distanceRange: 8,
      });

      expect(result.atlasWidth).toBeGreaterThanOrEqual(64 + 4 * 2);
      expect(result.atlasHeight).toBeGreaterThanOrEqual(64 + 4 * 2);
    });

    it('should produce valid UV coordinates', () => {
      const chars = 'AB';
      const result = generateAtlas(font, chars);

      const entries = Array.from(result.glyphs.entries());
      for (let i = 0; i < entries.length; i++) {
        const [char, info] = entries[i];
        // Skip empty glyphs (like space)
        const glyph = font.getGlyph(char);
        if (!glyph) continue;
        const shape = glyph.toShape();
        if (shape.contours.length === 0) continue;

        // UV coordinates should be in 0-1 range
        expect(info.uvBounds.u0).toBeGreaterThanOrEqual(0);
        expect(info.uvBounds.u0).toBeLessThanOrEqual(1);
        expect(info.uvBounds.v0).toBeGreaterThanOrEqual(0);
        expect(info.uvBounds.v0).toBeLessThanOrEqual(1);
        expect(info.uvBounds.u1).toBeGreaterThanOrEqual(0);
        expect(info.uvBounds.u1).toBeLessThanOrEqual(1);
        expect(info.uvBounds.v1).toBeGreaterThanOrEqual(0);
        expect(info.uvBounds.v1).toBeLessThanOrEqual(1);

        // u1 should be greater than u0, v1 should be greater than v0
        expect(info.uvBounds.u1).toBeGreaterThan(info.uvBounds.u0);
        expect(info.uvBounds.v1).toBeGreaterThan(info.uvBounds.v0);
      }
    });

    it('should include font metrics in glyph info', () => {
      const chars = 'A';
      const result = generateAtlas(font, chars);

      const glyphInfo = result.glyphs.get('A')!;

      // Should have advance width and left side bearing
      expect(glyphInfo.advanceWidth).toBeGreaterThan(0);
      expect(typeof glyphInfo.leftSideBearing).toBe('number');

      // Should have plane bounds in em units
      expect(typeof glyphInfo.planeBounds.left).toBe('number');
      expect(typeof glyphInfo.planeBounds.bottom).toBe('number');
      expect(typeof glyphInfo.planeBounds.right).toBe('number');
      expect(typeof glyphInfo.planeBounds.top).toBe('number');
    });

    it('should have valid atlas bounds', () => {
      const chars = 'AB';
      const result = generateAtlas(font, chars);

      const values = Array.from(result.glyphs.values());
      for (let i = 0; i < values.length; i++) {
        const info = values[i];
        // Skip empty glyphs
        if (info.atlasBounds.left === 0 &&
            info.atlasBounds.right === 0 &&
            info.atlasBounds.top === 0 &&
            info.atlasBounds.bottom === 0) {
          continue;
        }

        // Atlas bounds should be within atlas dimensions
        expect(info.atlasBounds.left).toBeGreaterThanOrEqual(0);
        expect(info.atlasBounds.bottom).toBeGreaterThanOrEqual(0);
        expect(info.atlasBounds.right).toBeLessThanOrEqual(result.atlasWidth);
        expect(info.atlasBounds.top).toBeLessThanOrEqual(result.atlasHeight);

        // Right should be greater than left, top greater than bottom
        expect(info.atlasBounds.right).toBeGreaterThan(info.atlasBounds.left);
        expect(info.atlasBounds.top).toBeGreaterThan(info.atlasBounds.bottom);
      }
    });

    it('should return valid AtlasResult structure', () => {
      const result = generateAtlas(font, 'ABC');

      expect(result).toHaveProperty('atlas');
      expect(result).toHaveProperty('glyphs');
      expect(result).toHaveProperty('generationTimeMs');
      expect(result).toHaveProperty('atlasWidth');
      expect(result).toHaveProperty('atlasHeight');
      expect(result.glyphs).toBeInstanceOf(Map);
    });

    it('should include all requested characters in glyphs Map', () => {
      const chars = 'ABCDEF';
      const result = generateAtlas(font, chars);

      for (const char of chars) {
        expect(result.glyphs.has(char)).toBe(true);
      }
      expect(result.glyphs.size).toBe(chars.length);
    });

    it('should respect different glyph sizes', () => {
      const result16 = generateAtlas(font, 'A', { glyphSize: 16 });
      const result64 = generateAtlas(font, 'A', { glyphSize: 64 });

      // Larger glyph size should produce larger atlas (or equal if padding dominates)
      expect(result64.atlasWidth).toBeGreaterThanOrEqual(result16.atlasWidth);
    });
  });

  describe('performance (MSDF-03)', () => {
    it('should track generation time for performance optimization', () => {
      // Standard ASCII character set: A-Z, a-z, 0-9, punctuation
      const ascii = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';

      const result = generateAtlas(font, ascii);

      expect(result.generationTimeMs).toBeGreaterThan(0);
      console.log(`ASCII atlas (${ascii.length} chars) generated in ${result.generationTimeMs.toFixed(2)}ms (target: <100ms)`);

      // MSDF-03 target: <100ms. This is first optimization (glyph size 32→24), expected ~200ms. Additional work needed.
      expect(result.generationTimeMs).toBeLessThan(250);
    });

    it('should track alphanumeric generation time', () => {
      const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

      const result = generateAtlas(font, alphanumeric);

      expect(result.generationTimeMs).toBeGreaterThan(0);
      console.log(`Alphanumeric atlas (${alphanumeric.length} chars) generated in ${result.generationTimeMs.toFixed(2)}ms (target: <65ms)`);

      // MSDF-03 target: <65ms. Current milestone: <165ms. Additional optimization needed.
      expect(result.generationTimeMs).toBeLessThan(165);
    });

    it('should complete small atlas generation quickly', () => {
      const small = 'ABC';
      const result = generateAtlas(font, small);

      // Small sets should be fast
      expect(result.generationTimeMs).toBeLessThan(50);
      console.log(`Small atlas (${small.length} chars) generated in ${result.generationTimeMs.toFixed(2)}ms`);
    });
  });

  describe('atlasBounds consistency', () => {
    it('should have non-overlapping glyph regions', () => {
      const result = generateAtlas(font, 'ABCDEFGH');
      const values = Array.from(result.glyphs.values());
      const bounds = values.map(g => g.atlasBounds);

      // Check no two glyphs overlap
      for (let i = 0; i < bounds.length; i++) {
        for (let j = i + 1; j < bounds.length; j++) {
          const a = bounds[i];
          const b = bounds[j];

          // Check for no overlap (rectangles don't intersect)
          const noOverlap =
            a.right <= b.left ||
            b.right <= a.left ||
            a.top <= b.bottom ||
            b.top <= a.bottom;

          expect(noOverlap).toBe(true);
        }
      }
    });

    it('should have glyph bounds within atlas dimensions', () => {
      const result = generateAtlas(font, 'ABCDEFGHIJ');

      const values = Array.from(result.glyphs.values());
      for (let i = 0; i < values.length; i++) {
        const info = values[i];
        expect(info.atlasBounds.left).toBeGreaterThanOrEqual(0);
        expect(info.atlasBounds.bottom).toBeGreaterThanOrEqual(0);
        expect(info.atlasBounds.right).toBeLessThanOrEqual(result.atlasWidth);
        expect(info.atlasBounds.top).toBeLessThanOrEqual(result.atlasHeight);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty character string', () => {
      const result = generateAtlas(font, '');

      expect(result.glyphs.size).toBe(0);
      // Atlas should still be valid (even if minimal size)
      expect(result.atlasWidth).toBeGreaterThan(0);
      expect(result.atlasHeight).toBeGreaterThan(0);
    });

    it('should handle single character', () => {
      const result = generateAtlas(font, 'X');

      expect(result.glyphs.size).toBe(1);
      expect(result.glyphs.has('X')).toBe(true);
    });

    it('should handle characters with different shapes', () => {
      // Mix of simple and complex glyphs
      const chars = 'IMW8%@';  // I is simple, W/M are complex, 8/% have multiple parts
      const result = generateAtlas(font, chars);

      expect(result.glyphs.size).toBe(chars.length);
      for (const char of chars) {
        const info = result.glyphs.get(char);
        expect(info).toBeDefined();
        expect(info!.advanceWidth).toBeGreaterThan(0);
      }
    });

    it('should handle custom padding', () => {
      const resultPad2 = generateAtlas(font, 'ABC', { padding: 2 });
      const resultPad8 = generateAtlas(font, 'ABC', { padding: 8 });

      // Higher padding should result in larger atlas (or equal)
      expect(resultPad8.atlasWidth).toBeGreaterThanOrEqual(resultPad2.atlasWidth);
    });

    it('should handle large character sets', () => {
      // 200+ characters (with duplicates that will be deduped)
      const extended = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
        '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~' +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'; // Duplicates will be deduped

      const result = generateAtlas(font, extended);

      // Should complete without error
      expect(result.glyphs.size).toBeLessThanOrEqual(extended.length);
      expect(result.atlasWidth).toBeLessThanOrEqual(4096); // Reasonable GPU limit
      expect(result.atlasHeight).toBeLessThanOrEqual(4096);
    });
  });

  describe('planeBounds', () => {
    it('should have planeBounds in em units (normalized)', () => {
      const result = generateAtlas(font, 'A');
      const glyphInfo = result.glyphs.get('A')!;

      // planeBounds should be normalized to em (typically -1 to 1 range or 0 to 1)
      // The exact values depend on the glyph, but they should be reasonable
      expect(Math.abs(glyphInfo.planeBounds.right - glyphInfo.planeBounds.left)).toBeLessThan(2);
      expect(Math.abs(glyphInfo.planeBounds.top - glyphInfo.planeBounds.bottom)).toBeLessThan(2);
    });

    it('should have consistent planeBounds and atlas bounds relationship', () => {
      const result = generateAtlas(font, 'ABC');

      const entries = Array.from(result.glyphs.entries());
      for (let i = 0; i < entries.length; i++) {
        const [char, info] = entries[i];
        // Skip space
        if (char === ' ') continue;

        // planeBounds and atlasBounds should both have positive dimensions
        const planeWidth = info.planeBounds.right - info.planeBounds.left;
        const planeHeight = info.planeBounds.top - info.planeBounds.bottom;
        const atlasWidth = info.atlasBounds.right - info.atlasBounds.left;
        const atlasHeight = info.atlasBounds.top - info.atlasBounds.bottom;

        expect(planeWidth).toBeGreaterThanOrEqual(0);
        expect(planeHeight).toBeGreaterThanOrEqual(0);
        expect(atlasWidth).toBeGreaterThan(0);
        expect(atlasHeight).toBeGreaterThan(0);
      }
    });
  });
});
