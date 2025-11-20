/**
 * Equation solvers for finding roots of quadratic and cubic polynomials.
 * Used extensively in finding closest points on Bezier curves.
 *
 * TypeScript port of msdfgen equation solvers from core/equation-solver.cpp
 * @author Viktor Chlumsky (original C++)
 */

const TWO_PI = 2 * Math.PI;

/**
 * Solves a quadratic equation: ax^2 + bx + c = 0
 * Returns an array of solutions (0, 1, or 2 real roots).
 * If equation is degenerate (0 = 0), returns empty array with special flag.
 *
 * @param a - Coefficient of x^2
 * @param b - Coefficient of x
 * @param c - Constant term
 * @returns Array of real roots
 */
export function solveQuadratic(a: number, b: number, c: number): number[] {
  // a == 0 -> linear equation
  if (a === 0 || Math.abs(b) > 1e12 * Math.abs(a)) {
    // a == 0, b == 0 -> no solution (or infinite solutions)
    if (b === 0) {
      // 0 == 0 case (infinite solutions) - return empty array
      return [];
    }
    // Linear case: bx + c = 0
    return [-c / b];
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant > 0) {
    const sqrtD = Math.sqrt(discriminant);
    return [
      (-b + sqrtD) / (2 * a),
      (-b - sqrtD) / (2 * a),
    ];
  } else if (discriminant === 0) {
    return [-b / (2 * a)];
  } else {
    // No real roots
    return [];
  }
}

/**
 * Solves a normalized cubic equation: x^3 + ax^2 + bx + c = 0
 * (internal helper function)
 *
 * Uses Cardano's formula with trigonometric method for three real roots.
 *
 * @param a - Coefficient of x^2
 * @param b - Coefficient of x
 * @param c - Constant term
 * @returns Array of real roots (1, 2, or 3 roots)
 */
function solveCubicNormed(a: number, b: number, c: number): number[] {
  const a2 = a * a;
  const q = (1 / 9) * (a2 - 3 * b);
  const r = (1 / 54) * (a * (2 * a2 - 9 * b) + 27 * c);
  const r2 = r * r;
  const q3 = q * q * q;
  const aThird = a * (1 / 3);

  if (r2 < q3) {
    // Three real roots (trigonometric solution)
    let t = r / Math.sqrt(q3);
    // Clamp to [-1, 1] to avoid numerical errors
    if (t < -1) t = -1;
    if (t > 1) t = 1;
    t = Math.acos(t);
    const qMult = -2 * Math.sqrt(q);
    return [
      qMult * Math.cos((1 / 3) * t) - aThird,
      qMult * Math.cos((1 / 3) * (t + TWO_PI)) - aThird,
      qMult * Math.cos((1 / 3) * (t - TWO_PI)) - aThird,
    ];
  } else {
    // One or two real roots (algebraic solution)
    const u = (r < 0 ? 1 : -1) * Math.pow(Math.abs(r) + Math.sqrt(r2 - q3), 1 / 3);
    const v = u === 0 ? 0 : q / u;
    const root1 = u + v - aThird;

    // Check for double root
    if (u === v || Math.abs(u - v) < 1e-12 * Math.abs(u + v)) {
      const root2 = -0.5 * (u + v) - aThird;
      return [root1, root2];
    }

    return [root1];
  }
}

/**
 * Solves a cubic equation: ax^3 + bx^2 + cx + d = 0
 * Returns an array of solutions (1, 2, or 3 real roots).
 *
 * For numerical stability, falls back to quadratic solver when:
 * - a == 0 (equation is actually quadratic)
 * - b/a ratio is too large (would cause numerical errors)
 *
 * @param a - Coefficient of x^3
 * @param b - Coefficient of x^2
 * @param c - Coefficient of x
 * @param d - Constant term
 * @returns Array of real roots
 */
export function solveCubic(a: number, b: number, c: number, d: number): number[] {
  if (a !== 0) {
    const bn = b / a;
    // Above this ratio, numerical error gets larger than treating a as zero
    if (Math.abs(bn) < 1e6) {
      return solveCubicNormed(bn, c / a, d / a);
    }
  }
  // Fall back to quadratic solver
  return solveQuadratic(b, c, d);
}
