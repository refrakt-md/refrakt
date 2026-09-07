{% work id="WORK-532" status="done" priority="medium" complexity="simple" source="SPEC-125" tags="runes,config,validation,dx" milestone="v0.31.0" pr="refrakt-md/refrakt#591" %}

# Lint slot/role mismatches

The twelve corrections in {% ref "WORK-529" /%}–{% ref "WORK-531" /%} were found
by an ad-hoc script comparing each rune's declared slots (from `layout`,
`structure`, `autoLabel`, `blocks`, `contentWrapper`) against its `sections` map.
Nothing stops the same drift returning the next time a rune gains a `body` slot.

Turn that comparison into a standing check.

## Acceptance Criteria

- [x] A rune declaring a `body` slot with no `body` section role is flagged
- [x] A rune declaring a `title`/`header` slot with no header-ish role is flagged
- [x] The check runs over core **and** all nine plugins, not just `baseConfig`
- [x] Genuinely bodyless runes (the 105 with neither a body role nor a body slot)
      produce no noise
- [x] Runes deliberately left uncorrected in {% ref "WORK-529" /%}–{% ref "WORK-531" /%}
      have a recorded way to opt out, and the reason travels with the opt-out
      rather than living only in a work-item resolution
- [x] The check fails CI rather than only warning
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

**Direction only.** This lints for a *missing* role. It must not flag a role that
is present — those are correct, and the `DataTable` / `Showcase` cases are an
overload of `body`'s meaning, not a data error. Flagging them here would push
someone toward the wrong fix (removing a role Lumina styles) instead of the right
one ({% ref "WORK-537" /%}).

Where it lives is worth a moment. `refrakt validate` already checks theme config
and is the obvious home, but the slot inputs come from four different config
fields and the existing ad-hoc script had to reconstruct them — so a shared
"declared slots for a rune" helper is likely the real deliverable, with the lint
as its first consumer. {% ref "WORK-534" /%} will want the same helper.

## Blocked by
- {% ref "WORK-529" /%}
- {% ref "WORK-530" /%}
- {% ref "WORK-531" /%}

## References

- {% ref "SPEC-125" /%} — Phase 1, *Guard against recurrence*

## Resolution

Completed: 2026-09-07

Branch: `claude/milestone-v0-31-0-e5ihxr`

### The shared helper was indeed the real deliverable

The Approach guessed that a "declared slots for a rune" helper would be the substance, with the lint as its first consumer. That is how it landed: `declaredSlots(config)` in `packages/transform/src/section-roles.ts` gathers slot names from all five config fields that can introduce one — `layout` (container keys plus their `children`), `structure` (entry keys plus every nested `ref`), `autoLabel` values, `blocks` keys, and `contentWrapper.ref`. That is the reconstruction the ad-hoc audit script did by hand, now in one place so the lint and {% ref "WORK-534" /%} agree on what a rune's slots are.

It is deliberately a **lower bound**: slot names the schema emits as bare `data-name` attributes are invisible from config. `Card`'s `title` is one — which is why the lint never flagged it even though {% ref "WORK-529" /%} declined that role. Erring this way means the check only fires on what it can actually see and never invents a slot.

### The lint

`lintSectionRoles(runes)` flags two shapes: a `body` slot with no `body` role, and a heading slot (`title`, `header`, `headline`, `name`) with no header-ish role (`header`/`preamble`/`title`/`description` — the same set `prominence` gates on).

Two suppressions keep it honest rather than noisy:
- A rune whose `sections` already carries a `body` role under a different key is not flagged — `Blog` maps `content → body`, `DataTable` maps `table → body`. The region is declared, just not under the name `body`.
- One header finding per rune, since one is enough to act on.

**Direction only**, as the Approach requires. It flags a *missing* role and never a role that is present, so the `DataTable` / `Showcase` overload is untouched — pinned by a test asserting `DataTable` produces no finding while its `table → body` mapping stands.

### Where it runs

Wired into `validateThemeConfig`, which means `refrakt validate` and `refrakt plugin validate` both pick it up for free, for any theme or plugin. Reported as an **error**, not a warning: the failure mode being closed is a silent one, so it must not scroll past in a build log. Verified end-to-end — `refrakt validate --config` on a drifted config prints the finding and exits 1.

Catalogue coverage lives in `packages/lumina/test/section-role-drift.test.ts`, the only package that can see core *and* all nine plugins at once. A plugin rune drifting is exactly as silent as a core one, so `baseConfig` alone would have been the wrong scope. The test names the offending `rune.slot` in its failure, and a second case guards the guard: if a plugin stops contributing runes, the check would otherwise pass by looking at less.

### Opt-out

New `RuneConfig.sectionRoleExceptions` — `Record<slot, reason>`. It silences the check for one slot and keeps the justification next to the decision rather than only in a work-item resolution, which is what the criterion asked for. Applied to the five runes this milestone deliberately left without a header-ish role: `AccordionItem`, `CharacterSection`, `RealmSection`, `FactionSection`, `ItineraryDay`. Each carries its own reason; the inline comments written during {% ref "WORK-529" /%}–{% ref "WORK-531" /%} were folded into those strings so there is one home for the reasoning, not two.

A test asserts every exception's reason is a non-trivial string — an empty opt-out would silence the check while recording nothing, which is the failure mode the field exists to prevent.

### The rule behind the exceptions

Documented in the lint's own docs rather than encoded as automatic suppression: **a child rune takes the `title` role only when its parent does not already hold one.** It explains all six header-ish cases in the audit (five declines, one addition — `BentoCell`, whose parent `Bento` declares no `sections` at all). Left as recorded per-rune reasons rather than inference, so the lint stays a data check and each decision stays readable where it was made.

### Result on the catalogue

132 runes, **0 findings**. Before the Phase 1 corrections the same check would have reported twelve.

### One real find while wiring it up

Three fixtures in `packages/transform/test/validate.test.ts` — one of them literally named `validConfig` — declared a `header` structure slot with no `sections` entry, so the lint failed them. That is a true positive: the real `Hint` in `baseConfig` maps `sections: { header: 'header' }` and the fixtures had drifted from it. Fixed the fixtures rather than loosening the check.

### Files changed

- `packages/transform/src/section-roles.ts` (new) — `declaredSlots`, `lintSectionRoles`, `BODY_SLOT_NAMES`, `HEADER_SLOT_NAMES`
- `packages/transform/src/validate.ts` — runs the lint over `runes`, reporting findings as errors
- `packages/transform/src/types.ts` — `RuneConfig.sectionRoleExceptions`
- `packages/transform/src/index.ts` — exports
- `packages/runes/src/config.ts`, `plugins/storytelling/src/config.ts`, `plugins/places/src/config.ts` — the five exceptions
- `packages/transform/test/section-roles.test.ts` (new, 21 cases) — the helper's five collection sources, both lint rules, the direction-only guarantee, per-slot exception scoping, and the error-not-warning integration
- `packages/lumina/test/section-role-drift.test.ts` (new, 7 cases) — the catalogue-wide check, plugin coverage, bodyless-rune silence, exception reasons, and a synthetic drifted rune proving the check fires
- `packages/transform/test/validate.test.ts` — three drifted fixtures corrected
- `site/content/extend/theme-authoring/config-api.md` — the check and `sectionRoleExceptions` documented
- `.changeset/quick-moons-repeat.md`

### Notes

- Theme and plugin authors upgrading may see `refrakt validate` newly fail on a rune that was quietly dropping an attribute. That is the check working as intended, and the changeset says so.
- Verified: `npm run build` clean, full suite 4149/4149 across 340 files, `refrakt contracts --check --site main` up to date (no contract movement — the lint changes no output).
- The `pr` attribute is not set — no pull request was opened for this branch.

{% /work %}
