{% work id="WORK-582" status="ready" priority="medium" complexity="moderate" milestone="v0.36.0" source="SPEC-135" tags="plan, validation, cli" %}

# Detect duplicate plan IDs, prevent them pre-merge, and resolve them when provable

CLAUDE.md says duplicate IDs "are rejected at create time". Nothing re-checks
afterwards, so a collision introduced by a **merge** passes `plan validate` with
zero errors.

Three happened in two days on the {% ref "SPEC-131" /%} branch — `SPEC-133`,
then `BUG-015`, then `BUG-019`. The `BUG-019` case had already corrupted the
rollups before a human noticed: {% ref "SPEC-130" /%} and {% ref "SPEC-131" /%}
each claimed a different entity under the same ID, and `plan status` emitted the
same no-milestone warning twice.

## Three tiers, and the middle one is the valuable one

- **Detect always.** Group by ID, report groups larger than one. Trivial, and
  always correct.
- **Prevent early.** `plan validate --against <ref>` compares IDs against a base
  ref. On a branch, before a merge, every reference to the branch's own entity
  is unambiguously the branch's — the moment resolution is free, and the moment
  a PR check fires.
- **Resolve only when provable.** `plan migrate ids` renumbers, and **refuses,
  naming what it cannot resolve**, rather than guessing.

## Why resolution must refuse rather than guess

The mechanical half is cheap: `extractRefs` (`scanner-core.ts:175`) already
finds every `{% ref %}` / `{% xref %}` ID because the rollups need them, and
`plan migrate` is an established family — `filenames`, `pr-attrs`,
`dependencies` — with `--dry-run` / `--apply` / `--git`, and a precedent of
`plan validate` naming the migration that fixes a finding (`validate.ts:548`).

The hard part is knowing **which entity a reference meant**. Once two files
share `BUG-019`, every reference to it is ambiguous, and getting it wrong
repoints a reference at the wrong entity — silently, in a file nobody is
looking at. A tool that guesses here reproduces the failure class
{% ref "SPEC-131" /%} exists to remove.

## Acceptance Criteria

- [ ] `plan validate` reports duplicate entity IDs at **error** severity, naming every file claiming each ID
- [ ] A test reproduces the observed case: two files claiming one ID pass today and fail after
- [ ] `plan validate --against <ref>` reports IDs colliding with those on the given git ref
- [ ] `plan migrate ids` renumbers a colliding entity to the next free ID, rewrites its filename to the `{ID}-{slug}` convention, and rewrites every `{% ref %}`, `source`, `supersedes` and `## Blocked by` / `## Blocks` entry pointing at it
- [ ] It refuses, naming the references it cannot resolve, rather than guessing
- [ ] It follows the family's conventions: dry-run by default, `--apply` writes, `--git` stages
- [ ] The duplicate-ID finding names `plan migrate ids` as its fix, matching how the filename finding names its migration

## Approach

The check alone is an afternoon and could be pulled forward at any point — it
is independent of everything else in {% ref "SPEC-135" /%}, and only lives in
this spec because it is the same disease: a check that would have caught it is
cheap and absent.

`--against` is the piece that changes outcomes, so build it second rather than
last. `migrate ids` is the largest part and the least urgent, since prevention
removes most of its occasions.

**Do not build post-merge resolution.** It is possible with line-level
`git blame` on each ambiguous reference, and it is deliberately out of scope:
more machinery, for the case prevention removes, with a silent-wrong failure
mode when the heuristic is wrong. {% ref "SPEC-135" /%} D8.

## Notes

`plan/ids.json` — an allocation ledger that makes git conflict on the ID itself
— is recorded in {% ref "SPEC-135" /%} D9 as a rejected fallback, including the
shape that would actually work (a sorted ID-keyed map; a counter merges cleanly
on precisely the case that matters). Revisit only if collisions continue after
`--against` has somewhere to run.

## References

- {% ref "SPEC-135" /%} — D7 (error severity, and why), D8 (detect, prevent, resolve-when-provable), D9 (the ledger, rejected, with its working shape)
- `plugins/plan/src/scanner-core.ts` — `extractRefs`, the reference index a renumber reuses
- `plugins/plan/src/commands/migrate.ts` — the family this joins
- `plugins/plan/src/commands/validate.ts` — the precedent of a finding naming its migration

{% /work %}
