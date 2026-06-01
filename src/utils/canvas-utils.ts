/**
 * Utilities for converting MSDF bitmaps to Canvas/ImageData format
 */

import type { Bitmap } from '../core/bitmap/Bitmap';

/**
 * Converts a single-channel (SDF/PSDF) bitmap to grayscale ImageData
 */
export function sdfToImageData(bitmap: Bitmap<Float32Array, 1>): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const sdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const value = Math.max(0, Math.min(255, Math.round(sdfData[i] * 255)));
    const offset = i * 4;
    pixels[offset] = value;     // R
    pixels[offset + 1] = value; // G
    pixels[offset + 2] = value; // B
    pixels[offset + 3] = 255;   // A
  }

  return imageData;
}

/**
 * Converts a 3-channel MSDF bitmap to RGB ImageData
 */
export function msdfToImageData(bitmap: Bitmap<Float32Array, 3>): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const msdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const msdfOffset = i * 3;
    const pixelOffset = i * 4;

    pixels[pixelOffset] = Math.max(0, Math.min(255, Math.round(msdfData[msdfOffset] * 255)));     // R
    pixels[pixelOffset + 1] = Math.max(0, Math.min(255, Math.round(msdfData[msdfOffset + 1] * 255))); // G
    pixels[pixelOffset + 2] = Math.max(0, Math.min(255, Math.round(msdfData[msdfOffset + 2] * 255))); // B
    pixels[pixelOffset + 3] = 255; // A
  }

  return imageData;
}

/**
 * Converts a 4-channel MTSDF bitmap to RGBA ImageData
 */
export function mtsdfToImageData(bitmap: Bitmap<Float32Array, 4>): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const mtsdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const mtsdfOffset = i * 4;
    const pixelOffset = i * 4;

    pixels[pixelOffset] = Math.max(0, Math.min(255, Math.round(mtsdfData[mtsdfOffset] * 255)));     // R
    pixels[pixelOffset + 1] = Math.max(0, Math.min(255, Math.round(mtsdfData[mtsdfOffset + 1] * 255))); // G
    pixels[pixelOffset + 2] = Math.max(0, Math.min(255, Math.round(mtsdfData[mtsdfOffset + 2] * 255))); // B
    pixels[pixelOffset + 3] = Math.max(0, Math.min(255, Math.round(mtsdfData[mtsdfOffset + 3] * 255))); // A
  }

  return imageData;
}

/**
 * Renders an ImageData to a canvas context
 */
export function renderToCanvas(
  imageData: ImageData,
  canvas: HTMLCanvasElement,
  scale: number = 1
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
  }

  // Set canvas size
  canvas.width = imageData.width * scale;
  canvas.height = imageData.height * scale;

  // Disable image smoothing for crisp pixels
  ctx.imageSmoothingEnabled = false;

  // Create temporary canvas for the original size
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('Could not create temporary canvas context');
  }

  // Put image data on temp canvas
  tempCtx.putImageData(imageData, 0, 0);

  // Draw scaled to main canvas
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
}

/**
 * Renders MSDF with distance field visualization (shows the median channel)
 */
export function renderMSDFMedian(bitmap: Bitmap<Float32Array, 3>): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const msdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const msdfOffset = i * 3;
    const r = msdfData[msdfOffset];
    const g = msdfData[msdfOffset + 1];
    const b = msdfData[msdfOffset + 2];

    // Calculate median
    const median = Math.max(Math.min(r, g), Math.min(Math.max(r, g), b));
    const value = Math.max(0, Math.min(255, Math.round(median * 255)));

    const pixelOffset = i * 4;
    pixels[pixelOffset] = value;     // R
    pixels[pixelOffset + 1] = value; // G
    pixels[pixelOffset + 2] = value; // B
    pixels[pixelOffset + 3] = 255;   // A
  }

  return imageData;
}

/**
 * Renders SDF as a binary shape (black/white) using threshold
 * This simulates how SDF would be rendered in a shader
 */
export function renderSDFShape(bitmap: Bitmap<Float32Array, 1>, threshold: number = 0.5): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const sdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const distance = sdfData[i];
    // Simple threshold: > 0.5 is inside (white), < 0.5 is outside (black)
    const alpha = distance >= threshold ? 255 : 0;

    const pixelOffset = i * 4;
    pixels[pixelOffset] = 255;     // R (white)
    pixels[pixelOffset + 1] = 255; // G (white)
    pixels[pixelOffset + 2] = 255; // B (white)
    pixels[pixelOffset + 3] = alpha; // A
  }

  return imageData;
}

/**
 * Renders MSDF as a shape using the median distance for thresholding
 * This simulates how MSDF would be rendered in a shader
 */
export function renderMSDFShape(bitmap: Bitmap<Float32Array, 3>, threshold: number = 0.5): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const msdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const msdfOffset = i * 3;
    const r = msdfData[msdfOffset];
    const g = msdfData[msdfOffset + 1];
    const b = msdfData[msdfOffset + 2];

    // Calculate median (this is how MSDF is sampled in shaders)
    const median = Math.max(Math.min(r, g), Math.min(Math.max(r, g), b));
    const alpha = median >= threshold ? 255 : 0;

    const pixelOffset = i * 4;
    pixels[pixelOffset] = 255;     // R (white)
    pixels[pixelOffset + 1] = 255; // G (white)
    pixels[pixelOffset + 2] = 255; // B (white)
    pixels[pixelOffset + 3] = alpha; // A
  }

  return imageData;
}

/**
 * Renders SDF with smooth antialiasing using smoothstep
 * This shows the quality of the antialiasing that SDF provides
 */
export function renderSDFAntialiased(bitmap: Bitmap<Float32Array, 1>, threshold: number = 0.5, smoothing: number = 0.1): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const sdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const distance = sdfData[i];

    // Smoothstep for antialiasing
    const edge0 = threshold - smoothing / 2;
    const edge1 = threshold + smoothing / 2;
    let alpha = (distance - edge0) / (edge1 - edge0);
    alpha = Math.max(0, Math.min(1, alpha)); // clamp
    alpha = alpha * alpha * (3 - 2 * alpha); // smoothstep

    const alphaValue = Math.round(alpha * 255);

    const pixelOffset = i * 4;
    pixels[pixelOffset] = 255;     // R (white)
    pixels[pixelOffset + 1] = 255; // G (white)
    pixels[pixelOffset + 2] = 255; // B (white)
    pixels[pixelOffset + 3] = alphaValue; // A
  }

  return imageData;
}

/**
 * Renders MSDF with smooth antialiasing using the median
 * This shows the superior quality of MSDF antialiasing
 */
export function renderMSDFAntialiased(bitmap: Bitmap<Float32Array, 3>, threshold: number = 0.5, smoothing: number = 0.1): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const msdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const msdfOffset = i * 3;
    const r = msdfData[msdfOffset];
    const g = msdfData[msdfOffset + 1];
    const b = msdfData[msdfOffset + 2];

    // Calculate median
    const median = Math.max(Math.min(r, g), Math.min(Math.max(r, g), b));

    // Smoothstep for antialiasing
    const edge0 = threshold - smoothing / 2;
    const edge1 = threshold + smoothing / 2;
    let alpha = (median - edge0) / (edge1 - edge0);
    alpha = Math.max(0, Math.min(1, alpha)); // clamp
    alpha = alpha * alpha * (3 - 2 * alpha); // smoothstep

    const alphaValue = Math.round(alpha * 255);

    const pixelOffset = i * 4;
    pixels[pixelOffset] = 255;     // R (white)
    pixels[pixelOffset + 1] = 255; // G (white)
    pixels[pixelOffset + 2] = 255; // B (white)
    pixels[pixelOffset + 3] = alphaValue; // A
  }

  return imageData;
}

/**
 * Renders MTSDF with smooth antialiasing using the median of RGB channels
 * MTSDF has 4 channels (RGB for MSDF + alpha for true distance)
 */
export function renderMTSDFAntialiased(bitmap: Bitmap<Float32Array, 4>, threshold: number = 0.5, smoothing: number = 0.1): ImageData {
  const width = bitmap.width();
  const height = bitmap.height();
  const imageData = new ImageData(width, height);
  const mtsdfData = bitmap.data();
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const mtsdfOffset = i * 4;
    const r = mtsdfData[mtsdfOffset];
    const g = mtsdfData[mtsdfOffset + 1];
    const b = mtsdfData[mtsdfOffset + 2];
    // Alpha channel (mtsdfData[mtsdfOffset + 3]) contains true distance, not used here

    // Calculate median of RGB channels (same as MSDF)
    const median = Math.max(Math.min(r, g), Math.min(Math.max(r, g), b));

    // Smoothstep for antialiasing
    const edge0 = threshold - smoothing / 2;
    const edge1 = threshold + smoothing / 2;
    let alpha = (median - edge0) / (edge1 - edge0);
    alpha = Math.max(0, Math.min(1, alpha)); // clamp
    alpha = alpha * alpha * (3 - 2 * alpha); // smoothstep

    const alphaValue = Math.round(alpha * 255);

    const pixelOffset = i * 4;
    pixels[pixelOffset] = 255;     // R (white)
    pixels[pixelOffset + 1] = 255; // G (white)
    pixels[pixelOffset + 2] = 255; // B (white)
    pixels[pixelOffset + 3] = alphaValue; // A
  }

  return imageData;
}
