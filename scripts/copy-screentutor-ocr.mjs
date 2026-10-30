import { copyFile, mkdir, readdir } from "node:fs/promises";

// ScreenTutor reads the screen only in the desktop app, which has no network CDN to rely on.
// Copies the OCR runtime and language data into <public|dist>/screentutor-ocr so the packaged
// app is self-contained. The web and Android builds never include it.
const destination = process.argv[2] === "public" ? "public" : "dist";
const root = new URL("../", import.meta.url);
const target = new URL(`${destination}/screentutor-ocr/`, root);
await mkdir(target, { recursive: true });

await copyFile(new URL("node_modules/tesseract.js/dist/worker.min.js", root), new URL("worker.min.js", target));
for (const name of await readdir(new URL("node_modules/tesseract.js-core/", root))) {
  if (name.includes("lstm") && (name.endsWith(".wasm.js") || name.endsWith(".wasm"))) {
    await copyFile(new URL(`node_modules/tesseract.js-core/${name}`, root), new URL(name, target));
  }
}
for (const language of ["eng", "tha"]) {
  await copyFile(new URL(`node_modules/@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`, root), new URL(`${language}.traineddata.gz`, target));
}
await copyFile(new URL("node_modules/tesseract.js-core/LICENSE", root), new URL("LICENSE-core", target));
await copyFile(new URL("node_modules/tesseract.js/LICENSE.md", root), new URL("LICENSE-tesseract.md", target));
