import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const assetsDirectory = join(process.cwd(), "dist", "assets");
const limits = {
  largestJavaScriptBytes: 500 * 1024,
  totalJavaScriptBytes: 4 * 1024 * 1024,
};

const files = await readdir(assetsDirectory);
const javascript = await Promise.all(
  files
    .filter((file) => file.endsWith(".js"))
    .map(async (file) => ({ file, bytes: (await stat(join(assetsDirectory, file))).size })),
);

const largest = javascript.reduce(
  (current, item) => (item.bytes > current.bytes ? item : current),
  { file: "none", bytes: 0 },
);
const total = javascript.reduce((sum, item) => sum + item.bytes, 0);
const kib = (bytes) => (bytes / 1024).toFixed(1);

console.log(
  `Bundle budget: ${javascript.length} JS chunks, ${kib(total)} KiB total, largest ${largest.file} at ${kib(largest.bytes)} KiB.`,
);

const failures = [];
if (largest.bytes > limits.largestJavaScriptBytes) {
  failures.push(`largest JS chunk exceeds ${kib(limits.largestJavaScriptBytes)} KiB`);
}
if (total > limits.totalJavaScriptBytes) {
  failures.push(`total JS exceeds ${kib(limits.totalJavaScriptBytes)} KiB`);
}

if (failures.length > 0) {
  console.error(`Bundle budget failed: ${failures.join("; ")}.`);
  process.exitCode = 1;
}
