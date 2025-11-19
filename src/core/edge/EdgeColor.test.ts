import { describe, it, expect } from 'vitest';
import {
  EdgeColor,
  numChannels,
  hasRed,
  hasGreen,
  hasBlue,
  combineColors,
  intersectColors,
  complementColor,
  colorToString,
} from './EdgeColor';

describe('EdgeColor', () => {
  describe('enum values', () => {
    it('should have correct bitwise values', () => {
      expect(EdgeColor.BLACK).toBe(0);
      expect(EdgeColor.RED).toBe(1);
      expect(EdgeColor.GREEN).toBe(2);
      expect(EdgeColor.YELLOW).toBe(3);
      expect(EdgeColor.BLUE).toBe(4);
      expect(EdgeColor.MAGENTA).toBe(5);
      expect(EdgeColor.CYAN).toBe(6);
      expect(EdgeColor.WHITE).toBe(7);
    });

    it('should have correct bit combinations', () => {
      expect(EdgeColor.YELLOW).toBe(EdgeColor.RED | EdgeColor.GREEN);
      expect(EdgeColor.MAGENTA).toBe(EdgeColor.RED | EdgeColor.BLUE);
      expect(EdgeColor.CYAN).toBe(EdgeColor.GREEN | EdgeColor.BLUE);
      expect(EdgeColor.WHITE).toBe(EdgeColor.RED | EdgeColor.GREEN | EdgeColor.BLUE);
    });
  });

  describe('numChannels', () => {
    it('should return 0 for BLACK', () => {
      expect(numChannels(EdgeColor.BLACK)).toBe(0);
    });

    it('should return 1 for single channel colors', () => {
      expect(numChannels(EdgeColor.RED)).toBe(1);
      expect(numChannels(EdgeColor.GREEN)).toBe(1);
      expect(numChannels(EdgeColor.BLUE)).toBe(1);
    });

    it('should return 2 for two-channel colors', () => {
      expect(numChannels(EdgeColor.YELLOW)).toBe(2);
      expect(numChannels(EdgeColor.MAGENTA)).toBe(2);
      expect(numChannels(EdgeColor.CYAN)).toBe(2);
    });

    it('should return 3 for WHITE', () => {
      expect(numChannels(EdgeColor.WHITE)).toBe(3);
    });
  });

  describe('hasRed', () => {
    it('should return true for colors containing red', () => {
      expect(hasRed(EdgeColor.RED)).toBe(true);
      expect(hasRed(EdgeColor.YELLOW)).toBe(true);
      expect(hasRed(EdgeColor.MAGENTA)).toBe(true);
      expect(hasRed(EdgeColor.WHITE)).toBe(true);
    });

    it('should return false for colors without red', () => {
      expect(hasRed(EdgeColor.BLACK)).toBe(false);
      expect(hasRed(EdgeColor.GREEN)).toBe(false);
      expect(hasRed(EdgeColor.BLUE)).toBe(false);
      expect(hasRed(EdgeColor.CYAN)).toBe(false);
    });
  });

  describe('hasGreen', () => {
    it('should return true for colors containing green', () => {
      expect(hasGreen(EdgeColor.GREEN)).toBe(true);
      expect(hasGreen(EdgeColor.YELLOW)).toBe(true);
      expect(hasGreen(EdgeColor.CYAN)).toBe(true);
      expect(hasGreen(EdgeColor.WHITE)).toBe(true);
    });

    it('should return false for colors without green', () => {
      expect(hasGreen(EdgeColor.BLACK)).toBe(false);
      expect(hasGreen(EdgeColor.RED)).toBe(false);
      expect(hasGreen(EdgeColor.BLUE)).toBe(false);
      expect(hasGreen(EdgeColor.MAGENTA)).toBe(false);
    });
  });

  describe('hasBlue', () => {
    it('should return true for colors containing blue', () => {
      expect(hasBlue(EdgeColor.BLUE)).toBe(true);
      expect(hasBlue(EdgeColor.MAGENTA)).toBe(true);
      expect(hasBlue(EdgeColor.CYAN)).toBe(true);
      expect(hasBlue(EdgeColor.WHITE)).toBe(true);
    });

    it('should return false for colors without blue', () => {
      expect(hasBlue(EdgeColor.BLACK)).toBe(false);
      expect(hasBlue(EdgeColor.RED)).toBe(false);
      expect(hasBlue(EdgeColor.GREEN)).toBe(false);
      expect(hasBlue(EdgeColor.YELLOW)).toBe(false);
    });
  });

  describe('combineColors', () => {
    it('should combine single channels', () => {
      expect(combineColors(EdgeColor.RED, EdgeColor.GREEN)).toBe(EdgeColor.YELLOW);
      expect(combineColors(EdgeColor.RED, EdgeColor.BLUE)).toBe(EdgeColor.MAGENTA);
      expect(combineColors(EdgeColor.GREEN, EdgeColor.BLUE)).toBe(EdgeColor.CYAN);
    });

    it('should combine all channels to WHITE', () => {
      expect(combineColors(EdgeColor.RED, EdgeColor.CYAN)).toBe(EdgeColor.WHITE);
      expect(combineColors(EdgeColor.YELLOW, EdgeColor.BLUE)).toBe(EdgeColor.WHITE);
      expect(combineColors(EdgeColor.MAGENTA, EdgeColor.GREEN)).toBe(EdgeColor.WHITE);
    });

    it('should be idempotent', () => {
      expect(combineColors(EdgeColor.RED, EdgeColor.RED)).toBe(EdgeColor.RED);
      expect(combineColors(EdgeColor.CYAN, EdgeColor.CYAN)).toBe(EdgeColor.CYAN);
    });

    it('should handle BLACK', () => {
      expect(combineColors(EdgeColor.BLACK, EdgeColor.RED)).toBe(EdgeColor.RED);
      expect(combineColors(EdgeColor.GREEN, EdgeColor.BLACK)).toBe(EdgeColor.GREEN);
      expect(combineColors(EdgeColor.BLACK, EdgeColor.BLACK)).toBe(EdgeColor.BLACK);
    });
  });

  describe('intersectColors', () => {
    it('should return common channels', () => {
      expect(intersectColors(EdgeColor.YELLOW, EdgeColor.MAGENTA)).toBe(EdgeColor.RED);
      expect(intersectColors(EdgeColor.YELLOW, EdgeColor.CYAN)).toBe(EdgeColor.GREEN);
      expect(intersectColors(EdgeColor.MAGENTA, EdgeColor.CYAN)).toBe(EdgeColor.BLUE);
    });

    it('should return BLACK when no common channels', () => {
      expect(intersectColors(EdgeColor.RED, EdgeColor.GREEN)).toBe(EdgeColor.BLACK);
      expect(intersectColors(EdgeColor.RED, EdgeColor.BLUE)).toBe(EdgeColor.BLACK);
      expect(intersectColors(EdgeColor.GREEN, EdgeColor.BLUE)).toBe(EdgeColor.BLACK);
    });

    it('should be idempotent', () => {
      expect(intersectColors(EdgeColor.RED, EdgeColor.RED)).toBe(EdgeColor.RED);
      expect(intersectColors(EdgeColor.CYAN, EdgeColor.CYAN)).toBe(EdgeColor.CYAN);
    });

    it('should handle WHITE', () => {
      expect(intersectColors(EdgeColor.WHITE, EdgeColor.RED)).toBe(EdgeColor.RED);
      expect(intersectColors(EdgeColor.YELLOW, EdgeColor.WHITE)).toBe(EdgeColor.YELLOW);
      expect(intersectColors(EdgeColor.WHITE, EdgeColor.WHITE)).toBe(EdgeColor.WHITE);
    });
  });

  describe('complementColor', () => {
    it('should complement single channels', () => {
      expect(complementColor(EdgeColor.RED)).toBe(EdgeColor.CYAN);
      expect(complementColor(EdgeColor.GREEN)).toBe(EdgeColor.MAGENTA);
      expect(complementColor(EdgeColor.BLUE)).toBe(EdgeColor.YELLOW);
    });

    it('should complement two-channel colors', () => {
      expect(complementColor(EdgeColor.YELLOW)).toBe(EdgeColor.BLUE);
      expect(complementColor(EdgeColor.MAGENTA)).toBe(EdgeColor.GREEN);
      expect(complementColor(EdgeColor.CYAN)).toBe(EdgeColor.RED);
    });

    it('should complement BLACK and WHITE', () => {
      expect(complementColor(EdgeColor.BLACK)).toBe(EdgeColor.WHITE);
      expect(complementColor(EdgeColor.WHITE)).toBe(EdgeColor.BLACK);
    });

    it('should be its own inverse', () => {
      expect(complementColor(complementColor(EdgeColor.RED))).toBe(EdgeColor.RED);
      expect(complementColor(complementColor(EdgeColor.YELLOW))).toBe(EdgeColor.YELLOW);
      expect(complementColor(complementColor(EdgeColor.CYAN))).toBe(EdgeColor.CYAN);
    });
  });

  describe('colorToString', () => {
    it('should return correct names', () => {
      expect(colorToString(EdgeColor.BLACK)).toBe('BLACK');
      expect(colorToString(EdgeColor.RED)).toBe('RED');
      expect(colorToString(EdgeColor.GREEN)).toBe('GREEN');
      expect(colorToString(EdgeColor.YELLOW)).toBe('YELLOW');
      expect(colorToString(EdgeColor.BLUE)).toBe('BLUE');
      expect(colorToString(EdgeColor.MAGENTA)).toBe('MAGENTA');
      expect(colorToString(EdgeColor.CYAN)).toBe('CYAN');
      expect(colorToString(EdgeColor.WHITE)).toBe('WHITE');
    });

    it('should handle invalid values', () => {
      expect(colorToString(99 as EdgeColor)).toBe('UNKNOWN(99)');
    });
  });

  describe('bitwise operations', () => {
    it('should work with standard bitwise operators', () => {
      const color = EdgeColor.RED | EdgeColor.GREEN;
      expect(color).toBe(EdgeColor.YELLOW);

      const intersection = EdgeColor.YELLOW & EdgeColor.CYAN;
      expect(intersection).toBe(EdgeColor.GREEN);

      const complement = EdgeColor.RED ^ EdgeColor.WHITE;
      expect(complement).toBe(EdgeColor.CYAN);
    });

    it('should support masking operations', () => {
      const color = EdgeColor.WHITE;
      expect(color & EdgeColor.RED).toBe(EdgeColor.RED);
      expect(color & EdgeColor.GREEN).toBe(EdgeColor.GREEN);
      expect(color & EdgeColor.BLUE).toBe(EdgeColor.BLUE);
    });
  });
});
