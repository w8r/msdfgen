# MSDFGEN TypeScript Demo

This demo showcases the MSDFGEN TypeScript port's ability to generate distance fields from manually-defined vector shapes.

## Running the Demo

### Development Server

```bash
npm run dev
```

Then navigate to `http://localhost:5173/demo/msdf-demo.html`

### What You'll See

The demo generates and visualizes 6 different shapes using all 4 distance field algorithms:

1. **Square** - Simple 4-sided polygon with linear edges
2. **Triangle** - Equilateral triangle
3. **Circle** - Approximated using quadratic Bezier curves
4. **Heart** - Complex shape using cubic Bezier curves
5. **Star** - 5-pointed star with 10 linear edges
6. **Letter A** - Letter with inner and outer contours (demonstrates holes)

### Distance Field Types Shown

Each shape displays 4 different distance field outputs:

- **SDF** (Single Channel) - Classic signed distance field with true Euclidean distance
- **PSDF** (Perpendicular) - Uses perpendicular distance from edges
- **MSDF** (Multi-Channel) - 3-channel RGB output that preserves sharp corners
- **MTSDF** (Multi + True) - 4-channel RGBA combining MSDF with true distance in alpha

## Performance

The demo measures and displays:
- Total generation time for all shapes
- Number of shapes generated
- All operations run in real-time in the browser

## Demo Features

✅ **Manual Shape Creation** - All shapes hand-coded using the MSDF API
✅ **Live Generation** - Distance fields generated in the browser
✅ **Visual Comparison** - Side-by-side comparison of all algorithms
✅ **Educational** - Info sections explain each algorithm
✅ **Responsive** - Works on desktop and tablet screens

## Code Structure

- `shape-demo.ts` - Shape creation functions and distance field generation
- `demo-browser.ts` - Browser demo runner and visualization code
- `msdf-demo.html` - Demo page HTML and styles
- `../src/utils/canvas-utils.ts` - Utilities for converting bitmaps to Canvas

## Next Steps

After this demo works, we'll add:
- Font file loading (TTF/OTF support)
- Font atlas generation
- WebGPU-based text rendering
- Export to PNG/BMP

## Implementation Status

- ✅ Phase 1: Core Data Structures (225 tests)
- ✅ Phase 2: Edge Segments (102 tests)
- ✅ Phase 3: Distance Algorithms (72 tests)
- ✅ Phase 4: Edge Coloring (24 tests)
- ✅ Phase 6: Main Generators (15 tests)
- ⏳ Phase 5: Error Correction (not required for demo)
- ⏳ Phase 7: Font Loading (next)

**Total: 438 tests passing**
