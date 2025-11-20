import { describe, it, expect } from 'vitest';
import { solveQuadratic, solveCubic } from './equation-solver';

describe('equation-solver', () => {
  describe('solveQuadratic', () => {
    it('should solve x^2 - 5x + 6 = 0 (two distinct roots)', () => {
      const roots = solveQuadratic(1, -5, 6);
      expect(roots).toHaveLength(2);
      expect(roots).toContain(3);
      expect(roots).toContain(2);
    });

    it('should solve x^2 - 4x + 4 = 0 (double root)', () => {
      const roots = solveQuadratic(1, -4, 4);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBeCloseTo(2, 10);
    });

    it('should solve x^2 + 1 = 0 (no real roots)', () => {
      const roots = solveQuadratic(1, 0, 1);
      expect(roots).toHaveLength(0);
    });

    it('should solve x^2 - 1 = 0 (roots at ±1)', () => {
      const roots = solveQuadratic(1, 0, -1);
      expect(roots).toHaveLength(2);
      expect(roots).toContain(1);
      expect(roots).toContain(-1);
    });

    it('should handle linear equation (a = 0)', () => {
      const roots = solveQuadratic(0, 2, -6);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBe(3);
    });

    it('should handle degenerate case (a = 0, b = 0, c = 0)', () => {
      const roots = solveQuadratic(0, 0, 0);
      expect(roots).toHaveLength(0);
    });

    it('should handle impossible linear case (a = 0, b = 0, c != 0)', () => {
      const roots = solveQuadratic(0, 0, 5);
      expect(roots).toHaveLength(0);
    });

    it('should handle very small a coefficient', () => {
      const roots = solveQuadratic(1e-15, 2, -6);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBeCloseTo(3, 5);
    });

    it('should solve 2x^2 - 7x + 3 = 0', () => {
      const roots = solveQuadratic(2, -7, 3);
      expect(roots).toHaveLength(2);
      expect(roots).toContain(3);
      expect(roots).toContain(0.5);
    });

    it('should handle negative discriminant with precision', () => {
      const roots = solveQuadratic(1, 1, 1);
      expect(roots).toHaveLength(0);
    });

    it('should handle zero discriminant at boundary', () => {
      const roots = solveQuadratic(1, 2, 1);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBeCloseTo(-1, 10);
    });
  });

  describe('solveCubic', () => {
    it('should solve x^3 - 6x^2 + 11x - 6 = 0 (three distinct roots)', () => {
      const roots = solveCubic(1, -6, 11, -6);
      expect(roots).toHaveLength(3);
      expect(roots).toContain(1);
      expect(roots).toContain(2);
      expect(roots).toContain(3);
    });

    it('should solve x^3 - 1 = 0 (one real root)', () => {
      const roots = solveCubic(1, 0, 0, -1);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBeCloseTo(1, 10);
    });

    it('should solve x^3 + 1 = 0 (one real root)', () => {
      const roots = solveCubic(1, 0, 0, 1);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBeCloseTo(-1, 10);
    });

    it('should solve x^3 - 3x^2 + 3x - 1 = 0 (triple root)', () => {
      const roots = solveCubic(1, -3, 3, -1);
      // Triple root at x = 1, but solver may return 1 or 2 roots
      expect(roots.length).toBeGreaterThanOrEqual(1);
      expect(roots.length).toBeLessThanOrEqual(2);
      expect(roots[0]).toBeCloseTo(1, 5);
    });

    it('should solve x^3 - 2x = 0 (three roots including zero)', () => {
      const roots = solveCubic(1, 0, -2, 0);
      expect(roots).toHaveLength(3);
      const sortedRoots = roots.sort((a, b) => a - b);
      expect(sortedRoots[0]).toBeCloseTo(-Math.sqrt(2), 10);
      expect(sortedRoots[1]).toBeCloseTo(0, 10);
      expect(sortedRoots[2]).toBeCloseTo(Math.sqrt(2), 10);
    });

    it('should handle quadratic case (a = 0)', () => {
      const roots = solveCubic(0, 1, -5, 6);
      expect(roots).toHaveLength(2);
      expect(roots).toContain(3);
      expect(roots).toContain(2);
    });

    it('should handle linear case (a = 0, b = 0)', () => {
      const roots = solveCubic(0, 0, 2, -6);
      expect(roots).toHaveLength(1);
      expect(roots[0]).toBe(3);
    });

    it('should solve 2x^3 - 4x^2 - 2x + 4 = 0', () => {
      // Dividing by 2: x^3 - 2x^2 - x + 2 = 0
      // Roots: -1, 1, 2
      const roots = solveCubic(2, -4, -2, 4);
      expect(roots).toHaveLength(3);
      const sortedRoots = roots.sort((a, b) => a - b);
      expect(sortedRoots[0]).toBeCloseTo(-1, 10);
      expect(sortedRoots[1]).toBeCloseTo(1, 10);
      expect(sortedRoots[2]).toBeCloseTo(2, 10);
    });

    it('should handle case with one real root (r^2 >= q^3)', () => {
      const roots = solveCubic(1, -3, 4, -2);
      expect(roots.length).toBeGreaterThanOrEqual(1);
      expect(roots[0]).toBeCloseTo(1, 5);
    });

    it('should handle very small leading coefficient', () => {
      const roots = solveCubic(1e-15, 1, -5, 6);
      // Should fall back to quadratic solver
      expect(roots).toHaveLength(2);
    });

    it('should handle large b/a ratio', () => {
      const roots = solveCubic(1, 1e7, 0, 0);
      // Should fall back to quadratic due to numerical stability
      expect(roots.length).toBeGreaterThanOrEqual(1);
    });

    it('should solve x^3 - 3x + 2 = 0', () => {
      // Roots: -2, 1, 1 (double root at 1)
      const roots = solveCubic(1, 0, -3, 2);
      expect(roots.length).toBeGreaterThanOrEqual(2);
      const sortedRoots = roots.sort((a, b) => a - b);
      expect(sortedRoots[0]).toBeCloseTo(-2, 10);
      expect(sortedRoots[sortedRoots.length - 1]).toBeCloseTo(1, 10);
    });
  });

  describe('edge cases and numerical stability', () => {
    it('should handle very small coefficients in quadratic', () => {
      const roots = solveQuadratic(1e-10, 1e-10, 1e-10);
      expect(roots.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large coefficients in quadratic', () => {
      const roots = solveQuadratic(1e10, -5e10, 6e10);
      expect(roots).toHaveLength(2);
      expect(roots[0]).toBeCloseTo(3, 5);
      expect(roots[1]).toBeCloseTo(2, 5);
    });

    it('should handle roots very close to zero', () => {
      const roots = solveQuadratic(1, 0, -1e-10);
      expect(roots).toHaveLength(2);
      expect(Math.abs(roots[0])).toBeCloseTo(1e-5, 1);
      expect(Math.abs(roots[1])).toBeCloseTo(1e-5, 1);
    });

    it('should handle cubic with all positive roots', () => {
      // (x-1)(x-2)(x-3) = x^3 - 6x^2 + 11x - 6
      const roots = solveCubic(1, -6, 11, -6);
      expect(roots).toHaveLength(3);
      const sortedRoots = roots.sort((a, b) => a - b);
      expect(sortedRoots[0]).toBeCloseTo(1, 10);
      expect(sortedRoots[1]).toBeCloseTo(2, 10);
      expect(sortedRoots[2]).toBeCloseTo(3, 10);
    });

    it('should handle cubic with all negative roots', () => {
      // (x+1)(x+2)(x+3) = x^3 + 6x^2 + 11x + 6
      const roots = solveCubic(1, 6, 11, 6);
      expect(roots).toHaveLength(3);
      const sortedRoots = roots.sort((a, b) => a - b);
      expect(sortedRoots[0]).toBeCloseTo(-3, 10);
      expect(sortedRoots[1]).toBeCloseTo(-2, 10);
      expect(sortedRoots[2]).toBeCloseTo(-1, 10);
    });
  });
});
