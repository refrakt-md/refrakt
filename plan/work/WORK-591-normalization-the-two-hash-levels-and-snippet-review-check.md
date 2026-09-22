{% work id="WORK-591" status="ready" priority="high" complexity="moderate" source="SPEC-134" tags="snippet, file-ref, reviewed, hashing, diagnostics, drift" milestone="v0.37.0" %}

# Normalization, the two hash levels, and snippet review --check

{% ref "SPEC-131" /%} answers *am I quoting the right region*.
{% ref "SPEC-134" /%} answers the next one up: **the region is right, and the
prose around it no longer describes what is in it.**

A field is removed, a default flips, a parameter is reordered — the anchor
resolves perfectly, the code block renders real current code, and the paragraph
above it quietly becomes false. That is the *ordinary* case, because editing a
declaration is far more common than renaming or moving one.

```markdoc
{% snippet path="packages/types/src/config.ts" symbol="SiteConfig" reviewed="a3f91c4e" /%}
```

Resolution is unchanged. After the slice resolves, it is normalized, hashed, and
compared. A mismatch produces a diagnostic; the page still renders the current
code.

## Normalization is the whole design

Hash raw bytes and the marker fires on every trailing space and every reformat —
and a marker that cries wolf gets deleted. In order:

1. **Apply `reindent` first** ({% ref "WORK-589" /%}). Moving a function into a
   class shifts every line two columns without changing a character of content.
2. Normalize line endings, strip per-line trailing whitespace, normalize the
   trailing newline.
3. **Stop. Comments stay in** — D2.

Excluding comments would make markers quieter and the masker from
{% ref "WORK-597" /%} could do it for free. It is still wrong: a doc comment is
very often the exact text the surrounding prose paraphrases. If `@param
timeout`'s description changes meaning and the marker stays green, the feature
has failed at the only job it has.

## Two levels, so a reformat is not a review (D3)

A repo-wide formatter run would invalidate every marker at once, and an author
re-stamping fifty of them learns nothing — the feature's worst failure mode and
the strongest objection to it.

- **strict** — the stored hash, per above.
- **loose** — additionally collapsing whitespace runs and dropping blank lines.

Strict differs and loose matches → the change is *provably* formatting-only,
re-stamp silently. Otherwise hold for review. A mass reformat becomes one
mechanical commit, and the three slices that actually changed still stop
someone.

This item defines and computes both. {% ref "WORK-592" /%} is what acts on them.

## Where findings go (D6)

Into {% ref "SPEC-132" /%}'s diagnostics surface as `PipelineWarning`s, and no
further. **Nothing is rendered into the page.**

This is deliberately *different* from {% ref "SPEC-131" /%} D6, and the
difference is principled: SPEC-131 uses an error fence because the content could
not be produced. Here the content was produced perfectly — the code is real,
current, and correctly located. What is uncertain is the prose beside it, which
the resolver cannot see. Replacing a correct code block with an error because a
paragraph *might* be stale is a straightforward regression for every reader.

## Acceptance Criteria

- [ ] `reviewed` is accepted on `snippet` and `file-ref`, and its absence leaves behaviour unchanged
- [ ] `expand` does not accept `reviewed` — it resolves no slice, so there is nothing of the right shape to hash
- [ ] The hashed form applies `reindent` first, then normalizes line endings, per-line trailing whitespace, and the trailing newline
- [ ] Comments are included in the hashed form, covered by a test where only a doc comment changes and the marker fires
- [ ] A nesting-only change (a function moved into a class, content otherwise identical) does not fire the marker
- [ ] The stored hash is truncated to 8–12 hex characters
- [ ] Both hash levels are computed and exposed, with the loose form additionally collapsing whitespace runs and dropping blank lines
- [ ] A change that alters the strict hash but not the loose hash is classified formatting-only, covered by a reformatting test
- [ ] A stale marker produces a `PipelineWarning` and renders nothing into the page
- [ ] A refused anchor never evaluates `reviewed`
- [ ] `refrakt snippet review --check` reports every stale marker with file, line, anchor, and a summary of what changed
- [ ] `--check` has its own exit code, independent of the pipeline diagnostic channel

## Approach

Build the checker before the writer. The feature is useful read-only the moment
a marker can be placed, and building `--check` first keeps the normalization
decisions honest — every normalization choice is immediately visible as a
marker that does or does not fire.

**Budget the normalization, not the hash.** Hashing is a line. Getting
normalization wrong produces a feature that is worse than not having it, because
a noisy marker trains people to ignore a real one.

## Blocked by

- {% ref "WORK-589" /%} — `reindent` is normalization step 1

## Notes

**{% ref "SPEC-134" /%}'s stated prerequisite is stale and this item is not
blocked on it.** The spec's Approach says the feature would "ship as a no-op
with a CLI attached" until {% ref "WORK-573" /%} lands, on the strength of
{% ref "WORK-554" /%}'s finding that the adapter dev server prints no
diagnostics at all.

{% ref "WORK-575" /%} has since shipped in v0.36.0 and fixed exactly that: one
reporter at `loadContent`, printing in dev. So a review-marker diagnostic now
*is* seen by someone editing documentation, which was the disqualifying row.

What {% ref "WORK-573" /%} still owns is whether an error-severity diagnostic
**fails a build** — and D7 says a fired marker is a review prompt, not a
failure, so this feature actively does not want that. No dependency in either
direction.

D1 is worth respecting in the naming: `reviewed`, not `pin`. This freezes
nothing — the snippet still tracks HEAD and re-resolves every build. `pin=`
would steer an author toward "this is frozen, nothing to do here", the opposite
of the intended response.

## References

- {% ref "SPEC-134" /%} — D1 (the name), D2 (comments in), D3 (proven formatting-only), D4 (inline and truncated, not a sidecar), D6 (diagnostic, never a fence), D9 (the anchor refuses first)
- {% ref "WORK-589" /%} — `reindent`
- {% ref "WORK-575" /%} — the reporter seam that makes the diagnostic visible in dev, resolving the spec's stated blocker
- {% ref "SPEC-132" /%} — the diagnostics routing model
- `packages/content/src/site.ts` — the diagnostics surface
- `packages/editor/src/community-tags-builder.ts` — the 8-character truncated-hash precedent

{% /work %}
