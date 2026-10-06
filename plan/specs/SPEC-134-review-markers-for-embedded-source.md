{% spec id="SPEC-134" status="implemented" tags="snippet, file-ref, drift, docs, tooling, dx" %}

# Review markers for embedded source

{% ref "SPEC-131" /%} makes `snippet` address code by name, so a moved or
renamed symbol becomes a loud failure instead of a wrong render. That closes
the question *"am I quoting the right region?"*

It leaves the next one untouched: **the region is right, and the prose around
it no longer describes what is in it.** A field is removed, a default flips, a
parameter is reordered — the anchor resolves perfectly, the code block renders
real current code, and the paragraph above it quietly becomes false.

This spec adds an opt-in `reviewed` marker recording that a human read a
particular version of a resolved slice. When the slice changes, the marker
stops matching and the author is told which documented regions moved since
anyone last looked at them.

## Problem

### Correct resolution is not the same as correct documentation

{% ref "SPEC-131" /%}'s guarantee is about *location*. Once the anchor
resolves, the resolver has no opinion about content, and nothing else in the
pipeline does either: the page renders whatever the symbol says today,
underneath prose written against whatever it said whenever the author last
looked.

The two failures are genuinely different, and they fail in different places:

| | Anchor resolves? | Renders? | Who notices |
|---|---|---|---|
| Symbol renamed / moved | **No** — refuses | Error fence | Build, immediately (SPEC-131) |
| Symbol changed in place | Yes | Correct current code | **Nobody** |

The second row is the whole subject of this spec. It is not a rarer case than
the first — it is the *ordinary* case, because editing a declaration is far
more common than renaming or moving one.

### The absence of known instances is not evidence

There is no signal for this today, so nothing has ever been reported. That is a
property of the detector, not of the codebase.

One instance is available, and it is this spec's own predecessor.
{% ref "SPEC-131" /%} states, in the present tense:

> `SiteConfig` occupies lines 74–161 of `packages/types/src/theme.ts` *today*

`theme.ts` is 104 lines long and does not contain `SiteConfig`; it lives in
`packages/types/src/config.ts`. The sentence was accurate when written. The file
changed, the prose did not, and nothing anywhere connected the two.

That is the failure class exactly: an assertion about code, correct at the time,
silently invalidated by an ordinary edit. {% ref "BUG-020" /%} is the same
underlying event observed from the addressing side — `SPEC-131` catches the
`file-ref` invocations, and nothing catches the sentence.

### Why this cannot be solved by trying harder

The information needed to check "does this prose still describe this code" is
not in the repository. No static analysis recovers it, because it is a claim
about meaning held by whoever wrote the paragraph.

What *can* be recorded is far weaker and entirely sufficient: **a human looked
at this exact content and was satisfied.** Everything after that is change
detection, which is mechanical. The marker does not verify the documentation —
it remembers when the documentation was last verified by someone who could.

## What already exists

Following {% ref "SPEC-132" /%}'s framing, because the same thing is true here —
most of the machinery is present:

| Piece | State |
|---|---|
| Slice resolution (`symbol` / `match` / `lines` → `[start, end]`) | {% ref "SPEC-131" /%} phase 1 |
| `reindent` normalization | {% ref "SPEC-131" /%} D16 |
| Line-level LCS diff (`computeLineDiff`) | Exists in `packages/runes/src/tags/diff.ts` — module-local, needs extracting |
| Truncated-hash-as-identity precedent | `packages/editor/src/community-tags-builder.ts:26` — `createHash(…).digest('hex').slice(0, 8)` |
| Diagnostics surface (`ctx.info` / `warn` / `error`) | `packages/content/src/site.ts:301` |
| `PipelineWarning` — severity, phase, `pluginName`, url, message | `packages/types/src/pipeline.ts:156` |
| A display surface for those warnings | Planned — {% ref "WORK-395" /%}'s editor validation rail |
| A CLI that rewrites invocations in place | {% ref "SPEC-131" /%} D7's codemod |

The new parts are a hash, a normalization policy, and a review command.

## Proposal

### The attribute

```markdoc
{% snippet path="packages/types/src/config.ts" symbol="SiteConfig" reviewed="a3f91c4e" /%}
{% file-ref path="packages/content/src/pipeline.ts" symbol="runPipeline" reviewed="7c02bb15" preview="drawer" /%}
```

| Attribute | Meaning |
|---|---|
| `reviewed` | Truncated hash of the normalized slice as last reviewed. Absent = not under review tracking. |

Resolution is unchanged. After the slice is resolved, it is normalized, hashed,
and compared. A mismatch produces a diagnostic; the page still renders the
current code.

### What gets hashed

Normalization is the whole design. Hash raw bytes and the marker fires on every
trailing space and every reformat, and a marker that cries wolf gets deleted —
{% ref "SPEC-126" /%} D3's reasoning about disabled guards, applied to this
feature.

In order:

1. **Apply `reindent` first** ({% ref "SPEC-131" /%} D16). Moving a function
   into a class shifts every line two columns without changing a character of
   content. Hashing after reindent means a pure nesting change does not fire.
2. Normalize line endings, strip per-line trailing whitespace, normalize the
   trailing newline.
3. Stop. **Comments stay in** — D2.

### Two normalization levels, so a reformat is not a review

A repo-wide formatter run would invalidate every marker at once, and an author
re-stamping fifty of them learns nothing — the feature's worst failure mode, and
the strongest objection to it.

The re-stamp tool computes two hashes:

- **strict** — the stored one, per above.
- **loose** — additionally collapsing whitespace runs and dropping blank lines.

If strict differs and loose matches, the change is *provably* formatting-only:
re-stamp silently. Otherwise hold it for review. A mass reformat becomes one
mechanical commit, and the three slices that actually changed still stop
someone.

### Generation

Markers are never hand-written:

```bash
# stamp unmarked snippets on a page, or across the site
npx refrakt snippet review site/content/runes/file-ref.md
npx refrakt snippet review --all

# re-stamp what changed, showing each content diff, one at a time
npx refrakt snippet review --update --interactive

# CI / pre-merge
npx refrakt snippet review --check
```

`--update` **renders the diff of every slice it re-stamps**. A commit full of
changed hex strings is unreviewable and would make the marker ceremonial; a
commit where someone saw each before/after and confirmed the prose still holds
is the entire deliverable. This is where extracting `computeLineDiff` from
`diff.ts` pays for itself.

The block editor stamps on insert, so anything authored through `refrakt edit`
starts marked.

### Where findings go

Into {% ref "SPEC-132" /%}'s diagnostics surface as `PipelineWarning`s, and no
further. Nothing is rendered into the page — D6.

## Design decisions

**D1 — `reviewed`, not `pin`.** "Pin" means *hold this still*, which is what a
revision reference does. This freezes nothing: the snippet still tracks HEAD and
still re-resolves every build. What the attribute records is that a human read
this version and the surrounding prose matched.

The name is load-bearing rather than cosmetic. The entire value of the feature
depends on an author understanding what to do when it fires, and `pin=` steers
them toward "this is frozen, nothing to do here" — the opposite of the intended
response.

**D2 — Comments are included in the hash.** Excluding them would make markers
quieter, and the masker from {% ref "SPEC-131" /%} step 1 could do it for free.
It is still wrong: a doc comment is very often the exact text the surrounding
prose paraphrases. If `@param timeout`'s description changes meaning and the
marker stays green, the feature has failed at the only job it has.

**D3 — Formatting-only changes are proven, never assumed.** The loose hash
exists so that "this was just the formatter" is a fact the tool establishes
rather than a judgement the author makes under time pressure. An author asked to
eyeball fifty diffs will approve fifty diffs. Narrowing the set to the ones that
carry meaning is what keeps the review real.

**D4 — Inline and truncated, not a sidecar lockfile.** A lockfile keeps content
files clean and localizes merge conflicts, and it is the wrong choice here for
two reasons.

The practical one: it needs a stable key per invocation and there is no good
candidate. An ordinal breaks when a page is reordered, page-plus-symbol collides
when a page quotes the same symbol twice, and a deleted snippet orphans its
entry in silence.

The structural one: refrakt's premise is that the Markdoc file is the whole
truth about a page. A snippet whose review state lives in a file you must cross-
reference is a snippet you cannot understand by reading the page.

Truncation is what makes inline tolerable. 8–12 hex characters, not 64. This is
change detection against one known expected value, not a lookup table, so the
birthday bound does not apply; `packages/editor` already uses 8-character
truncated hashes as identity.

**D5 — The tool shows content, never hashes.** See `--update` above. A hash is
an implementation detail that must not leak into the review experience: every
surface an author touches — the CLI, the diagnostic, the editor — shows the
code that changed.

**D6 — A finding is a diagnostic beside the page, never an error fence.** This
is deliberately *different* from {% ref "SPEC-131" /%} D6, and the difference is
principled.

{% ref "SPEC-131" /%} uses the error fence because the content **could not be
produced** — there is nothing to render, so the fence takes its place. Here the
content was produced perfectly: the code is real, current, and correctly
located. What is uncertain is the prose beside it, which the resolver cannot
see.

{% ref "SPEC-132" /%} arrived at this same line independently and stated it
well: a finding that *annotates* content which rendered fine belongs beside the
page, not in it. Replacing a correct code block with an error because a
paragraph might be stale would be a straightforward regression for every reader.

**D7 — A fired marker is a review prompt, not a failure.** The wording matters
as much as the mechanism:

```
3 documented regions changed since last review:
  site/content/runes/file-ref.md:51 — SiteConfig (+2 fields, 1 removed)
  site/content/docs/pipeline.md:88  — runPipeline (signature changed)
  site/content/extend/authoring.md:12 — createContentModelSchema (body changed)
```

That is a changed-files list. Framed instead as a failing test with a red X,
authors will re-stamp reflexively to get green — which produces markers that
certify nothing and cost a command. The feature's output is attention, and
attention is only obtainable by being honest about what is and is not known.

**D8 — Opt-in per invocation, and never stamped in bulk.** Marking every
snippet would make `--check` permanently noisy and train everyone to ignore it.
Authors mark the references whose prose makes specific claims.

Specifically, {% ref "SPEC-131" /%} phase 3's codemod **must not** auto-stamp
the 23 invocations it migrates. A marker asserting that a human reviewed 23
regions nobody looked at is a false claim in precisely the shape this spec
exists to prevent.

**D9 — Layering: the anchor refuses first.** The two features never overlap.
{% ref "SPEC-131" /%} answers *can I find the region* and refuses if not —
`reviewed` is never evaluated on a refusal. This spec answers *I found it, is it
still what was documented*. {% ref "BUG-020" /%} is a SPEC-131 failure and would
never reach this layer.

**D10 — `reviewed` on a fixed revision is a no-op.** If a future revision
attribute lands, a slice pinned to a tag cannot change, so the marker can never
fire. The tool should say so rather than stamping a marker that means nothing.

## Non-goals

- **Verifying that the documentation is correct.** Impossible by construction —
  the marker records that someone checked, never that they were right.
- **Detecting prose changes.** The relation is one-directional: code changing
  invalidates a review, prose changing is the author already doing the work.
- **Partial or field-level markers.** `review-match=` hashing only signature
  lines and ignoring bodies is the natural extension. Deferred until an author
  hits the need.
- **Automatic re-stamping in CI.** A bot that re-stamps on green defeats the
  feature completely. `--update` is a human command.
- **Extending markers beyond `snippet` / `file-ref`.** A marker attaches to a
  *resolved slice*, so it reaches exactly what {% ref "SPEC-131" /%}'s resolver
  reaches and nothing else. That excludes `expand`, which despite sitting in the
  same module reads whole files through `readWholeSandboxedFile` and produces no
  slice. Hashing an entire embedded document would fire on every edit to it —
  a marker with D3's noise problem and none of its precision.

## Acceptance Criteria

- [ ] `reviewed` is accepted on `snippet` and `file-ref`, and its absence leaves behaviour unchanged
- [ ] `expand` does not accept `reviewed` — it resolves no slice, so there is nothing of the right shape to hash
- [ ] The hashed form applies `reindent` first, then normalizes line endings, per-line trailing whitespace, and the trailing newline
- [ ] Comments are included in the hashed form, covered by a test where only a doc comment changes and the marker fires
- [ ] A nesting-only change (a function moved into a class, content otherwise identical) does not fire the marker
- [ ] The stored hash is truncated to 8–12 hex characters
- [ ] `refrakt snippet review` stamps unmarked invocations in place, per page and across the site
- [ ] `refrakt snippet review --update` renders the content diff of every slice it re-stamps, never a bare hash change
- [ ] A change that alters the strict hash but not the loose hash is re-stamped without prompting, covered by a reformatting test
- [ ] A change that alters both is held for review
- [ ] `refrakt snippet review --check` reports every stale marker with file, line, anchor, and a summary of what changed
- [ ] A stale marker produces a `PipelineWarning` and renders nothing into the page
- [ ] A refused anchor never evaluates `reviewed`
- [ ] The block editor stamps `reviewed` when inserting a snippet
- [ ] {% ref "SPEC-131" /%}'s codemod does not stamp markers on the invocations it migrates
- [ ] Docs explain what a fired marker means, and that re-stamping without reading is the one way to make the feature worthless

## Approach

**One prerequisite, and the blocker that was named here is now cleared.**
{% ref "WORK-554" /%} established, by planting a synthetic error-severity
`PipelineWarning` and observing every surface, that it fails nothing anywhere:
`vite build` exits 0 in both dogfooded sites, the tests exit 0 because nothing
observes the count, and — the sharpest result at the time — the adapter dev
server printed **nothing at all**.

That last row was disqualifying for this feature specifically, because a review
marker's entire audience is someone editing documentation, and someone editing
documentation is running the dev server. This spec therefore said the feature
would "ship as a no-op with a CLI attached" until {% ref "WORK-573" /%} made the
channel load-bearing.

**{% ref "WORK-575" /%} shipped in v0.36.0 and fixed exactly that** — one
reporter at `loadContent`, printing in dev. A review-marker diagnostic now
reaches someone editing documentation, which was the disqualifying row, so the
dependency is gone.

What {% ref "WORK-573" /%} still owns is whether an error-severity diagnostic
*fails a build* — and D7 says a fired marker is a review prompt, not a failure,
so this feature actively does not want that. **No dependency in either
direction.**

`--check` remains the surface that works in a job: it has its own exit code, so
it is independent of the diagnostic channel either way.

{% ref "SPEC-131" /%} phases 1–2 are the second prerequisite: there is no
resolved slice to hash without the resolver, and D16's `reindent` is the first
normalization step.

Then three phases.

1. **Normalization, hashing, and the check.** The normalized form, both hash
   levels, comparison during resolution, and the `PipelineWarning`. Plus
   `--check`. No writing yet — the feature is useful read-only the moment a
   marker can be hand-placed by the tool in phase 2, and building the checker
   first keeps the normalization decisions honest.
2. **The review CLI.** `review`, `--update`, `--interactive`, with
   `computeLineDiff` extracted from `diff.ts` into a shared module for terminal
   rendering. This is the phase that determines whether anyone uses the feature.
3. **Editor integration and adoption.** Stamp-on-insert, the validation rail
   entry, and marking the reference pages whose prose makes specific claims.

**Budget the normalization, not the hash.** Hashing is a line. The normalization
policy, the two-level comparison, and making `--update` a genuine review surface
are the work — and getting normalization wrong produces a feature that is worse
than not having it, because a noisy marker trains people to ignore a real one.

## Open questions

- ~~**Where does `--check` run?**~~ **Answered.** This was written when the
  repository had one workflow, `release.yml`, triggered on push to `main`.
  {% ref "WORK-580" /%} added a pre-merge job in v0.36.0, and
  {% ref "WORK-592" /%} added `snippet review --check` to it. A stale marker is
  now found on the branch rather than after merge.
- ~~**What is the right granularity for the diagnostic summary?**~~
  **Answered — line counts.** Naming *fields* needs a language-aware layer
  {% ref "SPEC-131" /%} D1 deliberately declined to build, and a count that said
  "fields" while actually counting lines would be worse than the cheap version
  for sounding authoritative. `summarizeDiff` reports "+1 line, -2 lines"
  ({% ref "WORK-592" /%}).
- **Should `--check` distinguish "changed" from "changed a lot"?** A one-line
  change and a rewrite are the same signal today. A magnitude threshold would
  let a team triage, and would also be a way to sneak silence back in.

## References

- {% ref "SPEC-131" /%} — the addressing layer this builds on; D16 (`reindent`), D6 (error fence for unproducible content), D7 (the codemod that must not stamp). A prerequisite — see Approach
- {% ref "WORK-554" /%} — established that an error-severity diagnostic fails nothing and is not printed at all in the dev server
- {% ref "WORK-573" /%} — makes that channel load-bearing. A prerequisite for everything in this spec except `--check` — see Approach
- {% ref "SPEC-132" /%} — the diagnostics routing model, and the prior statement of D6's principle: findings annotate content that rendered fine, so they belong beside the page
- {% ref "SPEC-126" /%} — the one-off assertion this generalises from the other side, and D3's warning that a noisy guard gets disabled
- {% ref "BUG-020" /%} — the same real-world event seen from the addressing side
- {% ref "WORK-395" /%} — the editor validation rail where findings surface
- `packages/runes/src/tags/diff.ts` — `computeLineDiff`, to extract
- `packages/content/src/site.ts` — the diagnostics surface

{% /spec %}
