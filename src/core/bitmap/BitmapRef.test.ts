import { describe, it, expect } from 'vitest';
import { Bitmap } from './Bitmap';
import { BitmapRef } from './BitmapRef';
import { BitmapSection } from './BitmapSection';
import { YAxisOrientation } from './YAxisOrientation';

describe('BitmapRef', () => {
  describe('constructor', () => {
    it('should create reference to typed array', () => {
      const data = new Float32Array(12); // 3x2 with 2 channels
      const ref = new BitmapRef(data, 3, 2, 2);
      expect(ref.width).toBe(3);
      expect(ref.height).toBe(2);
      expect(ref.channels).toBe(2);
    });

    it('should use default Y-axis orientation', () => {
      const data = new Float32Array(10);
      const ref = new BitmapRef(data, 5, 2, 1);
      expect(ref.yOrientation).toBe(YAxisOrientation.Y_UPWARD);
    });

    it('should use specified Y-axis orientation', () => {
      const data = new Float32Array(10);
      const ref = new BitmapRef(data, 5, 2, 1, YAxisOrientation.Y_DOWNWARD);
      expect(ref.yOrientation).toBe(YAxisOrientation.Y_DOWNWARD);
    });
  });

  describe('pixel access', () => {
    it('should read pixel values through reference', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5);
      bmp.setPixel(2, 3, [10, 20, 30]);

      const ref = bmp.ref();
      expect(ref.getChannel(2, 3, 0)).toBe(10);
      expect(ref.getChannel(2, 3, 1)).toBe(20);
      expect(ref.getChannel(2, 3, 2)).toBe(30);
    });

    it('should write pixel values through reference', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5);
      const ref = bmp.ref();

      ref.setPixel(1, 2, [100, 200, 300]);
      expect(bmp.getChannel(1, 2, 0)).toBe(100);
      expect(bmp.getChannel(1, 2, 1)).toBe(200);
      expect(bmp.getChannel(1, 2, 2)).toBe(300);
    });

    it('should get pixel as typed array view', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5);
      bmp.setPixel(0, 0, [1, 2, 3]);

      const ref = bmp.ref();
      const pixel = ref.getPixel(0, 0);
      expect(pixel.length).toBe(3);
      expect(pixel[0]).toBe(1);
      expect(pixel[1]).toBe(2);
      expect(pixel[2]).toBe(3);
    });

    it('should set individual channel values', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5);
      const ref = bmp.ref();

      ref.setChannel(4, 4, 0, 5);
      ref.setChannel(4, 4, 1, 10);
      ref.setChannel(4, 4, 2, 15);

      expect(bmp.getChannel(4, 4, 0)).toBe(5);
      expect(bmp.getChannel(4, 4, 1)).toBe(10);
      expect(bmp.getChannel(4, 4, 2)).toBe(15);
    });
  });

  describe('reference semantics', () => {
    it('should reflect changes to original bitmap', () => {
      const bmp = new Bitmap(Float32Array, 1, 5, 5);
      const ref = bmp.ref();

      bmp.setPixel(2, 2, [42]);
      expect(ref.getChannel(2, 2, 0)).toBe(42);
    });

    it('should modify original bitmap when written through ref', () => {
      const bmp = new Bitmap(Float32Array, 1, 5, 5);
      const ref = bmp.ref();

      ref.setPixel(3, 3, [99]);
      expect(bmp.getChannel(3, 3, 0)).toBe(99);
    });

    it('should share underlying data with bitmap', () => {
      const bmp = new Bitmap(Float32Array, 1, 5, 5);
      const ref = bmp.ref();

      expect(ref.pixels).toBe(bmp.data());
    });
  });

  describe('different array types', () => {
    it('should work with Float64Array', () => {
      const bmp = new Bitmap(Float64Array, 1, 5, 5);
      const ref = bmp.ref();

      ref.setPixel(0, 0, [3.14159]);
      expect(ref.getChannel(0, 0, 0)).toBeCloseTo(3.14159, 10);
    });

    it('should work with Uint8Array', () => {
      const bmp = new Bitmap(Uint8Array, 3, 5, 5);
      const ref = bmp.ref();

      ref.setPixel(1, 1, [255, 128, 64]);
      expect(ref.getChannel(1, 1, 0)).toBe(255);
      expect(ref.getChannel(1, 1, 1)).toBe(128);
      expect(ref.getChannel(1, 1, 2)).toBe(64);
    });
  });
});

describe('BitmapSection', () => {
  describe('constructor', () => {
    it('should create section with specified rowStride', () => {
      const data = new Float32Array(100);
      const section = new BitmapSection(data, 5, 5, 1, 20);
      expect(section.width).toBe(5);
      expect(section.height).toBe(5);
      expect(section.rowStride).toBe(20);
    });

    it('should calculate default rowStride from width and channels', () => {
      const data = new Float32Array(60);
      const section = new BitmapSection(data, 5, 4, 3);
      expect(section.rowStride).toBe(15); // 5 * 3
    });

    it('should create from BitmapRef', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5);
      const ref = bmp.ref();
      const section = BitmapSection.fromRef(ref);

      expect(section.width).toBe(5);
      expect(section.height).toBe(5);
      expect(section.rowStride).toBe(15); // 5 * 3
    });
  });

  describe('pixel access with rowStride', () => {
    it('should access pixels correctly with custom rowStride', () => {
      const bmp = new Bitmap(Float32Array, 1, 10, 10);
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          bmp.setPixel(x, y, [x + y * 100]);
        }
      }

      const section = bmp.section();
      expect(section.getChannel(3, 4, 0)).toBe(3 + 4 * 100);
    });

    it('should handle subsections correctly', () => {
      const bmp = new Bitmap(Float32Array, 1, 10, 10);
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          bmp.setPixel(x, y, [x + y * 10]);
        }
      }

      const section = bmp.getSection(2, 3, 7, 8);
      expect(section.width).toBe(5);
      expect(section.height).toBe(5);

      // (0, 0) in section corresponds to (2, 3) in original
      expect(section.getChannel(0, 0, 0)).toBe(2 + 3 * 10);

      // (4, 4) in section corresponds to (6, 7) in original
      expect(section.getChannel(4, 4, 0)).toBe(6 + 7 * 10);
    });

    it('should handle nested subsections', () => {
      const bmp = new Bitmap(Float32Array, 1, 20, 20);
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 20; x++) {
          bmp.setPixel(x, y, [x + y * 100]);
        }
      }

      const section1 = bmp.getSection(5, 5, 15, 15);
      const section2 = section1.getSection(2, 2, 7, 7);

      expect(section2.width).toBe(5);
      expect(section2.height).toBe(5);

      // (0, 0) in section2 corresponds to (7, 7) in original
      expect(section2.getChannel(0, 0, 0)).toBe(7 + 7 * 100);
    });
  });

  describe('reorient', () => {
    it('should flip section vertically when reorienting', () => {
      const bmp = new Bitmap(Float32Array, 1, 3, 3, YAxisOrientation.Y_UPWARD);
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          bmp.setPixel(x, y, [y]); // Each row has its y-value
        }
      }

      const section = bmp.section();
      expect(section.getChannel(0, 0, 0)).toBe(0);
      expect(section.getChannel(0, 1, 0)).toBe(1);
      expect(section.getChannel(0, 2, 0)).toBe(2);

      section.reorient(YAxisOrientation.Y_DOWNWARD);
      expect(section.yOrientation).toBe(YAxisOrientation.Y_DOWNWARD);

      // After reorienting, rows should be reversed
      expect(section.getChannel(0, 0, 0)).toBe(2);
      expect(section.getChannel(0, 1, 0)).toBe(1);
      expect(section.getChannel(0, 2, 0)).toBe(0);
    });

    it('should make rowStride negative when flipping', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5);
      const section = bmp.section();

      const originalRowStride = section.rowStride;
      expect(originalRowStride).toBeGreaterThan(0);

      section.reorient(YAxisOrientation.Y_DOWNWARD);
      expect(section.rowStride).toBe(-originalRowStride);
    });

    it('should do nothing if already in target orientation', () => {
      const bmp = new Bitmap(Float32Array, 1, 5, 5, YAxisOrientation.Y_UPWARD);
      const section = bmp.section();

      const originalRowStride = section.rowStride;
      section.reorient(YAxisOrientation.Y_UPWARD);

      expect(section.rowStride).toBe(originalRowStride);
    });

    it('should reorient back to original', () => {
      const bmp = new Bitmap(Float32Array, 1, 3, 3);
      bmp.setPixel(1, 1, [42]);

      const section = bmp.section();
      section.reorient(YAxisOrientation.Y_DOWNWARD);
      section.reorient(YAxisOrientation.Y_UPWARD);

      // Should be back to original
      expect(section.getChannel(1, 1, 0)).toBe(42);
    });
  });

  describe('write through section', () => {
    it('should modify original bitmap when writing through section', () => {
      const bmp = new Bitmap(Float32Array, 3, 10, 10);
      const section = bmp.getSection(2, 3, 7, 8);

      section.setPixel(1, 1, [100, 200, 300]);

      // (1, 1) in section is (3, 4) in original
      expect(bmp.getChannel(3, 4, 0)).toBe(100);
      expect(bmp.getChannel(3, 4, 1)).toBe(200);
      expect(bmp.getChannel(3, 4, 2)).toBe(300);
    });

    it('should handle setting channels individually', () => {
      const bmp = new Bitmap(Float32Array, 3, 10, 10);
      const section = bmp.section();

      section.setChannel(5, 5, 0, 1);
      section.setChannel(5, 5, 1, 2);
      section.setChannel(5, 5, 2, 3);

      expect(bmp.getChannel(5, 5, 0)).toBe(1);
      expect(bmp.getChannel(5, 5, 1)).toBe(2);
      expect(bmp.getChannel(5, 5, 2)).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle 1x1 section', () => {
      const bmp = new Bitmap(Float32Array, 1, 10, 10);
      bmp.setPixel(5, 5, [42]);

      const section = bmp.getSection(5, 5, 6, 6);
      expect(section.width).toBe(1);
      expect(section.height).toBe(1);
      expect(section.getChannel(0, 0, 0)).toBe(42);
    });

    it('should handle negative rowStride for flipped images', () => {
      const bmp = new Bitmap(Float32Array, 1, 5, 5);
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          bmp.setPixel(x, y, [y]);
        }
      }

      const section = bmp.section();
      section.reorient(YAxisOrientation.Y_DOWNWARD);

      // Verify negative stride works
      expect(section.rowStride).toBeLessThan(0);
      expect(section.getChannel(0, 0, 0)).toBe(4); // First row is now last
      expect(section.getChannel(0, 4, 0)).toBe(0); // Last row is now first
    });
  });
});
