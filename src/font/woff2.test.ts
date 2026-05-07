import { describe, it, expect } from 'vitest';
import { isWoff2 } from './woff2';

describe('woff2', () => {
  describe('isWoff2', () => {
    it('should return true for WOFF2 magic number', () => {
      // 'wOF2' = 0x77 0x4F 0x46 0x32
      const woff2Buffer = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 0, 0, 0]).buffer;
      expect(isWoff2(woff2Buffer)).toBe(true);
    });

    it('should return false for TTF magic number', () => {
      // TTF = 0x00 0x01 0x00 0x00
      const ttfBuffer = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0, 0, 0, 0]).buffer;
      expect(isWoff2(ttfBuffer)).toBe(false);
    });

    it('should return false for OTF magic number', () => {
      // OTF = 'OTTO' = 0x4F 0x54 0x54 0x4F
      const otfBuffer = new Uint8Array([0x4f, 0x54, 0x54, 0x4f, 0, 0, 0, 0]).buffer;
      expect(isWoff2(otfBuffer)).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const emptyBuffer = new ArrayBuffer(0);
      expect(isWoff2(emptyBuffer)).toBe(false);
    });

    it('should return false for buffer smaller than 4 bytes', () => {
      const smallBuffer = new Uint8Array([0x77, 0x4f]).buffer;
      expect(isWoff2(smallBuffer)).toBe(false);
    });
  });
});
