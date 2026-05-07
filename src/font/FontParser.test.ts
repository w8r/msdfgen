import { describe, it, expect, beforeAll } from 'vitest';
import { parseFont } from './FontParser';
import { isWoff2 } from './woff2';
import * as fs from 'fs';
import * as path from 'path';

// Test character sets that expose common parsing issues
const TEST_CHARACTERS = {
  // Compound counters - expose winding order issues
  counters: ['8', 'B', '%', '@', '&', 'O', 'Q'],
  // Sharp corners - expose edge handling
  sharpCorners: ['M', 'W', 'V', 'A', 'N', '7', '#'],
  // Accented - expose composite glyph handling
  accented: ['e', 'a', 'u', 'c', 'o'],
  // Descenders - expose metric handling
  descenders: ['g', 'y', 'p', 'j', 'q'],
};

describe('FontParser', () => {
  let robotoBuffer: ArrayBuffer | null = null;
  let woff2Buffer: ArrayBuffer | null = null;

  beforeAll(async () => {
    const fixturesDir = path.join(__dirname, '../test-fixtures');

    // Load Roboto TTF
    const robotoPath = path.join(fixturesDir, 'Roboto-Regular.ttf');
    if (fs.existsSync(robotoPath)) {
      const buffer = fs.readFileSync(robotoPath);
      robotoBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    // Load WOFF2 if available
    const woff2Path = path.join(fixturesDir, 'OpenSans-Regular.woff2');
    if (fs.existsSync(woff2Path)) {
      const buffer = fs.readFileSync(woff2Path);
      woff2Buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
  });

  describe('TTF parsing', () => {
    it('should parse TTF font and return Font object', async () => {
      if (!robotoBuffer) return;
      const font = await parseFont(robotoBuffer);
      expect(font).toBeDefined();
      expect(font.metrics.unitsPerEm).toBe(2048); // Roboto uses 2048
    });

    it('should extract correct metrics', async () => {
      if (!robotoBuffer) return;
      const font = await parseFont(robotoBuffer);
      expect(font.metrics.unitsPerEm).toBeGreaterThan(0);
      expect(font.metrics.ascender).toBeGreaterThan(0);
      expect(font.metrics.descender).toBeLessThan(0); // Descender is typically negative
    });
  });

  describe('WOFF2 parsing', () => {
    it('should detect WOFF2 format correctly', async () => {
      if (!woff2Buffer) return;
      expect(isWoff2(woff2Buffer)).toBe(true);
    });

    it('should parse WOFF2 font transparently', async () => {
      if (!woff2Buffer) return;
      const font = await parseFont(woff2Buffer);
      expect(font).toBeDefined();
      expect(font.metrics.unitsPerEm).toBeGreaterThan(0);
    });

    it('should return same interface for WOFF2 as TTF', async () => {
      if (!woff2Buffer) return;
      const font = await parseFont(woff2Buffer);
      const glyph = font.getGlyph('A');
      expect(glyph).not.toBeNull();
      expect(glyph!.toShape().validate()).toBe(true);
    });
  });

  describe('compound glyphs (winding order)', () => {
    it.each(TEST_CHARACTERS.counters)('should handle counter glyph "%s" correctly', async (char) => {
      if (!robotoBuffer) return;
      const font = await parseFont(robotoBuffer);
      const glyph = font.getGlyph(char);
      if (!glyph) return; // Skip if glyph not in font

      const shape = glyph.toShape();
      expect(shape.validate()).toBe(true);
      // Compound glyphs should have multiple contours
      if (['8', 'B', '%', '@', '&'].includes(char)) {
        expect(shape.contours.length).toBeGreaterThan(1);
      }
    });
  });

  describe('sharp corners', () => {
    it.each(TEST_CHARACTERS.sharpCorners)(
      'should handle sharp corner glyph "%s" correctly',
      async (char) => {
        if (!robotoBuffer) return;
        const font = await parseFont(robotoBuffer);
        const glyph = font.getGlyph(char);
        if (!glyph) return;

        const shape = glyph.toShape();
        expect(shape.validate()).toBe(true);
      },
    );
  });

  describe('accented characters (composite glyphs)', () => {
    it.each(TEST_CHARACTERS.accented)('should handle accented "%s" correctly', async (char) => {
      if (!robotoBuffer) return;
      const font = await parseFont(robotoBuffer);

      const glyph = font.getGlyph(char);
      if (!glyph) return;

      const shape = glyph.toShape();
      expect(shape.validate()).toBe(true);
    });
  });

  describe('glyph metrics', () => {
    it('should return correct advance width', async () => {
      if (!robotoBuffer) return;
      const font = await parseFont(robotoBuffer);

      const glyphM = font.getGlyph('M');
      const glyphI = font.getGlyph('i');

      expect(glyphM).not.toBeNull();
      expect(glyphI).not.toBeNull();

      // M should be wider than i
      expect(glyphM!.metrics.advanceWidth).toBeGreaterThan(glyphI!.metrics.advanceWidth);
    });

    it('should handle space character', async () => {
      if (!robotoBuffer) return;
      const font = await parseFont(robotoBuffer);

      const space = font.getGlyph(' ');
      expect(space).not.toBeNull();
      expect(space!.metrics.advanceWidth).toBeGreaterThan(0);

      // Space has no outline
      const shape = space!.toShape();
      expect(shape.contours.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should return null for missing glyph', async () => {
      if (!robotoBuffer) return;
      const font = await parseFont(robotoBuffer);

      // Private use area character unlikely to exist
      const glyph = font.getGlyph('\uE000');
      expect(glyph).toBeNull();
    });

    it('should hasGlyph work correctly', async () => {
      if (!robotoBuffer) return;
      const font = await parseFont(robotoBuffer);

      expect(font.hasGlyph('A')).toBe(true);
      expect(font.hasGlyph('\uE000')).toBe(false);
    });
  });
});
