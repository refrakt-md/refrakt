{% bug id="BUG-043" status="confirmed" severity="major" source="SPEC-072" tags="plan, pipeline, git, history, performance, ci" %}

# Building plan content slows with the length of git history

Pages that render plan entities read git history during the build, and the cost grows with the
repository's history rather than with the content being built. In this repository, two tests
that build real plan content take **~17s on a shallow clone (96 commits) and ~170s on the full
history (3,473 commits)**:

| Test | Shallow | Full history |
|---|---|---|
| `packages/content/test/plan-site-dogfood-real.test.ts` (builds the plan site) | passes | times out, ~176s |
| `plugins/plan/test/pipeline.test.ts` "contributes relationship edges to the registry graph" | passes | times out, ~165s |

CI only passes because `actions/checkout` makes a depth-1 clone. Found when PR #704 briefly
switched the validate job to `fetch-depth: 0` and both tests timed out; that change was
reverted in the same PR. Any full-history build of a site with plan content pays the same
cost, which may include the plan site's production deploy.

## Where the time goes (measured on the full history)

- **`extractBatchHistory`** (`plugins/plan/src/history.ts`, called from the plan pipeline's
  aggregate hook in `pipeline.ts`): one `git log` over the plan directory, then one
  `git show <hash>:<file>` per commit that touched each plan file. That is **3,669** `git show`
  processes for this history, at ~3ms each: **~11s per extraction**. `.plan-history-cache.json`
  only helps on a warm second run in the same checkout, never in CI or a fresh clone.
- **`packages/content/src/timestamps.ts`**: `git log --name-only` over the whole history,
  **~3.8s**, plus ~0.4s for the created-date pass.

These account for ~15s per build. The ~170s the tests take means the work runs several times
per test, or a path not measured here dominates. That is part of what the fix has to establish.

The pipeline test also reads the real repository's history through `cwd: '.'`, so its runtime
depends on the clone it runs in, not on its fixtures.

## Steps to Reproduce

1. In a clone with full history (`git fetch --unshallow`), run
   `npx vitest run packages/content/test/plan-site-dogfood-real.test.ts plugins/plan/test/pipeline.test.ts`.
2. Run the same in a depth-1 clone.

## Expected

Build time tracks the plan content, not the length of the repository's history. Both tests pass
on either clone.

## Actual

~17s shallow; on full history both time out at 30s and take ~165–176s to finish.

## Environment

- `@refrakt-md/plan` and `@refrakt-md/content` at v0.41.1.

## Acceptance Criteria

- [ ] The remaining time is accounted for: which calls run, how many times, for each of the two tests
- [ ] History extraction reads file contents without one process per commit and file, for example with a single `git log -p` or `git cat-file --batch`, or is bounded or skipped where no page shows history
- [ ] Both tests pass on a full-history clone within their timeouts
- [ ] The pipeline test no longer depends on the history of the clone it runs in

{% /bug %}
