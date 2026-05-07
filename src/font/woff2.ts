/**
 * WOFF2 format detection and decompression
 * Uses lazy loading to avoid bundling wawoff2 WASM (~450KB) unless needed
 */

// WOFF2 magic number: 'wOF2' in big-endian
const WOFF2_MAGIC = 0x774f4632;

/**
 * Check if a buffer contains WOFF2 data
 * @param buffer - ArrayBuffer to check
 * @returns true if buffer starts with WOFF2 magic number
 */
export function isWoff2(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) {
    return false;
  }
  const view = new DataView(buffer);
  const magic = view.getUint32(0, false); // big-endian
  return magic === WOFF2_MAGIC;
}

/**
 * Decompress WOFF2 to TTF/OTF format
 * Lazy loads wawoff2 WASM module only when called
 * @param buffer - WOFF2 compressed font data
 * @returns Decompressed TTF/OTF ArrayBuffer
 * @throws Error if wawoff2 is not installed
 */
export async function decompressWoff2(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    // Dynamic import - only loads wawoff2 when actually decompressing WOFF2
    const wawoff2 = await import('wawoff2');
    const decompressed = await wawoff2.decompress(new Uint8Array(buffer));
    // Create a new ArrayBuffer copy to avoid SharedArrayBuffer type issues
    const result = new ArrayBuffer(decompressed.byteLength);
    new Uint8Array(result).set(decompressed);
    return result;
  } catch (error) {
    if (
      (error as Error).message?.includes('Cannot find module') ||
      (error as Error).message?.includes('Failed to resolve')
    ) {
      throw new Error(
        'WOFF2 decompression requires wawoff2 package. ' +
          'Install it with: npm install wawoff2',
      );
    }
    throw error;
  }
}
