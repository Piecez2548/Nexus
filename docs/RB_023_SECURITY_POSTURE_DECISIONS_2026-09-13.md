# RB-023 — Security posture decision record (2026-09-13)

This engineering record maps the security choices that require an appointed Security owner before a real-data pilot. It is not a risk acceptance or pentest report.

| Area | Current control | Decision still required |
|---|---|---|
| Plaintext backup/export | Portable human-readable backup is deliberately plaintext; export tests cover the behavior and the UI warns about handling. | Security/Privacy owner must approve the use case, storage guidance and deletion/retention boundary. |
| Optional content encryption | AES-GCM client-side encryption with PBKDF2-derived keys and wrapped-DEK recovery; cloud receives ciphertext plus metadata. | Confirm whether optional encryption is sufficient for the intended data categories and supported account flows. |
| Local PIN / biometric | Device-local app-lock gate; PIN hash is intentionally unstretched and scoped to local shoulder-surfing risk. | Record residual offline-extraction risk and any supported-device requirement. |
| MFA / recovery | Supabase native TOTP promotes JWT to `aal2`; Nexus backup-code recovery is application-scoped and does not promote the JWT. | Confirm wording and cross-product boundary, especially DataLens native-TOTP enforcement. |
| CSP / third-party destinations | Production headers include a restrictive baseline, but inline style and configured Supabase destination remain. | Security owner must approve the CSP residual risk or define a hardening change before pilot. |

RB-023 remains **In Progress** pending named Security review, explicit residual-risk decisions and any required hardening. Existing tests and documentation provide engineering evidence only.
