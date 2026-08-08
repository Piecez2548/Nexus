// Perceptual hash (pHash) for detecting near-duplicate and modified slip images
// — complements the exact SHA-256 content hash (a re-saved/re-compressed slip
// has a different SHA-256 but a near-identical pHash). Pure DCT-based
// implementation over a 32×32 grayscale block; the browser pixel extraction
// lives in imageHash.ts so this stays unit-testable.

const HASH_SIZE = 8; // low-frequency block kept → 8×8 = 64 bits
const IMAGE_SIZE = 32; // grayscale reduced to 32×32 before the DCT

// 1-D DCT-II.
function dct1d(vector: number[]): number[] {
  const n = vector.length;
  const out = new Array<number>(n).fill(0);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += vector[i]! * Math.cos((Math.PI * (2 * i + 1) * k) / (2 * n));
    }
    out[k] = sum;
  }
  return out;
}

// Compute a 64-bit perceptual hash (16 lowercase hex chars) from a 32×32
// grayscale array (length 1024, values 0–255).
export function computePHash(gray: number[], size: number = IMAGE_SIZE): string {
  if (gray.length !== size * size) {
    throw new Error(`computePHash expects ${size * size} grayscale values, got ${gray.length}`);
  }

  // 2-D DCT: rows then columns.
  const rows: number[][] = [];
  for (let y = 0; y < size; y++) rows.push(dct1d(gray.slice(y * size, y * size + size)));

  const dct: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  for (let x = 0; x < size; x++) {
    const column = rows.map((row) => row[x]!);
    const transformed = dct1d(column);
    for (let y = 0; y < size; y++) dct[y]![x] = transformed[y]!;
  }

  // Top-left 8×8 low-frequency coefficients.
  const block: number[] = [];
  for (let y = 0; y < HASH_SIZE; y++) for (let x = 0; x < HASH_SIZE; x++) block.push(dct[y]![x]!);

  // Median excludes the DC term (block[0]), which dominates and carries no
  // structure.
  const ac = block.slice(1).slice().sort((a, b) => a - b);
  const median = ac[Math.floor(ac.length / 2)]!;

  let bits = "";
  for (const coeff of block) bits += coeff > median ? "1" : "0";

  // Pack 64 bits → 16 hex chars.
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

// Hamming distance between two equal-length hex hashes (number of differing
// bits). Returns Infinity for mismatched lengths.
export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

// Two images are perceptually similar when their pHashes differ by at most
// `threshold` bits (default 10 of 64 — a common near-duplicate cutoff).
export function arePerceptuallySimilar(a: string, b: string, threshold = 10): boolean {
  return hammingDistanceHex(a, b) <= threshold;
}
