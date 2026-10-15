{% bug id="BUG-040" status="confirmed" severity="major" source="SPEC-135" tags="plan, validate, against, ids, ci" milestone="v0.41.1" %}

# plan validate --against misses a collision with an ID the base added after the branch point

`refrakt plan validate --against <ref>` exists to catch an ID collision on the branch, before
the merge makes every reference to that ID ambiguous (SPEC-135 D8, WORK-582). It does not
catch the most common one: two branches that each create the next free ID. It reports
"No ID collisions" and exits 0, so the PR job passes it.

The cause is the deletion check in `collisionsFrom` (`plugins/plan/src/commands/against.ts`):

```ts
// The base's claimant is gone from the branch, so the merge leaves one
// file holding the ID. A rename, a move, or a deliberate replacement …
if (!existsSync(join(cwd, refPath))) continue;
```

A base file missing from the working tree is read as "the branch deleted or renamed it". But
a file the base **added after the branch point** is missing from the working tree too, and it
is the second claimant this check is looking for. Both cases are skipped.

Every test in `plugins/plan/test/against.test.ts` compares against the branch's own base
commit, so a base-side file absent from the tree can only have been deleted by the branch.
No test advances the base after the branch point, which is the case that fails.

Found on `claude/site-changelog-readability-k4p902`. Against `origin/main` it reported
"No ID collisions with origin/main (894 ids compared)" while the branch and main each
held their own SPEC-160, WORK-639 and WORK-640. Plain `plan validate` reported all three as
duplicates once main was merged in.

## Steps to Reproduce

1. On `main`, commit `plan/work/WORK-001-alpha.md`.
2. Branch off, and add `plan/work/WORK-002-from-branch.md` there.
3. Back on `main`, commit `plan/work/WORK-002-from-main.md`.
4. On the branch, run `refrakt plan validate --against main`.

## Expected

A collision on `WORK-002`, naming both files, and a non-zero exit.

## Actual

`No ID collisions with main (2 ids compared).`, exit 0.

## Environment

- `@refrakt-md/plan` at the current `main`.
- `refrakt plan migrate ids --against` shares `readRefIds` with the validator through
  `baseClaimants`, but it only acts on duplicates already present in the working tree, so it
  is not affected.

## Approach

Tell the two cases apart with the merge-base, which git already knows. A base-side file that
is absent from the working tree:

- **existed at `git merge-base HEAD <ref>`**: the branch deleted or renamed it. One claimant
  survives the merge, so not a collision. This is the case the check was written for.
- **did not exist there**: the base added it after the branch point. Both claimants survive
  the merge, so it is a collision.

When no merge-base exists (unrelated histories), fail loudly rather than guess, matching how
an unresolvable ref is handled.

## Acceptance Criteria

- [ ] A collision with an ID the base added after the branch point is reported, naming both files
- [ ] A base claimant the branch deleted or renamed is still not reported
- [ ] A ref with no merge-base with `HEAD` fails with an error instead of reporting a clean run
- [ ] `against.test.ts` has a test that advances the base after the branch point, and the existing tests still pass

## References

- {% ref "SPEC-135" /%} D8 and {% ref "WORK-582" /%}: the check and why it runs pre-merge.

{% /bug %}
