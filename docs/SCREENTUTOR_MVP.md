# ScreenTutor — MVP implementation note

**Current route:** `/screentutor` (within the Nexus account route gate). Nexus All is the shared `/` entry point.

## Status

Partial MVP. The React/Electron vertical slice is implemented; focused route/provider/UI tests and a production build pass. Native Windows screen capture, an always-on-top desktop region selector, and the global hotkey are wired through Electron IPC; final end-to-end capture/OCR verification requires running the packaged Electron app on a Windows desktop with Ollama available.

## Architecture

```text
ScreenTutorApp
  ↓
Zustand local store (settings, region, history)
  ↓
captureService → Electron preload → Electron main process
  ↓
OCRService (Tesseract.js) → cleanup → classifyContent
  ↓
AIProvider boundary → OllamaProvider (/api/tags, /api/generate)
  ↓
Result overlay + local history
```

ScreenTutor sends recognized screen data only to the configured Ollama endpoint. Screen content is wrapped as untrusted `SCREEN_CONTENT` data in the AI request and is never treated as application instructions. Analysis fails closed unless real desktop capture, non-empty OCR, provider availability and a validated non-empty JSON response all succeed. Successful results carry explicit Ollama provenance; legacy history without provenance is labeled as unrecorded.

## Validation

- `npm run build` — passed.
- `npm run lint` — passed.
- Focused route/provider/UI run — 3 files / 21 tests passed (2026-10-02).
- Full `npm test -- --reporter=dot` — incomplete quality gate: 458 files passed, 2 failed; TopBar gallery lazy test and unrelated sync-engine test timeout; see the [phase report](PHASE_0_1_0_2_PRODUCT_ENTRY_SCREENTUTOR_FIX_2026-10-02.md).
- Browser preview — UI only. Browser capture is unsupported, and ScreenTutor will not generate an answer without a real capture and validated Ollama response.
- Electron capture/Ollama remains subject to packaged runtime verification; do not infer it from the browser preview.

## Known limitations

- Cross-application capture requires the Electron desktop wrapper; the Vercel/browser preview remains sandboxed to its own tab.
- Global hotkey and native region capture are implemented for Electron, not Tauri 2, because this repository already ships an Electron desktop wrapper.
- Tesseract language data and the first OCR run can be heavy. OCR performance should be measured with Thai and English fixtures on the target machine.
- Ollama model pull/start is a user prerequisite and must be tested on the Windows packaging path.

## Next recommended task

Run `PERF-001`: verify the Electron capture crop, native selector coordinates, and Tesseract Thai/English OCR timings on a real Windows 11 desktop with Ollama available.
