{% work id="WORK-592" status="in-progress" priority="high" complexity="moderate" source="SPEC-134" tags="cli, snippet, reviewed, diff, dx, drift" milestone="v0.37.0" %}

# The review CLI — stamping, --update, and the content diff

{% ref "SPEC-134" /%}: *"This is the phase that determines whether anyone uses
the feature."*

Markers are never hand-written. This item is the tool that writes them, and the
review experience that makes writing one mean something.

```bash
npx refrakt snippet review site/content/runes/file-ref.md   # stamp unmarked
npx refrakt snippet review --all
npx refrakt snippet review --update --interactive           # re-stamp what changed
```

## `--update` renders the diff, always (D5)

A commit full of changed hex strings is unreviewable and would make the marker
ceremonial. A commit where someone saw each before/after and confirmed the prose
still holds is the entire deliverable.

**The tool shows content, never hashes.** A hash is an implementation detail
that must not leak into the review experience — every surface an author touches
shows the code that changed.

This is where extracting `computeLineDiff` from
`packages/runes/src/tags/diff.ts` pays for itself. It is module-local today and
needs lifting into a shared module that both the rune and the terminal renderer
read.

## The formatting-only path is silent (D3)

{% ref "WORK-591" /%} computes both hash levels; this item acts on them. Strict
differs, loose matches → re-stamp without prompting. Otherwise hold for review.

D3's reasoning is about human attention under time pressure, not about
correctness: an author asked to eyeball fifty diffs will approve fifty diffs.
Narrowing the set to the ones that carry meaning is what keeps the review real.

## A fired marker is a prompt, not a failure (D7)

The wording matters as much as the mechanism:

```
3 documented regions changed since last review:
  site/content/runes/file-ref.md:51 — SiteConfig (+2 fields, 1 removed)
  site/content/docs/pipeline.md:88  — runPipeline (signature changed)
```

That is a changed-files list. Framed instead as a failing test with a red X,
authors re-stamp reflexively to get green — producing markers that certify
nothing and cost a command. The feature's output is attention, and attention is
only obtainable by being honest about what is and is not known.

## Acceptance Criteria

- [ ] `refrakt snippet review` stamps unmarked invocations in place, per page and across the site, extending {% ref "WORK-591" /%}'s command rather than registering a second one
- [ ] `refrakt snippet review --update` renders the content diff of every slice it re-stamps, never a bare hash change
- [ ] A change that alters the strict hash but not the loose hash is re-stamped without prompting
- [ ] A change that alters both is held for review
- [ ] `--interactive` shows each held diff one at a time and takes a per-slice decision
- [ ] `computeLineDiff` is extracted from `diff.ts` into a shared module, with the `diff` rune and the terminal renderer both reading it
- [ ] No surface an author touches displays a hash
- [ ] Output is phrased as a list of regions to look at, never as a failing check
- [ ] `reviewed` on an invocation that cannot change is reported as a no-op rather than stamped
- [ ] Docs explain what a fired marker means, and that re-stamping without reading is the one way to make the feature worthless
- [ ] `site/content/docs/cli/cli-overview.md` gains a row for `snippet review` — the page {% ref "WORK-595" /%} cites as its motivating instance of a stale command table

## Approach

Extract `computeLineDiff` first, as its own commit — it is a pure move with
existing coverage, and doing it separately keeps the review of this item on the
part that carries judgement.

Decide the diagnostic summary's granularity once `computeLineDiff`'s output
shape is in hand. D7's example says "+2 fields, 1 removed", which requires
interpreting the diff rather than reporting it; a line count is cheaper and less
useful. This is a genuinely open question in the spec — settle it here and
record what was chosen.

## Blocked by

- {% ref "WORK-591" /%} — the normalization and both hash levels

## Notes

**Never auto-re-stamp in CI.** A bot that re-stamps on green defeats the feature
completely. `--update` is a human command, and `--check` (from
{% ref "WORK-591" /%}) is the one that belongs in a job.

There is now somewhere for `--check` to run: {% ref "WORK-580" /%} adds a
pre-merge job in v0.36.0, which the spec's open question ("there is no pre-merge
job for `--check` to run in") was written before. Adding `snippet review
--check` to that job is in scope here.

Bulk stamping is forbidden by D8 — authors mark the references whose prose makes
specific claims. `--all` stamps *unmarked* invocations on request, which is not
the same thing as stamping everything by default; keep that distinction in the
docs.

## References

- {% ref "SPEC-134" /%} — D3 (proven formatting-only), D5 (content, never hashes), D7 (a prompt, not a failure), D8 (opt-in, never bulk), D10 (`reviewed` on something that cannot change)
- {% ref "WORK-591" /%} — normalization, both hashes, and `--check`
- {% ref "WORK-580" /%} — the pre-merge job `--check` can join
- `packages/runes/src/tags/diff.ts` — `computeLineDiff`, to extract

{% /work %}
