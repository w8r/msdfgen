/**
 * Viewport manages zoom and pan state for the WebGPU canvas.
 * Computes view-projection matrices for rendering.
 * Does NOT handle mouse events (that's for Plan 02).
 */
export class Viewport {
  private _zoom: number;
  private _panX: number;
  private _panY: number;
  private canvasWidth: number;
  private canvasHeight: number;

  private static readonly MIN_ZOOM = 0.1;
  private static readonly MAX_ZOOM = 10.0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this._zoom = 1.0;
    this._panX = 0;
    this._panY = 0;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Get current zoom level
   */
  get zoom(): number {
    return this._zoom;
  }

  /**
   * Get current pan X coordinate
   */
  get panX(): number {
    return this._panX;
  }

  /**
   * Get current pan Y coordinate
   */
  get panY(): number {
    return this._panY;
  }

  /**
   * Set zoom level (clamped to min/max)
   */
  setZoom(zoom: number): void {
    this._zoom = Math.max(
      Viewport.MIN_ZOOM,
      Math.min(Viewport.MAX_ZOOM, zoom)
    );
  }

  /**
   * Set pan coordinates
   */
  setPan(x: number, y: number): void {
    this._panX = x;
    this._panY = y;
  }

  /**
   * Update canvas dimensions
   */
  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * Get view-projection matrix as Float32Array (column-major for WebGPU)
   *
   * Creates an orthographic projection matrix with zoom and pan applied.
   * Origin is at top-left corner, Y-axis points down.
   *
   * @returns Float32Array with 16 elements (mat4x4)
   */
  getViewMatrix(): Float32Array {
    const matrix = new Float32Array(16);

    // Orthographic projection: maps canvas coordinates to NDC [-1, 1]
    // left = 0, right = canvasWidth, top = 0, bottom = canvasHeight

    const left = 0;
    const right = this.canvasWidth;
    const top = 0;
    const bottom = this.canvasHeight;
    const near = -1;
    const far = 1;

    // Apply zoom by scaling the coordinate space
    const zoomedLeft = left / this._zoom;
    const zoomedRight = right / this._zoom;
    const zoomedTop = top / this._zoom;
    const zoomedBottom = bottom / this._zoom;

    // Apply pan by translating the coordinate space
    const pannedLeft = zoomedLeft - this._panX / this._zoom;
    const pannedRight = zoomedRight - this._panX / this._zoom;
    const pannedTop = zoomedTop - this._panY / this._zoom;
    const pannedBottom = zoomedBottom - this._panY / this._zoom;

    // Construct orthographic projection matrix (column-major)
    const width = pannedRight - pannedLeft;
    const height = pannedBottom - pannedTop;
    const depth = far - near;

    // Column 0
    matrix[0] = 2 / width;
    matrix[1] = 0;
    matrix[2] = 0;
    matrix[3] = 0;

    // Column 1
    matrix[4] = 0;
    matrix[5] = 2 / height;
    matrix[6] = 0;
    matrix[7] = 0;

    // Column 2
    matrix[8] = 0;
    matrix[9] = 0;
    matrix[10] = -2 / depth;
    matrix[11] = 0;

    // Column 3 (translation)
    matrix[12] = -(pannedRight + pannedLeft) / width;
    matrix[13] = -(pannedBottom + pannedTop) / height;
    matrix[14] = -(far + near) / depth;
    matrix[15] = 1;

    return matrix;
  }
}
