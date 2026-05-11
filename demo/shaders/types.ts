// TypeScript types matching WGSL shader layout

/**
 * Vertex input for quad corners
 */
export interface VertexInput {
  position: [number, number]; // vec2<f32>
  texCoord: [number, number]; // vec2<f32>
}

/**
 * Instance input for per-character transforms and UV bounds
 */
export interface InstanceInput {
  modelMatrix: Float32Array; // mat4x4<f32> - 16 floats
  uvBounds: [number, number, number, number]; // vec4<f32> - (u0, v0, u1, v1)
}

/**
 * Uniform data structure
 */
export interface UniformData {
  viewProjection: Float32Array; // mat4x4<f32> - 16 floats
  color: [number, number, number, number]; // vec4<f32> - (r, g, b, a)
  mode: number; // u32 - 0=rendered, 1=raw, 2=heatmap
}

/**
 * Buffer layout helpers
 */
export const BufferLayout = {
  /**
   * Vertex buffer stride: 2 floats (position) + 2 floats (texCoord) = 4 floats = 16 bytes
   */
  vertexStride: 16,

  /**
   * Instance buffer stride: 16 floats (mat4) + 4 floats (uvBounds) = 20 floats = 80 bytes
   */
  instanceStride: 80,

  /**
   * Uniform buffer size: 16 floats (mat4) + 4 floats (color) + 1 u32 (mode) + 3 u32 (padding) = 24 floats = 96 bytes
   * Note: WebGPU requires uniform buffer size to be a multiple of 16 bytes
   */
  uniformSize: 96,

  /**
   * Get vertex buffer offset for position attribute
   */
  vertexPositionOffset: 0,

  /**
   * Get vertex buffer offset for texCoord attribute
   */
  vertexTexCoordOffset: 8,

  /**
   * Get instance buffer offset for model matrix column 0
   */
  instanceModelCol0Offset: 0,

  /**
   * Get instance buffer offset for model matrix column 1
   */
  instanceModelCol1Offset: 16,

  /**
   * Get instance buffer offset for model matrix column 2
   */
  instanceModelCol2Offset: 32,

  /**
   * Get instance buffer offset for model matrix column 3
   */
  instanceModelCol3Offset: 48,

  /**
   * Get instance buffer offset for UV bounds
   */
  instanceUvBoundsOffset: 64,
};

/**
 * Create a Float32Array for a quad's vertex buffer
 * Contains 6 vertices (2 triangles) with positions and texture coordinates
 */
export function createQuadVertexData(): Float32Array {
  return new Float32Array([
    // Triangle 1
    -0.5, -0.5, 0.0, 0.0, // Bottom-left
    0.5, -0.5, 1.0, 0.0, // Bottom-right
    0.5, 0.5, 1.0, 1.0, // Top-right

    // Triangle 2
    -0.5, -0.5, 0.0, 0.0, // Bottom-left
    0.5, 0.5, 1.0, 1.0, // Top-right
    -0.5, 0.5, 0.0, 1.0, // Top-left
  ]);
}

/**
 * Create a Float32Array for uniform buffer
 */
export function createUniformData(data: UniformData): Float32Array {
  const buffer = new Float32Array(24); // 16 (mat4) + 4 (color) + 4 (mode + padding to align to 16 bytes)

  // View-projection matrix (16 floats)
  buffer.set(data.viewProjection, 0);

  // Color (4 floats)
  buffer.set(data.color, 16);

  // Mode (1 u32, stored as float)
  buffer[20] = data.mode;

  // Padding (3 u32 to reach 96 bytes / 16-byte alignment)
  buffer[21] = 0;
  buffer[22] = 0;
  buffer[23] = 0;

  return buffer;
}

/**
 * Pack instance data into a flat Float32Array
 */
export function packInstanceData(instances: InstanceInput[]): Float32Array {
  const buffer = new Float32Array(instances.length * 20); // 20 floats per instance

  for (let i = 0; i < instances.length; i++) {
    const offset = i * 20;
    const inst = instances[i];

    // Model matrix (16 floats)
    buffer.set(inst.modelMatrix, offset);

    // UV bounds (4 floats)
    buffer.set(inst.uvBounds, offset + 16);
  }

  return buffer;
}
