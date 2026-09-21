{% work id="WORK-595" status="ready" priority="high" complexity="moderate" source="SPEC-136" tags="frontmatter, staleness, extraction, docs, drift" milestone="v0.37.0" %}

# Edge coverage — the documents frontmatter field and prose path extraction

{% ref "WORK-594" /%} establishes the index against the one edge class whose
extraction is already trustworthy, and finds almost nothing — because embedded
source reaches 28 of this repository's 237 content pages. **A page can be
entirely about a subsystem without ever naming a file in it.**

This item is the two classes that between them reach the pages that matter.

| Class | Extracted from | Precision |
|---|---|---|
| **Declared** | `documents:` in frontmatter | Highest — the author stated it |
| **Prose path mention** | Backticked repo-relative path in body text | Low — file-granular, and the paragraph may not be about the file |

## The frontmatter half lands first

It is the smaller job by far — a declared field, a resolver, an error path — and
it needs no precision tuning, so it makes the item useful while the extraction
rule is still being argued about.

```yaml
---
title: Theme Overview
documents:
  - packages/transform/src/merge.ts
  - packages/runes/src/config.ts
---
```

`documents` joins the **declared members** of `Frontmatter`
(`packages/content/src/frontmatter.ts:3`) rather than living in its index
signature — WORK-545's correction — which means {% ref "SPEC-126" /%} generates
its reference entry automatically.

**Unlike every other class, a declared path that does not resolve is an error**
(D14). The author stated this edge; a typo in it is a mistake, not a
low-precision signal to skip.

## The prose half is a judgement call, and its acceptance test is human

The spec is blunt about this: *"The first run over `site/content` is the real
acceptance test for the prose half: if the top ten are not things a maintainer
agrees are worth reading, the rule is wrong and the phase is not done."*

Measured base rate at the time of writing: 13 of 35 prose edges non-zero, across
11 pages. Healthy, but a small sample — which is why {% ref "WORK-594" /%}
prints the per-class base rate in the footer, so degradation is visible rather
than inferred.

A backticked path that does not resolve to an existing file is **skipped**, not
reported. That is the opposite of the `documents` rule above, and the asymmetry
is the point: one is a declaration, the other is a guess.

## Acceptance Criteria

- [ ] `documents` is a declared member of the `Frontmatter` interface, not read through its index signature
- [ ] Each `documents` entry produces an edge that ranks and answers `touching` identically to an extracted one
- [ ] `documents` entries resolve through `ProjectFiles`, rejecting absolute paths and traversal escapes as `snippet path=` does
- [ ] A `documents` entry that resolves to no existing file is reported as an error, naming the page and the entry
- [ ] A `documents` entry set in a `_layout.md` does not cascade to pages beneath it
- [ ] The frontmatter reference documents `documents`, generated from the schema
- [ ] Prose path mentions are extracted from backticked repo-relative paths that resolve to an existing file
- [ ] A backticked path that does not resolve to an existing file is skipped, not reported
- [ ] A first run over `site/content` is reviewed by a maintainer, and the top ten are agreed to be worth reading before the item is closed
- [ ] The per-class base rate for both new classes appears in the report footer

## Approach

Ship `documents` and its error path as the first commit, then iterate on the
prose rule with the report in hand.

**Budget the extraction rule, not the arithmetic.** The counting is a map lookup
and a subtraction. What decides whether anyone runs this a second time is
whether the top ten are worth reading — which is a question about which prose
mentions count as claims, and is answered by trying it on a real corpus and
throwing away rules that surface noise.

No cascade for `documents`: a layout declaring what it documents would attribute
that claim to every page beneath it, which is precisely the over-broad edge the
prose class already risks.

## Blocked by

- {% ref "WORK-594" /%} — the index these classes feed

## Notes

**Do not add a frontmatter opt-out for the prose class yet.** A page that
legitimately mentions many paths without documenting them — CLAUDE.md's monorepo
map is the obvious one — will rank persistently, and an opt-out is both the easy
answer and the easy way to make the feature disappear one page at a time. Fix
the extraction rule first; revisit only if a page is genuinely miscategorised.

Bulk application **is** legitimate here, and that is the whole difference from
{% ref "SPEC-134" /%} D8. A `documents:` entry claims "this page is about that
file", which an author can state honestly for a whole page in one line. A
`reviewed` marker claims "a human read this exact content", which cannot be
claimed in bulk without lying.

## References

- {% ref "SPEC-136" /%} — D7 (prose extraction), D13 (`documents`), D14 (a declared path that does not resolve is an error), D2 (why bulk is legitimate here and not in SPEC-134)
- {% ref "WORK-594" /%} — the index and the report
- {% ref "SPEC-126" /%} — the generator that turns a declared field into its reference entry
- `packages/content/src/frontmatter.ts` — the `Frontmatter` interface; `created` / `modified` are the precedent
- `site/content/extend/rune-authoring/authoring-overview.md` — the instance in the spec's Problem

{% /work %}
