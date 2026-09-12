# Project hub — video reference review

Date: 2026-08-31. Scope: existing static project hub and the user-supplied 11.02-second MP4. Audit only; no application code changes.

## Reference direction

Eight sampled frames were inspected across the clip. These establish composition and changing visual states, not frame-rate performance or the original site's implementation. No instructions or marketing claims inside the video were adopted as requirements.

- Near-black / green atmospheric hero, centered large typography, restrained navigation and a central CTA.
- Large photographic scene below the headline with moving green light trails visible at different positions across frames.
- A two-destination selection section, directly applicable to Nexus Main and Nexus Tools.
- A later white section creates visual contrast with the dark introduction.
- The laptop frame appears to present the website in the video. Treat it as presentation framing, not a required website container, unless the user says otherwise.

Proposed adaptation (Planned): centered Nexus headline, original atmospheric imagery, a visible Explore Projects CTA, then two project entry panels with existing destinations. Keep Nexus facts; do not import HackerRank branding, people, claims or AI functionality. Motion should support the scene without blocking navigation. The supplied reference supersedes the earlier open-ended aesthetic options; changing only Studio's purple accent would not reproduce its structure.

## Integrity verdict

The current hub remains coherent as a small project directory, but does not yet match the newly supplied reference. This is a changed design target, not evidence of a broken project link. Its hero has no cinematic media, titles are left aligned, and motion is limited to hover transforms. Preserve its semantic links and shared content when replacing the presentation.

## Audit score

Source-level provisional assessment; not a WCAG certification, browser performance measurement or score for the video.

| Dimension | Score | Finding |
|---|---:|---|
| Accessibility | 2/4 | Light variants reuse a dark-green focus outline on the near-black preview toolbar. |
| Performance | 4/4 | Static local assets and bounded hover transforms; future cinematic media not implemented. |
| Responsive | 2/4 | Phone breakpoints exist; earlier narrow-viewport evidence remains inconclusive. |
| Theming | 3/4 | Shared tokens, but light-theme accents are also used on the always-dark toolbar. |
| Implementation integrity | 3/4 | Honest conceptual images and real destinations; new reference direction remains Planned. |
| **Total** | **14/20** | **Good, provisional; changed target requires visual rework.** |

## Prioritized findings

### P1 — focus outline contrast on the preview toolbar

Location: `public/projects/styles.css`, `a:focus-visible,button:focus-visible` and Gallery/Index accent overrides. Gallery's #48583c and Index's #315d3b outline sit against #101217. Calculated sRGB contrast is below 3:1 (approximately 2.44:1 and 2.46:1 respectively; see calculation output for exact rounded values). This risks losing the keyboard position indicator, against WCAG 1.4.11 non-text contrast. Use a separate high-contrast toolbar focus token rather than the page accent. Suggested command: `$impeccable harden`.

### P2 — narrow-phone verification remains incomplete

Location: prior project-hub mobile captures and the max-width:600px rules. Earlier requested viewport sizes did not match reported CSS widths, so they cannot certify phone layout or zoom. Validate the selected future design at actual 320/390 CSS pixels, 200% text zoom and keyboard navigation. This is a verification gap, not a newly confirmed overflow defect. Suggested command: `$impeccable adapt`.

Open technical issues: P0 0, P1 1, P2 1, P3 0. The reference mismatch is recorded separately as Planned design work, not artificially counted as an accessibility defect.

## Positive findings and implementation safeguards

Native anchors, buttons, heading order, a skip link, pressed states and live selection status already exist. Project destinations are independent of animation and JavaScript. Keep these behaviors. The current reduced-motion rule removes transform animation and smooth scrolling.

For the Planned motion design, provide a still-image reduced-motion presentation; avoid flashing, scroll hijacking and hidden-until-animated content. If decorative motion runs longer than five seconds, provide pause/stop controls where WCAG 2.2.2 applies. Bound particle counts, pause work offscreen, and verify frame timing on mobile. Do not embed the reference recording as the entire page: it cannot provide accessible project navigation.

## Validation and next order

Read current HTML/CSS/JS and reran the detector: no regex findings, but degraded mode lacks HTML/CSS parsers and cannot evaluate computed contrast. Contrast here was calculated independently from the source colors. No browser or full-suite retest this turn, since this is a report-only audit; previous build/test outcomes remain historical.

1. `$impeccable harden`: separate toolbar focus color.
2. `$impeccable layout` and `$impeccable animate`: implement the supplied reference direction using Nexus content, with original imagery and accessible motion.
3. `$impeccable adapt`: verify actual narrow viewports and reduced motion.
4. `$impeccable polish`: typography, icons and final visual consistency.

These can be requested individually or together. Re-run `$impeccable audit` after implementation. No deployment, routing changes or business logic changes were made in this audit.

## Implementation completion note — 2026-08-31

The preceding review and its 14/20 score describe the earlier three-variant prototype and are retained as historical findings. The reference adaptation is now implemented as one cinematic black/emerald hub at `/projects/index.html`, replacing Studio/Gallery/Index. Its centered hero, original generated workspace image, restrained light trail, two project entries and light closing section follow the user-pinned video direction. The design contract in `public/projects/index.html` is authoritative; `public/projects/DESIGN.md` records the built visual system.

The implementation retains native same-tab destinations for Nexus Main (`/dashboard`) and Nexus Tools (`https://nexus-tools-chi.vercel.app/`). It adds self-hosted Manrope/Noto Sans Thai with bundled OFL licenses, separate dark/light section tokens, responsive WebP preloads, independent hero text space for 200% enlargement, a pause control, reduced-motion behavior and hidden/offscreen animation pausing. The new original image was generated with built-in ImageGen on this date; its prompt and provenance are in `public/projects/assets/hero-prompt.txt` and the adjacent WebP JSON records. Optimized images are 48,118 and 14,442 bytes.

Final screenshot evidence is under `.impeccable/review/hub-final`; consult `docs/PROJECT_HUB_AUDIT.md` for the current verdict, tests and remaining limitations rather than carrying this historical audit score forward. This note records implementation, not independent certification. The root dashboard, application business logic and root design system remain unchanged; homepage routing migration and deployment are outside this work.

