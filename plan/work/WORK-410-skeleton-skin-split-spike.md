{% work id="WORK-410" status="done" priority="high" complexity="moderate" source="SPEC-094" milestone="v0.22.0" tags="theme,css,skeleton-skin,spike,architecture" %}

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

- [x] A working split of the slice under `@layer skeleton, skin`, with the editorial re-skin overriding via low-specificity selectors (no specificity wars, no `!important`).
- [x] A written **cut-line rule** (which declaration classes are skeleton vs skin) and a **packaging decision** (`@refrakt-md/skeleton` package vs. a neutral `base.css` export).
- [x] A **scope estimate** for the full v0.23.0 extraction (file / declaration counts, plus the `data-surface` + icon-config engine changes) feeding the v0.23.0 milestone.

## Dependencies

- Best run after {% ref "WORK-405" /%} (tokenized type shrinks the classification surface) and using {% ref "WORK-409" /%} for the before/after diff.

## References

- {% ref "SPEC-094" /%} · `packages/lumina/styles/dimensions/surfaces.css` · `packages/lumina/styles/runes/hint.css` · `packages/sveltekit/src/virtual-modules.ts`.

## Resolution

Completed: 2026-06-15

Branch: `claude/work-410-skeleton-skin-spike`

### What was done
Spiked the skeleton/skin split on a representative slice — `card` (card-surface rune), `hint` (inline rune carrying icon data), and `surfaces.css` — under `@layer skeleton, skin`, re-skinned with a deliberately un-Lumina "editorial" look. Artifacts in `spike/skeleton-skin/` (skeleton.css, skin.lumina.css, skin.editorial.css, layers.css, icons.json, demo.html) + `FINDINGS.md`.

### Deliverables (the three ACs)
- **Cut-line rule** (FINDINGS §1): correctness-not-taste, with a *third* category the §8 framing implied — **content** (embedded assets + the rune→treatment assignment) that leaves CSS entirely for config. Resolved the three gray-zone calls: padding/margin magnitude = skin-via-token; border presence = skin; per-surface padding pattern = skin keyed off `[data-elevation]`.
- **Packaging decision** (§2): a dedicated, versioned `@refrakt-md/skeleton` package (over a neutral base.css export) — it's the contract every theme depends on and must version independently of any skin.
- **Scope estimate** (§6): 114 CSS files / ~13,532 lines / ~6,058 declarations; ~40% skeleton / ~55% skin / ~5% content+assignment. Gating non-mechanical work, ordered: spacing-token coverage (prerequisite, like WORK-405 was for type) → data-elevation engine emission (WORK-423) → icon-from-config (9 URIs / 2 files) → the per-file layer re-bucketing → the skeleton package + loader order-emit.

### Key findings
- **Layer order is guaranteed loader-agnostically** by one line (`@layer skeleton, skin;`) emitted first; the loader does NOT need to guarantee skeleton-before-skin import order, removing the fragile constraint. Editorial re-skin overrides with single-class/attribute selectors and zero `!important`.
- **SPEC-107 vocabulary validated empirically**: surfaces.css's 49 rune-name selectors → ~5 `[data-elevation]` rules; card/inset→raised/flat/sunken, inline→flush, banner→flush+width:full. No vocabulary gaps surfaced.
- **Biggest "more work first" finding**: spacing is not tokenized (card.css hardcodes 0.5rem/0.375rem/0.8125em), so a clean spacing skin/skeleton split needs a spacing-token pass first — the editorial re-skin's only friction was un-tokenized magnitudes, not mis-placed structure.

### Deferred
The before/after **visual diff** (the WORK-409 harness) is the one validation not closeable here — Chromium download is blocked by the environment's network policy. Split validated by construction + cascade rules + the isolated demo; pixel diff to run when a browser env is available.

{% /work %}
