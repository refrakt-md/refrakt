{% work id="WORK-594" status="in-progress" priority="high" complexity="complex" source="SPEC-136" tags="cli, git, staleness, edge-index, drift, docs" milestone="v0.37.0" %}

# The edge index, the git scan, and refrakt stale

{% ref "SPEC-134" /%} is precise and costs a stamp per invocation, so it only
ever covers the references someone already suspected. This is the cheap, wide
signal underneath it.

Documentation already declares edges into the repository. Indexing them costs
nothing per reference and needs no new syntax, no marker, and no change to a
single existing page.

```
staleness = commits touching the target since the referrer last changed
```

Commits, not elapsed days. Zero when the referrer is newer than every change to
its target.

## This track is independent of {% ref "SPEC-131" /%}

Worth stating because the milestone otherwise reads as one long chain. Phase 1
extracts edges from `path=` attributes, which exist today. `symbol=` → resolved
line range is only needed for `--precise`, which is **not in this milestone**.
So this item can start on day one, in parallel with
{% ref "WORK-597" /%}.

## Build the index so the MCP tool does not have to rewrite it

The temptation is a function that walks content, scores as it goes, and prints.
**That shape cannot answer `touching`**, because {% ref "WORK-596" /%}'s query
runs in the opposite direction and without the git scan at all.

Extract edges into an addressable index first and let the ranking be one reader
of it. The cost is an afternoon here and a rewrite avoided later.

## Almost nothing new is being built

| Piece | State |
|---|---|
| Single-pass `git log --format=%at --name-only` scan | `packages/content/src/timestamps.ts:55` — the exact scan shape |
| Shallow-clone detection | `timestamps.ts:37` — `isShallowClone`, already written |
| Git-root-relative path prefixing | `timestamps.ts:123` — `getGitRelativePrefix` |
| Embedded-source edge extraction | the shared reader, `read-file.ts` |
| A ranked report with `--format json` | `plan status`, the pattern to follow |

## The refusals are load-bearing from the first commit (D5)

A shallow clone reports an empty result that is indistinguishable from a clean
corpus. That is the failure this command cannot afford, because its output is
already "nothing is very wrong" most of the time.

## This phase will find almost nothing here, and that is the right order

The spec is explicit: embedded-source edges are the class whose extraction is
already trustworthy, so they are the right one to establish the index, the scan
and the output shape against. {% ref "WORK-595" /%} is where the corpus is
actually reached.

## Acceptance Criteria

- [x] A `stale` command is registered in `packages/cli/src/commands/` — no such command exists today
- [x] `refrakt stale` reports a ranked list of edges, ordered by commits to the target since the referrer last changed
- [x] The git scan is a single `git log --name-only` pass over the repository, not one `git log` invocation per edge
- [x] The scan runs with `--full-history` and no pathspec, so history simplification cannot drop commits from a file's history
- [x] A test pins a file whose simplified and full histories differ, asserting the scan reports the full one
- [x] Embedded-source edges are extracted from `snippet`, `file-ref` and `expand` `path=` attributes
- [x] An edge whose referrer is newer than every change to its target scores zero and is omitted
- [x] Output is bounded by `--top`, defaulting to 10, and each entry lists commit subjects for the target's changes
- [x] `--class`, `--min` and `--format json` behave as specified
- [x] `refrakt stale` exits zero whatever it finds, including when every edge in the corpus is stale
- [x] A refusal (shallow clone, non-git tree) exits non-zero, distinguishing "could not measure" from "measured, nothing wrong"
- [x] A shallow clone is detected and refused with a message naming `fetch-depth: 0`
- [x] A non-git working tree is refused with its own message, not treated as a clean corpus
- [x] The report footer states each class's base rate — how many edges of that class were non-zero out of how many scanned
- [x] The edge index is a shared module, with ranking as one reader of it and no query owning it
- [x] A test fixture reproduces the measured case: a page referencing a file that has since taken N commits ranks above one referencing an unchanged file
- [x] Docs state that a zero score is the absence of evidence of staleness, not evidence of freshness
- [x] `site/content/docs/cli/cli-overview.md` gains a row for `stale` — the page {% ref "WORK-595" /%} cites as its motivating instance of a stale command table

## Approach

Adapt `timestamps.ts`'s scan rather than rewriting it; the shallow-clone and
git-root handling there are the parts most easily got wrong.

**Pass `--full-history`, and do not take the existing call shape on trust.**
Found while measuring {% ref "SPEC-136" /%} D16's base rate, and it is the
single easiest way to ship this item with quietly wrong numbers:

```
git log --name-only -- site/content/docs/cli/cli-overview.md
  → one commit, 2026-07-24

git log --full-history --name-only          (no pathspec)
  → five commits, most recent 2026-09-10
```

A pathspec makes git apply history simplification. Both outputs are correct
git answering different questions, but this command does *arithmetic* on those
timestamps — the referrer's last-changed time is one half of every score — so a
simplified history inflates every edge out of that file, and deflates every
edge into it.

The failure is invisible: the report still renders, still ranks, still looks
plausible. It is the spec's own subject turned on the spec's own instrument,
which is why it gets a pinned test rather than a comment.

The commit subjects are the report's whole value. *"11 commits"* is a number;
*"generate breadcrumb and timeline positions from a declared index"* is a person
recognising that the page they wrote does not mention declared indexes. Do not
economise on them.

## Notes

**This ranks. It never fails** (D1). No exit code on findings, no build failure,
no required check, not even an opt-in flag to make it failing.

The failure mode of getting that wrong is specific and fatal: the cheapest way
to turn any edge green is to edit the referring page, so a gate would train
people to make trivial documentation edits to clear it — actively destroying the
signal it measures. The measure only survives if nothing depends on it being
zero.

Two edge classes are **rejected**, not deferred: plan `source=` edges (99% base
rate) and derived rune pages (96%). Both are in the spec's table with their
measurements; do not re-add them.

## References

- {% ref "SPEC-136" /%} — the measure, D1 (ranks, never fails), D5 (refusals), D9 (`--top` and commit subjects), D12 (the index as a shared module)
- {% ref "WORK-595" /%} — the classes that reach the rest of the corpus
- {% ref "WORK-596" /%} — the `touching` query this index must be able to answer
- `packages/content/src/timestamps.ts` — the single-pass scan and `isShallowClone`, both adapted rather than rewritten
- `packages/runes/src/lib/read-file.ts` — the shared reader carrying `path=`

{% /work %}
