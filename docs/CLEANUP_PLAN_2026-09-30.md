# System Cleanup Plan — 2026-09-30

No source deletion or speculative fixes were made during the audit. Complete in this order, with owner approval where marked.

| Order | Priority | Work | Status / gate |
|---:|---|---|---|
| 1 | P1 — decision required | Decide whether web, Electron and Android root should launch Nexus or ScreenTutor; reconcile routes, PWA identity, entry shell, README and docs after decision | BLOCKED / product decision required |
| 2 | P1 | Make ScreenTutor demo fallback unmistakable and prevent canned option C from looking like verified advice; add UI/service regression tests | Product/UX behavior approval required |
| 3 | P2 | Resolve full Vitest suite behavior; run clean `npm test` with complete summary and isolate ordering sensitivity in TopBar/Gallery lazy mount | Planned; audit full suite incomplete |
| 4 | P2 | Build changed Android scanner APK; device test permission, exhaustive scan, incremental startup, date boundary, cancel/retry and real consented slips | Planned; Gradle currently fails loopback before configuration |
| 5 | P2 | Browser directory-picker behavior and fallback matrix; Electron packaged capture/OCR/Ollama validation | Planned |
| 6 | P2 | Add synthetic DB migration/integrity matrix and relational consistency checks | Planned |
| 7 | P3 | Decide long-term Calendar data retention/export/sync policy; only then consider migration/removal | Preserve until policy exists |
| 8 | P2 | Define provider/jurisdiction/consent/security for Bank Connectivity before implementation | Not started; must precede feature work |

## Safe cleanup performed

- Proven dead code removed: 0.
- Confirmed bug fixes performed during this audit: 0 (the scanner fix predates this audit and is documented separately).
- Source changes/deletions: 0.
- Existing user changes preserved; no commit, push or deploy.
