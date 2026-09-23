{% bug id="BUG-026" status="confirmed" severity="major" source="SPEC-135" tags="plan,cli,migrate,ids" %}

# `migrate ids` can renumber the published claimant, breaking references it never scans

When two files claim an ID, `runMigrateIds` sorts the claimants by path and
keeps the first (`plugins/plan/src/commands/migrate-ids.ts:165`). Which claimant
is already published on the base ref plays no part, so on a branch the tool will
happily renumber the entity that is already on `main` and leave the local draft
holding the ID.

The safety argument for that choice is stated in the code:

> It is also harmless: this only ever acts when *nothing* references the ID, so
> no reference is repointed either way and the entities keep their content.

**The refusal check that makes it "harmless" only reads plan files.** It
iterates `entities` from `scanPlanFiles(dir)` (`migrate-ids.ts:170-182`), so
"nothing references this ID" means *nothing inside `plan/`*. Plan IDs are
referenced from well outside it, including from files that have already shipped
to npm.

## Where it comes from

`referencePatterns` and `lineReferences` are correct and thorough for what they
are given. The gap is the corpus, not the matcher: the loop that collects
`ambiguousRefs` never looks beyond the plan directory.

## Measured on this repo

IDs matching `(SPEC|WORK|BUG|ADR)-\d{3}` outside `plan/`, excluding
`node_modules` and `dist`:

| File | Refs | Reachable after a renumber? |
|------|------|------------------------------|
| `site/content/_data/rune-attributes.json` | 718 | generated — regenerable |
| `site/content/releases.md` | 224 | in-repo — fixable, but unscanned |
| `packages/runes/CHANGELOG.md` | 130 | **published to npm — permanent** |
| `packages/transform/CHANGELOG.md` | 120 | **published** |
| `packages/lumina/CHANGELOG.md` | 80 | **published** |
| `packages/content/CHANGELOG.md` | 51 | **published** |
| `packages/runes/src/config.ts` | 54 | in-repo source comments |

The changelog rows are the ones that cannot be walked back. A released entry
reads:

```
- f1908a3: An entity with no properties is not emitted (WORK-567, SPEC-130 D4)
```

Renumber `SPEC-130` and that line, in a tarball already on the registry, now
names a spec about something else. Nothing in the repository records that it
went stale.

## The asymmetry the tool is missing

"Which claimant should keep the ID is not knowable from the files alone" is true
of two files in a working tree. It stops being true the moment a base ref is
available, and `plan validate --against <ref>` already establishes exactly that
fact:

- An ID **present on the base ref** is already distributed — merged commits, PR
  bodies, changelogs, release notes, other branches in flight. Renumbering it
  invalidates references the tool cannot see and cannot fix.
- An ID **only on the branch** has been seen by nobody. Renumbering it
  invalidates nothing.

So the choice is not arbitrary and does not need a tiebreak. It needs the base
ref the sibling command already takes.

Path-sort is also worse than a coin flip here, because it correlates with the
slug. In the case that surfaced this, the local draft won the keep slot purely
because `collapse-the-rune-transform-boilerplate` sorts before
`pluggable-query-engines-for-the-field-value-grammar`.

## Steps to Reproduce

1. Branch from `main`.
2. Create a spec locally that takes the next free ID — say `SPEC-138`.
3. Meanwhile `main` lands its own `SPEC-138` (this is the ordinary race; it is
   why `--against` exists).
4. Merge `main` into the branch. `plan validate` reports the duplicate.
5. Run `refrakt plan migrate ids`.

## Expected

The entity that is new on this branch is the one renumbered; the ID already
reachable on the base ref is left alone. Failing that — with no base ref to
consult — the tool says it cannot tell which claimant is published and refuses,
rather than picking by filename.

## Actual

```
Scanned 827 plan files in plan/
  Would renumber 1 entit(y/ies):
    SPEC-138 → SPEC-140   specs/SPEC-138-pluggable-query-engines-for-the-field-value-grammar.md
      collides with specs/SPEC-138-collapse-the-rune-transform-boilerplate.md
```

`pluggable-query-engines` is the one already merged to `main`. Applying this
would have renamed a published spec and left the unpublished draft holding
`SPEC-138`.

## Notes

- Verified by hand on branch `claude/nifty-ptolemy-80epot`; the draft was
  renumbered manually to `SPEC-140` instead, and
  `plan validate --against origin/main` then reported no collisions across 791
  ids.
- In that instance nothing referenced either ID yet, so the outcome was
  recoverable. The severity is that it is not detectably *un*recoverable: the
  tool reports the same confident plan whether or not the ID it is about to move
  appears in a published changelog.
- **The existing test does not pin the current behaviour.** `picks which file
  moves deterministically` (`plugins/plan/test/migrate-ids.test.ts:113`) asserts
  only that two runs agree, not which file moves. A fix that changes the
  selection rule leaves it passing.
- Related but distinct from the refusal path, which is working as designed: this
  is about the case where the tool *proceeds*.
- A narrower fix — refuse whenever more than one claimant exists and no base ref
  was given — is strictly safer than today and needs no new plumbing, at the
  cost of the convenience the command was written for.

## References

- {% ref "SPEC-135" /%} — duplicate-ID detection, prevention and resolution; D8 is the "resolve only when provable" rule this narrows
- {% ref "WORK-582" /%} — the work item that built `migrate ids` and `validate --against`

{% /bug %}
