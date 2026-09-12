> Current user direction (2026-08-31): black–purple, superseding earlier green/mint guidance below. Canvas #0c0b10, surface #19171f, accent #b69aff with #211337 ink; light action #6d28d9 with white ink. Restore the original All hero scene with purple lighting; do not remove it for formality. Preserve semantic success/income colors and stored Light/System/Mono preferences.

---
name: Nexus Login
description: Home-aligned arrival theme for the existing login and signup auth gate only.
colors:
  primary: "#55d995"
  background: "#0b0e0d"
  surface: "#181a1b"
  ink: "#f1f2f1"
  muted: "#b5b9b7"
  divider: "#363b38"
  field-border: "#758179"
  focus: "#8ce6b5"
  invalid: "#f87171"
  button-ink: "#10281b"
  primary-hover: "#75e3aa"
typography:
  display:
    fontFamily: "Manrope, Noto Sans Thai, sans-serif"
    fontSize: "clamp(36px, 3.7vw, 54px)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, Noto Sans Thai, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: "6px"
  panel: "14px"
spacing:
  field-gap: "20px"
  panel-padding: "36px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.button-ink}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
    height: "50px"
  form-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-padding}"
---

# Design System: Nexus Login

## Overview

**Creative North Star: "A little more clarity. Every day."**

This documents the implemented Home-aligned arrival treatment in `LoginScreen.tsx` and `loginScreen.css`, covering sign-in and sign-up inside the existing auth gate. Its dark green canvas, mint emphasis, existing fonts, and reused Home hero connect the public identity to account entry.

This is a scoped reference, not a claim that MFA, lock, settings, or other sync screens use this theme. Authentication, MFA, and synchronization behavior remain owned by the existing architecture; the visual treatment introduces no authentication bypass.

**Key Characteristics:**
- Dark green surfaces with mint action emphasis.
- Spacious desktop story and form; focused mobile form.
- Existing Manrope, Thai font, and hero assets.

## Colors

### Primary

Mint identifies the submit action, selected tab, story emphasis, and valid field borders. The lighter hover token brightens the submit button.

### Neutral

The forest background supports a slightly lighter form surface. Pale ink carries labels and headings; muted sage carries supporting copy. Dividers and stronger field borders separate content and controls. Focus and invalid tokens preserve distinct interaction feedback.

## Typography

Manrope and Noto Sans Thai are served from existing `/projects/assets/` font files with sans-serif fallback. The display token belongs to the desktop story. Form headings use medium weight (600), a compact size (30px; 27px on mobile), and line height (1.4). Inputs use readable text (16px); labels, tabs, and form copy use body size (14px).

## Layout

The desktop content centers around an available width of 1160px with a story/form grid (1.15fr / 1fr), a generous gap (80px), and vertical padding (64px). At 1000px and below, the gap narrows to 36px and form padding to 28px.

At 760px and below, the story is hidden and the form becomes the sole main content, capped at 480px with side padding. Header and footer remain. At 360px and below, signup name fields stack. The page uses minimum viewport height and natural document scrolling, accommodating the longer signup form.

## Elevation & Depth

Depth comes from tonal surfaces and thin borders, without a panel shadow. The existing hero image is decorative, masked into the desktop story, and hidden in forced colors. Focus uses a visible outline rather than a shadow glow.

## Shapes

The form has gently rounded panel corners; inputs and submit controls use the tighter control radius. Tabs use a simple underline. Borders and clear spacing carry the hierarchy.

## Components

- **Submit:** Full width, mint background, dark text, minimum height (50px). Hover lightens the surface; loading disables submission, lowers opacity, and shows the processing label.
- **Fields:** Existing shared `FormField` labels remain. Controls have a dark background and minimum height (48px). Touched valid and invalid fields retain mint/red borders and check/cross badges. Keyboard focus retains an offset outline (3px, offset 4px).
- **Account tabs:** Sign-in and sign-up share an existing form panel. The selected tab has mint text and underline. Arrow keys, Home, and End switch and focus tabs; ARIA selection and panel labels track mode.
- **Feedback:** Existing auth errors remain alerts; email confirmation remains a status message. Signup retains name, country code, phone, email, and password fields.
- **Story:** Existing hero image and finance/habit summaries support desktop arrival. They introduce no new account capability or navigation action.

## Do's and Don'ts

### Do:
- **Do** reuse the existing Home assets and scoped login palette.
- **Do** preserve readable labels, keyboard focus, and valid/invalid feedback.
- **Do** keep sign-in and sign-up wired to the existing auth store and auth gate.

### Don't:
- **Don't** apply this scoped reference to other sync screens without reviewing their own context.
- **Don't** change MFA, synchronization, or authentication requirements as part of this theme.
- **Don't** invent authentication bypasses or unimplemented account capabilities.

Theme ownership update (2026-08-31): the palette above describes the dark appearance only. Runtime colors now inherit `src/styles/nexusTheme.css` and follow the stored Light/Dark/Mono/System mode. Do not reintroduce fixed page colors. See `docs/SHARED_THEME.md`.

## Shared theme contract

Canonical colors are inherited from `src/styles/nexusTheme.css`; values above document dark mode, not independent overrides. Light/System/Mono inherit the shared palette. Component typography uses 12px metadata, 14–16px supporting/body text, 27–30px wordmarks/headings and responsive 36–54px story headings. These roles must remain readable at 200% scaling.
