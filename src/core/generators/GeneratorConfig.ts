/**
 * Mode of operation for error correction.
 *
 * TypeScript port of msdfgen::ErrorCorrectionConfig::Mode
 * @author Viktor Chlumsky (original C++)
 */
export enum ErrorCorrectionMode {
  /** Skips error correction pass */
  DISABLED = 'DISABLED',
  /** Corrects all discontinuities regardless if edges are adversely affected */
  INDISCRIMINATE = 'INDISCRIMINATE',
  /** Corrects artifacts at edges only if it does not affect edges or corners */
  EDGE_PRIORITY = 'EDGE_PRIORITY',
  /** Only corrects artifacts at edges */
  EDGE_ONLY = 'EDGE_ONLY',
}

/**
 * Configuration of distance checking algorithm for error correction.
 *
 * TypeScript port of msdfgen::ErrorCorrectionConfig::DistanceCheckMode
 * @author Viktor Chlumsky (original C++)
 */
export enum DistanceCheckMode {
  /** Never computes exact shape distance */
  DO_NOT_CHECK_DISTANCE = 'DO_NOT_CHECK_DISTANCE',
  /** Only computes exact shape distance at edges (good balance) */
  CHECK_DISTANCE_AT_EDGE = 'CHECK_DISTANCE_AT_EDGE',
  /** Computes and compares exact shape distance for each artifact */
  ALWAYS_CHECK_DISTANCE = 'ALWAYS_CHECK_DISTANCE',
}

/**
 * The configuration of the MSDF error correction pass.
 *
 * TypeScript port of msdfgen::ErrorCorrectionConfig from core/generator-config.h
 * @author Viktor Chlumsky (original C++)
 */
export class ErrorCorrectionConfig {
  /** The default value of minDeviationRatio (10/9 = 1.11111...) */
  public static readonly defaultMinDeviationRatio = 10 / 9;

  /** The default value of minImproveRatio (10/9 = 1.11111...) */
  public static readonly defaultMinImproveRatio = 10 / 9;

  /** Mode of operation */
  public mode: ErrorCorrectionMode;

  /** Configuration of distance checking algorithm */
  public distanceCheckMode: DistanceCheckMode;

  /**
   * The minimum ratio between the actual and maximum expected distance delta
   * to be considered an error
   */
  public minDeviationRatio: number;

  /**
   * The minimum ratio between the pre-correction distance error and
   * the post-correction distance error
   */
  public minImproveRatio: number;

  /**
   * An optional buffer to avoid dynamic allocation.
   * Must have at least as many bytes as the MSDF has pixels.
   * In TypeScript, we use Uint8Array for this purpose.
   */
  public buffer: Uint8Array | null;

  constructor(
    mode: ErrorCorrectionMode = ErrorCorrectionMode.EDGE_PRIORITY,
    distanceCheckMode: DistanceCheckMode = DistanceCheckMode.CHECK_DISTANCE_AT_EDGE,
    minDeviationRatio: number = ErrorCorrectionConfig.defaultMinDeviationRatio,
    minImproveRatio: number = ErrorCorrectionConfig.defaultMinImproveRatio,
    buffer: Uint8Array | null = null
  ) {
    this.mode = mode;
    this.distanceCheckMode = distanceCheckMode;
    this.minDeviationRatio = minDeviationRatio;
    this.minImproveRatio = minImproveRatio;
    this.buffer = buffer;
  }
}

/**
 * The configuration of the distance field generator algorithm.
 *
 * TypeScript port of msdfgen::GeneratorConfig from core/generator-config.h
 * @author Viktor Chlumsky (original C++)
 */
export class GeneratorConfig {
  /**
   * Specifies whether to use the version of the algorithm that supports
   * overlapping contours with the same winding. May be set to false to
   * improve performance when no such contours are present.
   */
  public overlapSupport: boolean;

  constructor(overlapSupport: boolean = true) {
    this.overlapSupport = overlapSupport;
  }
}

/**
 * The configuration of the multi-channel distance field generator algorithm.
 *
 * TypeScript port of msdfgen::MSDFGeneratorConfig from core/generator-config.h
 * @author Viktor Chlumsky (original C++)
 */
export class MSDFGeneratorConfig extends GeneratorConfig {
  /** Configuration of the error correction pass */
  public errorCorrection: ErrorCorrectionConfig;

  constructor();
  constructor(overlapSupport: boolean, errorCorrection?: ErrorCorrectionConfig);

  constructor(
    overlapSupport?: boolean,
    errorCorrection?: ErrorCorrectionConfig
  ) {
    super(overlapSupport ?? true);
    this.errorCorrection =
      errorCorrection ?? new ErrorCorrectionConfig();
  }
}
