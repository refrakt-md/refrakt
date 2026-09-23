{% spec id="SPEC-140" status="draft" tags="runes, transform, architecture, dx" %}

# Collapse the rune transform boilerplate

Across 121 runes, `transform()` is 3,955 lines. A large, measurable fraction of
that is not logic: it is the same four or five gestures retyped — declare a
meta, name it twice more, cast a `Markdoc.transform` result, guard a slot that
needs no guard. This spec removes the gestures that are provably inert and
replaces the ones that are merely repetitive with named utilities.

**The tiers are independent and land in order.** Tier 1 is deletion with no new
API and a byte-identical output contract. Tier 2 adopts helpers that already
exist. Only Tier 3 adds surface area. Each tier is verifiable by
`refrakt contracts --check` and `npm run seo:baseline:check` returning no diff —
the two artefacts that already assert the full HTML structure and the full
structured-data output of every rune.

## Problem

The measurements below come from `packages/runes/src/tags/*.ts` plus
`plugins/*/src/tags/*.ts` — 92 `transform(resolved, attrs, config)` bodies,
median 38 lines.

| Form | Sites | Status |
|------|-------|--------|
| Meta emitted into `children` after being mapped in `properties` | 100, in 24 files | **inert** — filtered back out |
| `schema:` / `typeof:` / `schemaOrgType:` on `createComponentRenderable` | 0 | **unreachable** — no callers remain |
| `...(x ? { k: x } : {})` inside `refs` / `properties` | 59 | **inert** — the helper already skips `undefined` |
| `extractText(node)`, byte-identical copies | 6 | duplicate |
| Local reimplementations of the exported `textContent` | 3 | duplicate |
| `new RenderableNodeCursor(Markdoc.transform(asNodes(resolved.X), config) as …)` | 81 of 153 | repetitive |
| `as RenderableTreeNode[]` casts | 160 | repetitive |
| Identical body-only `contentModel` | 49 of 94 | repetitive |
| Heading-dispatch grouping loop | 7 | repetitive |

Three of those rows are not style opinions. They are dead code, and the
codebase already disagrees with itself about two of them.

### The meta triple, and why the third write does nothing

The canonical rune declares a meta, maps it in `properties`, and lists it in
`children`:

```ts
const statusMeta = new Tag('meta', { content: attrs.status ?? 'draft' });
// …
properties: { status: statusMeta, /* … */ },
children:   [ statusMeta, /* … */ ],
```

Since {% ref "SPEC-082" /%} / {% ref "WORK-331" /%}, `createComponentRenderable`
projects every scalar property into the reserved `data-rune-fields` bag and then
**filters the carrier back out of the child array**
(`packages/runes/src/lib/component.ts:127-131`). The value already lives in the
bag; the element would be a duplicate.

The codebase is split on this and nobody noticed, which is the proof:

- **233** metas reach `properties`
- **133** of them are never listed in `children` — and render correctly
- **100** still are, across 24 files — and render identically

Verified by deleting all twelve from `work.ts`'s `children`: `refrakt inspect`
returned byte-identical HTML and `seo:baseline:check` reported no drift. A
57/43 split on a distinction with no observable effect is not a convention; it
is 100 lines of noise that every rune author has to decide about.

### The schema.org channel on `createComponentRenderable` has no callers

{% ref "SPEC-130" /%} moved structured data to a declarative table on
`createContentModelSchema({ schema })`. The migration completed. The imperative
surface it replaced was never removed:

```
schema:         0 call sites across 121 runes
typeof:         0
schemaOrgType:  0
```

Every `schema:` key in the tag files is the *content-model* option, not this
one. So `schemaTags` (component.ts:57-61) is always empty, `isSeoMeta`
(component.ts:84) is always `false`, `emptySeoMetas` (component.ts:110-125) is
always empty, and roughly 40 lines of the helper are unreachable.

This is not a new observation so much as an unfinished one: SPEC-130's own
acceptance criteria required "the imperative form either still works or is
fully migrated — not half of each, per rune". Per rune, it is fully migrated.
The dead surface is what remains.

**It also makes the previous section a theorem rather than a sample.** Because
`schemaTags` can never be non-empty, *every* meta mapped in `properties` is
necessarily a pure-data meta, and pure-data metas are unconditionally filtered
from the children. The 100 sites are not "usually" inert. They cannot be
anything else.

### The guards that guard nothing

`createComponentRenderable` opens both slot loops with `if (v === undefined) continue`
(component.ts:77, 98). So inside `refs` and `properties`:

```ts
...(captionTag ? { caption: captionTag } : {})   // is exactly
caption: captionTag                               // this
```

59 sites. Verified on `figure.ts` — identical output. The 20 *other* conditional
spreads in the tag files sit on hand-built `Tag` attribute objects
(`diff.ts:138`, `form.ts:204`, `sandbox.ts:253`) where the guard is load-bearing
and must stay. The sweep is not "delete all conditional spreads"; it is bounded
to the two slot literals.

### Six copies of one function

`extractText(node: Node)` is defined byte-for-byte identically in
`packages/runes/src/tags/form.ts`, `plugins/places/src/tags/map.ts`,
`plugins/design/src/tags/{palette,typography,spacing}.ts` and
`plugins/marketing/src/tags/comparison.ts`.

Separately, `@refrakt-md/runes` already exports `textContent(tag)`
(`seo.ts:23`) for the renderable-tree side — and three modules reimplement it
anyway: `plugins/plan/src/pipeline.ts` and `plugins/storytelling/src/pipeline.ts`
as `extractTextContent`, `plugins/media/src/tags/track.ts` as a Tag-flavoured
`extractText`. **The exported version trims and the copies do not**, so
adoption is a behaviour change at each site, not a rename.

## What this is not

This spec does not reduce the *number* of transforms, merge runes, or move
logic into the engine. The nine largest transforms (`nav.ts` at 203 lines,
`playlist.ts` at 146, `recipe.ts` at 105) are large because they do genuinely
bespoke work, and they stay that way. What shrinks is the constant overhead
every rune pays regardless of complexity.

Nor does it make the transforms declarative. {% ref "SPEC-130" /%} moved the
schema.org channel into data because that channel needed to be *overridable*.
Nothing here needs overriding — it needs naming.

## The utilities

Tier 3 adds four. Each replaces a form counted in the table above; nothing is
added speculatively.

### `metaFields(attrs, spec)`

Returns a `Record<string, Tag>` suitable for `properties:` directly, collapsing
the declare-and-name-twice cycle into one declaration. `work.ts`'s 36 lines of
plumbing become:

```ts
properties: metaFields(attrs, {
  id: '', status: 'draft', priority: 'medium', complexity: 'unknown',
  assignee: '', milestone: '', source: '', supersedes: '', pr: '', tags: '',
  created:  () => attrs.created  || fileVars?.created  || '',
  modified: () => attrs.modified || fileVars?.modified || '',
}),
```

A string value is the default for a missing attribute; a function is a computed
default, which covers the 12 metas whose value is not a plain `attrs` read. The
27 runes that need a meta *outside* `properties` keep building it by hand — the
utility is for the bulk case, not a mandate.

This is the one with real design risk, and it carries {% ref "ADR-008" /%}'s
flat-namespace constraint: `metaFields` writes into the same key space as
`refs`, so the collision check has to keep working on a computed object.

### `renderNodes(nodes, config)`

Returns a `RenderableNodeCursor`, absorbing the `asNodes` wrap, the
`Markdoc.transform` call and the `as RenderableTreeNode[]` cast that 81 sites
spell out in full and 160 casts attest to. Purely a spelling change.

### A body-only `contentModel` preset

```ts
contentModel: bodyOnly(),   // { type: 'sequence', fields: [{ name: 'body', match: 'any', optional: true, greedy: true }] }
```

49 of the 94 content models in the tag files are exactly this, in four
whitespace variants.

### `groupByHeading(nodes, onItem)`

The "walk children; a heading sets the running group; list items become entries"
loop, written seven times: `tint.ts:39`, `map.ts:138`, `palette.ts:132` and
`:282`, `spacing.ts:85` and `:230`, `bento.ts:311`. The per-item parsers
(`parseColorEntry`, `parseNameValue`, `parseFontEntry`, `parseLocationItem`)
stay rune-specific — only the traversal is shared.

## Decisions

### D1 — Tier 1 ships before any utility exists

The deletions are independently correct and independently verifiable. Coupling
them to a new API would mean reviewing "is this dead?" and "is this the right
helper?" in one diff, and the first question has an objective answer while the
second does not.

### D2 — `contracts --check` plus `seo:baseline:check` is the acceptance test

Both artefacts are committed and already describe every rune's complete output
— structure on one side, structured data on the other. For Tiers 1 and 2 the
required result is **no diff**: a refactor that changes either file has changed
behaviour, whatever the intent. This is stronger than the unit tests for this
particular class of change, because the contract is generated from config and
the baseline is captured at both harvest points.

### D3 — the `contracts` dual-commit applies

Any regeneration touches `contracts/structures.json` and
`packages/lumina/contracts/structures.json` in lock-step. For this spec both
should be no-ops; if either moves, the change is not the refactor it claims to
be.

### D4 — remove the dead schema channel rather than keeping it for plugin authors

`schema` / `typeof` / `schemaOrgType` are exported types
(`InlineTransformResult`), so a third-party plugin could in principle use them.
They are removed anyway: they no longer work the way their doc comments claim,
since {% ref "SPEC-130" /%} made `createContentModelSchema({ schema })` the
channel the appliers and the JSON-LD harvest actually read. Leaving a surface
that silently produces no structured data is worse than removing it — the
failure mode is invisible, which is the exact hazard SPEC-130 D5 identified for
this channel. This is a breaking change to a published type and belongs in a
minor release with a changeset.

### D5 — `metaFields` does not become mandatory

No lint rule, no contract assertion. Runes that need a meta in `children`, or
conditionally, or with a non-`attrs` source, keep the explicit form. The
utility earns its use by being shorter, or it does not earn it.

### D6 — the `textContent` trim difference is resolved per call site

Three sites currently do not trim. Each is inspected and either adopts the
trimming version (if trimming is correct or harmless there) or keeps a local
non-trimming variant with a comment saying why. No blanket swap — a silent
whitespace change in `plan`'s checkbox counting or `storytelling`'s entity
indexing would be a real regression that no contract catches.

## Migration shape

Six work items, three tiers, strictly ordered within a tier only where noted.

| # | Work | Tier | Sites | Risk |
|---|------|------|-------|------|
| 1 | Drop inert metas from `children` | 1 | 100 / 24 files | none — output-identical |
| 2 | Remove the unreachable schema channel from `createComponentRenderable` | 1 | ~40 lines + 3 type fields | breaking type change |
| 3 | Drop redundant slot guards | 1 | 59 | none — output-identical |
| 4 | One `extractText`; adopt `textContent` | 2 | 6 + 3 | D6 per-site review |
| 5 | `renderNodes` + `bodyOnly` | 3 | 81 + 49 | mechanical |
| 6 | `metaFields` + `groupByHeading` | 3 | 233 + 7 | design |

Item 2 should follow item 1: with the metas already out of the children, the
`pureDataMetas` filter has less to do and the removal reads more clearly.

## Non-goals

- Reducing the number of runes, or merging similar ones
- Moving transform logic into the identity transform engine
- Changing any rune's HTML output, BEM classes, data attributes or structured data
- Touching the nine large bespoke transforms beyond the mechanical substitutions
- A lint rule or contract assertion enforcing any of the new utilities (D5)
- Reviving `schemaOrgType` in any form — {% ref "SPEC-130" /%} settled where types are declared

## Acceptance Criteria

- [ ] No meta mapped in `properties` is also emitted into `children`, in any of the 121 runes
- [ ] `schema`, `typeof` and `schemaOrgType` are gone from `TransformResult` / `InlineTransformResult`, and `createComponentRenderable` has no unreachable SEO branch
- [ ] The removal in the previous criterion ships with a changeset recording it as a breaking change to a published type (D4)
- [ ] No `...(x ? { k: x } : {})` remains inside a `refs` or `properties` literal; the 20 on hand-built `Tag` attribute objects are untouched
- [ ] `extractText` for AST nodes is defined once and imported by all six former copies
- [ ] `plan`, `storytelling` and `media` either import `textContent` or carry a comment saying why they keep a local variant (D6)
- [ ] `refrakt contracts --check` reports no drift, on both committed copies (D3)
- [ ] `npm run seo:baseline:check` reports no drift
- [ ] `npm test` passes, and the CSS coverage test is unchanged
- [ ] `metaFields` handles a computed default, so the 12 `fileVars`-derived metas are expressible
- [ ] A property-and-ref name collision is still rejected with the {% ref "ADR-008" /%} error when the properties object comes from `metaFields`
- [ ] The rune authoring guide documents the four utilities, and the meta triple is no longer shown as the canonical form
- [ ] Total `transform()` line count across the tag files is measurably reduced, recorded before and after

## References

- {% ref "SPEC-028" /%} — rune output standards; the one-off extractions this generalises
- {% ref "WORK-076" /%} — shared layout meta utility; the precedent for a shared builder
- {% ref "WORK-077" /%} — shared media unwrap utility
- {% ref "WORK-080" /%} — realm/faction transform consolidation, the same idea for one rune pair
- {% ref "SPEC-082" /%} — the `data-rune-fields` bag that made the meta children inert
- {% ref "WORK-331" /%} — the change that started filtering pure-data metas out of the children
- {% ref "SPEC-130" /%} — declarative schema.org mapping; why the imperative channel has no callers
- {% ref "ADR-008" /%} — the flat namespace `properties` and `refs` share

{% /spec %}
