{% work id="WORK-431" status="ready" priority="high" complexity="moderate" source="SPEC-105" milestone="v0.24.0" tags="motion,animation,engine,transform,runes" %}

# `reveal`/`stagger` engine facet

The gate for {% ref "SPEC-105" /%} (§1–§3): a shared, closed `reveal` modifier plus an
orthogonal `stagger` modifier on section-level runes, emitting the generic `data-*` hooks
and the per-child index the motion CSS and behaviour read. Pure intent → attributes; no
look here.

## Scope

- **Closed vocabulary** — `reveal` accepts `none | fade | slide | scale | blur` (`matches`
  set; default `none`; unknown = build error). A cross-rune facet like `media-position`/`tint`,
  configured once on section-level runes (`hero`, `feature`, `bento`, `cta`, `card`, `steps`,
  `pricing`, `testimonial`, `playlist`, …) — not per rune.
- **Emission** — `data-reveal="<value>"` on the rune root; `data-stagger` when set;
  `--rf-reveal-index` (0,1,2,…) on each enumerated child (reuse the existing numbered-sequence
  child enumeration). Stagger is a silent no-op on single-child runes.
- **Index marker contract** — children carry the index as the global stagger hook
  (WORK-432 targets `[style*="--rf-reveal-index"]`, not `> *`), so "which children
  cascade" is decided here in config, never in CSS.
- Intent only: no keyframes, durations, or transforms in this item (those are WORK-432).

## Acceptance Criteria

- [ ] A closed `reveal` modifier (`none|fade|slide|scale|blur`, default `none`, unknown = build error) is available on section-level runes as a shared engine facet; it emits `data-reveal` on the root and `--rf-reveal-index` on enumerated children.
- [ ] `stagger` is an orthogonal modifier composing with any character; it emits `data-stagger`, is a silent no-op on single-child runes, and stamps the per-child index marker that drives the cascade.
- [ ] The "which children cascade" decision lives in rune config (child enumeration), not CSS; unit tests cover value emission, the `matches` validation, the index marker, and the single-child no-op.

## Dependencies

- None — the {% ref "SPEC-105" /%} gate. WORK-432 and WORK-433 consume these attributes.

## References

- {% ref "SPEC-105" /%} §1–§3 · `packages/transform/src/engine.ts` · `packages/runes/src/config.ts` · named-set discipline {% ref "SPEC-088" /%}.

{% /work %}
