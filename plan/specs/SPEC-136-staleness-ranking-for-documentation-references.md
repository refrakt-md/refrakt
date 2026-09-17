{% spec id="SPEC-136" status="draft" tags="drift, docs, git, cli, tooling, dx, plan" %}

# Staleness ranking for documentation references

{% ref "SPEC-134" /%} records that a human read one slice of code, and tells them
when that exact slice changes. It is precise, and it costs a stamp per
invocation — so it only ever covers the references someone already suspected.

This spec adds the cheap, wide signal underneath it. Documentation already
declares edges into the repository — `snippet path=`, `file-ref path=`, a
backticked module path in a paragraph, a work item's `source=`. Git already
knows how much each end of every edge has moved. Crossing the two costs nothing
per reference and produces a **ranked list of which documentation is most likely
to have rotted**.

It never verifies anything, and it never fails a build. It answers one question
that nothing in the repository answers today: *of the several hundred places
documentation makes a claim about code, which ones should someone look at
first?*

## Problem

### Every page declares edges, and nothing measures them

A documentation page that mentions `packages/runes/src/config.ts` is making a
claim about that file. So is `{% snippet path="…" symbol="…" /%}`. So is a `done`
work item carrying `source="SPEC-128"`. These are dependency edges from prose to
a thing that changes independently of the prose.

The pipeline already extracts the first kind (the shared reader, {% ref "SPEC-062" /%} /
{% ref "SPEC-078" /%}) and the third (`extractRefs`, `scanner-core.ts:175`). Git already
records every commit to both ends. Nobody has ever multiplied the two.

The result is that documentation rot is discovered the way it has always been
discovered here: a human happens to read a page and notices it is wrong. That is
how {% ref "BUG-020" /%} was found, and how the defect below was found — by
writing this spec, rather than by any check.

### A real instance, found by the measure this spec proposes

`site/content/extend/rune-authoring/authoring-overview.md` is the page CLAUDE.md
directs every agent to read before writing a rune. It last changed
**2026-07-09**. `packages/runes/src/config.ts`, which it documents, has taken
**11 commits since**, most recently 2026-09-16.

The page teaches the engine config with a worked `Hint` example:

```typescript
Hint: {
  block: 'hint',
  defaultDensity: 'compact',
  modifiers: { hintType: { source: 'meta', default: 'note' } },
  contextModifiers: { 'hero': 'in-hero', 'feature': 'in-feature' },
  sections: { header: 'header' },
  editHints: { icon: 'none', title: 'none' },
  structure: { … },
}
```

`config.ts:386` today:

```typescript
Hint: {
  block: 'hint',
  defaultDensity: 'compact',
  defaultElevation: 'sunken',
  modifiers: { hintType: { source: 'meta', default: 'note' } },
  contextModifiers: { hero: 'in-hero', feature: 'in-feature' },
  sections: hintSections,
  i18nEnums: { note: 'Note', warning: 'Warning', caution: 'Caution', check: 'Check' },
  metaFields: { hintType: { icon: { group: 'hint' } } },
  blocks: { header: { fields: ['hintType'], layout: 'bar' } },
  layout: { root: ['header'] },
}
```

`structure:` and `editHints:` are still valid `RuneConfig` fields
(`packages/transform/src/types.ts:209`, `:443`), so this is not a vanished API —
it is worse in the way that matters for a teaching page. The canonical example
of *how a rune is configured* demonstrates the pre-{% ref "SPEC-080" /%} /
{% ref "SPEC-081" /%} shape, and omits `metaFields` / `blocks` / `layout`
entirely — the assembly model that replaced it. An author following the page
writes a rune against the older mechanism, and nothing tells them otherwise.

Note what found it. Not a reader, not a test, not `validate` — a commit count.

### Measured, not assumed

The measure was run over this repository, comparing each referring file's last
commit against commits to its target since that point.

**Embedded-source edges** (`snippet` / `file-ref` / `expand` with a real `path=`),
263 invocations scanned:

| Page | Target | Commits since |
|---|---|---|
| `runes/file-ref.md` | `package.json` | 2 |
| `runes/snippet.md` | `packages/runes/src/util.ts` | 1 |
| `runes/codegroup.md` | `packages/runes/src/tags/codegroup.ts` | 1 |

Three, all trivial. **The explicit-edge class is currently clean**, which is a
real and slightly inconvenient result: the strongest-typed edges are the ones
with the least rot, because the rune pages get touched whenever the rune does.

**Prose path mentions** (a backticked `packages/…` or `plugins/…` path in body
text) tell the opposite story — **13 of 35** resolvable edges, across 11 pages:

| Page | Target | Commits since |
|---|---|---|
| `extend/rune-authoring/authoring-overview.md` | `packages/runes/src/index.ts` | **15** |
| `extend/rune-authoring/authoring-overview.md` | `packages/runes/src/config.ts` | **11** |
| `CLAUDE.md` | `packages/lumina/contracts/structures.json` | 6 |
| `extend/theme-authoring/creating-a-theme.md` | `packages/lumina/test/css-coverage.test.ts` | 5 |
| `extend/rune-authoring/content-models.md` | `plugins/learning/src/tags/recipe.ts` | 5 |
| `extend/rune-authoring/authoring-overview.md` | `packages/runes/src/tags/hint.ts` | 3 |
| … 7 more at 1–2 | | |

The rot is concentrated in the **explanatory** pages — the authoring guides,
which explain mechanisms rather than demonstrate a single rune, and which
therefore do not get touched when any one rune changes. That is precisely the
set CLAUDE.md points agents at.

**Plan `source=` edges**, `done` work items whose source spec moved afterwards:
**500 of 505**, a 99% base rate. The class was measured, and it is rejected —
D10.

Two conclusions shape the whole design.

**The highest-yield edge class is the one nothing currently extracts**, and the
lowest-yield is the one the pipeline already models — a feature that only ranked
`snippet` invocations would find almost nothing here today.

And **an edge class earns inclusion by its base rate, not by existing.** Put the
three side by side:

| Class | Non-zero | Of | Rate |
|---|---|---|---|
| Embedded source | 3 | 263 | 1% — too sparse to rank |
| **Prose mention** | **13** | **35** | **37% — discriminates** |
| Plan `source=` | 500 | 505 | 99% — fires on everything |

A signal that fires on almost nothing and a signal that fires on almost
everything are the same kind of useless. Only the middle row supports a ranking,
and which row a class lands in is not predictable from how well-typed its edges
are — it has to be measured before an extractor is written for it.

## What already exists

| Piece | State |
|---|---|
| Single-pass `git log --format=%at --name-only` scan → path → time map | `packages/content/src/timestamps.ts:55` — the exact scan shape this needs |
| Shallow-clone detection | `timestamps.ts:37` — `isShallowClone`, already written |
| Git-root-relative path prefixing | `timestamps.ts:123` — `getGitRelativePrefix` |
| Embedded-source edge extraction (`path=`, `lines=`) | The shared reader — `packages/runes/src/lib/read-file.ts` |
| Symbol → resolved line range | {% ref "SPEC-131" /%} phase 1 |
| Entity reference extraction | `plugins/plan/src/scanner-core.ts:175` — `extractRefs` |
| `source=` / `status=` attribute parsing | `plugins/plan/src/diff.ts` — `parseTagAttributes` |
| A ranked-report CLI with `--format json` | `plan status`, the pattern to follow |
| Advisory-severity finding category | {% ref "SPEC-135" /%} D10 |

Nothing here is new machinery. The git scan is a near-copy of one that already
ships, and two of the three edge extractors already exist for other reasons.

## Proposal

### The measure

For an edge from a **referrer** (a documentation file, or a region within it) to
a **target** (a repository path, or a region within it):

```
staleness = commits touching the target since the referrer last changed
```

Commits, not elapsed days — D4. Zero when the referrer is newer than every
change to its target. Zero when a matching {% ref "SPEC-134" /%} `reviewed`
marker is present — D3.

### Edge classes

| Class | Extracted from | Precision | Status |
|---|---|---|---|
| **Embedded source** | `snippet` / `file-ref` / `expand` `path=` (+ `symbol=`/`lines=`) | High — exact path, and exact region under {% ref "SPEC-131" /%} | Extractor exists |
| **Prose path mention** | Backticked repo-relative path in body text | Low — file-granular, and the paragraph may not be about the file | **New** — D7 |
| Plan source | `source=` on a `done` work item | None — 99% base rate | **Rejected** — D10 |
| Entity `ref` / `xref` | Page → page | Too low to be worth it | Non-goal |

### The command

```bash
refrakt stale                      # ranked report, all edge classes
refrakt stale --top 20             # bound the output (default 10) — D9
refrakt stale --class prose        # narrow to one edge class
refrakt stale --min 3              # floor on the commit count
refrakt stale --format json
```

Always exits zero — D1.

### Output

```
Most likely stale, by commits to the target since the page last changed:

 15  extend/rune-authoring/authoring-overview.md  →  packages/runes/src/index.ts
     last changed 2026-07-09 · target 2026-09-16
     b40cbac per-type schema for playlist and track, resolving BUG-013
     40fb66d show a rune's resolved schema row in inspect, contracts and reference
     … 13 more

 11  extend/rune-authoring/authoring-overview.md  →  packages/runes/src/config.ts
     last changed 2026-07-09 · target 2026-09-16
     846d2d4 generate breadcrumb and timeline positions from a declared index
     … 10 more
```

The commit subjects are the report's whole value — D9. "11 commits" is a number;
*"generate breadcrumb and timeline positions from a declared index"* is a person
recognising that the page they wrote does not mention declared indexes.

## Design decisions

**D1 — This ranks. It never fails.** No exit code, no build failure, no required
check, not even an opt-in flag to make it failing. That is a stronger position
than {% ref "SPEC-135" /%} D10 takes for {% ref "SPEC-134" /%}'s markers, and the
difference is warranted: a `reviewed` marker that fires is a *fact* (this exact
content changed after a human approved it), whereas a staleness count is a
*correlation*. Eleven commits to `config.ts` does not mean the page is wrong, and
a gate built on a correlation gets satisfied by touching the file.

The failure mode of getting this wrong is specific and fatal: the cheapest way to
turn any edge green is to edit the referring page, which means a failing check
would train people to make trivial edits to documentation to clear it — actively
destroying the signal it was measuring. The measure only survives if nothing
depends on it being zero.

**D2 — Bulk application is legitimate here, and that is the whole difference from
{% ref "SPEC-134" /%} D8.** SPEC-134 forbids stamping markers in bulk, and is
right to: its marker asserts *a human read this*, so bulk-stamping manufactures
false evidence.

A staleness count asserts nothing about a human. It is derived, and it is true by
construction whether or not anyone has ever looked at the edge. There is no claim
to falsify, so there is no reason to restrict coverage — and coverage is the
entire point, since the measured rot sits in pages nobody had flagged.

What SPEC-134's D8 warning *does* transfer is the noise concern, in a different
shape: not false claims, but low precision. D9 is the answer to that.

**D3 — A matching `reviewed` marker zeroes the edge.** Where an invocation
carries a {% ref "SPEC-134" /%} marker whose hash still matches, a human looked at
that exact content *after* whatever commits the counter would report. The marker
is strictly better evidence and supersedes the estimate.

This makes the two features compose in one direction: **staleness ranks where to
spend review effort, `reviewed` records that it was spent.** The report is how an
author decides what to stamp; a stamp removes it from the report until the
content actually changes. Neither duplicates the other, and the cheap signal
feeds the expensive one.

**D4 — Commit count, not elapsed time.** A file untouched for a year is not
stale — it is stable, and its documentation is probably fine. A file that took
fifteen commits last month while its guide sat still is the signal. Elapsed time
measures the calendar; commit count measures divergence.

Churn (lines changed) is the tempting refinement and is rejected for now: a
one-line change that flips a default invalidates more prose than a 200-line
reformat, so weighting by size would rank the wrong way about as often as the
right way.

**D5 — Refuse on a shallow clone; never report zero.** `actions/checkout`
defaults to `fetch-depth: 1`. Under that, `git log` on any path returns one
commit and every edge scores zero — the tool would confidently report a clean
corpus, which is the silent-wrong class this repository keeps refusing to
tolerate ({% ref "SPEC-131" /%}, {% ref "SPEC-135" /%} D8).

`isShallowClone` already exists at `timestamps.ts:37`. The command detects it and
exits with an explanation naming `fetch-depth: 0`, rather than producing a report.
Same for "not a git repository" — this feature has no non-git fallback and should
say so instead of degrading.

**A refusal exits non-zero, and this does not contradict D1.** D1 is about
*findings*: no number of stale edges is a failure. Being unable to run at all is
a different event — the tool produced no answer — and a CI step that silently
succeeds while measuring nothing is the same silent-wrong this decision exists to
prevent. Findings never fail; a broken invocation always does.

**D6 — The referrer side resets on any edit, and this is a known, accepted false
negative.** A typo fix on a page updates its last-commit time and zeroes every
edge leaving it. The measure is not "when was this claim last checked" but "when
was this file last touched, for any reason". It will under-report.

Stated plainly because it bounds what the feature can claim: **a zero is not
evidence of freshness**, only the absence of evidence of staleness. The report is
a ranked list of suspects, never a certificate — and it is why nothing is allowed
to gate on it (D1), and why {% ref "SPEC-134" /%}'s markers remain the instrument
for references whose prose makes specific claims.

The partial mitigation is D8's region scoping, which narrows the referrer side
from the file to the lines around the reference. It reduces the false-negative
rate; it does not eliminate it, because editing a paragraph does not mean
re-verifying it.

**D7 — Prose path mentions are an edge class, and the highest-yield one.** The
measurement is unambiguous: every finding worth acting on came from prose, and
the explicit-rune class produced three trivial hits. A version of this feature
scoped to what the pipeline already extracts would have found nothing.

This is also the class with no existing extractor and the worst precision — a
backticked path in a sentence like "formatting is owned by `biome.jsonc`" is a
mention, not a documented claim. The design accepts that: with D1 removing any
consequence from a false positive, and D9 bounding the output, a mention that
ranks highly costs a reader three seconds.

Extraction is deliberately narrow — a backticked, repo-root-relative path that
resolves to a file that exists today. Unbackticked paths, globs, and paths that no
longer exist are all skipped. A path that no longer exists is a different and
louder defect, and belongs to `content:check-links`, not here.

**D8 — Scope to the region when the region is known; the file otherwise. The two
ends are known independently.** `git log -L <start>,<end>:<path>` counts only
commits touching a given line range, and either end of an edge can use it
whenever its region is resolvable:

| | Referrer region | Target region |
|---|---|---|
| Embedded source | The invocation's own lines | {% ref "SPEC-131" /%}'s resolved slice |
| Prose mention | The paragraph containing the mention | **None** — file-granular |

The target side is what raises precision: `config.ts` is 2,782 lines, and eleven
commits to the file says little about the `Hint` entry specifically.

The **referrer** side is the more valuable half, and the less obvious one. It is
the direct mitigation for D6: scoping to the paragraph means a typo fix three
sections away no longer zeroes the edge. That applies to prose mentions too —
they have no target region, but the line their path appears on is perfectly well
known. The class with the worst target precision gets the referrer-side fix
regardless, which is fortunate, because it is the class that carries the value.

Phase 3 rather than phase 1 because `-L` is per-edge and cannot ride the single
bulk scan, so the cost has to be measured before it could ever be the default;
`--precise` until then.

**D9 — Bounded, ordered output. A top-N, not a finding per edge.** The corpus has
hundreds of edges and most score zero. Emitting one diagnostic per non-zero edge
would produce a wall that gets scrolled past — {% ref "SPEC-126" /%} D3's
disabled-guard failure, reached by a different route.

Ten ranked entries with commit subjects attached is a thing a person reads on a
Friday afternoon and acts on. That is the intended interaction, and the output
format follows from it rather than from what the data structure makes convenient.

**D10 — The plan `source=` class is measured and rejected.** It was the most
obvious edge class to include — the extractor already exists, the edges are
explicit and typed, and "this work shipped before its spec last moved" sounds
like exactly the question this spec is about.

The base rate kills it. **500 of 505** `done` work items with a `source` have a
source entity that changed afterwards. A signal that fires on 99% of the
population discriminates nothing; ranking within it would be ranking noise.

The base rate is also *correct*, which is the important part. Specs here are
living documents — five of {% ref "SPEC-130" /%}'s work items show the pattern —
and the `implemented` → `shipped` lifecycle ({% ref "SPEC-049" /%}) guarantees at
least one post-completion edit to every spec that ships, since `status` and
`released-in` are both attributes on the spec file itself. "The spec moved after
the work finished" is not drift here; it is the documented workflow.

Recorded as a decision rather than silently omitted, because the edge is
tempting, cheap to build, and would have shipped on plausibility alone. The
measurement is the whole argument, and it generalises: **check a candidate edge
class's base rate before building an extractor for it.**

**D11 — Its own command, not a `refrakt validate` tier.**
{% ref "SPEC-135" /%} D11 worries about command sprawl, so this needs a reason.

It is a hard dependency difference. `validate` runs against a corpus — content
and config — and must work in the hosted, in-memory, {% ref "SPEC-113" /%} build
where there is no `.git` at all. This feature is *only* git, refuses without it
(D5), and cannot run in a pipeline. Folding it in would make `validate` behave
differently depending on whether the build had a working tree.

The useful consequence: **this spec is blocked on nothing.**
{% ref "SPEC-134" /%} waits on {% ref "WORK-573" /%} to make the diagnostic
channel load-bearing, because a marker with no visible surface is a no-op. A
command with its own stdout has no such dependency.

## Non-goals

- **Verifying that documentation is correct.** Same impossibility as
  {% ref "SPEC-134" /%}: the claim lives in a human's head. This measures
  divergence between two files' commit histories and nothing more.
- **Failing anything on a finding.** D1. Not a build, not a PR check, not an
  opt-in strict mode. A refusal to run is separate and does exit non-zero — D5.
- **In-pipeline diagnostics.** No `PipelineWarning`, no dev-server output, no
  entry in the editor validation rail. Hosted builds have no git (D11), and a
  correlation does not belong beside a page.
- **A rune.** Nothing renders. There is no `{% staleness %}`.
- **Content-to-content edges.** `{% ref %}` / `{% xref %}` between pages score
  almost everything as stale, because content changes constantly. Excluded until
  someone demonstrates a use.
- **Auto-fixing, or auto-stamping `reviewed`.** A tool that clears its own signal
  is {% ref "SPEC-134" /%}'s "automatic re-stamping in CI" non-goal wearing a
  different hat.
- **Weighting by churn, blame, or authorship.** D4. Revisit only with evidence
  that the plain count mis-ranks.

## Acceptance Criteria

- [ ] `refrakt stale` reports a ranked list of edges, ordered by commits to the target since the referrer last changed
- [ ] The git scan is a single `git log --name-only` pass over the repository, not one `git log` invocation per edge
- [ ] Embedded-source edges are extracted from `snippet`, `file-ref` and `expand` `path=` attributes
- [ ] Prose path mentions are extracted from backticked repo-relative paths that resolve to an existing file
- [ ] A backticked path that does not resolve to an existing file is skipped, not reported
- [ ] An edge whose referrer is newer than every change to its target scores zero and is omitted
- [ ] An invocation carrying a matching {% ref "SPEC-134" /%} `reviewed` marker scores zero regardless of commit count
- [ ] Output is bounded by `--top`, defaulting to 10, and each entry lists commit subjects for the target's changes
- [ ] `refrakt stale` exits zero whatever it finds, including when every edge in the corpus is stale
- [ ] A refusal (shallow clone, non-git tree) exits non-zero, distinguishing "could not measure" from "measured, nothing wrong"
- [ ] A shallow clone is detected and refused with a message naming `fetch-depth: 0`, rather than reporting an empty result
- [ ] A non-git working tree is refused with its own message, not treated as a clean corpus
- [ ] `--class`, `--min` and `--format json` behave as specified
- [ ] A test fixture reproduces the measured case: a page referencing a file that has since taken N commits ranks above one referencing an unchanged file
- [ ] `--precise` scopes both ends to line ranges via `git log -L` where a region is resolvable, and falls back to file granularity where it is not
- [ ] The report footer states each class's base rate — how many edges of that class were non-zero out of how many scanned
- [ ] Docs state that a zero score is the absence of evidence of staleness, not evidence of freshness

## Approach

Three phases. Phase 1 is self-contained and shippable alone.

1. **The edge index and the report.** The single-pass git scan (adapted from
   `timestamps.ts`), embedded-source edge extraction from the existing reader,
   ranking, and the `refrakt stale` command with `--top` / `--min` / `--format
   json`. Plus D5's refusals, which are load-bearing from the first commit.
   This phase will find almost nothing in this repository — see the measurement —
   and that is the correct order anyway: it establishes the scan, the ranking and
   the output shape against the class whose extraction is already trustworthy.
2. **Prose path extraction.** The class that carries the value (D7). Its own
   extractor, its own precision tuning, and the first run over `site/content`
   treated as the real acceptance test: if the top ten are not things a
   maintainer agrees are worth reading, the extraction rule is wrong and the
   phase is not done.
3. **Region scoping (`--precise`).** `git log -L` on both ends where
   {% ref "SPEC-131" /%} makes a region resolvable. Measure the cost before
   deciding whether it can ever be the default.

**Budget the extraction rule, not the arithmetic.** The counting is a map lookup
and a subtraction. What decides whether anyone runs this a second time is whether
phase 2's top ten are worth reading — which is a question about which prose
mentions count as claims, and is answered by trying it on a real corpus and
throwing away rules that surface noise.

## Open questions

- **Who reads the report, and when?** This has no gate and no diagnostic surface
  by construction (D1, D11), which means it is a command someone must choose to
  run — the failure mode {% ref "SPEC-126" /%} has now documented three times in
  this repository. A scheduled job that opens an issue with the current top ten
  is the obvious answer and is outside this spec; without something like it, the
  honest expectation is that this gets run during doc-maintenance passes and not
  otherwise. Worth deciding before phase 2, since phase 2 is the phase that
  produces findings worth routing.
- **Does the prose class hold its base rate as the corpus grows?** 13 of 35 is
  healthy, but 35 edges across 11 pages is a small sample, and the rate is a
  property of how often this repository edits guides versus code — not a constant.
  If it drifts toward the plan class's 99%, the ranking degrades into a list of
  everything and the feature needs the region scoping of phase 3 to stay useful.
  Worth re-measuring, not assuming, and worth `refrakt stale` printing its own
  base rate in the report footer so the degradation is visible rather than
  inferred.
- **Should prose extraction honour an opt-out?** A page that legitimately mentions
  many paths without documenting them (CLAUDE.md's monorepo map, for instance)
  will rank persistently. Frontmatter opt-out is the easy answer and also the easy
  way to make the feature disappear one page at a time. Prefer fixing the
  extraction rule first and revisit only if a page is genuinely miscategorised.
- **Is the top-N the right bound, or should it be a threshold?** `--top 10` is a
  fixed budget regardless of corpus health; `--min N` is a fixed bar regardless of
  corpus size. The report currently offers both and defaults to the budget.
  Whether that is right is a question about how the report is consumed, which the
  first open question has to settle first.

## References

- {% ref "SPEC-134" /%} — the precise instrument this feeds; D8 (no bulk stamping), which D2 distinguishes, and D7 (a prompt, not a failure), which D1 extends
- {% ref "SPEC-131" /%} — symbol addressing, which makes D8's region scoping possible
- {% ref "SPEC-135" /%} — the advisory-finding category (D10) and the sibling-commands argument (D11) this spec answers to
- {% ref "SPEC-113" /%} — the hosted, git-less build that keeps this out of the pipeline
- {% ref "SPEC-126" /%} — guards that nothing runs; the open question above is its fourth instance
- {% ref "BUG-020" /%} — prose invalidated by an ordinary edit, found by a human rather than a check
- `packages/content/src/timestamps.ts` — the single-pass git scan and `isShallowClone`, both adapted rather than rewritten
- `packages/runes/src/lib/read-file.ts` — the shared reader carrying `path=` / `lines=`
- `plugins/plan/src/scanner-core.ts` — `extractRefs`, the plan-edge index
- `site/content/extend/rune-authoring/authoring-overview.md` — the instance in Problem

{% /spec %}
