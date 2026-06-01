/**
 * Browser-based MSDF Demo
 * Runs in the browser and visualizes distance field generation
 */

import { getAllDemoShapes, generateAllDistanceFields } from "./shape-demo";
import {
  sdfToImageData,
  msdfToImageData,
  mtsdfToImageData,
  renderMSDFMedian,
  renderToCanvas,
  renderSDFAntialiased,
  renderMSDFAntialiased,
  renderMTSDFAntialiased,
} from "../src/utils/canvas-utils";

function createShapeCard(shapeName: string, description: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "shape-card";

  const title = document.createElement("h2");
  title.textContent = shapeName;
  card.appendChild(title);

  const desc = document.createElement("p");
  desc.className = "shape-description";
  desc.textContent = description;
  card.appendChild(desc);

  // Distance field visualization section
  const dfSection = document.createElement("div");
  dfSection.className = "section-header";
  dfSection.textContent = "Distance Fields (Raw Data)";
  card.appendChild(dfSection);

  const canvasGrid = document.createElement("div");
  canvasGrid.className = "canvas-grid";

  const types = [
    { label: "SDF (Single Channel)", id: "sdf" },
    { label: "PSDF (Perpendicular)", id: "psdf" },
    { label: "MSDF (Multi-Channel)", id: "msdf" },
    { label: "MTSDF (4 Channels)", id: "mtsdf" },
  ];

  for (const type of types) {
    const container = document.createElement("div");
    container.className = "canvas-container";

    const label = document.createElement("div");
    label.className = "canvas-label";
    label.textContent = type.label;
    container.appendChild(label);

    const canvas = document.createElement("canvas");
    canvas.id = `${shapeName.toLowerCase().replace(/\s+/g, "-")}-${type.id}`;
    canvas.width = 128;
    canvas.height = 128;
    container.appendChild(canvas);

    canvasGrid.appendChild(container);
  }

  card.appendChild(canvasGrid);

  // Rendered shapes section
  const renderSection = document.createElement("div");
  renderSection.className = "section-header";
  renderSection.textContent = "Rendered Shapes (Antialiased)";
  card.appendChild(renderSection);

  const renderGrid = document.createElement("div");
  renderGrid.className = "canvas-grid";

  const renderTypes = [
    { label: "SDF Rendered", id: "sdf-render" },
    { label: "PSDF Rendered", id: "psdf-render" },
    { label: "MSDF Rendered", id: "msdf-render" },
    { label: "MTSDF Rendered", id: "mtsdf-render" },
  ];

  for (const type of renderTypes) {
    const container = document.createElement("div");
    container.className = "canvas-container";

    const label = document.createElement("div");
    label.className = "canvas-label";
    label.textContent = type.label;
    container.appendChild(label);

    const canvas = document.createElement("canvas");
    canvas.id = `${shapeName.toLowerCase().replace(/\s+/g, "-")}-${type.id}`;
    canvas.width = 128;
    canvas.height = 128;
    container.appendChild(canvas);

    renderGrid.appendChild(container);
  }

  card.appendChild(renderGrid);
  return card;
}

function showError(message: string): void {
  const errorContainer = document.getElementById("error-container");
  if (!errorContainer) return;

  const errorDiv = document.createElement("div");
  errorDiv.className = "error";
  errorDiv.textContent = `Error: ${message}`;
  errorContainer.appendChild(errorDiv);
}

async function runDemo(): Promise<void> {
  try {
    const loading = document.getElementById("loading");
    const shapesContainer = document.getElementById("shapes-container");

    if (!loading || !shapesContainer) {
      throw new Error("Required DOM elements not found");
    }

    // Get all demo shapes
    const demoShapes = getAllDemoShapes();

    // Update shape count
    const shapeCountEl = document.getElementById("shape-count");
    if (shapeCountEl) {
      shapeCountEl.textContent = demoShapes.length.toString();
    }

    // Create cards for all shapes
    for (const demoShape of demoShapes) {
      const card = createShapeCard(demoShape.name, demoShape.description);
      shapesContainer.appendChild(card);
    }

    // Hide loading, show shapes
    loading.style.display = "none";
    shapesContainer.style.display = "grid";

    // Generate distance fields for each shape
    const startTime = performance.now();

    for (const demoShape of demoShapes) {
      const nameSlug = demoShape.name.toLowerCase().replace(/\s+/g, "-");

      // Generate all distance fields at high resolution for sharp rendering
      const distanceFields = generateAllDistanceFields(demoShape.shape, 256);

      // Convert to ImageData (raw distance fields)
      const sdfImage = sdfToImageData(distanceFields.sdf);
      const psdfImage = sdfToImageData(distanceFields.psdf);
      const msdfImage = msdfToImageData(distanceFields.msdf);
      const mtsdfImage = mtsdfToImageData(distanceFields.mtsdf);

      // Render distance fields to canvases (downscale from 256 to 128)
      const sdfCanvas = document.getElementById(
        `${nameSlug}-sdf`
      ) as HTMLCanvasElement;
      const psdfCanvas = document.getElementById(
        `${nameSlug}-psdf`
      ) as HTMLCanvasElement;
      const msdfCanvas = document.getElementById(
        `${nameSlug}-msdf`
      ) as HTMLCanvasElement;
      const mtsdfCanvas = document.getElementById(
        `${nameSlug}-mtsdf`
      ) as HTMLCanvasElement;

      if (sdfCanvas) renderToCanvas(sdfImage, sdfCanvas, 0.5);
      if (psdfCanvas) renderToCanvas(psdfImage, psdfCanvas, 0.5);
      if (msdfCanvas) renderToCanvas(msdfImage, msdfCanvas, 0.5);
      if (mtsdfCanvas) renderToCanvas(mtsdfImage, mtsdfCanvas, 0.5);

      // Render antialiased shapes with very tight smoothing for maximum sharpness
      // Smoothing of 0.01 gives about 1-2 pixels of antialiasing at 256px (0.5-1 pixel at 128px display)
      const sdfRendered = renderSDFAntialiased(distanceFields.sdf, 0.5, 0.01);
      const psdfRendered = renderSDFAntialiased(distanceFields.psdf, 0.5, 0.01);
      const msdfRendered = renderMSDFAntialiased(distanceFields.msdf, 0.5, 0.01);
      const mtsdfRendered = renderMTSDFAntialiased(distanceFields.mtsdf, 0.5, 0.01);

      const sdfRenderCanvas = document.getElementById(
        `${nameSlug}-sdf-render`
      ) as HTMLCanvasElement;
      const psdfRenderCanvas = document.getElementById(
        `${nameSlug}-psdf-render`
      ) as HTMLCanvasElement;
      const msdfRenderCanvas = document.getElementById(
        `${nameSlug}-msdf-render`
      ) as HTMLCanvasElement;
      const mtsdfRenderCanvas = document.getElementById(
        `${nameSlug}-mtsdf-render`
      ) as HTMLCanvasElement;

      if (sdfRenderCanvas) renderToCanvas(sdfRendered, sdfRenderCanvas, 0.5);
      if (psdfRenderCanvas) renderToCanvas(psdfRendered, psdfRenderCanvas, 0.5);
      if (msdfRenderCanvas) renderToCanvas(msdfRendered, msdfRenderCanvas, 0.5);
      if (mtsdfRenderCanvas) renderToCanvas(mtsdfRendered, mtsdfRenderCanvas, 0.5);

      // Log progress
      console.log(`Generated distance fields for ${demoShape.name}`);
    }

    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);

    // Update generation time
    const genTimeEl = document.getElementById("generation-time");
    if (genTimeEl) {
      genTimeEl.textContent = `${totalTime}ms`;
    }

    console.log(
      `✓ Demo complete! Generated ${demoShapes.length} shapes in ${totalTime}ms`
    );
    console.log(
      `  Average: ${Math.round(totalTime / demoShapes.length)}ms per shape`
    );
  } catch (error) {
    console.error("Demo error:", error);
    showError(error instanceof Error ? error.message : String(error));

    const loading = document.getElementById("loading");
    if (loading) {
      loading.textContent = "Failed to load demo. Check console for errors.";
      loading.style.color = "#ff4444";
    }
  }
}

// Run demo when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runDemo);
} else {
  runDemo();
}
