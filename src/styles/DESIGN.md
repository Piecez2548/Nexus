> Current user direction (2026-08-31): black–purple, superseding earlier green/mint guidance below. Canvas #0c0b10, surface #19171f, accent #b69aff with #211337 ink; light action #6d28d9 with white ink. Restore the original All hero scene with purple lighting; do not remove it for formality. Preserve semantic success/income colors and stored Light/System/Mono preferences.

# Nexus Main shared theme

Mode: Operate. Updated 2026-08-31 following the user's request to align Main with Nexus All. Scope: root `nexusTheme.css` tokens across Main, All, login and Nexus Tools; `mainTheme.css` retains shell layout only.

Reuse All's self-hosted Manrope/Noto Sans Thai families and black-green / emerald identity. Main remains an operational UI; preserve existing dashboard sections, content, semantic status colors, and navigation. Do not bring the hub's hero imagery into data pages.

Dark canvas `#0b0e0d`, charcoal surface `#181a1b`, neutral muted ink `#b5b9b7`, selected action `#55d995` with `#10281b` ink. Light canvas `#f5f6f5`, primary action `#176b3b` with white ink. Primary controls use the shared `nexus-primary-action` foreground/background pair, 48px minimum height and 12px radius in every mode. Apply zinc/brand remapping at the document root; monochrome keeps its original neutral palette. Do not replace users' stored theme preferences.

Use clear borders and the existing component radii. Keyboard focus, caret, selection and numeric alignment are authored at shell scope. Route changes respect reduced motion. The small switch track sits inside a 44×44 target.

Shell text/warning/control/heading colors use semantic tokens; muted text must retain 4.5:1 contrast on hover surfaces as well as the canvas. Popovers use viewport-bounded panels below 1024px; the sidebar is desktop-only at that threshold. Bottom navigation can wrap at enlarged text sizes. Keep primary action labels and navigation readable at 200% text without freezing the user's font size. Respect reduced motion in shared drawers/popovers, preserve modal focus, and maintain Thai/English document language and accessible labels.

See `docs/MAIN_THEME_AUDIT.md` for findings, contrast measurements, and scope limits.

See `docs/SHARED_THEME.md` for theme ownership, Tools synchronization and cross-origin preference limits.

Neutral refinement approved 2026-08-31: keep green on actions/selected states and brand accents; surfaces, borders and secondary text use charcoal/neutral grays. Preserve semantic status/category colors.
