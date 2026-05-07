import { describe, it, expect, beforeAll } from 'vitest';
import { parseFont } from './FontParser';
import * as fs from 'fs';
import * as path from 'path';

// Test with a real font file
describe('FontParser', () => {
  let fontBuffer: ArrayBuffer;

  beforeAll(async () => {
    // Load Roboto test font
    const testFontPath = path.join(__dirname, '../test-fixtures/Roboto-Regular.ttf');
    if (fs.existsSync(testFontPath)) {
      const nodeBuffer = fs.readFileSync(testFontPath);
      // Create a proper ArrayBuffer copy for opentype.js
      fontBuffer = new Uint8Array(nodeBuffer).buffer;
    } else {
      throw new Error('Test font not found at ' + testFontPath);
    }
  });

  describe('parseFont', () => {
    it('should parse TTF font and return Font object', async () => {
      const font = await parseFont(fontBuffer);
      expect(font).toBeDefined();
      expect(font.metrics).toBeDefined();
    });

    it('should extract font metrics correctly', async () => {
      const font = await parseFont(fontBuffer);
      expect(font.metrics.unitsPerEm).toBeGreaterThan(0);
      expect(typeof font.metrics.ascender).toBe('number');
      expect(typeof font.metrics.descender).toBe('number');
      expect(typeof font.metrics.lineGap).toBe('number');
    });

    it('should get glyph for existing character', async () => {
      const font = await parseFont(fontBuffer);
      const glyph = font.getGlyph('A');
      expect(glyph).not.toBeNull();
      expect(glyph!.metrics.advanceWidth).toBeGreaterThan(0);
    });

    it('should return null for missing character', async () => {
      const font = await parseFont(fontBuffer);
      // Use a very rare character unlikely to exist
      const glyph = font.getGlyph('\u{10FFFF}');
      expect(glyph).toBeNull();
    });

    it('should convert glyph to valid Shape', async () => {
      const font = await parseFont(fontBuffer);
      const glyph = font.getGlyph('B'); // B has multiple contours (counters)
      expect(glyph).not.toBeNull();

      const shape = glyph!.toShape();
      expect(shape.contours.length).toBeGreaterThan(0);
      expect(shape.validate()).toBe(true);
    });

    it('should hasGlyph return true for existing glyphs', async () => {
      const font = await parseFont(fontBuffer);
      expect(font.hasGlyph('A')).toBe(true);
      expect(font.hasGlyph('a')).toBe(true);
      expect(font.hasGlyph('0')).toBe(true);
    });

    it('should hasGlyph return false for missing glyphs', async () => {
      const font = await parseFont(fontBuffer);
      expect(font.hasGlyph('\u{10FFFF}')).toBe(false);
    });
  });
});
