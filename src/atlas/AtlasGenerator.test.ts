import { describe, it, expect, beforeEach } from 'vitest';
import { generateAtlas } from './AtlasGenerator';
import { parseFont } from '../font/FontParser';
import type { Font } from '../font/types';
import * as fs from 'fs';
import * as path from 'path';

describe('AtlasGenerator', () => {
  let font: Font;

  beforeEach(async () => {
    // Load Roboto Regular for testing
    const fontPath = path.join(__dirname, '../../test-fonts/Roboto-Regular.ttf');
    const fontBuffer = fs.readFileSync(fontPath);
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

      for (const [char, info] of result.glyphs) {
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

      for (const info of result.glyphs.values()) {
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
  });
});
