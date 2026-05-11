/**
 * MSDFRenderer handles WebGPU rendering pipeline for MSDF text.
 * Manages device initialization, pipeline creation, texture uploads, and rendering.
 */

import type { AtlasResult } from '../../src/atlas';
import { createQuadVertexData, createUniformData } from '../shaders/types';
import shaderCode from '../shaders/msdf.wgsl?raw';

export class MSDFRenderer {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;
  private pipeline: GPURenderPipeline;
  private bindGroup: GPUBindGroup;

  // Buffers
  private quadVertexBuffer: GPUBuffer;
  private instanceBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer;

  // Texture resources
  private atlasTexture: GPUTexture | null = null;
  private sampler: GPUSampler;

  // State
  private instanceCount = 0;
  private currentColor: [number, number, number, number] = [1, 1, 1, 1];
  private currentMode = 0;

  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
    pipeline: GPURenderPipeline,
    quadVertexBuffer: GPUBuffer,
    uniformBuffer: GPUBuffer,
    sampler: GPUSampler,
    bindGroup: GPUBindGroup
  ) {
    this.device = device;
    this.context = context;
    this.format = format;
    this.pipeline = pipeline;
    this.quadVertexBuffer = quadVertexBuffer;
    this.uniformBuffer = uniformBuffer;
    this.sampler = sampler;
    this.bindGroup = bindGroup;
  }

  /**
   * Initialize WebGPU renderer
   */
  static async init(
    canvas: HTMLCanvasElement,
    onError: (msg: string) => void
  ): Promise<MSDFRenderer | null> {
    // Check WebGPU support
    if (!navigator.gpu) {
      onError(
        'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Safari 18+.'
      );
      return null;
    }

    // Request adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      onError(
        'Failed to get WebGPU adapter. Your GPU may not support WebGPU.'
      );
      return null;
    }

    // Request device
    let device: GPUDevice;
    try {
      device = await adapter.requestDevice();
    } catch (err) {
      onError(`Failed to create WebGPU device: ${(err as Error).message}`);
      return null;
    }

    // Get canvas context
    const context = canvas.getContext('webgpu');
    if (!context) {
      onError('Failed to get WebGPU context from canvas.');
      return null;
    }

    // Configure context
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: 'premultiplied',
    });

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: shaderCode,
    });

    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' },
        },
      ],
    });

    // Create pipeline layout
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    });

    // Create render pipeline
    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            // Vertex buffer: position + texCoord
            arrayStride: 16,
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
              { shaderLocation: 1, offset: 8, format: 'float32x2' }, // texCoord
            ],
          },
          {
            // Instance buffer: model matrix + uvBounds
            arrayStride: 80,
            stepMode: 'instance',
            attributes: [
              { shaderLocation: 2, offset: 0, format: 'float32x4' }, // modelCol0
              { shaderLocation: 3, offset: 16, format: 'float32x4' }, // modelCol1
              { shaderLocation: 4, offset: 32, format: 'float32x4' }, // modelCol2
              { shaderLocation: 5, offset: 48, format: 'float32x4' }, // modelCol3
              { shaderLocation: 6, offset: 64, format: 'float32x4' }, // uvBounds
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    // Create quad vertex buffer
    const quadVertexData = createQuadVertexData();
    const quadVertexBuffer = device.createBuffer({
      size: quadVertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(quadVertexBuffer, 0, quadVertexData);

    // Create uniform buffer
    const uniformBuffer = device.createBuffer({
      size: 88, // 16 floats (mat4) + 4 floats (color) + 2 u32 (mode + padding)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Create sampler
    const sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    // Create a placeholder 1x1 white texture (will be replaced by atlas)
    const placeholderTexture = device.createTexture({
      size: { width: 1, height: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture: placeholderTexture },
      new Uint8Array([255, 255, 255, 255]),
      { bytesPerRow: 4 },
      { width: 1, height: 1 }
    );

    // Create bind group with placeholder texture
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: placeholderTexture.createView() },
        { binding: 2, resource: sampler },
      ],
    });

    return new MSDFRenderer(
      device,
      context,
      format,
      pipeline,
      quadVertexBuffer,
      uniformBuffer,
      sampler,
      bindGroup
    );
  }

  /**
   * Upload MSDF atlas texture to GPU
   */
  uploadAtlas(atlas: AtlasResult): void {
    const { atlasWidth, atlasHeight } = atlas;
    const floatData = atlas.atlas.data(); // Float32Array, 3 channels (RGB)

    // Convert RGB Float32 (0.0-1.0) to RGBA Uint8 (0-255)
    const uint8Data = new Uint8Array(atlasWidth * atlasHeight * 4);
    for (let i = 0; i < atlasWidth * atlasHeight; i++) {
      uint8Data[i * 4 + 0] = Math.round(floatData[i * 3 + 0] * 255); // R
      uint8Data[i * 4 + 1] = Math.round(floatData[i * 3 + 1] * 255); // G
      uint8Data[i * 4 + 2] = Math.round(floatData[i * 3 + 2] * 255); // B
      uint8Data[i * 4 + 3] = 255; // A
    }

    // Calculate aligned bytesPerRow (must be multiple of 256)
    const bytesPerRow = Math.ceil((atlasWidth * 4) / 256) * 256;

    // Pad row data if necessary
    const paddedData = new Uint8Array(bytesPerRow * atlasHeight);
    for (let y = 0; y < atlasHeight; y++) {
      const srcOffset = y * atlasWidth * 4;
      const dstOffset = y * bytesPerRow;
      paddedData.set(
        uint8Data.subarray(srcOffset, srcOffset + atlasWidth * 4),
        dstOffset
      );
    }

    // Create atlas texture
    this.atlasTexture = this.device.createTexture({
      size: { width: atlasWidth, height: atlasHeight },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    // Upload texture data
    this.device.queue.writeTexture(
      { texture: this.atlasTexture },
      paddedData,
      { bytesPerRow, rowsPerImage: atlasHeight },
      { width: atlasWidth, height: atlasHeight }
    );

    // Recreate bind group with new texture
    const bindGroupLayout = this.pipeline.getBindGroupLayout(0);
    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.atlasTexture.createView() },
        { binding: 2, resource: this.sampler },
      ],
    });
  }

  /**
   * Update text instance buffer
   */
  updateTextInstances(instanceData: Float32Array): void {
    const requiredSize = instanceData.byteLength;

    // Recreate instance buffer if size changed or doesn't exist
    if (
      !this.instanceBuffer ||
      this.instanceBuffer.size < requiredSize
    ) {
      if (this.instanceBuffer) {
        this.instanceBuffer.destroy();
      }

      this.instanceBuffer = this.device.createBuffer({
        size: requiredSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
    }

    // Write instance data
    this.device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);

    // Update instance count
    this.instanceCount = instanceData.length / 20; // 20 floats per instance
  }

  /**
   * Set visualization mode
   */
  setVisualizationMode(mode: number): void {
    this.currentMode = mode;
  }

  /**
   * Set text color
   */
  setColor(r: number, g: number, b: number, a: number): void {
    this.currentColor = [r, g, b, a];
  }

  /**
   * Render frame
   */
  render(viewMatrix: Float32Array): void {
    if (!this.instanceBuffer || this.instanceCount === 0) {
      // Nothing to render
      return;
    }

    // Update uniform buffer
    const uniformData = createUniformData({
      viewProjection: viewMatrix,
      color: this.currentColor,
      mode: this.currentMode,
    });
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    // Get current texture to render to
    const textureView = this.context.getCurrentTexture().createView();

    // Create command encoder
    const encoder = this.device.createCommandEncoder();

    // Begin render pass
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, // Match #1a1a1a background
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    // Set pipeline and bind group
    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);

    // Set vertex buffers
    renderPass.setVertexBuffer(0, this.quadVertexBuffer);
    renderPass.setVertexBuffer(1, this.instanceBuffer);

    // Draw instanced quads (6 vertices per quad)
    renderPass.draw(6, this.instanceCount);

    renderPass.end();

    // Submit commands
    this.device.queue.submit([encoder.finish()]);
  }
}
