/**
 * Type declarations for wawoff2 module
 * wawoff2 is a WebAssembly-based WOFF2 font decompressor
 */
declare module 'wawoff2' {
  /**
   * Decompress WOFF2 data to TTF/OTF
   * @param buffer - WOFF2 compressed font data
   * @returns Decompressed TTF/OTF data
   */
  export function decompress(buffer: Uint8Array): Promise<Uint8Array>;
}
