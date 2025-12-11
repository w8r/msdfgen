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

      // Generate all distance fields
      const distanceFields = generateAllDistanceFields(demoShape.shape, 64);

      // Convert to ImageData
      const sdfImage = sdfToImageData(distanceFields.sdf);
      const psdfImage = sdfToImageData(distanceFields.psdf);
      const msdfImage = msdfToImageData(distanceFields.msdf);
      const mtsdfImage = mtsdfToImageData(distanceFields.mtsdf);

      // Render to canvases
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

      if (sdfCanvas) renderToCanvas(sdfImage, sdfCanvas, 2);
      if (psdfCanvas) renderToCanvas(psdfImage, psdfCanvas, 2);
      if (msdfCanvas) renderToCanvas(msdfImage, msdfCanvas, 2);
      if (mtsdfCanvas) renderToCanvas(mtsdfImage, mtsdfCanvas, 2);

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
