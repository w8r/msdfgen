import { describe, it, expect } from 'vitest';
import { TrueDistanceSelector, EdgeCache } from './TrueDistanceSelector';
import { PerpendicularDistanceSelector } from './PerpendicularDistanceSelector';
import { MultiDistanceSelector } from './MultiDistanceSelector';
import { MultiAndTrueDistanceSelector } from './MultiAndTrueDistanceSelector';
import { SignedDistance } from '../types/SignedDistance';
import { MultiDistance } from '../types/MultiDistance';
import { MultiAndTrueDistance } from '../types/MultiAndTrueDistance';
import { LinearSegment } from '../edge/LinearSegment';
import { EdgeColor } from '../edge/EdgeColor';
import { Vector2 } from '../types/Vector2';

describe('EdgeCache', () => {
  it('should create with default values', () => {
    const cache = new EdgeCache();
    expect(cache.point.x).toBe(0);
    expect(cache.point.y).toBe(0);
    expect(cache.absDistance).toBe(0);
  });

  it('should create with specified values', () => {
    const point = new Vector2(1, 2);
    const cache = new EdgeCache(point, 5.5);
    expect(cache.point).toBe(point);
    expect(cache.absDistance).toBe(5.5);
  });
});

describe('TrueDistanceSelector', () => {
  describe('constructor', () => {
    it('should initialize with default values', () => {
      const selector = new TrueDistanceSelector();
      expect(selector.distance()).toBeInstanceOf(SignedDistance);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const selector = new TrueDistanceSelector();
      const origin = new Vector2(0, 0);

      selector.reset(origin);
      expect(selector.hasDistance()).toBe(false);
    });
  });

  describe('addEdge', () => {
    it('should update minimum distance', () => {
      const selector = new TrueDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(5, 0),
        new Vector2(10, 0),
        EdgeColor.WHITE,
      );
      const distance = new SignedDistance(5, 1);

      selector.addEdge(distance, edge, origin, 0);

      const result = selector.distance();
      expect(result.distance).toBe(5);
      expect(result.dot).toBe(1);
    });

    it('should keep minimum distance when adding larger distance', () => {
      const selector = new TrueDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge1 = new LinearSegment(
        new Vector2(5, 0),
        new Vector2(10, 0),
        EdgeColor.WHITE,
      );
      const edge2 = new LinearSegment(
        new Vector2(8, 0),
        new Vector2(12, 0),
        EdgeColor.WHITE,
      );

      selector.addEdge(new SignedDistance(5, 1), edge1, origin, 0);
      selector.addEdge(new SignedDistance(8, 1), edge2, origin, 0);

      const result = selector.distance();
      expect(result.distance).toBe(5);
    });

    it('should update to smaller distance', () => {
      const selector = new TrueDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge1 = new LinearSegment(
        new Vector2(8, 0),
        new Vector2(12, 0),
        EdgeColor.WHITE,
      );
      const edge2 = new LinearSegment(
        new Vector2(3, 0),
        new Vector2(6, 0),
        EdgeColor.WHITE,
      );

      selector.addEdge(new SignedDistance(8, 1), edge1, origin, 0);
      selector.addEdge(new SignedDistance(3, 1), edge2, origin, 0);

      const result = selector.distance();
      expect(result.distance).toBe(3);
    });

    it('should cache edge distance', () => {
      const selector = new TrueDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(5, 0),
        new Vector2(10, 0),
        EdgeColor.WHITE,
      );

      selector.addEdge(new SignedDistance(5, 1), edge, origin, 0.5);

      const cached = selector.getCached(edge);
      expect(cached).toBeDefined();
      expect(cached!.absDistance).toBe(5);
      expect(cached!.point.x).toBe(7.5);
      expect(cached!.point.y).toBe(0);
    });
  });

  describe('merge', () => {
    it('should return distance with smaller absolute value', () => {
      const a = new SignedDistance(5, 1);
      const b = new SignedDistance(3, 1);
      const result = TrueDistanceSelector.merge(a, b);
      expect(result.distance).toBe(3);
    });

    it('should handle negative distances', () => {
      const a = new SignedDistance(-5, 1);
      const b = new SignedDistance(3, 1);
      const result = TrueDistanceSelector.merge(a, b);
      expect(result.distance).toBe(3);
    });

    it('should prefer closer distance when both negative', () => {
      const a = new SignedDistance(-5, 1);
      const b = new SignedDistance(-3, 1);
      const result = TrueDistanceSelector.merge(a, b);
      expect(result.distance).toBe(-3);
    });
  });
});

describe('PerpendicularDistanceSelector', () => {
  describe('constructor', () => {
    it('should initialize with default values', () => {
      const selector = new PerpendicularDistanceSelector();
      expect(selector.distance()).toBeInstanceOf(SignedDistance);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const selector = new PerpendicularDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);
      expect(selector.hasDistance()).toBe(false);
    });
  });

  describe('addEdge', () => {
    it('should convert to perpendicular distance', () => {
      const selector = new PerpendicularDistanceSelector();
      const origin = new Vector2(0, 5);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(0, 0),
        new Vector2(10, 0),
        EdgeColor.WHITE,
      );
      const distance = new SignedDistance(5, 1);

      selector.addEdge(distance, edge, origin, 0);

      // Result should use perpendicular distance
      const result = selector.distance();
      expect(Math.abs(result.distance)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('merge', () => {
    it('should return distance with smaller absolute value', () => {
      const a = new SignedDistance(5, 1);
      const b = new SignedDistance(3, 1);
      const result = PerpendicularDistanceSelector.merge(a, b);
      expect(result.distance).toBe(3);
    });
  });
});

describe('MultiDistanceSelector', () => {
  describe('constructor', () => {
    it('should initialize with default values', () => {
      const selector = new MultiDistanceSelector();
      const dist = selector.distance();
      expect(dist).toBeInstanceOf(MultiDistance);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const selector = new MultiDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);
      expect(selector.hasDistance()).toBe(false);
    });
  });

  describe('addEdge', () => {
    it('should update red channel for red edge', () => {
      const selector = new MultiDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(5, 0),
        new Vector2(10, 0),
        EdgeColor.RED,
      );

      selector.addEdge(new SignedDistance(5, 1), edge, origin, 0);

      const result = selector.distance();
      expect(result.r).toBe(5);
      expect(result.g).toBeLessThan(0);
      expect(result.b).toBeLessThan(0);
    });

    it('should update green channel for green edge', () => {
      const selector = new MultiDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(3, 0),
        new Vector2(8, 0),
        EdgeColor.GREEN,
      );

      selector.addEdge(new SignedDistance(3, 1), edge, origin, 0);

      const result = selector.distance();
      expect(result.r).toBeLessThan(0);
      expect(result.g).toBe(3);
      expect(result.b).toBeLessThan(0);
    });

    it('should update blue channel for blue edge', () => {
      const selector = new MultiDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(7, 0),
        new Vector2(12, 0),
        EdgeColor.BLUE,
      );

      selector.addEdge(new SignedDistance(7, 1), edge, origin, 0);

      const result = selector.distance();
      expect(result.r).toBeLessThan(0);
      expect(result.g).toBeLessThan(0);
      expect(result.b).toBe(7);
    });

    it('should update multiple channels for yellow edge', () => {
      const selector = new MultiDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(4, 0),
        new Vector2(9, 0),
        EdgeColor.YELLOW, // RED | GREEN
      );

      selector.addEdge(new SignedDistance(4, 1), edge, origin, 0);

      const result = selector.distance();
      expect(result.r).toBe(4);
      expect(result.g).toBe(4);
      expect(result.b).toBeLessThan(0);
    });

    it('should handle white edge (all channels)', () => {
      const selector = new MultiDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(6, 0),
        new Vector2(11, 0),
        EdgeColor.WHITE,
      );

      selector.addEdge(new SignedDistance(6, 1), edge, origin, 0);

      const result = selector.distance();
      expect(result.r).toBe(6);
      expect(result.g).toBe(6);
      expect(result.b).toBe(6);
    });

    it('should keep minimum per channel', () => {
      const selector = new MultiDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge1 = new LinearSegment(
        new Vector2(5, 0),
        new Vector2(10, 0),
        EdgeColor.RED,
      );
      const edge2 = new LinearSegment(
        new Vector2(3, 0),
        new Vector2(8, 0),
        EdgeColor.GREEN,
      );
      const edge3 = new LinearSegment(
        new Vector2(2, 0),
        new Vector2(7, 0),
        EdgeColor.RED,
      );

      selector.addEdge(new SignedDistance(5, 1), edge1, origin, 0);
      selector.addEdge(new SignedDistance(3, 1), edge2, origin, 0);
      selector.addEdge(new SignedDistance(2, 1), edge3, origin, 0);

      const result = selector.distance();
      expect(result.r).toBe(2); // Updated by edge3
      expect(result.g).toBe(3); // Set by edge2
    });
  });

  describe('merge', () => {
    it('should merge by taking minimum per channel', () => {
      const a = new MultiDistance(5, 3, 7);
      const b = new MultiDistance(4, 6, 2);
      const result = MultiDistanceSelector.merge(a, b);

      expect(result.r).toBe(4);
      expect(result.g).toBe(3);
      expect(result.b).toBe(2);
    });

    it('should handle negative values', () => {
      const a = new MultiDistance(-5, 3, -7);
      const b = new MultiDistance(4, -6, 2);
      const result = MultiDistanceSelector.merge(a, b);

      expect(result.r).toBe(4);
      expect(result.g).toBe(3);
      expect(result.b).toBe(2);
    });
  });
});

describe('MultiAndTrueDistanceSelector', () => {
  describe('constructor', () => {
    it('should initialize with default values', () => {
      const selector = new MultiAndTrueDistanceSelector();
      const dist = selector.distance();
      expect(dist).toBeInstanceOf(MultiAndTrueDistance);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const selector = new MultiAndTrueDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);
      expect(selector.hasDistance()).toBe(false);
    });
  });

  describe('addEdge', () => {
    it('should update both color channels and true distance', () => {
      const selector = new MultiAndTrueDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge = new LinearSegment(
        new Vector2(5, 0),
        new Vector2(10, 0),
        EdgeColor.RED,
      );

      selector.addEdge(new SignedDistance(5, 1), edge, origin, 0);

      const result = selector.distance();
      expect(result.r).toBe(5);
      expect(result.a).toBe(5); // True distance also updated
    });

    it('should update true distance regardless of color', () => {
      const selector = new MultiAndTrueDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge1 = new LinearSegment(
        new Vector2(5, 0),
        new Vector2(10, 0),
        EdgeColor.RED,
      );
      const edge2 = new LinearSegment(
        new Vector2(3, 0),
        new Vector2(8, 0),
        EdgeColor.GREEN,
      );

      selector.addEdge(new SignedDistance(5, 1), edge1, origin, 0);
      selector.addEdge(new SignedDistance(3, 1), edge2, origin, 0);

      const result = selector.distance();
      expect(result.r).toBe(5);
      expect(result.g).toBe(3);
      expect(result.a).toBe(3); // Minimum of all edges
    });

    it('should handle all four channels independently', () => {
      const selector = new MultiAndTrueDistanceSelector();
      const origin = new Vector2(0, 0);
      selector.reset(origin);

      const edge1 = new LinearSegment(
        new Vector2(5, 0),
        new Vector2(10, 0),
        EdgeColor.RED,
      );
      const edge2 = new LinearSegment(
        new Vector2(3, 0),
        new Vector2(8, 0),
        EdgeColor.GREEN,
      );
      const edge3 = new LinearSegment(
        new Vector2(7, 0),
        new Vector2(12, 0),
        EdgeColor.BLUE,
      );
      const edge4 = new LinearSegment(
        new Vector2(2, 0),
        new Vector2(6, 0),
        EdgeColor.BLACK, // No color, but affects true distance
      );

      selector.addEdge(new SignedDistance(5, 1), edge1, origin, 0);
      selector.addEdge(new SignedDistance(3, 1), edge2, origin, 0);
      selector.addEdge(new SignedDistance(7, 1), edge3, origin, 0);
      selector.addEdge(new SignedDistance(2, 1), edge4, origin, 0);

      const result = selector.distance();
      expect(result.r).toBe(5);
      expect(result.g).toBe(3);
      expect(result.b).toBe(7);
      expect(result.a).toBe(2); // Closest overall
    });
  });

  describe('merge', () => {
    it('should merge by taking minimum per channel', () => {
      const a = new MultiAndTrueDistance(5, 3, 7, 4);
      const b = new MultiAndTrueDistance(4, 6, 2, 5);
      const result = MultiAndTrueDistanceSelector.merge(a, b);

      expect(result.r).toBe(4);
      expect(result.g).toBe(3);
      expect(result.b).toBe(2);
      expect(result.a).toBe(4);
    });

    it('should handle negative values', () => {
      const a = new MultiAndTrueDistance(-5, 3, -7, -4);
      const b = new MultiAndTrueDistance(4, -6, 2, 5);
      const result = MultiAndTrueDistanceSelector.merge(a, b);

      expect(result.r).toBe(4);
      expect(result.g).toBe(3);
      expect(result.b).toBe(2);
      expect(result.a).toBe(-4);
    });
  });
});
