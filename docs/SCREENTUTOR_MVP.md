# ScreenTutor — MVP implementation note

## Status

Partial MVP. The React/Electron vertical slice is implemented and verified in the browser preview. Native Windows screen capture is wired through Electron IPC, but final end-to-end capture/OCR verification requires running the packaged Electron app on a Windows desktop with Ollama available.

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

ScreenTutor sends screen data only to the local Ollama endpoint configured by the user. Screen content is wrapped as untrusted `SCREEN_CONTENT` data in the AI request and is never treated as application instructions.

## Validation

- `npm run build` — passed.
- `npm run lint` — passed.
- `npm test -- --run src/features/screentutor/services.test.ts` — 3 tests passed.
- Browser preview — region selection, save state, demo capture, answer overlay, ESC close, and history entry verified.

## Known limitations

- The selector is currently an in-app selection surface; a separate always-on-top transparent selection window is still needed for selecting pixels behind the ScreenTutor window.
- Global hotkey and native region capture are implemented for Electron, not Tauri 2, because this repository already ships an Electron desktop wrapper.
- Tesseract language data and the first OCR run can be heavy. OCR performance should be measured with Thai and English fixtures on the target machine.
- Ollama model pull/start is a user prerequisite and must be tested on the Windows packaging path.

## Next recommended task

Run `PERF-001`: verify the Electron capture crop and Tesseract Thai/English OCR timings on a real Windows 11 desktop, then add a native transparent selector if the capture coordinates need desktop-space calibration.
