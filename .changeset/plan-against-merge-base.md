---
'@refrakt-md/plan': patch
---

`refrakt plan validate --against <ref>` now catches the collision it was built for: an ID the base branch took after your branch split off, while your branch took the same one. It used to read any base file missing from your working tree as one your branch had deleted, which also skipped every file the base added later, so two branches that each claimed the next free ID passed with "No ID collisions".

The check now reads the merge-base of `HEAD` and the ref. A base file that existed there and is gone from your tree was deleted or renamed by your branch, and is still not a collision; one that did not exist there is. A file the base renamed or deleted after the branch point is not a collision either.

Because it needs the merge-base, a ref with no shared history, or a shallow clone that stops short of it, is now an error rather than a clean run. Fetch the history first (`git fetch --unshallow`, or `fetch-depth: 0` with `actions/checkout`).
