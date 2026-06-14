{% work id="WORK-424" status="ready" priority="high" complexity="moderate" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,prominence,engine,transform" %}

# `prominence` axis (page-section family)

Add the header-emphasis axis from {% ref "SPEC-107" /%}: `prominence` scales a rune's
page-section header (eyebrow / title / blurb / rhythm), selecting its typographic register.
Unlike `elevation` it is **not universal** — it is available only to runes that carry the
page-section header model.

## Scope

- Recognise `quiet | normal | prominent | display` and emit `data-prominence`.
- Gate **availability** by structure: offer `prominence` (via a shared attribute preset) only
  to the page-section-header family — the runes already sharing `pageSectionProperties` /
  `sections: { preamble, headline, blurb }` (`recipe`, `hero`, `cta`, `section`, `feature`,
  `budget`, `cast`, `comparison`, …). Setting it on a non-header rune (e.g. `badge`) is a
  validation error with a clear message.
- Add `defaultProminence` to `RuneConfig`. The skin owns the *magnitude* (it may clamp/no-op a
  value); availability is the engine's concern, degree is the theme's.

## Acceptance Criteria

- [ ] `prominence` accepts `quiet | normal | prominent | display`, emitted as `data-prominence`, on header-family runes only.
- [ ] A non-family rune rejects `prominence` with a clear validation error; tests cover an allowed + a rejected rune.
- [ ] `defaultProminence` is read from theme `RuneConfig`; a `hero` defaulting to `display` needs no authored attribute, while a compact hero / `display` recipe can override.

## Dependencies

- Requires {% ref "WORK-423" /%} (the axis + `RuneConfig` default plumbing).

## References

- {% ref "SPEC-107" /%} · `packages/runes/src/tags/common.ts` (`pageSectionProperties`) · `packages/runes/src/attribute-presets.ts`.

{% /work %}
