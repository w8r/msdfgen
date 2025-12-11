import { describe, it, expect } from 'vitest';
import { generateSDF, generatePSDF, generateMSDF, generateMTSDF } from './msdfgen';
import { SDFTransformation } from './SDFTransformation';
import { GeneratorConfig, MSDFGeneratorConfig } from './GeneratorConfig';
import { Bitmap } from '../bitmap/Bitmap';
import { Shape } from '../shape/Shape';
import { Contour } from '../shape/Contour';
import { EdgeHolder } from '../shape/EdgeHolder';
import { Vector2 } from '../types/Vector2';
import { Projection } from '../types/Projection';
import { Range } from '../types/Range';
import { EdgeColor } from '../edge/EdgeColor';
import { edgeColoringSimple } from '../edge-coloring/edge-coloring';

describe('Distance Field Generators', () => {
  /**
   * Helper to create a simple square shape (0,0) to (1,1)
   */
  function createSquareShape(): Shape {
    const shape = new Shape();
    const contour = new Contour();

    // Create a square with 4 linear segments
    contour.addEdge(
      new EdgeHolder(new Vector2(0, 0), new Vector2(1, 0), EdgeColor.WHITE)
    );
    contour.addEdge(
      new EdgeHolder(new Vector2(1, 0), new Vector2(1, 1), EdgeColor.WHITE)
    );
    contour.addEdge(
      new EdgeHolder(new Vector2(1, 1), new Vector2(0, 1), EdgeColor.WHITE)
    );
    contour.addEdge(
      new EdgeHolder(new Vector2(0, 1), new Vector2(0, 0), EdgeColor.WHITE)
    );

    shape.addContour(contour);
    return shape;
  }

  /**
   * Helper to create a colored square for MSDF generation
   */
  function createColoredSquare(): Shape {
    const shape = createSquareShape();
    edgeColoringSimple(shape, Math.PI, 0n);
    return shape;
  }

  describe('generateSDF', () => {
    it('should generate a basic SDF for a square', () => {
      const shape = createSquareShape();
      const bitmap = new Bitmap(Float32Array, 1, 32, 32);

      // Transform: scale shape to fit in bitmap with some padding
      const projection = new Projection(
        new Vector2(28, 28), // scale to 28x28 (leaving 2px padding)
        new Vector2(-0.5, -0.5) // translate to center
      );
      const range = new Range(-2, 2); // Distance range
      const transformation = new SDFTransformation(projection, range);

      generateSDF(bitmap, shape, transformation);

      // Check that bitmap has been filled
      const pixels = bitmap.data();
      expect(pixels.length).toBe(32 * 32);

      // Check that not all pixels are the same
      const firstPixel = pixels[0];
      const hasDifference = pixels.some((p) => Math.abs(p - firstPixel) > 0.001);
      expect(hasDifference).toBe(true);

      // Check that center pixels (inside square) are positive
      const centerX = 16;
      const centerY = 16;
      const centerPixel = bitmap.getPixel(centerX, centerY)[0];
      expect(centerPixel).toBeGreaterThan(0.5);

      // Check that corner pixels (outside square) are negative
      const cornerPixel = bitmap.getPixel(0, 0)[0];
      expect(cornerPixel).toBeLessThan(0.5);
    });

    it('should respect overlap support configuration', () => {
      const shape = createSquareShape();
      const bitmap1 = new Bitmap(Float32Array, 1, 16, 16);
      const bitmap2 = new Bitmap(Float32Array, 1, 16, 16);

      const projection = new Projection(new Vector2(14, 14), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      // Generate with overlap support
      generateSDF(bitmap1, shape, transformation, new GeneratorConfig(true));

      // Generate without overlap support
      generateSDF(bitmap2, shape, transformation, new GeneratorConfig(false));

      // Both should produce valid results (they'll be identical for non-overlapping shapes)
      expect(bitmap1.data().every((p) => !isNaN(p) && isFinite(p))).toBe(true);
      expect(bitmap2.data().every((p) => !isNaN(p) && isFinite(p))).toBe(true);
    });

    it('should handle small bitmaps', () => {
      const shape = createSquareShape();
      const bitmap = new Bitmap(Float32Array, 1, 4, 4);

      const projection = new Projection(new Vector2(2, 2), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      expect(() => generateSDF(bitmap, shape, transformation)).not.toThrow();
      expect(bitmap.data().every((p) => !isNaN(p) && isFinite(p))).toBe(true);
    });

    it('should handle large bitmaps', () => {
      const shape = createSquareShape();
      const bitmap = new Bitmap(Float32Array, 1, 128, 128);

      const projection = new Projection(new Vector2(120, 120), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      expect(() => generateSDF(bitmap, shape, transformation)).not.toThrow();
      expect(bitmap.data().every((p) => !isNaN(p) && isFinite(p))).toBe(true);
    });
  });

  describe('generatePSDF', () => {
    it('should generate a perpendicular SDF for a square', () => {
      const shape = createSquareShape();
      const bitmap = new Bitmap(Float32Array, 1, 32, 32);

      const projection = new Projection(new Vector2(28, 28), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      generatePSDF(bitmap, shape, transformation);

      // Check that bitmap has been filled with valid values
      const pixels = bitmap.data();
      expect(pixels.length).toBe(32 * 32);
      expect(pixels.every((p) => !isNaN(p) && isFinite(p))).toBe(true);

      // PSDF should have different characteristics than SDF near corners
      // but we can't easily verify this without comparing to SDF
      const centerPixel = bitmap.getPixel(16, 16)[0];
      expect(centerPixel).toBeGreaterThan(0.5);
    });
  });

  describe('generateMSDF', () => {
    it('should generate a 3-channel MSDF for a colored square', () => {
      const shape = createColoredSquare();
      const bitmap = new Bitmap(Float32Array, 3, 32, 32);

      const projection = new Projection(new Vector2(28, 28), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      generateMSDF(bitmap, shape, transformation);

      // Check that bitmap has been filled
      const pixels = bitmap.data();
      expect(pixels.length).toBe(32 * 32 * 3);

      // Check all channels are valid
      expect(pixels.every((p) => !isNaN(p) && isFinite(p))).toBe(true);

      // Check that channels have different values (multi-channel nature)
      const centerPixel = bitmap.getPixel(16, 16);
      expect(centerPixel.length).toBe(3);

      // At least check they're all valid numbers
      expect(centerPixel[0]).toBeGreaterThan(0.4);
      expect(centerPixel[1]).toBeGreaterThan(0.4);
      expect(centerPixel[2]).toBeGreaterThan(0.4);
    });

    it('should work with custom MSDF config', () => {
      const shape = createColoredSquare();
      const bitmap = new Bitmap(Float32Array, 3, 16, 16);

      const projection = new Projection(new Vector2(14, 14), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      const config = new MSDFGeneratorConfig(true);

      expect(() => generateMSDF(bitmap, shape, transformation, config)).not.toThrow();
      expect(bitmap.data().every((p) => !isNaN(p) && isFinite(p))).toBe(true);
    });

    it('should handle shapes without edge coloring', () => {
      // This should still work, but colors will be WHITE
      const shape = createSquareShape();
      const bitmap = new Bitmap(Float32Array, 3, 16, 16);

      const projection = new Projection(new Vector2(14, 14), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      expect(() => generateMSDF(bitmap, shape, transformation)).not.toThrow();
      expect(bitmap.data().every((p) => !isNaN(p) && isFinite(p))).toBe(true);
    });
  });

  describe('generateMTSDF', () => {
    it('should generate a 4-channel MTSDF for a colored square', () => {
      const shape = createColoredSquare();
      const bitmap = new Bitmap(Float32Array, 4, 32, 32);

      const projection = new Projection(new Vector2(28, 28), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      generateMTSDF(bitmap, shape, transformation);

      // Check that bitmap has been filled
      const pixels = bitmap.data();
      expect(pixels.length).toBe(32 * 32 * 4);

      // Check all channels are valid
      expect(pixels.every((p) => !isNaN(p) && isFinite(p))).toBe(true);

      // Check that we have 4 channels
      const centerPixel = bitmap.getPixel(16, 16);
      expect(centerPixel.length).toBe(4);

      // All channels should be valid
      expect(centerPixel[0]).toBeGreaterThan(0.4); // R (MSDF)
      expect(centerPixel[1]).toBeGreaterThan(0.4); // G (MSDF)
      expect(centerPixel[2]).toBeGreaterThan(0.4); // B (MSDF)
      expect(centerPixel[3]).toBeGreaterThan(0.4); // A (true distance)
    });

    it('should work with custom MSDF config', () => {
      const shape = createColoredSquare();
      const bitmap = new Bitmap(Float32Array, 4, 16, 16);

      const projection = new Projection(new Vector2(14, 14), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      const config = new MSDFGeneratorConfig(false); // No overlap support

      expect(() => generateMTSDF(bitmap, shape, transformation, config)).not.toThrow();
      expect(bitmap.data().every((p) => !isNaN(p) && isFinite(p))).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should produce different results for SDF vs PSDF', () => {
      const shape = createSquareShape();
      const sdfBitmap = new Bitmap(Float32Array, 1, 32, 32);
      const psdfBitmap = new Bitmap(Float32Array, 1, 32, 32);

      const projection = new Projection(new Vector2(28, 28), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      generateSDF(sdfBitmap, shape, transformation);
      generatePSDF(psdfBitmap, shape, transformation);

      // They should be different (at least in some pixels)
      const sdfPixels = sdfBitmap.data();
      const psdfPixels = psdfBitmap.data();

      let differenceCount = 0;
      for (let i = 0; i < sdfPixels.length; i++) {
        if (Math.abs(sdfPixels[i] - psdfPixels[i]) > 0.001) {
          differenceCount++;
        }
      }

      // At least 10% of pixels should be different
      expect(differenceCount).toBeGreaterThan(sdfPixels.length * 0.1);
    });

    it('should handle edge coloring correctly for MSDF', () => {
      const shape = createSquareShape();

      // Color the shape
      edgeColoringSimple(shape, Math.PI, 0n);

      // Verify coloring was applied
      let coloredEdges = 0;
      for (const contour of shape.contours) {
        for (const edgeHolder of contour.edges) {
          if (edgeHolder.get().color !== EdgeColor.WHITE) {
            coloredEdges++;
          }
        }
      }
      expect(coloredEdges).toBeGreaterThan(0);

      // Generate MSDF
      const bitmap = new Bitmap(Float32Array, 3, 32, 32);
      const projection = new Projection(new Vector2(28, 28), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      generateMSDF(bitmap, shape, transformation);

      // Should complete without errors
      expect(bitmap.data().every((p) => !isNaN(p) && isFinite(p))).toBe(true);
    });

    it('should work with different ranges', () => {
      const shape = createSquareShape();
      const bitmap1 = new Bitmap(Float32Array, 1, 16, 16);
      const bitmap2 = new Bitmap(Float32Array, 1, 16, 16);

      const projection = new Projection(new Vector2(14, 14), new Vector2(-0.5, -0.5));
      const transformation1 = new SDFTransformation(projection, new Range(-1, 1));
      const transformation2 = new SDFTransformation(projection, new Range(-4, 4));

      generateSDF(bitmap1, shape, transformation1);
      generateSDF(bitmap2, shape, transformation2);

      // Both should work but produce different value ranges
      const pixels1 = bitmap1.data();
      const pixels2 = bitmap2.data();

      expect(pixels1.every((p) => !isNaN(p) && isFinite(p))).toBe(true);
      expect(pixels2.every((p) => !isNaN(p) && isFinite(p))).toBe(true);

      // The ranges should be different
      const max1 = Math.max(...pixels1);
      const max2 = Math.max(...pixels2);
      expect(Math.abs(max1 - max2)).toBeGreaterThan(0.01);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty shapes gracefully', () => {
      const shape = new Shape();
      const bitmap = new Bitmap(Float32Array, 1, 16, 16);

      const projection = new Projection(new Vector2(14, 14), new Vector2(-0.5, -0.5));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      // Should not throw
      expect(() => generateSDF(bitmap, shape, transformation)).not.toThrow();
    });

    it('should handle single-pixel bitmaps', () => {
      const shape = createSquareShape();
      const bitmap = new Bitmap(Float32Array, 1, 1, 1);

      const projection = new Projection(new Vector2(1, 1), new Vector2(0, 0));
      const transformation = new SDFTransformation(projection, new Range(-2, 2));

      expect(() => generateSDF(bitmap, shape, transformation)).not.toThrow();
      expect(bitmap.data()[0]).toBeDefined();
      expect(isFinite(bitmap.data()[0])).toBe(true);
    });
  });
});
