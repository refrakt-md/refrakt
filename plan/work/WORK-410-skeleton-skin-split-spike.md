{% work id="WORK-410" status="pending" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,css,skeleton-skin,spike,architecture" %}

# Skeleton/skin split — spike

The gating spike for the v0.23.0 wholesale extraction. The skeleton/skin cut is a per-declaration
design call (structure and aesthetics are braided inside single rules), so settle it empirically
on a small slice before committing to the public contract every future theme depends on.

## Scope

- Take one card-surface rune + `hint` + one dimension file. Split them on the **correctness-not-taste** criterion (skeleton = what a rune breaks without; skin = anything a different theme would plausibly want different).
- Deliver the split via cascade layers (`@layer skeleton, skin`); confirm the virtual-module loader can guarantee layer order.
- Re-skin the slice with a deliberately un-Lumina editorial look (large serif display, no footer rules, centred preambles, a different inset feel) to surface where Lumina's opinion leaks into the skeleton.
- Probe the engine coupling: how `data-surface` (SPEC-094 §8) and icon-from-config would remove the rune-name lists / embedded data-URIs.

## Acceptance Criteria

- [ ] A working split of the slice under `@layer skeleton, skin`, with the editorial re-skin overriding via low-specificity selectors (no specificity wars, no `!important`).
- [ ] A written **cut-line rule** (which declaration classes are skeleton vs skin) and a **packaging decision** (`@refrakt-md/skeleton` package vs. a neutral `base.css` export).
- [ ] A **scope estimate** for the full v0.23.0 extraction (file / declaration counts, plus the `data-surface` + icon-config engine changes) feeding the v0.23.0 milestone.

## Dependencies

- Best run after {% ref "WORK-405" /%} (tokenized type shrinks the classification surface) and using {% ref "WORK-409" /%} for the before/after diff.

## References

- {% ref "SPEC-094" /%} · `packages/lumina/styles/dimensions/surfaces.css` · `packages/lumina/styles/runes/hint.css` · `packages/sveltekit/src/virtual-modules.ts`.

{% /work %}
