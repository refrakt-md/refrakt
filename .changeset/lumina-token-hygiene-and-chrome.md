---
"@refrakt-md/lumina": minor
"@refrakt-md/types": minor
---

Lumina polish: token hygiene, dark parity, theme-aware chrome, and a11y (v0.19.0 batch A).

- **Token hygiene.** Reconciled seven phantom colour tokens that were painting stale literal fallbacks (the out-of-place blue and cold-gray muted text): `text-muted`→`muted`, `heading`→`text`, `accent`→`primary`, `background`→`bg`, `border-light`→`border`, `warning-fg`→`warning`. Added a derived `--rf-color-primary-bg` (tracks `primary` in both modes) and a mode-flipped `--rf-color-on-primary` (fixes invisible white text on the light dark-mode primary).
- **Breaking (theme authors):** the misnamed `--rf-color-primary-50…950` ramp and the `PrimaryScale` type are **removed** — it was a warm-neutral scale mislabelled "primary" with almost no consumers. Set `--rf-color-primary` directly; `primary-bg` derives from it.
- **Dark parity.** Verified every absolute token has a dark override; the remaining four are intentionally shared (derived from mode-aware tokens), now annotated.
- **Theme-aware chrome.** Branded `::selection`, token-driven scrollbars, and `color-scheme` per mode so native chrome (including the main scrollbar) follows the theme.
- **Accessibility.** A uniform `:focus-visible` ring across all interactive elements and a global `prefers-reduced-motion` reset.
