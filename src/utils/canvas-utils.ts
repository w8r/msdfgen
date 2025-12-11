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
