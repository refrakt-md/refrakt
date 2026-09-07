{% work id="WORK-528" status="done" priority="high" complexity="simple" source="SPEC-125" tags="transform,config,theme,validation" milestone="v0.31.0" pr="refrakt-md/refrakt#591" %}

# Enforce identity fields on theme overrides

`packages/transform/src/validate.ts` already declares
`IDENTITY_FIELDS = ['block', 'modifiers', 'sections', 'variants']` and enforces it
against {% ref "SPEC-091" /%} variant deltas — "a delta restructures a rune, never
redefines it". The theme-override path does not: `mergeRuneConfig` shallow-merges
`{ ...base, ...override }` with no field restrictions, so a theme can write
`runes: { Card: { sections: {} } }` and silently disable `reading` on every card
in a site.

One position, applied to one of two merge paths. This closes the other.

## Why it goes first

It depends on nothing, and it is the guarantee everything else in
{% ref "SPEC-125" /%} rests on. Once schemas narrow ({% ref "WORK-534" /%}), the
schema-time value must be authoritative — an unguarded override would let config
and schema diverge, which is the divergence the spec exists to close.

Expected to be a **no-op in practice**: Lumina overrides none of these fields.
That makes it cheap to land alone, ahead of the ~50-file work that follows.

## Acceptance Criteria

- [x] `block`, `modifiers` and `sections` are non-overridable on the theme
      override path, not only on variant deltas
- [x] The rule is expressed once and shared between both paths rather than
      duplicated
- [x] A violating override is reported with the same clarity as the variant-delta
      case — it names the field and the rune
- [x] Tests cover both paths, including that a *permitted* field (`layout`,
      `structure`, `styles`, `contentWrapper`, `staticModifiers`, `autoLabel`,
      `editHints`, `projection`) still merges
- [x] Confirmed no-op against the shipped configs: Lumina and all nine plugins
      build with no new diagnostics
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

`frameTarget` is deliberately **not** added to the guarded set here. It is moving
into tag modules in {% ref "WORK-533" /%}, and guarding a field in the same
release that relocates it invites a confusing intermediate state. Add it there,
or drop it if the move makes the guard redundant for that field.

## References

- {% ref "SPEC-125" /%} — Phase 2
- {% ref "ADR-028" /%} — the governing decision
- {% ref "SPEC-091" /%} — where `IDENTITY_FIELDS` comes from

## Resolution

Completed: 2026-09-07

Branch: `claude/milestone-v0-31-0-e5ihxr`

### What was done

- **`packages/transform/src/identity-fields.ts`** (new) — the single home for the ADR-028 rule. `IDENTITY_FIELDS = ['block','modifiers','sections']`, `VARIANT_DELTA_RESERVED_FIELDS = [...IDENTITY_FIELDS, 'variants']`, plus `findReservedFields()` and `identityFieldMessage()` so both paths report the same sentence.
- **`packages/transform/src/validate.ts`** — the SPEC-091 variant-delta check now consumes the shared constant/helpers instead of its own inline literal. Message wording is a superset of the old one, so the existing `/identity field "block"/` assertion still holds.
- **`packages/transform/src/merge.ts`** — `mergeRuneConfig` gained a `RuneConfigMergeOptions` third argument; with `guardIdentity` it strips identity fields from the override and reports each as an `IdentityViolation` (`path`, `rune`, `field`, `message`). `mergeThemeConfig` turns it on for every rune override and takes an optional violation sink (4th arg), defaulting to a one-time `console.warn` per path.
- **`packages/transform/src/types.ts`** — `RuneConfig` and the three fields carry the identity/decoration split in their doc comments.
- **`packages/transform/src/index.ts`** — exports the shared rule and the two new types.
- **`packages/lumina/src/config.ts`** — Lumina's overrides object is now exported as `luminaOverrides` alongside the merged `luminaConfig`, so the merge can be re-run with a sink in a test.
- **`packages/lumina/test/identity-guard.test.ts`** (new) — turns the "expected to be a no-op" claim into an enforced check: Lumina, each of the nine plugins individually, and the full core+plugins+Lumina assembly all produce zero violations.
- **`packages/transform/test/identity-fields.test.ts`** (new, 17 cases) — the guard per field, the motivating `sections: {}` case, multi-field reporting, the console fallback, every permitted field still merging, `variants` still theme-extensible, a base-less key treated as a new rune, the guard staying off for the engine's transform-time merge, and the variant-delta path.
- **`site/content/extend/theme-authoring/config-api.md`** — the `mergeThemeConfig` example no longer teaches overriding `modifiers`; identity notes added under `## RuneConfig`, `block`, `modifiers`, `sections` and the merge-behaviour table.
- **`.changeset/plain-poems-argue.md`** — minor for `@refrakt-md/transform` and `@refrakt-md/lumina`.

### Notes

- **Ignore-and-report, not throw.** `mergeThemeConfig` runs at module scope in theme packages, so a throw would take down the build of a site whose theme is merely over-reaching. Dropping the field is what actually enforces "non-overridable" — the rune's declaration stands — and the warning names the rune and the field. The sink parameter exists so a future `refrakt validate` can surface these as `ValidationError`s without a console spy.
- **`variants` is not guarded on the theme path**, only on variant deltas. SPEC-091 deliberately lets a theme add axes and override value deltas, and `mergeRuneConfig`'s by-axis merge exists for that. Hence the two constants rather than one.
- **The guard is opt-in per merge path.** `engine.ts` and `contracts.ts` call `mergeRuneConfig` to apply a *validated* variant delta at transform time; neither is a place to strip fields or emit config diagnostics, so they keep the unguarded default.
- **A base-less key is a new rune, not an override.** `mergeRuneConfig` short-circuits when there is no base, so plugins declaring their own `sections` through `assembleThemeConfig`'s plugin pass are unaffected. The new Lumina test pins that.
- **One behaviour change landed with a real test attached to it.** `packages/transform/test/value-mapping.test.ts` asserted that a theme could restate `modifiers` to add a `valueMap`; ADR-028 removes that, so the case was rewritten to assert the guard, with a companion case showing a rune-declared `valueMap` surviving an unrelated override. Nothing shipped used the capability.
- `frameTarget` deliberately left unguarded — it moves into tag modules in WORK-533, per this item's Approach section.
- Verified: `npm run build` clean, full suite 4085/4085 across 333 files, `refrakt contracts --check --site main` up to date (132 runes, no drift).
- The `pr` attribute is not set — no pull request was opened for this branch.

{% /work %}
