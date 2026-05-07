// Font types
export type { Font, Glyph, FontMetrics, GlyphMetrics } from './types';

// Font parsing
export { parseFont, loadFont } from './FontParser';

// Glyph conversion (for advanced use)
export { glyphPathToShape, type PathCommand } from './GlyphConverter';

// WOFF2 support
export { isWoff2, decompressWoff2 } from './woff2';
