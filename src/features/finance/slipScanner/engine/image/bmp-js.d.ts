// bmp-js ships no types. Declared narrowly, scoped to this folder's own
// test-only usage (round-tripping bmpEncoder.ts's output through the exact
// decoder tesseract.js uses internally) -- not a general-purpose typing of
// the package.
declare module "bmp-js" {
  interface BmpDecodeResult {
    width: number;
    height: number;
    data: Uint8Array;
  }

  function decode(bytes: Uint8Array): BmpDecodeResult;
  function encode(image: { data: Uint8Array; width: number; height: number }): { data: Uint8Array; width: number; height: number };

  const bmp: { decode: typeof decode; encode: typeof encode };
  export default bmp;
}

// This project's tsconfig deliberately scopes "types" to ["vite/client"]
// only (a browser app, not a Node one), so Node's ambient globals -- Buffer
// included -- aren't visible even though @types/node is installed. bmp-js's
// decoder calls Buffer-specific methods (toString, readUInt32LE, ...) on its
// input directly, so the test needs a real Buffer, not just a Uint8Array.
// Declared minimally here rather than widening the whole project's types.
declare module "node:buffer" {
  interface Buffer extends Uint8Array {}
  const Buffer: { from(data: Uint8Array): Buffer };
  export { Buffer };
}
