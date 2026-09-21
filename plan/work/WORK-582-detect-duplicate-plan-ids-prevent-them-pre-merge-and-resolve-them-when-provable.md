{% work id="WORK-582" status="done" priority="medium" complexity="moderate" milestone="v0.36.0" source="SPEC-135" tags="plan, validation, cli" pr="refrakt-md/refrakt#632" %}

# Prevent duplicate plan IDs pre-merge, and resolve them when provable

Three collisions happened in two days on the {% ref "SPEC-131" /%} branch —
`SPEC-133`, then `BUG-015`, then `BUG-019`. The `BUG-019` case had already
corrupted the rollups before a human noticed: {% ref "SPEC-130" /%} and
{% ref "SPEC-131" /%} each claimed a different entity under the same ID, and
`plan status` emitted the same no-milestone warning twice.

## Detection already ships — this item is the other two tiers

**This item was originally scoped to add the detection. It is already there.**
`checkDuplicateIds` (`plugins/plan/src/commands/validate.ts:87`, wired at
`:729`) reports at **error** severity and names the other file, and has since
2026-07-09 — two months before these collisions. Tests cover it at
`validate.test.ts:49` and `unconditional-scan.test.ts:158`. Verified by planting
two files claiming `WORK-999`:

```json
{"severity":"error","type":"duplicate-id","source":"WORK-999",
 "file":"work/WORK-999-probe-b.md","target":"work/WORK-999-probe-a.md"}
```

All three collisions were detectable, at error severity, by a command that
already existed. **Nobody ran it** — which is why the fix for the observed case
is {% ref "WORK-580" /%}'s CI job, not anything in this item. See
{% ref "SPEC-135" /%} D7.

So the three tiers stand, but only two are work:

- **Detect always.** ✅ Ships today. Nothing to build.
- **Prevent early.** `plan validate --against <ref>` compares IDs against a base
  ref. On a branch, before a merge, every reference to the branch's own entity
  is unambiguously the branch's — the moment resolution is free, and the moment
  a PR check fires. **This is the valuable tier**, and the one detection cannot
  substitute for: detection tells you two files collide *after* the merge that
  made both reachable, when every reference to that ID is already ambiguous.
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

- [x] `plan validate --against <ref>` reports IDs colliding with those on the given git ref
- [x] `--against` resolves the ref through git and fails clearly when it does not exist, rather than silently reporting no collisions
- [x] `plan migrate ids` renumbers a colliding entity to the next free ID, rewrites its filename to the `{ID}-{slug}` convention, and rewrites every `{% ref %}`, `source`, `supersedes` and `## Blocked by` / `## Blocks` entry pointing at it
- [x] It refuses, naming the references it cannot resolve, rather than guessing
- [x] It follows the family's conventions: dry-run by default, `--apply` writes, `--git` stages
- [x] The duplicate-ID finding names `plan migrate ids` as its fix, matching how the filename finding names its migration

## Approach

Independent of everything else in {% ref "SPEC-135" /%}, and smaller than first
scoped now that detection is accounted for.

`--against` first — it is the piece that changes outcomes, and it is what
{% ref "WORK-580" /%}'s job wants to run once it exists. `migrate ids` is the
largest part and the least urgent, since prevention removes most of its
occasions.

**Check the assumption before building on it.** This item was scoped against a
belief about the code that turned out to be false, and the same trap is open for
`migrate ids`: confirm what `extractRefs` actually returns (does it carry line
numbers? does it cover `source=` / `supersedes=` attributes, or only
`{% ref %}` / `{% xref %}` bodies?) before designing the rewrite around it. The
AC below says "every `{% ref %}`, `source`, `supersedes` and dependency-section
reference" — verify each of those four is reachable from the existing index
rather than assuming it, and widen the index if not.

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

## Notes on ordering

**Deliberately not a dependency edge in either direction.**
{% ref "WORK-580" /%} ships with plain `plan validate` — which already catches
duplicates — and gains `--against origin/main` whenever this item lands. Making
the job wait on this item would delay the thing that actually fixes the observed
case; making this item wait on the job would be false, since `--against` is
testable on its own.

## References

- {% ref "SPEC-135" /%} — D7 (error severity, already shipped, and what its being unrun implies), D8 (detect, prevent, resolve-when-provable), D9 (the ledger, rejected, with its working shape)
- {% ref "WORK-580" /%} — the CI job that makes the existing detection load-bearing; the actual fix for the three observed collisions
- `plugins/plan/src/commands/validate.ts` — `checkDuplicateIds` at `:87`, the tier this item no longer has to build
- `plugins/plan/test/validate.test.ts`, `plugins/plan/test/unconditional-scan.test.ts` — the tests that already cover detection
- `plugins/plan/src/scanner-core.ts` — `extractRefs`, the reference index a renumber reuses
- `plugins/plan/src/commands/migrate.ts` — the family this joins
- `plugins/plan/src/commands/validate.ts` — the precedent of a finding naming its migration

## Resolution

Completed: 2026-09-21

Branch: `claude/work-582-duplicate-ids`

### What was done

- `plugins/plan/src/commands/against.ts` — `readRefIds` + `collisionsFrom`,
  behind `plan validate --against <ref>`.
- `plugins/plan/src/commands/migrate-ids.ts` — `runMigrateIds`, joining the
  `filenames` / `pr-attrs` / `dependencies` family.
- `plugins/plan/src/commands/validate.ts` — the duplicate-ID finding names
  `plan migrate ids` as its fix, matching the filename findings' precedent.
- `.github/workflows/validate.yml` — the PR job runs `--against` the base ref.
  PR-only: on a push to `main` the base *is* the commit, so every ID would
  match itself.
- `CLAUDE.md` — a "Duplicate IDs" section covering all three tiers.

### `--against` catches what detection cannot

Demonstrated on this repo. Deleting `WORK-575`'s file and creating a different
file claiming the same ID gives **one** local claimant, so plain detection finds
nothing:

```
plain plan validate:   duplicate findings: 0
plan validate --against main:
  ✗ WORK-575
      here: work/WORK-575-a-completely-different-entity.md
      main: work/WORK-575-route-pipeline-diagnostics-...md
  EXIT=1
```

That is the gap D8 describes: detection can only fire once both claimants are
reachable, which is after the merge, when every reference has already become
ambiguous.

### Three bugs `--apply` found that a dry run could not

Worth recording, because two were silent and only writing surfaced them:

1. **`require is not defined`** — `require('node:fs')` in an ESM module.
2. **Write-then-rename left inconsistent state.** The write succeeded and the
   rename threw, leaving a file whose `id=` had moved while its name had not —
   a duplicate that had become invisible to the check that found it. Renaming
   first means a failure leaves the file untouched.
3. **Every rewrite dropped the closing quote.** The patterns consume it via a
   backreference and the replacement did not put it back, producing
   `id="WORK-002 status="`. It would have corrupted every file it touched, and
   a dry run cannot see it because only `--apply` writes. Pinned by a
   quote-balance regression test.

### Notes

- **`extractRefs` could not be reused, contrary to the item's own References.**
  The item's approach section said to verify rather than assume, and it was
  right to: `extractRefs` (`scanner-core.ts:175`) is private, returns a
  deduplicated `string[]` with no positions, and covers only `{% ref %}` /
  `{% xref %}` — not `source=` or `supersedes=`. It tells you *which* IDs a file
  mentions, not *where*, so it cannot drive a rewrite. `migrate ids` works on
  source text instead. Dependency sections needed no separate handling: their
  entries are `{% ref %}` tags already.
- **The provable case is narrower than "renumber and repoint".** An entity is
  renumbered only when *nothing outside it* references the colliding ID — then
  no reference's meaning has to be inferred. Everything else refuses, naming the
  blocking references with file and line.
- 17 new tests; 4,669 pass overall.

{% /work %}
