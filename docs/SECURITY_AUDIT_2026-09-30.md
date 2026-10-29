# Security Audit — 2026-09-30

## Scope and limitations

Static source/config review of app routing/auth gates, local storage/encryption descriptions, Supabase schema/functions, Vercel headers, raw HTML use and environment variable names. No secrets were read, no live account or Supabase project was probed, no penetration test/device forensic assessment was performed, and no deploy was made.

## Positive controls observed

- Published Main/All routing gates use Supabase auth; private functions perform server-side identity/authorization checks per existing docs and code.
- Supabase domain-relay records are RLS scoped; scoped functions and sensitive MFA controls have explicit SQL hardening and migrations.
- Client uses Web Crypto encryption-at-rest as optional layer; Vault entries always encrypted. IndexedDB default remains local plaintext, documented as a device-local threat boundary.
- `vercel.json` sets CSP, X-Frame-Options, HSTS, Referrer Policy, nosniff and Permissions-Policy; `e2e/production-smoke.spec.ts` asserts key headers.
- `ProjectHub.tsx` uses `dangerouslySetInnerHTML` for a bundled HTML template, with code comment documenting static trusted markup and no user-data interpolation; user data enters via React portals. No untrusted HTML flow found in this specific use.
- `.env.example` provides placeholders; public Supabase anon key is intentionally a browser key and Anthropic key is described as server-only. `.env.local` was not opened or reported.

## Findings

| Finding | Severity | Evidence | Recommendation |
|---|---|---|---|
| CSP permits `'unsafe-inline'` in scripts/styles and `wasm-unsafe-eval` | P2 | `vercel.json` policy | Explore nonce/hash-based script CSP only after Vite/PWA inline bootstrap compatibility is mapped; avoid breaking OCR WASM. |
| Plain local IndexedDB can expose data to same-origin script/XSS or local profile access when encryption disabled | P2 documented boundary | Security model; optional encryption | Preserve CSP/a11y and dependency controls; ensure user understands app lock is not database encryption unless enabled. |
| Electron currently opens the Vite root while ScreenTutor is web root; native capture bridge is privileged | P2 | `electron/main.cjs`, preload exposes narrow IPC bridge | Verify packaged-origin navigation and IPC sender validation on Windows; no current hostile-origin route established. |
| No current live authorization/pentest/device validation | P2 evidence gap | Not run in this task | Use synthetic staging identities and named test plan; never use real personal finance data. |
| Demo analysis can present canned answer without model | P1 trust issue | ScreenTutor path | See [fake-feature audit](FAKE_FEATURE_AUDIT_2026-09-30.md); make demo state explicit or fail closed. |

## Review notes

- No API keys/tokens were printed. `rg` scanning focused on code/config names and did not emit `.env.local` values.
- Browser route authentication does not imply the local desktop wrapper has the same threat model; Electron context isolation and disabled Node integration are enabled in `main.cjs`, but packaged-app origin/IPC validation remains a separate verification task.
- Security score is not assigned; this was not a complete threat-model or penetration audit.
