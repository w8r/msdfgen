/**
 * WebGPU MSDF Demo - Main Entry Point
 *
 * Loads font, generates MSDF atlas, initializes WebGPU renderer,
 * and runs render loop displaying "Hello MSDF!" text.
 */

import { parseFont } from "../src/font";
import { generateAtlas } from "../src/atlas";
import { MSDFRenderer } from "./renderer/MSDFRenderer";
import { computeTextInstances } from "./renderer/TextLayout";
import { Viewport } from "./renderer/Viewport";

// Demo configuration
const DEMO_TEXT = "Hello MSDF!";
const FONT_SIZE = 48;
const FONT_PATH = "/test-fixtures/Roboto-Regular.ttf"; // Served from demo/public/ symlink

/**
 * Show error message
 */
function showError(message: string): void {
  const errorDiv = document.getElementById("webgpu-error");
  if (errorDiv) {
    errorDiv.style.display = "block";
    const messageP = errorDiv.querySelector("p");
    if (messageP) {
      messageP.textContent = message;
    }
  }
  console.error(message);
}

/**
 * Initialize and run demo
 */
async function main(): Promise<void> {
  const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  if (!canvas) {
    console.error("Canvas element not found");
    return;
  }

  // Set canvas size to match window
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  try {
    // Step 1: Load font
    console.log("Loading font from:", FONT_PATH);
    console.log("Full URL:", new URL(FONT_PATH, window.location.href).href);
    const fontResponse = await fetch(FONT_PATH);
    console.log("Font response:", fontResponse);
    console.log("Font response status:", fontResponse.status);
    console.log("Font response headers:", Object.fromEntries(fontResponse.headers.entries()));

    if (!fontResponse.ok) {
      throw new Error(`Failed to load font: ${fontResponse.statusText}`);
    }

    const fontBuffer = await fontResponse.arrayBuffer();
    console.log("Font buffer size:", fontBuffer.byteLength);

    const font = await parseFont(fontBuffer);
    console.log("Font loaded successfully");

    // Step 2: Generate MSDF atlas
    console.log("Generating MSDF atlas...");
    const startTime = performance.now();

    // Get unique characters from demo text
    const chars = Array.from(new Set(DEMO_TEXT)).join("");

    const atlas = await generateAtlas(font, chars);
    const generationTime = performance.now() - startTime;

    console.log(
      `Atlas generated in ${generationTime.toFixed(2)}ms (${
        atlas.atlasWidth
      }x${atlas.atlasHeight}, ${atlas.glyphs.size} glyphs)`,
    );

    // Step 3: Initialize WebGPU renderer
    console.log("Initializing WebGPU renderer...");
    const renderer = await MSDFRenderer.init(canvas, showError);

    if (!renderer) {
      // Error already shown by renderer
      return;
    }

    console.log("WebGPU renderer initialized");

    // Step 4: Upload atlas to GPU
    renderer.uploadAtlas(atlas);
    console.log("Atlas uploaded to GPU");

    // Step 5: Compute text instances
    const instanceData = computeTextInstances(
      DEMO_TEXT,
      FONT_SIZE,
      atlas,
      "Roboto",
    );

    renderer.updateTextInstances(instanceData);
    console.log(
      `Text instances computed: ${instanceData.length / 20} characters`,
    );

    // Step 6: Set rendering parameters
    renderer.setColor(1.0, 1.0, 1.0, 1.0); // White text
    renderer.setVisualizationMode(0); // Rendered mode

    // Step 7: Initialize viewport
    const viewport = new Viewport(canvas.width, canvas.height);

    // Center text on screen
    // Calculate text bounds and offset to center
    const textStartX =
      canvas.width / 2 - (instanceData.length / 20) * FONT_SIZE * 0.3;
    const textStartY = canvas.height / 2 - FONT_SIZE / 2;

    viewport.setPan(-textStartX, -textStartY);

    console.log("Viewport initialized");

    // Step 8: Start render loop
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    function renderLoop(): void {
      // Get view matrix from viewport
      const viewMatrix = viewport.getViewMatrix();

      // Render frame
      renderer!.render(viewMatrix);

      // Update FPS counter (every 60 frames)
      frameCount++;
      if (frameCount % 60 === 0) {
        const now = performance.now();
        const elapsed = now - lastFpsUpdate;
        const fps = (60 * 1000) / elapsed;
        console.log(`FPS: ${fps.toFixed(1)}`);
        lastFpsUpdate = now;
      }

      requestAnimationFrame(renderLoop);
    }

    console.log("Starting render loop...");
    requestAnimationFrame(renderLoop);

    console.log("Demo initialized successfully!");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    showError(`Failed to initialize demo: ${message}`);
  }
}

// Handle window resize
window.addEventListener("resize", () => {
  const canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

// Start demo when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
