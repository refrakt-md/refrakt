{% work id="WORK-473" status="done" priority="medium" complexity="moderate" source="SPEC-100" milestone="v0.26.0" tags="carousel,collapse,layout,lumina,css" %}

# Collapse-to-carousel target (CSS-only)

Let a rune's collapsed (mobile) form be a carousel instead of a stack — a CSS-only arrangement
flip at the {% ref "SPEC-099" /%} `collapse` breakpoint, with no JS nav on the responsive path.
Per {% ref "SPEC-100" /%} Phase A.4.

## Scope

- Introduce the **`collapse-to`** dial (`stack | carousel`, default `stack`) that selects the
  collapsed *form*. It is orthogonal to `collapse` (the breakpoint) — not a second breakpoint, so
  consistent with {% ref "SPEC-099" /%}'s "no second `layout-collapse` attribute" rule.
- With `collapse-to="carousel"`: below the `collapse` breakpoint the item band flips from its base
  arrangement (grid/list) to a scroll-snap row — **CSS-only**, keyed off the same `collapse` hook
  ({% ref "WORK-469" /%}). `layout="carousel"` is already a carousel at all widths, so `collapse-to`
  is moot there.
- The JS nav-button chrome is **explicit-desktop only** (`layout="carousel"`); the responsive
  collapse path relies on native touch/trackpad scroll and does **not** mount the JS affordances.
- Deliberately avoid a `matchMedia` mount/unmount lifecycle in the behavior layer (non-goal).

## Acceptance Criteria

- [x] A `collapse-to` dial (`stack | carousel`, default `stack`) selects the collapsed form, orthogonal to the `collapse` breakpoint; `layout="grid" collapse-to="carousel"` is grid above the breakpoint and a swipe row below.
- [x] Collapse-to-carousel works as a CSS-only arrangement flip at the `collapse` breakpoint.
- [x] No `matchMedia` mount/unmount in the behavior layer and no JS nav chrome mounted on the responsive collapse path.
- [x] The flip reuses the shared `collapse` hook (no new breakpoint attribute).

## Dependencies

- {% ref "WORK-472" /%} — the carousel CSS/track contract this flips into.
- {% ref "WORK-469" /%} — the shared `collapse` hook the flip keys off.

## References

- Spec: {% ref "SPEC-100" /%} Phase A.4 + Non-goals (responsive path is CSS/touch-only).
- {% ref "SPEC-099" /%} §3 (`collapse` semantics).

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-100-carousel-layout-mode`

### What was done
- `plugins/marketing/src/tags/feature.ts` — `collapse-to` attribute (`stack | carousel`), emitted as a `data-collapse-to` meta only when non-default.
- `plugins/marketing/src/config.ts` — `collapse-to` modifier (noBemClass).
- `packages/skeleton/styles/runes/carousel.css` — generic collapse-to-carousel: below the `collapse` breakpoint (sm/md/lg + default sm, mirroring split.css; `never` opts out), `[data-collapse-to="carousel"] [data-name="items"]` flips from grid/list to a scroll-snap row. CSS-only, shared `data-collapse` hook, no JS nav on the responsive path. Per-slide width via `--rf-carousel-slide`.

### Notes
- Orthogonal to the `collapse` breakpoint — not a second breakpoint (SPEC-099 ruled that out). Generic (keyed on the contract), so any adopting rune gets it. Moot under `layout="carousel"` (already a carousel at all widths).

{% /work %}
