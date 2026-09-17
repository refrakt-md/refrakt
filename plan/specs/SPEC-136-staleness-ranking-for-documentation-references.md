{% spec id="SPEC-136" status="draft" tags="drift, docs, git, cli, mcp, ai-workflow, tooling, dx" %}

# Staleness ranking for documentation references

{% ref "SPEC-134" /%} records that a human read one slice of code, and tells them
when that exact slice changes. It is precise, and it costs a stamp per
invocation — so it only ever covers the references someone already suspected.

This spec adds the cheap, wide signal underneath it. Documentation already
declares edges into the repository — `snippet path=`, `file-ref path=`, a
backticked module path in a paragraph. Indexing those costs nothing per
reference and needs no new syntax, no marker and no change to a single existing
page.

Extraction alone reaches 28 of this repository's 237 content pages, because a
page can be entirely about a subsystem without ever naming a file in it. So one
optional frontmatter field, `documents:`, lets an author state what extraction
cannot recover — written once per page, never re-stamped. See D13.

It never verifies anything, and it never fails a build. It answers two questions
nothing in the repository answers today, and the second one matters more:

- *Of the several hundred places documentation makes a claim about code, which
  should someone look at first?* — a survey, run occasionally, over rot that has
  already happened.
- *I am about to change this file. What documents it?* — asked at edit time, by
  whoever or whatever is making the change, before the divergence exists.

Both read the same edge index. The first is a list of debts; the second is how
you avoid taking one on — and it is the query an agent can be made to ask every
time, which a human reliably will not. See D12.

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

### The corpus is mostly invisible

Base rates describe the edges that exist. The harder number is how much of the
corpus has no edge at all — **209 of 237 pages**, because a page can describe a
subsystem thoroughly without ever naming a file in it.

| Section | Pages | With any edge | Blind |
|---|---|---|---|
| `docs/` | 56 | 6 | **50** |
| `extend/` | 35 | 8 | **27** |
| `themes/` | 12 | 0 | **12** |
| `runes/` | 116 | 10 | 106 |
| `blog/` | 7 | 0 | 7 |

The first three rows are the problem. They are the explanatory prose — the
authoring guides, the theme documentation, the conceptual `docs/` pages — which
is exactly where the measured rot lives, and 89 of their 103 pages are invisible
to every automatic extraction rule.

`site/content/extend/theme-authoring/overview.md` is representative: it explains
what a theme is, how the two-layer system works, and how themes are structured.
It is *about* `packages/transform/src/merge.ts` and `packages/runes/src/config.ts`
in every meaningful sense, and it names neither. No extractor recovers that,
because the relationship is in the author's head and nowhere in the text.

The automatic classes cannot close this. **A page's subject is not always
recoverable from its words** — which is the argument for letting an author state
it, rather than for extracting harder. See D13.

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
| An MCP tool surface returning structured findings | {% ref "SPEC-043" /%} — `plugins/plan/src/mcp-bindings.ts`, the binding pattern `refrakt_stale` follows |
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
| **Declared** | `documents:` in frontmatter | Highest — the author stated it | **New** — D13 |
| **Embedded source** | `snippet` / `file-ref` / `expand` `path=` (+ `symbol=`/`lines=`) | High — exact path, and exact region under {% ref "SPEC-131" /%} | Extractor exists |
| **Prose path mention** | Backticked repo-relative path in body text | Low — file-granular, and the paragraph may not be about the file | **New** — D7 |
| Plan source | `source=` on a `done` work item | None — 99% base rate | **Rejected** — D10 |
| Entity `ref` / `xref` | Page → page | Too low to be worth it | Non-goal |

### Declared edges

A page states what it is about, once, in frontmatter:

```yaml
---
title: Theme Overview
documents:
  - packages/transform/src/merge.ts
  - packages/runes/src/config.ts
---
```

Each entry is a repo-root-relative POSIX path, resolved through the same
`ProjectFiles` containment as `snippet path=` — absolute paths and traversal
escapes rejected identically. The resulting edges are ordinary edges: they rank
like any other, and `touching` returns them like any other.

`documents` joins the declared members of `Frontmatter`
(`packages/content/src/frontmatter.ts:3`) rather than living in its index
signature — WORK-545's correction, and it means {% ref "SPEC-126" /%} generates
the reference entry for it automatically.

Unlike every other class, a declared path that does not resolve is an **error**,
not a skip — D14.

### The command

```bash
refrakt stale                      # ranked report, all edge classes
refrakt stale --top 20             # bound the output (default 10) — D9
refrakt stale --class prose        # narrow to one edge class
refrakt stale --min 3              # floor on the commit count
refrakt stale --format json
```

Always exits zero — D1.

### The MCP tool, which asks the question backwards

The CLI answers *"what is stalest across the corpus?"* — a survey, run
occasionally. An agent editing code has a different and better-timed question:
**"I am about to change these files. What documents them?"**

`refrakt_stale` serves both, and the second is the one that matters:

| Argument | Query | Caller |
|---|---|---|
| *(none)* | The ranked report, as the CLI | Periodic review |
| `touching: [paths]` | Every page whose edges point at those paths | **An agent mid-edit** |
| `since: <ref>` | The same, for everything changed since a git ref | A PR-scoped sweep |

`touching` is an edge-index lookup, not a staleness measurement — there is no
commit count involved, because the change has not happened yet. It returns
structured rows (referring page, line, the edge's target, and whether a
{% ref "SPEC-134" /%} `reviewed` marker is attached), never formatted text, per
{% ref "SPEC-135" /%} D6.

The agent loop this is for:

```
agent edits packages/runes/src/config.ts
  → refrakt_stale { touching: ["packages/runes/src/config.ts"] }
  → extend/rune-authoring/authoring-overview.md:106 documents this file
  → agent opens that page and updates it in the same change
```

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

**D12 — The MCP surface inverts the query, and that turns the feature from
archaeology into prevention.** The CLI is retrospective by construction: it finds
rot that already happened, months after the commit that caused it, and only when
someone remembers to look. That is worth having, and it is the weaker half.

Inverted — *"what documents the file I am about to change?"* — the same edge index
answers at the only moment when fixing the docs is nearly free: while the author
still has the change in their head, in the same commit, before the divergence
exists. A staleness report is a list of debts. An impact lookup is how you avoid
taking one on.

This is also the decision that makes agents the primary consumer rather than an
afterthought. A human editing `config.ts` does not stop to run a CLI; an agent
with a tool call in its loop does, reliably, every time — and this repository's
documentation is already agent-edited, with CLAUDE.md prescribing a structured
per-task workflow that has an obvious slot for one more step.

Two consequences follow. **The edge index is the product, not the ranking.** The
counting is one consumer of it; `touching` is another, and does not use the git
scan at all. Build it as an index that several queries read, not as a report
generator with a lookup bolted on. And **`touching` is exempt from D9's bound** —
it is already scoped by its input, so returning every match is correct where
returning every stale edge would not be.

The honest limitation: this only helps an agent that asks. Nothing makes it ask,
and that is the same "a command nobody invokes" problem the open questions carry —
except that the remedy here is a line in CLAUDE.md rather than a scheduled job,
which is considerably cheaper.

**D13 — An author may declare edges, and the authoring cost is acceptable because
it is paid once.** This is the one place the spec asks for something to be
written by hand, which sits awkwardly against its own selling point — every other
class works on content nobody touches. The measurement is what justifies it: 209
of 237 pages have no edge at all, and 89 of those sit in the three sections where
the rot was actually found. No extraction rule reaches them, because a page's
subject is not always in its words.

The cost model is what separates this from {% ref "SPEC-134" /%} D8's prohibition
on bulk stamping:

| | What it asserts | When it must be rewritten |
|---|---|---|
| `reviewed="a3f91c4e"` | A human read *this version* of this code | **Every time the code changes** |
| `documents: [path]` | This page is *about* that file | Only if the page changes subject |

A `reviewed` marker decays by design — that is the mechanism. A `documents` entry
does not decay at all: it names what the page is about, which survives every edit
to the code it describes. Written once when the page is created, it keeps
producing edges for years. That is a genuinely different trade from stamping
fifty hashes and re-stamping them each release, and it is why D8's reasoning does
not carry over.

It is also the highest-precision class in the spec, for the obvious reason: an
author who lists three files has chosen three files the page actually describes.
There is no extraction heuristic to be wrong.

**D14 — A declared path that does not resolve is an error; a mentioned one is
skipped.** D7 skips a backticked path that matches no file, because the likeliest
explanation is that the extractor misfired on something that was never a path.
Silence is right there.

A `documents` entry that matches no file has no such excuse. The author asserted
the relationship, so a miss means the file was renamed, moved or deleted and the
declaration was not updated — a fact worth reporting loudly. Without this, the
mechanism designed to catch rot would quietly accumulate its own.

The asymmetry is the point: **inferred edges fail quietly, declared edges fail
loudly**, and which one applies follows from whether a human made a claim.

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
- **Globs in `documents`.** `packages/runes/src/tags/*.ts` is the obvious ask and
  the obvious trap: it expands to an edge set that is stale whenever *any* member
  moves, so a page declaring it fires permanently. That is the 99% base rate of
  D10, invited in by hand. Literal paths only until someone shows a case the
  ranking survives.
- **Cascading `documents` through `_layout.md`.** Frontmatter cascades in refrakt,
  and this field deliberately does not. A subtree declaration would put the same
  edge on every page beneath it, so one file moving lights up all 27 pages of a
  section at once — noise that buries the three pages that individually declared
  it. Per page, where the claim is specific enough to be actionable.

## Acceptance Criteria

- [ ] `refrakt stale` reports a ranked list of edges, ordered by commits to the target since the referrer last changed
- [ ] The git scan is a single `git log --name-only` pass over the repository, not one `git log` invocation per edge
- [ ] Embedded-source edges are extracted from `snippet`, `file-ref` and `expand` `path=` attributes
- [ ] Prose path mentions are extracted from backticked repo-relative paths that resolve to an existing file
- [ ] A backticked path that does not resolve to an existing file is skipped, not reported
- [ ] `documents` is a declared member of the `Frontmatter` interface, not read through its index signature
- [ ] Each `documents` entry produces an edge that ranks and answers `touching` identically to an extracted one
- [ ] `documents` entries resolve through `ProjectFiles`, rejecting absolute paths and traversal escapes as `snippet path=` does
- [ ] A `documents` entry that resolves to no existing file is reported as an error, naming the page and the entry
- [ ] A `documents` entry set in a `_layout.md` does not cascade to pages beneath it
- [ ] The frontmatter reference documents `documents`, generated from the schema
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
- [ ] A `refrakt_stale` MCP tool with no arguments returns the ranked report as structured findings, not formatted text
- [ ] `refrakt_stale { touching: [paths] }` returns every page whose edges point at those paths, with referring page, line, target, and whether a `reviewed` marker is attached
- [ ] `touching` runs without the git scan and returns results for a path with no commit history — including a file created in the working tree and never committed
- [ ] `touching` returns every match, unbounded by `--top`
- [ ] `refrakt_stale { since: <ref> }` resolves the changed paths from that ref and answers as `touching` would
- [ ] The edge index is a shared module that the ranking, `touching` and `since` queries all read, with no query owning it
- [ ] CLAUDE.md documents the `touching` call as a step in the per-task workflow
- [ ] Docs state that a zero score is the absence of evidence of staleness, not evidence of freshness

## Approach

Four phases. Phase 1 is self-contained and shippable alone.

1. **The edge index and the report.** The index as a standalone module (D12), the
   single-pass git scan (adapted from `timestamps.ts`), embedded-source edge
   extraction from the existing reader, ranking, and the `refrakt stale` command
   with `--top` / `--min` / `--format json`. Plus D5's refusals, which are
   load-bearing from the first commit.
   This phase will find almost nothing in this repository — see the measurement —
   and that is the correct order anyway: it establishes the index, the scan and
   the output shape against the class whose extraction is already trustworthy.
2. **Coverage: prose extraction and declared edges.** The two classes that
   between them reach the pages that matter — prose for the ones that name files
   (D7), `documents` for the 89 explanatory pages that do not (D13). The
   frontmatter half is the smaller job by far (a declared field, a resolver, an
   error path) and should land first, because it needs no precision tuning and
   makes the phase useful while the extraction rule is still being argued about.
   The first run over `site/content` is the real acceptance test for the prose
   half: if the top ten are not things a maintainer agrees are worth reading, the
   rule is wrong and the phase is not done.
3. **The MCP tool, and the `touching` query.** Both modes, plus the CLAUDE.md
   line that puts the call in the per-task loop. **This is the phase where the
   feature stops being retrospective** (D12), so it is not a tail — it is the
   payoff, and it is deliberately placed after phase 2 only because an impact
   lookup that knows about `snippet` invocations but not about the guides is a
   lookup that misses the pages most worth updating.
4. **Region scoping (`--precise`).** `git log -L` on both ends where
   {% ref "SPEC-131" /%} makes a region resolvable. Measure the cost before
   deciding whether it can ever be the default. Last because it sharpens a signal
   the earlier phases have to prove is worth sharpening.

**Budget the extraction rule, not the arithmetic.** The counting is a map lookup
and a subtraction. What decides whether anyone runs this a second time is whether
phase 2's top ten are worth reading — which is a question about which prose
mentions count as claims, and is answered by trying it on a real corpus and
throwing away rules that surface noise.

**Build the index so phase 3 does not have to rewrite it.** The temptation in
phase 1 is a function that walks content, scores as it goes, and prints. That
shape cannot answer `touching`, because the query runs in the opposite direction
and without the git scan at all. Extract edges into an addressable index first
and let the ranking be one reader of it — the cost is an afternoon in phase 1 and
a rewrite avoided in phase 3.

## Open questions

- **Who reads the report, and when?** Largely answered by D12, and worth recording
  that it was the spec's weakest point before the MCP surface existed. The
  retrospective report still has no gate and no diagnostic surface by construction
  (D1, D11), so as a *report* it remains a command someone must choose to run —
  {% ref "SPEC-126" /%}'s failure mode, for the fourth time here. What changed is
  that the feature no longer depends on that: `touching` is invoked by an agent
  mid-task, needs no scheduling, and catches the divergence before it exists. The
  residual question is narrower — whether the periodic survey earns a scheduled
  job on top, or whether prevention at edit time makes it a tool you reach for
  only when inheriting an unmaintained corpus.
- **Does a CLAUDE.md line actually change agent behaviour?** D12 leans on it, and
  it is an assumption, not a result. The per-task workflow already prescribes
  several structured steps and they are followed, which is weak evidence in
  favour. Phase 3 should check rather than assume: if agents do not call
  `touching` unprompted, the remedy is a hook or a `plan update` side effect, not
  a more emphatic sentence.
- **Does the prose class hold its base rate as the corpus grows?** 13 of 35 is
  healthy, but 35 edges across 11 pages is a small sample, and the rate is a
  property of how often this repository edits guides versus code — not a constant.
  If it drifts toward the plan class's 99%, the ranking degrades into a list of
  everything and the feature needs the region scoping of phase 3 to stay useful.
  Worth re-measuring, not assuming, and worth `refrakt stale` printing its own
  base rate in the report footer so the degradation is visible rather than
  inferred.
- **Should the 116 rune pages get edges derived from the catalog instead of by
  hand?** They are the largest blind section, and asking anyone to hand-write
  `documents` on 116 pages is a plan that does not survive contact. But their
  binding is mechanical in a way no other section's is: `runes/hint.md` documents
  the `hint` rune, and refrakt already knows from the catalog where that rune's
  schema lives and which config key it uses. A derived class could cover all 116
  for free.
  Deliberately not in this spec — it is refrakt-specific machinery, it needs the
  per-page↔rune mapping to be exact rather than slug-guessed, and its base rate is
  unmeasured. Worth asking before anyone starts stamping frontmatter onto rune
  pages, since the answer decides whether they should.
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
- {% ref "SPEC-135" /%} — the advisory-finding category (D10), the sibling-commands argument (D11) this spec answers to, and D6's rule that an MCP tool returns findings rather than a rendered report
- {% ref "SPEC-043" /%} — the MCP server `refrakt_stale` joins; `plugins/plan/src/mcp-bindings.ts` is the binding pattern
- {% ref "SPEC-113" /%} — the hosted, git-less build that keeps this out of the pipeline
- {% ref "SPEC-126" /%} — guards that nothing runs (the open question above is its fourth instance), and the generator that turns a declared `documents` into its own reference entry
- {% ref "BUG-020" /%} — prose invalidated by an ordinary edit, found by a human rather than a check
- `packages/content/src/timestamps.ts` — the single-pass git scan and `isShallowClone`, both adapted rather than rewritten
- `packages/runes/src/lib/read-file.ts` — the shared reader carrying `path=` / `lines=`
- `packages/content/src/frontmatter.ts` — the `Frontmatter` interface `documents` joins; `created` / `modified` are the precedent for a field that overrides what git reports
- `plugins/plan/src/scanner-core.ts` — `extractRefs`, the plan-edge index
- `site/content/extend/rune-authoring/authoring-overview.md` — the instance in Problem

{% /spec %}
