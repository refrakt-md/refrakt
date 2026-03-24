{% work id="WORK-067" status="ready" priority="high" complexity="moderate" tags="lumina, css, dimensions" %}

# Lumina Universal Dimension CSS

> Ref: SPEC-025 (Universal Theming Dimensions — Theme CSS sections), SPEC-026 (Lumina Theme)

Depends on: WORK-063 (Density), WORK-064 (Section Anatomy), WORK-065 (Interactive State), WORK-066 (Media Slots)

## Summary

Write the universal dimension CSS in Lumina: density rules (~3 + interactions), section anatomy rules (~6), interactive state rules (~6), media slot rules (~5), and surface assignments (~4 groups). Combined with the metadata CSS (WORK-061), this gives Lumina ~40 generic rules covering every rune in the ecosystem.

## Acceptance Criteria

- [ ] Density CSS: `[data-density="full"]`, `[data-density="compact"]`, `[data-density="minimal"]` with padding, description truncation, and secondary metadata hiding
- [ ] Section anatomy CSS: `[data-section="header"]`, `title`, `description`, `body`, `footer`, `media` with layout, typography, and spacing
- [ ] Density × section interactions: title font scales with density, descriptions hide at minimal, footers hide at minimal
- [ ] Interactive state CSS: `[data-state="open/closed"]` show/hide with animation, `[data-state="active/inactive"]` tab indicators, `[data-state="selected"]` highlight, `[data-state="disabled"]` dimming
- [ ] Media slot CSS: portrait (circular, 5rem), cover (16:9, full-width), thumbnail (3rem square), hero (responsive), icon (2rem square)
- [ ] Media × density: compact shrinks portraits and covers, minimal hides all media
- [ ] Surface assignments: runes grouped into card/inline/banner/inset selector lists per SPEC-026
- [ ] Surface × density interaction via `--rune-padding` custom property
- [ ] CSS coverage tests updated for all new selectors
- [ ] Per-rune CSS that is now redundant identified for future cleanup

## Approach

Create dimension CSS files in `packages/lumina/styles/dimensions/`: `density.css`, `sections.css`, `state.css`, `media.css`, `surfaces.css`. Import in `packages/lumina/index.css`. Reference design tokens throughout — never hard-code values.

## References

- SPEC-025 (Universal Theming Dimensions — all Theme CSS sections)
- SPEC-026 (Lumina Theme — full spec)

{% /work %}
