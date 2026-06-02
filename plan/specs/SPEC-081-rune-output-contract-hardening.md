{% spec id="SPEC-081" status="draft" source="SPEC-080" tags="theme, runes, contract, structure, assembly, serialization, data-channel, transform, engine, declarative" %}

# Rune output contract hardening

Before third-party themes and additional framework renderers start building
against it, harden the seam between the **rune transform** (which produces a
semantic intermediate tree) and the **identity transform / engine** (which
produces the presentational tree). `SPEC-080` made *metadata* assembly
declarative; iterating on it surfaced two further weaknesses in that seam that
are cheap to fix now and expensive to fix once external themes depend on the
current shape.

Two orthogonal, independently-shippable concerns:

- **A — Declarative structure assembly.** The structural skeleton (preamble
  header, content / media columns) is still hand-built imperatively in rune
  transform TypeScript, while the engine projects metadata into it
  declaratively. That split is where the `slots → zones → blocks/layout`
  churn lived, and it causes real placement bugs.
- **B — Typed node data channel.** Data crosses the serialize boundary as
  `<meta data-field>` child nodes that the engine reads and strips. It is a
  stringly-typed side channel that has generated a disproportionate share of
  bugs.

Neither changes the two-layer model itself — that separation (theme- and
framework-agnostic semantic IR, then per-theme presentation) is load-bearing
and explicitly retained (see Non-goals).

## Background — why the two layers stay

The schema transform produces a *semantic* IR (this is a hint of type
`warning`; this is the eyebrow; these are the metadata fields); the engine
produces the *presentational* tree (BEM classes, wrappers, projected blocks).
That IR is the stable contract, and four things depend on it being
theme/framework-agnostic:

1. **Framework fan-out.** One IR renders through svelte / astro / nuxt / next /
   react / vue / eleventy. Shaping structure earlier would multiply it to
   themes × frameworks.
2. **Cross-page pipeline reads the *pre-engine* tree.** Registry, `extractTitle`,
   breadcrumbs run before BEM/structure mangling — entities are semantic, not
   presentational.
3. **Static contracts.** `contracts/structures.json` is derivable *because*
   structure is declared in config, not built imperatively.
4. **Editor + `refrakt inspect`** read the semantic tree / the deterministic
   config→structure mapping.

The scars are at the seam, not in the layering. This spec sharpens the seam.

## Concern A — Declarative structure assembly

### Problem

The rune transform does two different jobs today and conflates them:

- **Content interpretation** (must stay in the transform): deciding *which*
  authored child is the headline, splitting the body on `---`, collecting list
  items as ingredients, pulling the eyebrow paragraph. This parses arbitrary
  authored Markdown; it cannot be config.
- **Structural assembly** (should be declarative): wrapping headline + blurb in
  a `preamble` `<header>`, building the content-column / media-column split,
  nesting the metadata def-list inside the content column. This is presentation
  hand-built in TypeScript.

Because the transform pre-builds part of the skeleton and the engine projects
the rest into it, every redesign (`slots → zones → zoneHost → blocks/layout`)
was an attempt to give the engine vocabulary to place things into a tree it did
not author. Premature nesting also causes concrete bugs: the `event` rune
wrapped headline + blurb in a `preamble` `<header>`, so `layout` could not
address them individually — listing `headline` / `blurb` in the root did
nothing and `preamble` silently appended last.

### Direction

- The transform emits a **flat bag of `data-name`-labelled slots** (`headline`,
  `blurb`, `eyebrow`, `media`, `body`, `ingredients`, …) — interpretation only,
  no wrappers.
- A **declarative grouping / wrap primitive** composes those slots into the
  nested skeleton (`preamble = group(headline, blurb)`; `content = group(
  preamble, metadata, body)`; `root = [content, media]`), theme-overridable.
- Guiding rule: **labelling is semantics (transform); nesting / grouping is
  presentation (declarative).**

The machinery is partly prototyped: `composeContainer` already orders / injects
by `data-name`, and `projection.group` already wraps a set of `data-name`
children into a new element. The work is promoting grouping from the
`projection` escape hatch to a first-class assembly primitive alongside
`blocks` / `layout`.

### Caveats

- **Computed assembly keeps `postTransform`.** Budget totals, media-position
  logic, ratio→`fr` styles are computation, not structure. The realistic
  end-state is "declarative for the common case, escape hatch for the rest" —
  SPEC-080's stated philosophy applied to the whole skeleton, not just
  metadata.
- **Semantic HTML grouping** (`<figure>`/`<figcaption>`, `<dl>`/`<dt>`/`<dd>`)
  is genuine semantics and can stay wherever it reads best; only
  *theme-variable* grouping needs to move.

### Benefits

- Eliminates the "layout names don't match because they're buried in a wrapper"
  bug class (the `event` bug).
- A flatter pre-engine tree is easier for the cross-page pipeline
  (`extractTitle` finds a top-level `headline`).
- Structure becomes fully theme-overridable without a theme running rune code.
- `generateStructureContract` can describe the *whole* skeleton, not just
  projected blocks.

## Concern B — Typed node data channel

### Problem

Markdoc transform emits `Tag` instances; crossing the serialize boundary
(notably SvelteKit server→client) flattens them to
`{ $$mdtype:'Tag', name, attributes, children }` with string→string
attributes. There is no typed slot for "the status is `warning`, the rating is
`4`", so the rune smuggles that data as child nodes —
`<meta data-field="status" content="warning">` — and the engine reads them into
`modifierValues` and strips them.

This side channel is the source of a disproportionate share of bugs:

1. **Stringly-typed, presence collapses.** Absent, `""`, and `"false"` blur
   together. The `codegroup` `title=""` case forced the `renderWhenEmpty` flag
   plus a present-but-empty path through three layers — a typed channel makes
   `"" vs undefined` free.
2. **Emit / read / strip must agree across three places,** and keys are
   kebab-cased in transit (`endDate → data-field="end-date"`), so the engine
   maintains a kebab-matching set.
3. **A defensive leak filter** exists solely to drop unconsumed `data-field`
   metas before they render.
4. **SEO double-booking.** `testimonial` emits `<meta property="ratingValue">`
   for schema.org *and* carries the rating for the engine; one mechanism serves
   output and internal data flow.
5. **Implicit contract.** The transform↔engine interface is "matching string
   keys," not a type.

### Direction

- Carry a **typed `data` bag on the serialized node**
  (`{ …, data: { status: 'warning', rating: 4 }, children }`). It is JSON, so it
  survives the boundary; the engine reads `node.data` directly — typed,
  presence-distinguishable, no kebab dance, no strip pass, no leak filter.
- Real schema.org / SEO `<meta>` tags revert to being **output only**.

### Cost

- Every framework adapter and the renderer must preserve `data` through the
  chain, and the serialize step must carry it. Contained but cross-cutting.
- The status quo's only real virtue — meta-nodes round-trip through any
  Markdoc-shaped serializer without a custom field — is not actually being
  cashed in, since refrakt owns its own serialize step and renderers.

## Non-goals

- **Do not collapse the two layers** or let themes run code at the rune
  transform stage. That sacrifices the portable IR, the pre-engine pipeline
  reads, the static contracts, inspect, and the editor — rejected after
  analysis.
- **Do not remove `projection` / `postTransform`.** They remain the
  deep-surgery / computed-assembly escape hatches.
- **Do not revise the SPEC-080 field / block / layout vocabulary.** This builds
  on it; it does not re-open it.

## Open questions

- **One spec or two?** A and B are orthogonal and independently shippable. If
  their milestones diverge, split B into its own spec (e.g. SPEC-082). Kept
  together here because both serve one north star: a solid rune output contract
  before external themes exist.
- **Grouping primitive shape.** Extend `layout` with a wrap/group operation, or
  add a dedicated `groups` map? Either way reconcile with the retained
  `projection.group` so there is one grouping concept, not two.
- **`data` bag typing.** A shared per-rune TS interface? How does it interact
  with `modifiers` / `metaFields`, which currently derive from metas — does the
  manifest read from `node.data` instead?
- **Serialization ownership.** Does `data` ride through Markdoc's Renderable
  contract, or is it purely owned by refrakt's serialize step + adapters?
- **Migration ordering.** B touches every framework adapter; sequence it so no
  renderer is left reading metas while another reads `data`.

## Relationship to prior specs

Builds on `SPEC-080` (block-and-layout model). SPEC-080 made *metadata*
assembly declarative; this completes the arc — Concern A makes the *structural
skeleton* declarative and rune-owned, and Concern B replaces the data channel
the whole model rides on. Together they make the rune output contract something
a third-party theme can build against with confidence.

{% /spec %}
