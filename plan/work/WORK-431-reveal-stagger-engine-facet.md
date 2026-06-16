{% work id="WORK-431" status="done" priority="high" complexity="moderate" source="SPEC-105" milestone="v0.24.0" tags="motion,animation,engine,transform,runes" %}

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

- [x] A closed `reveal` modifier (`none|fade|slide|scale|blur`, default `none`, unknown = build error) is available on section-level runes as a shared engine facet; it emits `data-reveal` on the root and `--rf-reveal-index` on enumerated children.
- [x] `stagger` is an orthogonal modifier composing with any character; it emits `data-stagger`, is a silent no-op on single-child runes, and stamps the per-child index marker that drives the cascade.
- [x] The "which children cascade" decision lives in rune config (child enumeration), not CSS; unit tests cover value emission, the `matches` validation, the index marker, and the single-child no-op.

## Dependencies

- None — the {% ref "SPEC-105" /%} gate. WORK-432 and WORK-433 consume these attributes.

## References

- {% ref "SPEC-105" /%} §1–§3 · `packages/transform/src/engine.ts` · `packages/runes/src/config.ts` · named-set discipline {% ref "SPEC-088" /%}.

## Resolution

Completed: 2026-06-16

Branch: `claude/v024-work431-reveal-facet`

### What was done
- **Schema layer** (`packages/runes/src/lib/index.ts`): added `reveal` (closed `matches: none|fade|slide|scale|blur`) and `stagger` (Boolean) to `universalAttributes`, so every block rune accepts them and Markdoc's `matches` enforces the closed vocabulary as a **build error** for free. Forwarded both onto the output tag alongside width/elevation. Registered both in `UNIVERSAL_ATTRIBUTE_NAMES` (`attribute-presets.ts`).
- **Engine** (`packages/transform/src/engine.ts`): in the universal-base-attribute block, read `reveal`/`stagger` from the tag and emit `data-reveal` (no BEM class — styled by attribute, like elevation) + `data-stagger`. Added a `stampStaggerIndex` helper + a `7c` phase that stamps `--rf-reveal-index: 0,1,2,…` (document order) on the cascade items when `stagger` is set, merging onto existing inline style; runs after child recursion so it isn't clobbered. Added `reveal`/`stagger` to the consumed-attribute strip list so the raw attrs don't leak to output.
- **Config contract** (`packages/transform/src/types.ts`): new `RuneConfig.staggerItems?: string` — the descendant `data-field`/`data-name` the engine stamps. "Which children cascade" lives in config, never CSS. Wired it into the multi-child section runes: `feature`→`feature-item`, `bento`→`cell`, `steps`→`step`, `pricing`→`tier` (marketing), `playlist`→`track` (media).
- **Tests**: `packages/transform/test/reveal-stagger.test.ts` (10) — emission, no-BEM-class, raw-attr strip, index stamping by data-field/data-name, nested wrapper order, style merge, and the two silent-no-op paths. `packages/runes/test/reveal-attribute.test.ts` (4) — Markdoc validation accepts the vocabulary, rejects an unknown `reveal` (`attribute-value-invalid`) and a non-boolean `stagger` (`attribute-type-invalid`). Updated the `reference.test.ts` universal-attribute list.

### Notes
- **Universal facet, not per-rune duplication.** Following the work item's "configured once, not per rune," `reveal`/`stagger` are universal attributes (like `width`/`tint`), read once in the engine. The per-rune fact — *which* children cascade — is the only thing that lives in each rune's config (`staggerItems`); runes without it make `stagger` a silent no-op, satisfying the single-child case.
- `data-reveal` is emitted only when the author sets it (absent = the `none` default, no attribute); `data-stagger` is a presence-only empty attribute. No look/keyframes here — that's WORK-432.
- Full suite green (3360 tests); contracts up to date; CSS coverage unaffected (no new selectors yet).

{% /work %}
