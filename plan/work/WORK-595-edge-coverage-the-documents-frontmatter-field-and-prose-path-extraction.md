{% work id="WORK-595" status="done" priority="high" complexity="moderate" source="SPEC-136" tags="frontmatter, staleness, extraction, docs, drift" milestone="v0.37.0" pr="refrakt-md/refrakt#650" %}

# Edge coverage — the documents frontmatter field and prose path extraction

{% ref "WORK-594" /%} establishes the index against the one edge class whose
extraction is already trustworthy, and finds almost nothing — because embedded
source reaches 28 of this repository's 237 content pages. **A page can be
entirely about a subsystem without ever naming a file in it.**

This item is the three classes that between them reach the pages that matter.

| Class | Extracted from | Precision |
|---|---|---|
| **Declared** | `documents:` in frontmatter | Highest — the author stated it |
| **Described link** | An internal link with an adjacent description | Medium — 39% base rate |
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

## Described links (D16)

The only class whose target is another content page. An overview listing its
children with one-line summaries is *duplicating* the target's content, and the
duplicate is what rots — the link merely says which target is being summarised.

Two structural shapes, and nothing else counts:

```markdoc
| [validate](/docs/cli/theme-tools#refrakt-validate) | Validate theme config and manifest |
- [xref](/runes/xref) — id-based sibling. Same `preview="drawer"` attribute.
```

A link in a table cell whose adjacent cell is prose, or a list item whose link
is followed by a dash and prose. **Not** a link in a paragraph, a bare list
item, or a nav entry — `site/content` has 748 internal links and only 169 carry
a description.

Measured: 169 edges, **0 unresolved targets**, **39% non-zero** — the same band
as the prose class, with a head to the distribution (4, 3, 2, 2, 2, 2, 2)
dominated by index → child edges.

The row above it in the spec's table was a non-goal until D16; the extraction
is what changed, not the verdict on bare links.

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

- [x] `documents` is a declared member of the `Frontmatter` interface, not read through its index signature
- [x] Each `documents` entry produces an edge that ranks and answers `touching` identically to an extracted one
- [x] `documents` entries resolve through `ProjectFiles`, rejecting absolute paths and traversal escapes as `snippet path=` does
- [x] A `documents` entry that resolves to no existing file is reported as an error, naming the page and the entry
- [x] A `documents` entry set in a `_layout.md` does not cascade to pages beneath it
- [x] The frontmatter reference documents `documents`, generated from the schema
- [x] Described-link edges are extracted from internal links carrying an adjacent description — a table cell whose neighbouring cell is prose, or a list item whose link is followed by a dash and prose
- [x] A link with no adjacent description produces no edge, covered by a test over a nav list and an inline paragraph mention
- [x] Described-link targets resolve through both `<path>.md` and `<path>/index.md`, with any `#anchor` stripped first
- [x] A described link whose target does not resolve to a content page is skipped, not reported
- [x] `{% ref %}` / `{% xref %}` entity links produce no described-link edges — extraction reads Markdoc source, not resolved hrefs
- [x] A fixture reproduces the motivating case: an overview row whose description contradicts its target after the target changed
- [x] Prose path mentions are extracted from backticked repo-relative paths that resolve to an existing file
- [x] A backticked path that does not resolve to an existing file is skipped, not reported
- [x] A first run over `site/content` is reviewed by a maintainer, and the top ten are agreed to be worth reading before the item is closed
- [x] The per-class base rate for both new classes appears in the report footer

## Approach

Ship `documents` and its error path as the first commit, described links
second, then iterate on the prose rule with the report in hand.

Described links go second because they are the one class already measured to a
conclusion — the shapes are structural, the extraction resolved 169 of 169
targets, and the base rate is known. There is no rule to tune, so they add
coverage while the prose rule is still being argued about.

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

- {% ref "SPEC-136" /%} — D7 (prose extraction), D13 (`documents`), D14 (a declared path that does not resolve is an error), D16 (described links, the measurements, and why bare links stay rejected), D2 (why bulk is legitimate here and not in SPEC-134)
- `site/content/docs/cli/cli-overview.md` — the motivating instance: a row summarising a command {% ref "WORK-578" /%} redefined
- {% ref "WORK-594" /%} — the index and the report
- {% ref "SPEC-126" /%} — the generator that turns a declared field into its reference entry
- `packages/content/src/frontmatter.ts` — the `Frontmatter` interface; `created` / `modified` are the precedent
- `site/content/extend/rune-authoring/authoring-overview.md` — the instance in the spec's Problem

## Resolution

Completed: 2026-09-25

Branch: `claude/v0-37-0-review-vqpl41`

### What was done

- `packages/content/src/frontmatter.ts` — `documents?: string[]` as a **declared**
  member, not read through the index signature, so SPEC-126 generates its
  reference entry. `packages/content/frontmatter.schema.json` gained the
  matching entry; `site/content/_data/frontmatter-fields.json` regenerated.
- `packages/content/src/edges/extract.ts` — three new classes beside `embedded`:
  `extractDeclaredEdges` (frontmatter, errors loudly on a path that resolves to
  nothing, rejects absolute paths and traversal escapes), `extractDescribedLinkEdges`
  (table cell beside prose, or list item followed by a dash and prose; resolves
  both `<path>.md` and `<path>/index.md`, anchor stripped), and
  `extractProseEdges` (backticked repo paths that resolve; skipped silently when
  they do not).
- `dedupeEdges` with a `PRECISION` order (declared → embedded → described-link →
  prose), so a page carrying both a declared and a prose edge to one target
  reports once, at the better class.
- `withoutFences()` beside `withoutExamples()` — the full Markdown mask blanks
  inline code spans, which is exactly where a prose path lives, so the prose
  class needed a fence-only mask.
- `site/content/extend/rune-authoring/authoring-overview.md` — the one
  `documents:` adoption, the spec's motivating instance.

### Notes

**The prose rule changed once, empirically.** The first corpus run surfaced
bare identifiers as paths; requiring a directory separator fixed it. Base rates
after: declared 3/3, described-link 86/170, embedded 1/6, prose 11/21.

**The maintainer acceptance gate was met**, on a top ten dominated by
described-link index→child edges plus two prose edges into code. Reviewed and
accepted rather than tightened further.

**A `_layout.md` declares nothing on behalf of the pages beneath it** — that
claim would be attributed to every one of them, which is precisely the
over-broad edge the prose class already risks.

The two pages that made the first run look worse than it was — a shipped
migration guide and the generated changelog — are not extraction failures but
structural miscategorisations, and are handled by the config surface WORK-596
added rather than by weakening a rule. See ADR-035; this does not reopen the
"do not add a frontmatter opt-out yet" note above, which is about suppressing a
class the extraction got right.

{% /work %}
