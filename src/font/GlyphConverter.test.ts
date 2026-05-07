import { describe, it, expect } from 'vitest';
import { glyphPathToShape, type PathCommand } from './GlyphConverter';

describe('glyphPathToShape', () => {
  it('should return empty shape for empty path', () => {
    const shape = glyphPathToShape([]);
    expect(shape.contours).toHaveLength(0);
    expect(shape.validate()).toBe(false);
  });

  it('should create contour from M/L/Z commands (triangle)', () => {
    const commands: PathCommand[] = [
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 100, y: 0 },
      { type: 'L', x: 50, y: 100 },
      { type: 'Z' },
    ];
    const shape = glyphPathToShape(commands);
    expect(shape.contours).toHaveLength(1);
    expect(shape.contours[0].edges).toHaveLength(3);
    expect(shape.validate()).toBe(true);
  });

  it('should create quadratic edges from Q commands', () => {
    const commands: PathCommand[] = [
      { type: 'M', x: 0, y: 0 },
      { type: 'Q', x1: 50, y1: 100, x: 100, y: 0 },
      { type: 'Z' },
    ];
    const shape = glyphPathToShape(commands);
    expect(shape.contours).toHaveLength(1);
    expect(shape.contours[0].edges).toHaveLength(2); // Q + closing L
  });

  it('should create cubic edges from C commands', () => {
    const commands: PathCommand[] = [
      { type: 'M', x: 0, y: 0 },
      { type: 'C', x1: 25, y1: 100, x2: 75, y2: 100, x: 100, y: 0 },
      { type: 'Z' },
    ];
    const shape = glyphPathToShape(commands);
    expect(shape.contours).toHaveLength(1);
    expect(shape.contours[0].edges).toHaveLength(2); // C + closing L
  });

  it('should handle multiple contours (letter O shape)', () => {
    const commands: PathCommand[] = [
      // Outer contour
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 100, y: 0 },
      { type: 'L', x: 100, y: 100 },
      { type: 'L', x: 0, y: 100 },
      { type: 'Z' },
      // Inner contour (hole)
      { type: 'M', x: 25, y: 25 },
      { type: 'L', x: 75, y: 25 },
      { type: 'L', x: 75, y: 75 },
      { type: 'L', x: 25, y: 75 },
      { type: 'Z' },
    ];
    const shape = glyphPathToShape(commands);
    expect(shape.contours).toHaveLength(2);
  });

  it('should not add closing edge if already at start', () => {
    const commands: PathCommand[] = [
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 100, y: 0 },
      { type: 'L', x: 0, y: 0 }, // Already back at start
      { type: 'Z' },
    ];
    const shape = glyphPathToShape(commands);
    expect(shape.contours[0].edges).toHaveLength(2); // No extra closing edge
  });
});
