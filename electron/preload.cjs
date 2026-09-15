// Nexus is fully client-side (IndexedDB only) — the renderer doesn't need
// any privileged main-process APIs today. This file exists so
// contextIsolation stays on with an explicit (currently empty) preload,
// rather than skipping it.
