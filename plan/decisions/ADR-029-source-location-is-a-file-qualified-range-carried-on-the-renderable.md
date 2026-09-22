{% decision id="ADR-029" status="proposed" date="2026-09-18" tags="transform, runes, architecture, diagnostics, agents, markdoc" %}

# Source location is a file-qualified range carried on the renderable

## Context

Several in-flight features need to answer *"which lines of which file produced
this node?"*, and nothing in the pipeline can. The renderable tree knows what a
node **is** and has no idea where it **came from**.

The demand is concrete, not speculative:

- **{% ref "SPEC-135" /%} promises a line it cannot produce.** Its acceptance
  criterion reads *"returns structured findings — file, line, severity, error id,
  message"*, and `PipelineWarning` (`packages/types/src/pipeline.ts`) carries
  `severity`, `phase`, `pluginName`, `url?`, `message` — no file, no line. Half of
  that promise has another route (`Markdoc.validate()` returns `ValidateError`,
  which already carries `lines`/`location`); the cross-page half — broken
  `{% ref %}`, missing entities, nav slug failures, raised from
  `register`/`aggregate`/`postProcess` — has none.
- **The agent read→write loop stops one step short.** {% ref "SPEC-121" /%} gives
  a machine `/page.json`, {% ref "SPEC-136" /%}'s `touching` query tells it *which
  page* documents the file being changed. Neither says where in the file, so the
  edit step is a text search — the fragile link in a chain otherwise made of
  addresses.
- **{% ref "SPEC-136" /%} D8's referrer-side region scoping requires it.** Scoping
  an edge to the paragraph around a reference is what stops a typo three sections
  away from zeroing it; without location that phase re-parses and re-locates by
  hand.
- **Shipped errors advertise a line they do not have.** `read-file.ts:37`
  documents its context parameter as producing *"Referenced from:
  docs/getting-started.md:42"*. Both call sites pass a bare page path
  (`snippet-pipeline.ts:178`, `file-ref-resolve.ts:213`). `site/content/runes/code.md`
  carries 17 `lang-map.ts` invocations; a sandbox error names the file and leaves
  the reader to find which of the 17.
- **Node-level provenance** (git blame per rune instance) is the original
  motivation and the weakest of the five — it is the only one with no consumer
  already waiting.

### What is already true, verified against the pinned Markdoc

Measured rather than assumed, because two widely-held assumptions about this are
wrong:

| | Reality |
|---|---|
| `node.lines` | `number[]`, always populated |
| `node.location` | `{ file?, start: {line}, end: {line} }` — **populated by default** |
| `Markdoc.parse(src, { location: true })` | **Changes nothing observable.** Location is not opt-in |
| `location.file` | The one absent field. It comes from `ParserArgs.file`, which **no call site passes** |
| Line numbering | **0-indexed** — `# Title` on file line 1 reports `start.line: 0` |
| `escapeFenceTags` | Line-preserving — maps line→line, substitutes within a line only |
| `parseFrontmatter` | Strips frontmatter before parse, so body coordinates are offset by the stripped line count |
| `serialize()` | A **4-field allowlist** — `$$mdtype`, `name`, `attributes`, `children` |
| `Tag` | Has no location field of any kind |

So location already exists, at every AST node, on every parse. What is missing is
the single field that makes it interpretable.

### Why a bare line number is not safe here

At least five build-path parse sites produce AST from a source that is **not** the
page being rendered, and splice it into that page's tree:

| Site | Source |
|---|---|
| `site.ts:240,243` | partials — another file |
| `expand-pipeline.ts:348` | an expanded entity's body — another page |
| `collection-resolve.ts:115` | a collection body |
| `collection-helpers.ts:41` | a template body, parsed as `'\n' + bodySource` — a deliberate **+1 shift**, documented in place |
| `deferred-body.ts:60` | a stashed body |

`include-pipeline.ts:183-184` already carries both fields across the clone:

```ts
if (node.lines) copy.lines = node.lines;
if (node.location) copy.location = node.location;
```

**That code is correct.** The node genuinely originated at those lines of the
partial. The defect is that without `file`, a spliced partial's coordinates are
indistinguishable from the host page's own — the right data, uninterpretable.
Anything consuming `lines` as "lines in this page" is wrong for included content
today, silently, which is the failure class this repository keeps declining to
tolerate ({% ref "SPEC-131" /%}, {% ref "SPEC-135" /%} D8).

### Where it dies

The **AST → Renderable** boundary, pipeline stage 2→3.
`createComponentRenderable` (`packages/runes/src/lib/component.ts:38`) builds a
`Tag` from cursors and never sees the originating `Node`. One seam.

## Options Considered

1. **Bare line numbers from `node.lines`.** Free — the field is already populated
   and already carried across clones. Rejected: it is exactly the ambiguity above.
   Five splice sites mean a line number in a page's tree may belong to four other
   files, with nothing to say so, and one of them is shifted by one for a
   documented reason. A cheap signal that is wrong for included content is worse
   than none, because it will be trusted.
2. **A side table — `WeakMap<Tag, Location>`.** Attractive because it touches no
   contract at all. Rejected: the tree is rebuilt repeatedly (preprocess hooks
   clone, the identity transform constructs, `serialize` produces fresh POJOs), and
   a table keyed by object identity loses every entry at each rebuild. Keying it by
   a synthetic node id instead means stamping an id onto every node — the contract
   change this option was meant to avoid, plus a table.
3. **A `data-*` attribute on the tag.** Would survive `serialize` for free, since
   `attributes` is in the allowlist. Rejected on two counts: it reaches rendered
   HTML and must be stripped somewhere, and it adds a channel to the node at the
   moment {% ref "SPEC-082" /%} is removing them (`data-rune-fields` consolidation,
   `data-field` metas dropped in WORK-323/329/331). Paying that cost by default,
   for a consumer most builds do not have, is the wrong direction.
4. **A file-qualified range on the renderable, from Markdoc's own `location`
   (chosen).** Uses the mechanism already present, adds the one missing field, and
   inherits the existing carry-across discipline for free.

## Decision

Carry source location through the schema transform as a **file-qualified range**,
sourced from Markdoc's own `location`, terminating at the renderable.

### 1. The unit is `(file, start, end)` — never a bare line number

Every location value names its own source. A consumer never has to know which of
five parse sites produced the node it is holding, and a spliced partial reports
the partial.

This is the decision the other five follow from. It is also why option 1 is
rejected despite being free: the cost of this feature is almost entirely the cost
of making the *file* correct, and a design that omits it is not cheaper, it is
wrong.

### 2. Markdoc's `location` is the carrier; the work is passing `file`

No parallel mechanism. All nine `Markdoc.parse()` call sites in the build path
(`packages/content`, `packages/runes`) pass `{ file }` naming the **real source**
of that text — the page for page bodies, the partial for partials, the
originating entity's page for an expanded body.

`include-pipeline.ts`'s existing carry-across then does the rest: because the
cloned node keeps `location`, and `location` now names its file, a partial spliced
into three pages reports the partial in all three. The splice problem solves
itself, which is the strongest argument for using Markdoc's field rather than
inventing one beside it.

### 3. Normalize at capture — once, not per consumer

Two corrections compose, and both are silent when missed:

- **0-indexed → 1-indexed.** `# Title` on file line 1 reports `start.line: 0`.
- **Frontmatter offset.** `parseFrontmatter` returns the body only, so every
  coordinate is short by the stripped line count. Verified: a heading on real line
  5 of a file with three frontmatter lines reports `start.line: 1`.

Both are corrected where the parse happens, so what enters the tree is a real
file coordinate. A consumer that has to remember to add four is a consumer that
will eventually forget, and an off-by-four line link is wrong in the way that
looks right.

`collection-helpers.ts:41`'s deliberate `'\n' +` prefix is a third such offset and
is corrected the same way, at its own site.

### 4. It stops at the renderable; `serialize()` stays a 4-field allowlist

Location is carried **in-process** — through the schema transform and available
to the pipeline hooks, the CLI, and `/page.json`. It does **not** cross the
server→client boundary by default.

`serialize()` being an allowlist is what makes this free: adding a field to `Tag`
cannot leak to the client, because `serialize` emits four named fields and would
have to be changed to carry a fifth. That change is available as an opt-in for the
dev server, the editor, and {% ref "SPEC-121" /%}'s structured representation —
and stays off for ordinary builds, so {% ref "SPEC-082" /%}'s payload work is not
undone by a feature most sites do not use.

### 5. Synthesized nodes inherit, and say so

The identity transform constructs nodes that were never authored — 31 `makeTag(`
sites in `engine.ts` alone, injecting headers, icons, badges and wrappers.

Such a node takes the location of the authored node it was derived from, **plus a
flag marking it derived**. Not `null`, which would strip location from exactly the
structural elements a click-to-source consumer is most likely to land on; and not
silent inheritance, which would claim an icon was authored at lines nobody wrote
an icon on. The flag is what keeps "inherited" from becoming "false".

### 6. The plumbing lives in the two factories — rune files do not change

`createContentModelSchema` builds `transform: (node, config) => { … }`
(`packages/runes/src/lib/index.ts:761`) and calls the author's transform from
inside that closure, with `node` in scope. So the factory captures
`node.location` and stamps it onto what `createComponentRenderable` returns.

**No individual rune is edited.** All ~114 core and plugin runes inherit location
by virtue of the factory they already use. A rune that hand-rolls a `Schema`
(`icon.ts`, `badge.ts` export a bare `Schema`) simply has no location until it
opts in — degradation, not breakage.

## Rationale

The decisive finding is that the mechanism already exists and is already being
maintained: `location` is populated on every node of every parse, and two
preprocess pipelines already treat carrying it across a clone as load-bearing
enough to comment on. What has never been supplied is `file` — one argument, at
nine call sites.

That reframes the work. This is not "add source tracking to the transform", which
would be a large and speculative change to the renderable contract. It is "finish
a mechanism that is three-quarters present, and make its output interpretable."
The expensive-looking part, provenance through includes and expands, is already
handled by code written for other reasons.

Option 1 is rejected precisely because it looks like the cheap version of this
decision and is not: it ships the ambiguity rather than resolving it, on a
codebase with five splice sites. Options 2 and 3 both work; each trades against
something this repository has explicitly invested in — tree rebuild freedom, and
{% ref "SPEC-082" /%}'s channel reduction.

Terminating at the renderable (4) is what keeps the cost proportionate. The
consumers that justify the work — diagnostics, the CLI, `/page.json`, an agent's
edit address — are all build-time. The one that would need serialization,
click-to-source in a rendered page, is the one nobody has asked for.

## Consequences

- **`Tag` gains an optional location field, and `serialize()` does not.** The
  allowlist is the boundary, and it is already written. Any future decision to
  serialize location is a deliberate edit to one function, not a drift.
- **All nine build-path parse sites must pass the right `file`, and "right" is the whole
  point.** A site that passes the *host page* for spliced content re-creates the
  ambiguity this ADR exists to remove, silently. Each site needs a test asserting
  the file it reports, and the partial/expand sites need one asserting they report
  the source rather than the host.
- **Three offset corrections are load-bearing:** 0→1 indexing, the frontmatter
  strip, and `collection-helpers`' `'\n'` prefix. Each is invisible when wrong. A
  fixture whose expected line numbers are read off a real file — not computed from
  the parse — is the only test that catches them.
- **{% ref "SPEC-135" /%}'s MCP acceptance criterion becomes satisfiable** for
  cross-page findings. `PipelineWarning` gains optional `file`/`line`, which is a
  type change for every plugin that constructs one — additive, since both are
  optional.
- **{% ref "SPEC-136" /%} phase 4 stops needing its own locator.** D8's
  referrer-side scoping reads the location that is already on the node.
- **Memory grows per node, in-process only.** A `{ file, start, end }` per node
  across a 237-page corpus is the cost; it never reaches a client bundle under
  decision 4. Worth measuring on the dogfooded sites before phase 2 of anything
  that depends on it, not worth pre-optimizing.
- **Derived nodes need the flag honoured by consumers.** A consumer that ignores
  it and offers "edit this" on an injected header sends an author to lines that do
  not contain what they clicked. The flag exists; using it is on each consumer,
  and the blame/provenance case is the one most likely to get it wrong.
- **Runes with a hand-rolled `Schema` get nothing** until they move to the factory
  or opt in explicitly. `icon` and `badge` are the known cases.
- **Nothing here produces a source map to rendered HTML.** Post-identity-transform
  the tree contains synthesized nodes and consumed metadata; mapping a DOM element
  back to source is a separate problem this ADR deliberately does not solve.

{% /decision %}
