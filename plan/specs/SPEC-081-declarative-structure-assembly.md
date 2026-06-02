{% spec id="SPEC-081" status="draft" source="SPEC-080" tags="theme, runes, contract, structure, assembly, transform, engine, declarative, grouping" %}

# Declarative structure assembly

Make a rune's structural skeleton — the preamble header, the content / media
columns, and any other theme-variable grouping — **declarative and
rune-owned**, instead of hand-built imperatively in rune transform TypeScript.
`SPEC-080` made *metadata* assembly declarative (`metaFields` + `blocks` +
`layout`); this completes the arc by moving the *structural* skeleton onto the
same declarative footing, so a theme can reshape structure without running rune
code.

Sibling to `SPEC-082` (typed node data channel); both extend `SPEC-080` and
harden the rune output contract before third-party themes depend on its current
shape. The two are independent and can land in either order. (This spec was
originally drafted alongside the data-channel concern; that half is now
`SPEC-082`.)

## Background — why the two layers stay

The schema transform produces a *semantic* IR (this is a hint of type
`warning`; this is the eyebrow; these are the metadata fields); the engine
produces the *presentational* tree (BEM classes, wrappers, projected blocks).
That IR is the stable contract, and four things depend on it being theme- and
framework-agnostic:

1. **Framework fan-out.** One IR renders through svelte / astro / nuxt / next /
   react / vue / eleventy. Shaping structure earlier would multiply it to
   themes × frameworks.
2. **Cross-page pipeline reads the *pre-engine* tree.** Registry,
   `extractTitle`, breadcrumbs run before BEM / structure mangling — entities
   are semantic, not presentational.
3. **Static contracts.** `contracts/structures.json` is derivable *because*
   structure is declared in config, not built imperatively.
4. **Editor + `refrakt inspect`** read the semantic tree / the deterministic
   config→structure mapping.

So this spec does **not** move structure-building into theme-hooked transform
code (see Non-goals). It moves the *imperative skeleton-building that currently
lives in the rune transform* onto the declarative config layer the engine
already interprets.

## Problem

The rune transform conflates two jobs:

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

## Direction

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

## Caveats

- **Computed assembly keeps `postTransform`.** Budget totals, media-position
  logic, ratio→`fr` styles are computation, not structure. The realistic
  end-state is "declarative for the common case, escape hatch for the rest" —
  SPEC-080's stated philosophy applied to the whole skeleton, not just
  metadata.
- **Semantic HTML grouping** (`<figure>` / `<figcaption>`, `<dl>` / `<dt>` /
  `<dd>`) is genuine semantics and can stay wherever it reads best; only
  *theme-variable* grouping needs to move.

## Benefits

- Eliminates the "layout names don't match because they're buried in a wrapper"
  bug class (the `event` bug).
- A flatter pre-engine tree is easier for the cross-page pipeline
  (`extractTitle` finds a top-level `headline`).
- Structure becomes fully theme-overridable without a theme running rune code.
- `generateStructureContract` can describe the *whole* skeleton, not just
  projected blocks.

## Non-goals

- **Do not collapse the two layers** or let themes run code at the rune
  transform stage. That sacrifices the portable IR, the pre-engine pipeline
  reads, the static contracts, inspect, and the editor — rejected after
  analysis (see Background).
- **Do not remove `projection` / `postTransform`.** They remain the
  deep-surgery / computed-assembly escape hatches.
- **Do not revise the SPEC-080 field / block / layout vocabulary.** This builds
  on it; it does not re-open it.

## Open questions

- **Grouping primitive shape.** Extend `layout` with a wrap / group operation,
  or add a dedicated `groups` map? Either way reconcile with the retained
  `projection.group` so there is one grouping concept, not two.
- **How far to push.** Which runes' transforms can become pure interpretation +
  flat emit, and which legitimately keep structural code (computed cases)?
- **Contract surface.** What does `generateStructureContract` emit for a
  declaratively-grouped skeleton (nested element entries, group membership)?

## Relationship to other specs

Builds on `SPEC-080` (block-and-layout model); sibling to `SPEC-082` (typed
node data channel). SPEC-080 made metadata assembly declarative; this makes the
structural skeleton declarative and rune-owned. Together with SPEC-082 they
make the rune output contract something a third-party theme can build against
with confidence.

{% /spec %}
