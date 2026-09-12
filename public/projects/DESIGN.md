---
name: Nexus project hub
description: A cinematic black and emerald gateway to two personal projects.
colors:
  bg: "#070d0b"
  surface: "#101a15"
  surface-alt: "#101612"
  ink: "#f1f7f3"
  muted: "#b2c3b8"
  accent: "#53f5a0"
  accent-hover: "#89ffbd"
  on-accent: "#062513"
  line: "#344d3e"
  focus: "#b5ffd1"
  paper: "#f2f6f0"
  paper-ink: "#142d1d"
  paper-muted: "#3f5e49"
  paper-accent: "#176b3b"
  paper-line: "#acc7b4"
typography:
  display:
    fontFamily: "Manrope, Noto Sans Thai, sans-serif"
    fontSize: "clamp(2.5rem, 5.7vw, 5rem)"
    fontWeight: 500
    lineHeight: 1.16
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Manrope, Noto Sans Thai, sans-serif"
    lineHeight: 1.6
rounded:
  control: "6px"
  project: "14px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
---

# Design System: Nexus project hub

Authentication update (2026-08-31): the presentation now lives in `src/features/projects/projectHub.html` and `projectHub.css`, rendered behind the shared AuthGate. `/projects/index.html` remains a compatibility route. JavaScript and a valid session are required; the earlier standalone/no-JavaScript entry described below is historical. Artwork, typography, layout and native project-link destinations are preserved. See `docs/PROJECT_HUB_AUTH.md`.

## Overview

Built record refreshed 2026-08-31. Scope is only `public/projects/`, previewed at `/projects/index.html`. The user-pinned video direction and the design contract in `index.html` are authoritative. This single cinematic black and emerald hub replaces the provisional Studio, Gallery and Index variants; it is not an app-wide design system. Root `DESIGN.md`, the existing dashboard, application architecture and homepage routing remain unchanged.

Centered English display copy and Thai supporting text introduce an original creative-workspace scene. Two direct project entries follow, then a light closing section. Preserve the owner's personal-project identity from `PRODUCT.md`; do not import reference branding or unsupported product claims.

## Colors

Emerald is the primary action and headline accent on near-black surfaces. Pale ink and muted green support readable hierarchy; fine green borders separate navigation and project panels. The closing paper section uses its own ink, muted text, accent and border tokens. Its focus outline uses paper-accent rather than the dark section's pale focus token. These are section palettes, not a selectable light/dark theme.

## Typography

Self-hosted Manrope supplies Latin text; Noto Sans Thai supplies the Thai Unicode range, with sans-serif fallback and font-display swap. Keep mixed-script text in live HTML. Desktop display typography uses the frontmatter values; below 640px it uses `clamp(2.15rem, 8.3vw, 3.3rem)`. Supporting copy has generous line height, and headings, paragraphs and buttons permit wrapping.

## Layout

Content is capped at 1160px with responsive gutters. The hero keeps text in normal flow and reserves 330px below it for the scene; its bottom-positioned decorative background is independent of text height. Preserve that separation when checking 200% text enlargement.

Project panels use equal minmax(0, 1fr) columns with a 24px gap. Both have an icon, title, short description, three concrete feature bullets and a full-width action; the Main-only decorative panel was removed after user feedback. Card insets are 32px on desktop and 24px on phones. Panels stack at 760px; below 640px the closing section stacks, navigation wraps and the optional header CTA is hidden. The headline CTA and two project destinations remain available. The dark footer closes the light section.

## Elevation & Depth

Atmosphere comes from the original image, edge gradients and restrained SVG light trail. UI panels use tonal surfaces and thin borders without box shadows. Do not make readable content depend on a photographic contrast patch or an animation frame.

## Shapes

Controls have modest rounded corners; project panels use the larger project radius. Inline SVG icons share thin rounded strokes. Visible focus uses a 3px outline with 5px offset. Links and controls retain useful touch dimensions rather than relying on icons alone.

## Components

- **Navigation and project entries:** native same-tab anchors lead to `/dashboard` and `https://nexus-tools-chi.vercel.app/`. Section navigation, skip link and project links work without JavaScript. Main's artwork is conceptual, not a product screenshot.
- **Primary and secondary actions:** emerald fill emphasizes Main and exploration; a bordered dark action leads to Tools. Hover changes color without concealing content.
- **Hero media:** decorative CSS WebP background, with media-qualified preloads and a smaller image at 640px and below. Text and links survive unavailable imagery. Original imagery was generated with built-in ImageGen on 2026-08-31; prompt: `assets/hero-prompt.txt`. Shipping WebP files are 48,118 bytes (desktop) and 14,442 bytes (small); adjacent `.webp.json` files retain provenance. The reference recording itself is not embedded.
- **Motion:** one nine-second SVG trail loop. The visible toggle exposes its pressed state and pauses/resumes motion. Reduced-motion preference removes animation and disables the toggle; document visibility and IntersectionObserver pause work while hidden or offscreen. Without JavaScript the control stays hidden and the scene stays still. Forced-colors mode removes decorative imagery.
- **Fonts and identity:** local WOFF2 files carry the accompanying `assets/manrope-license.txt` and `assets/noto-sans-thai-license.txt` OFL licenses. Wordmark/icons are inline SVG. The favicon is pre-existing; no new provenance claim is made for it.

## Do's and Don'ts

- Do preserve native destinations, Thai/English hierarchy, semantic headings, visible focus and independent text space.
- Do use `.impeccable/review/hub-final` for screenshot evidence and `docs/PROJECT_HUB_AUDIT.md` for the final scoped verdict and validation limits.
- Don't restore the three-option preview selector or treat the old provisional palette as current guidance.
- Don't copy reference branding, claim remote AI capabilities, or apply this hub's styling to the application by default.
- Don't imply that this implementation changes the root route, deploys the page or certifies app-wide accessibility.

