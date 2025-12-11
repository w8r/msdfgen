import type { Bitmap } from '../bitmap/Bitmap';
import type { Shape } from '../shape/Shape';
import { SDFTransformation } from './SDFTransformation';
import { GeneratorConfig, MSDFGeneratorConfig } from './GeneratorConfig';
import { ShapeDistanceFinder } from '../distance/ShapeDistanceFinder';
import { SimpleContourCombiner } from '../distance/SimpleContourCombiner';
import { OverlappingContourCombiner } from '../distance/OverlappingContourCombiner';
import { TrueDistanceSelector } from '../distance/TrueDistanceSelector';
import { PerpendicularDistanceSelector } from '../distance/PerpendicularDistanceSelector';
import { MultiDistanceSelector } from '../distance/MultiDistanceSelector';
import { MultiAndTrueDistanceSelector } from '../distance/MultiAndTrueDistanceSelector';
import { Vector2 } from '../types/Vector2';
import type { SignedDistance } from '../types/SignedDistance';

/**
 * Distance-to-pixel conversion helper for single-channel SDF
 */
class SingleChannelConverter {
  constructor(private distanceMapping: (distance: number) => number) {}

  convert(pixels: Float32Array, offset: number, distance: SignedDistance): void {
    pixels[offset] = this.distanceMapping(distance.distance);
  }
}

/**
 * Distance-to-pixel conversion helper for 3-channel MSDF
 */
class MultiChannelConverter {
  constructor(private distanceMapping: (distance: number) => number) {}

  convert(
    pixels: Float32Array,
    offset: number,
    distance: { r: number; g: number; b: number }
  ): void {
    pixels[offset] = this.distanceMapping(distance.r);
    pixels[offset + 1] = this.distanceMapping(distance.g);
    pixels[offset + 2] = this.distanceMapping(distance.b);
  }
}

/**
 * Distance-to-pixel conversion helper for 4-channel MTSDF
 */
class MultiAndTrueChannelConverter {
  constructor(private distanceMapping: (distance: number) => number) {}

  convert(
    pixels: Float32Array,
    offset: number,
    distance: { r: number; g: number; b: number; a: number }
  ): void {
    pixels[offset] = this.distanceMapping(distance.r);
    pixels[offset + 1] = this.distanceMapping(distance.g);
    pixels[offset + 2] = this.distanceMapping(distance.b);
    pixels[offset + 3] = this.distanceMapping(distance.a);
  }
}

/**
 * Core distance field generation function (generic)
 */
function generateDistanceField<TSelector, TDistance>(
  output: Bitmap<Float32Array, 1 | 3 | 4>,
  shape: Shape,
  transformation: SDFTransformation,
  createCombiner: () => SimpleContourCombiner<TDistance, TSelector> | OverlappingContourCombiner<TDistance, TSelector>,
  convertDistance: (pixels: Float32Array, offset: number, distance: TDistance) => void
): void {
  const width = output.width();
  const height = output.height();
  const channelCount = output.channelCount();
  const pixels = output.data();

  // Reorient based on shape's Y-axis orientation
  const yDirection = shape.getYAxisOrientation() === 'Y_UPWARD' ? -1 : 1;
  const yStart = yDirection < 0 ? height - 1 : 0;

  // Create distance finder
  const distanceFinder = new ShapeDistanceFinder(shape, createCombiner);

  // Generate distance field
  // Use serpentine scan pattern for better cache coherence
  let xDirection = 1;
  for (let row = 0; row < height; row++) {
    const y = yDirection < 0 ? yStart - row * yDirection : yStart + row * yDirection;
    let x = xDirection < 0 ? width - 1 : 0;

    for (let col = 0; col < width; col++) {
      // Sample at pixel center (x + 0.5, y + 0.5)
      const p = transformation.unproject(new Vector2(x + 0.5, y + 0.5));

      // Find distance
      const distance = distanceFinder.distance(p);

      // Convert to pixels
      const pixelOffset = (y * width + x) * channelCount;
      convertDistance(pixels, pixelOffset, distance);

      x += xDirection;
    }
    xDirection = -xDirection; // Serpentine pattern
  }
}

/**
 * Generates a conventional single-channel signed distance field.
 *
 * TypeScript port of msdfgen::generateSDF from core/msdfgen.cpp
 * @param output - Output bitmap (1 channel, Float32Array)
 * @param shape - Input shape
 * @param transformation - Spatial and distance transformation
 * @param config - Generator configuration
 *
 * @author Viktor Chlumsky (original C++)
 */
export function generateSDF(
  output: Bitmap<Float32Array, 1>,
  shape: Shape,
  transformation: SDFTransformation,
  config: GeneratorConfig = new GeneratorConfig()
): void {
  const distanceMapping = transformation.distanceMapping;
  const converter = new SingleChannelConverter((d) => distanceMapping.map(d));

  if (config.overlapSupport) {
    generateDistanceField<TrueDistanceSelector, SignedDistance>(
      output,
      shape,
      transformation,
      () => new OverlappingContourCombiner(() => new TrueDistanceSelector()),
      (pixels, offset, distance) => converter.convert(pixels, offset, distance)
    );
  } else {
    generateDistanceField<TrueDistanceSelector, SignedDistance>(
      output,
      shape,
      transformation,
      () => new SimpleContourCombiner(() => new TrueDistanceSelector()),
      (pixels, offset, distance) => converter.convert(pixels, offset, distance)
    );
  }
}

/**
 * Generates a perpendicular signed distance field (PSDF).
 * Uses perpendicular distance from edges instead of true Euclidean distance.
 *
 * TypeScript port of msdfgen::generatePSDF from core/msdfgen.cpp
 * @param output - Output bitmap (1 channel, Float32Array)
 * @param shape - Input shape
 * @param transformation - Spatial and distance transformation
 * @param config - Generator configuration
 *
 * @author Viktor Chlumsky (original C++)
 */
export function generatePSDF(
  output: Bitmap<Float32Array, 1>,
  shape: Shape,
  transformation: SDFTransformation,
  config: GeneratorConfig = new GeneratorConfig()
): void {
  const distanceMapping = transformation.distanceMapping;
  const converter = new SingleChannelConverter((d) => distanceMapping.map(d));

  if (config.overlapSupport) {
    generateDistanceField<PerpendicularDistanceSelector, SignedDistance>(
      output,
      shape,
      transformation,
      () => new OverlappingContourCombiner(() => new PerpendicularDistanceSelector()),
      (pixels, offset, distance) => converter.convert(pixels, offset, distance)
    );
  } else {
    generateDistanceField<PerpendicularDistanceSelector, SignedDistance>(
      output,
      shape,
      transformation,
      () => new SimpleContourCombiner(() => new PerpendicularDistanceSelector()),
      (pixels, offset, distance) => converter.convert(pixels, offset, distance)
    );
  }
}

/**
 * Generates a multi-channel signed distance field (MSDF).
 * Encodes distance information in 3 color channels for sharp corner preservation.
 *
 * TypeScript port of msdfgen::generateMSDF from core/msdfgen.cpp
 * @param output - Output bitmap (3 channels, Float32Array)
 * @param shape - Input shape (must have edge coloring applied)
 * @param transformation - Spatial and distance transformation
 * @param config - MSDF generator configuration (includes error correction)
 *
 * @author Viktor Chlumsky (original C++)
 */
export function generateMSDF(
  output: Bitmap<Float32Array, 3>,
  shape: Shape,
  transformation: SDFTransformation,
  config: MSDFGeneratorConfig = new MSDFGeneratorConfig()
): void {
  const distanceMapping = transformation.distanceMapping;
  const converter = new MultiChannelConverter((d) => distanceMapping.map(d));

  if (config.overlapSupport) {
    generateDistanceField<
      MultiDistanceSelector,
      { r: number; g: number; b: number }
    >(
      output,
      shape,
      transformation,
      () => new OverlappingContourCombiner(() => new MultiDistanceSelector()),
      (pixels, offset, distance) => converter.convert(pixels, offset, distance)
    );
  } else {
    generateDistanceField<
      MultiDistanceSelector,
      { r: number; g: number; b: number }
    >(
      output,
      shape,
      transformation,
      () => new SimpleContourCombiner(() => new MultiDistanceSelector()),
      (pixels, offset, distance) => converter.convert(pixels, offset, distance)
    );
  }

  // TODO: Apply error correction when Phase 5 is implemented
  // msdfErrorCorrection(output, shape, transformation, config);
}

/**
 * Generates a multi-channel and true distance field (MTSDF).
 * Combines MSDF (RGB) with true distance (Alpha channel).
 *
 * TypeScript port of msdfgen::generateMTSDF from core/msdfgen.cpp
 * @param output - Output bitmap (4 channels, Float32Array)
 * @param shape - Input shape (must have edge coloring applied)
 * @param transformation - Spatial and distance transformation
 * @param config - MSDF generator configuration (includes error correction)
 *
 * @author Viktor Chlumsky (original C++)
 */
export function generateMTSDF(
  output: Bitmap<Float32Array, 4>,
  shape: Shape,
  transformation: SDFTransformation,
  config: MSDFGeneratorConfig = new MSDFGeneratorConfig()
): void {
  const distanceMapping = transformation.distanceMapping;
  const converter = new MultiAndTrueChannelConverter((d) => distanceMapping.map(d));

  if (config.overlapSupport) {
    generateDistanceField<
      MultiAndTrueDistanceSelector,
      { r: number; g: number; b: number; a: number }
    >(
      output,
      shape,
      transformation,
      () => new OverlappingContourCombiner(() => new MultiAndTrueDistanceSelector()),
      (pixels, offset, distance) => converter.convert(pixels, offset, distance)
    );
  } else {
    generateDistanceField<
      MultiAndTrueDistanceSelector,
      { r: number; g: number; b: number; a: number }
    >(
      output,
      shape,
      transformation,
      () => new SimpleContourCombiner(() => new MultiAndTrueDistanceSelector()),
      (pixels, offset, distance) => converter.convert(pixels, offset, distance)
    );
  }

  // TODO: Apply error correction when Phase 5 is implemented
  // msdfErrorCorrection(output, shape, transformation, config);
}

/**
 * Legacy alias for generatePSDF
 * @deprecated Use generatePSDF instead
 */
export function generatePseudoSDF(
  output: Bitmap<Float32Array, 1>,
  shape: Shape,
  transformation: SDFTransformation,
  config: GeneratorConfig = new GeneratorConfig()
): void {
  generatePSDF(output, shape, transformation, config);
}
