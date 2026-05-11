// MSDF Vertex and Fragment Shaders for WebGPU
// Implements median-based MSDF sampling with three visualization modes

// Vertex shader inputs
struct VertexInput {
  @location(0) position: vec2<f32>,  // Quad corner position (-0.5 to 0.5)
  @location(1) texCoord: vec2<f32>,  // Quad UV (0 to 1)
}

// Instance inputs (per-character data)
struct InstanceInput {
  @location(2) modelCol0: vec4<f32>,  // Transform matrix column 0
  @location(3) modelCol1: vec4<f32>,  // Transform matrix column 1
  @location(4) modelCol2: vec4<f32>,  // Transform matrix column 2
  @location(5) modelCol3: vec4<f32>,  // Transform matrix column 3
  @location(6) uvBounds: vec4<f32>,   // Atlas UV bounds (u0, v0, u1, v1)
}

// Vertex shader output / Fragment shader input
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

// Uniforms
struct Uniforms {
  viewProjection: mat4x4<f32>,
  color: vec4<f32>,
  mode: u32,  // 0=rendered, 1=raw, 2=heatmap
  _padding: u32,  // Alignment padding
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var atlasTexture: texture_2d<f32>;
@group(0) @binding(2) var atlasSampler: sampler;

// Vertex shader: Transform instanced quad corners
@vertex
fn vertexMain(vert: VertexInput, inst: InstanceInput) -> VertexOutput {
  // Reconstruct model matrix from instance columns
  let model = mat4x4<f32>(inst.modelCol0, inst.modelCol1, inst.modelCol2, inst.modelCol3);

  // Transform quad position by model matrix
  let worldPos = model * vec4<f32>(vert.position, 0.0, 1.0);

  var output: VertexOutput;
  output.position = uniforms.viewProjection * worldPos;

  // Map quad UV (0-1) to atlas UV bounds
  output.uv = mix(inst.uvBounds.xy, inst.uvBounds.zw, vert.texCoord);

  return output;
}

// Median function for MSDF sampling
fn median(r: f32, g: f32, b: f32) -> f32 {
  return max(min(r, g), min(max(r, g), b));
}

// Fragment shader: Sample MSDF and apply visualization mode
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  // Sample MSDF atlas texture
  let msdf = textureSample(atlasTexture, atlasSampler, input.uv);

  // Compute median distance from RGB channels
  let dist = median(msdf.r, msdf.g, msdf.b);

  // Mode 1: Raw MSDF visualization (show RGB channels directly)
  if (uniforms.mode == 1u) {
    return vec4<f32>(msdf.rgb, 1.0);
  }

  // Mode 2: Heatmap visualization (distance gradient)
  if (uniforms.mode == 2u) {
    // Map distance to hot-to-cold gradient
    // Red (far from edge) -> Yellow -> Green -> Blue (close to edge)
    var color: vec3<f32>;

    if (dist < 0.4) {
      // Red to Yellow
      let t = dist / 0.4;
      color = mix(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 0.0), t);
    } else if (dist < 0.6) {
      // Yellow to Green
      let t = (dist - 0.4) / 0.2;
      color = mix(vec3<f32>(1.0, 1.0, 0.0), vec3<f32>(0.0, 1.0, 0.0), t);
    } else {
      // Green to Blue
      let t = (dist - 0.6) / 0.4;
      color = mix(vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0), t);
    }

    return vec4<f32>(color, 1.0);
  }

  // Mode 0: Standard MSDF rendering with derivative-based antialiasing
  // Use screen-space derivatives to compute antialiasing width
  let dx = dpdx(dist);
  let dy = dpdy(dist);
  let width = length(vec2<f32>(dx, dy));

  // Apply smoothstep antialiasing centered at 0.5
  let alpha = smoothstep(0.5 - width, 0.5 + width, dist);

  return vec4<f32>(uniforms.color.rgb, uniforms.color.a * alpha);
}
