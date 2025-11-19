import { describe, it, expect } from 'vitest';
import { SignedDistance } from './SignedDistance';

describe('SignedDistance', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const sd = new SignedDistance();
      expect(sd.distance).toBe(-Number.MAX_VALUE);
      expect(sd.dot).toBe(0);
    });

    it('should create with custom values', () => {
      const sd = new SignedDistance(5.5, 0.8);
      expect(sd.distance).toBe(5.5);
      expect(sd.dot).toBe(0.8);
    });

    it('should handle negative distances', () => {
      const sd = new SignedDistance(-3.2, 0.5);
      expect(sd.distance).toBe(-3.2);
      expect(sd.dot).toBe(0.5);
    });
  });

  describe('comparison operators', () => {
    describe('lessThan', () => {
      it('should compare by absolute distance first', () => {
        const a = new SignedDistance(2, 0);
        const b = new SignedDistance(3, 0);
        expect(a.lessThan(b)).toBe(true);
        expect(b.lessThan(a)).toBe(false);
      });

      it('should handle negative distances correctly', () => {
        const a = new SignedDistance(-2, 0);
        const b = new SignedDistance(3, 0);
        expect(a.lessThan(b)).toBe(true);
        expect(b.lessThan(a)).toBe(false);
      });

      it('should compare by dot when absolute distances are equal', () => {
        const a = new SignedDistance(2, 0.3);
        const b = new SignedDistance(2, 0.5);
        expect(a.lessThan(b)).toBe(true);
        expect(b.lessThan(a)).toBe(false);
      });

      it('should handle positive and negative with same absolute value', () => {
        const a = new SignedDistance(-2, 0.3);
        const b = new SignedDistance(2, 0.5);
        expect(a.lessThan(b)).toBe(true);
      });

      it('should return false when both distance and dot are equal', () => {
        const a = new SignedDistance(2, 0.5);
        const b = new SignedDistance(2, 0.5);
        expect(a.lessThan(b)).toBe(false);
      });
    });

    describe('greaterThan', () => {
      it('should compare by absolute distance first', () => {
        const a = new SignedDistance(3, 0);
        const b = new SignedDistance(2, 0);
        expect(a.greaterThan(b)).toBe(true);
        expect(b.greaterThan(a)).toBe(false);
      });

      it('should compare by dot when absolute distances are equal', () => {
        const a = new SignedDistance(2, 0.7);
        const b = new SignedDistance(2, 0.3);
        expect(a.greaterThan(b)).toBe(true);
        expect(b.greaterThan(a)).toBe(false);
      });

      it('should return false when both distance and dot are equal', () => {
        const a = new SignedDistance(2, 0.5);
        const b = new SignedDistance(2, 0.5);
        expect(a.greaterThan(b)).toBe(false);
      });
    });

    describe('lessThanOrEqual', () => {
      it('should return true for less than', () => {
        const a = new SignedDistance(2, 0);
        const b = new SignedDistance(3, 0);
        expect(a.lessThanOrEqual(b)).toBe(true);
      });

      it('should return true for equal distances with less dot', () => {
        const a = new SignedDistance(2, 0.3);
        const b = new SignedDistance(2, 0.5);
        expect(a.lessThanOrEqual(b)).toBe(true);
      });

      it('should return true when completely equal', () => {
        const a = new SignedDistance(2, 0.5);
        const b = new SignedDistance(2, 0.5);
        expect(a.lessThanOrEqual(b)).toBe(true);
      });

      it('should return false for greater', () => {
        const a = new SignedDistance(3, 0);
        const b = new SignedDistance(2, 0);
        expect(a.lessThanOrEqual(b)).toBe(false);
      });
    });

    describe('greaterThanOrEqual', () => {
      it('should return true for greater than', () => {
        const a = new SignedDistance(3, 0);
        const b = new SignedDistance(2, 0);
        expect(a.greaterThanOrEqual(b)).toBe(true);
      });

      it('should return true for equal distances with greater dot', () => {
        const a = new SignedDistance(2, 0.7);
        const b = new SignedDistance(2, 0.3);
        expect(a.greaterThanOrEqual(b)).toBe(true);
      });

      it('should return true when completely equal', () => {
        const a = new SignedDistance(2, 0.5);
        const b = new SignedDistance(2, 0.5);
        expect(a.greaterThanOrEqual(b)).toBe(true);
      });

      it('should return false for less than', () => {
        const a = new SignedDistance(2, 0);
        const b = new SignedDistance(3, 0);
        expect(a.greaterThanOrEqual(b)).toBe(false);
      });
    });
  });

  describe('use case: finding minimum distance', () => {
    it('should correctly identify closest edge', () => {
      const distances = [
        new SignedDistance(5, 0.1),
        new SignedDistance(2, 0.8),  // Closest
        new SignedDistance(3, 0.5),
        new SignedDistance(4, 0.2),
      ];

      let minDistance = distances[0];
      for (let i = 1; i < distances.length; i++) {
        if (distances[i].lessThan(minDistance)) {
          minDistance = distances[i];
        }
      }

      expect(minDistance.distance).toBe(2);
      expect(minDistance.dot).toBe(0.8);
    });

    it('should use dot as tiebreaker', () => {
      const distances = [
        new SignedDistance(3, 0.9),
        new SignedDistance(3, 0.2),  // Closest (same distance, lower dot)
        new SignedDistance(3, 0.5),
      ];

      let minDistance = distances[0];
      for (let i = 1; i < distances.length; i++) {
        if (distances[i].lessThan(minDistance)) {
          minDistance = distances[i];
        }
      }

      expect(minDistance.distance).toBe(3);
      expect(minDistance.dot).toBe(0.2);
    });
  });
});
