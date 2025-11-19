import { describe, it, expect } from 'vitest';
import { Projection } from './Projection';
import { Vector2 } from './Vector2';

describe('Projection', () => {
  describe('constructor', () => {
    it('should create identity projection with no args', () => {
      const proj = new Projection();
      const point = new Vector2(5, 7);
      const projected = proj.project(point);
      expect(projected.x).toBe(5);
      expect(projected.y).toBe(7);
    });

    it('should create projection with scale and translate', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(1, 2);
      const proj = new Projection(scale, translate);

      const point = new Vector2(0, 0);
      const projected = proj.project(point);
      expect(projected.x).toBe(2); // (0 + 1) * 2
      expect(projected.y).toBe(6); // (0 + 2) * 3
    });
  });

  describe('project and unproject', () => {
    it('should project points correctly', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(10, 20);
      const proj = new Projection(scale, translate);

      const point = new Vector2(5, 7);
      const projected = proj.project(point);

      expect(projected.x).toBe(30); // (5 + 10) * 2
      expect(projected.y).toBe(81); // (7 + 20) * 3
    });

    it('should unproject points correctly', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(10, 20);
      const proj = new Projection(scale, translate);

      const point = new Vector2(30, 81);
      const unprojected = proj.unproject(point);

      expect(unprojected.x).toBe(5); // 30 / 2 - 10
      expect(unprojected.y).toBe(7); // 81 / 3 - 20
    });

    it('should be reversible: unproject(project(p)) = p', () => {
      const scale = new Vector2(4, 5);
      const translate = new Vector2(3, 7);
      const proj = new Projection(scale, translate);

      const original = new Vector2(12, 18);
      const projected = proj.project(original);
      const unprojected = proj.unproject(projected);

      expect(unprojected.x).toBeCloseTo(original.x);
      expect(unprojected.y).toBeCloseTo(original.y);
    });
  });

  describe('projectVector and unprojectVector', () => {
    it('should project vectors (no translation applied)', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(10, 20);
      const proj = new Projection(scale, translate);

      const vector = new Vector2(5, 7);
      const projected = proj.projectVector(vector);

      expect(projected.x).toBe(10); // 5 * 2 (no translation)
      expect(projected.y).toBe(21); // 7 * 3 (no translation)
    });

    it('should unproject vectors (no translation applied)', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(10, 20);
      const proj = new Projection(scale, translate);

      const vector = new Vector2(10, 21);
      const unprojected = proj.unprojectVector(vector);

      expect(unprojected.x).toBe(5); // 10 / 2
      expect(unprojected.y).toBe(7); // 21 / 3
    });

    it('should be reversible for vectors: unprojectVector(projectVector(v)) = v', () => {
      const scale = new Vector2(4, 5);
      const translate = new Vector2(3, 7);
      const proj = new Projection(scale, translate);

      const original = new Vector2(8, 12);
      const projected = proj.projectVector(original);
      const unprojected = proj.unprojectVector(projected);

      expect(unprojected.x).toBeCloseTo(original.x);
      expect(unprojected.y).toBeCloseTo(original.y);
    });
  });

  describe('individual coordinate projections', () => {
    it('should project X coordinate', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(10, 20);
      const proj = new Projection(scale, translate);

      expect(proj.projectX(5)).toBe(30); // (5 + 10) * 2
    });

    it('should project Y coordinate', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(10, 20);
      const proj = new Projection(scale, translate);

      expect(proj.projectY(7)).toBe(81); // (7 + 20) * 3
    });

    it('should unproject X coordinate', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(10, 20);
      const proj = new Projection(scale, translate);

      expect(proj.unprojectX(30)).toBe(5); // 30 / 2 - 10
    });

    it('should unproject Y coordinate', () => {
      const scale = new Vector2(2, 3);
      const translate = new Vector2(10, 20);
      const proj = new Projection(scale, translate);

      expect(proj.unprojectY(81)).toBe(7); // 81 / 3 - 20
    });

    it('should be reversible for X: unprojectX(projectX(x)) = x', () => {
      const scale = new Vector2(4, 5);
      const translate = new Vector2(3, 7);
      const proj = new Projection(scale, translate);

      const x = 12;
      expect(proj.unprojectX(proj.projectX(x))).toBeCloseTo(x);
    });

    it('should be reversible for Y: unprojectY(projectY(y)) = y', () => {
      const scale = new Vector2(4, 5);
      const translate = new Vector2(3, 7);
      const proj = new Projection(scale, translate);

      const y = 18;
      expect(proj.unprojectY(proj.projectY(y))).toBeCloseTo(y);
    });
  });

  describe('edge cases', () => {
    it('should handle zero translation', () => {
      const scale = new Vector2(2, 3);
      const proj = new Projection(scale, new Vector2(0, 0));

      const point = new Vector2(5, 7);
      const projected = proj.project(point);

      expect(projected.x).toBe(10);
      expect(projected.y).toBe(21);
    });

    it('should handle unit scale', () => {
      const translate = new Vector2(10, 20);
      const proj = new Projection(new Vector2(1, 1), translate);

      const point = new Vector2(5, 7);
      const projected = proj.project(point);

      expect(projected.x).toBe(15);
      expect(projected.y).toBe(27);
    });

    it('should handle negative scale', () => {
      const scale = new Vector2(-2, -3);
      const proj = new Projection(scale, new Vector2(0, 0));

      const point = new Vector2(5, 7);
      const projected = proj.project(point);

      expect(projected.x).toBe(-10);
      expect(projected.y).toBe(-21);
    });
  });
});
