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
- A **declarative grouping primitive** composes those slots into the nested
  skeleton, theme-overridable.
- Guiding rule: **labelling is semantics (transform); nesting / grouping is
  presentation (declarative).**

### Grouping is recursive `layout`

Rather than a separate `groups` map (which splits the tree definition across two
places that must agree, and forces cross-references to nest a group inside a
group), make `layout` itself a **recursive, name-keyed tree**. Today `layout`
can only *order children within a container that already exists*; the change is
to let an entry also *create* a container:

```ts
type LayoutEntry =
  | string[]                                              // order children; create no wrapper
  | { tag?: string; children: string[]; attrs?: Record<string, string> };

layout?: Record<string, LayoutEntry>;
```

- `root` is the entry point — the rune's own element, which already exists.
- An entry **with `tag`** *creates* a wrapper element; its key becomes the
  wrapper's `data-name` (→ `.rf-{block}__{key}` via the existing BEM pass, and a
  `data-section` via the existing `sections` map).
- An entry **without `tag`** (or a bare array) orders an existing container.
- Each child name resolves, in order: (1) a `layout` entry → recurse / create;
  (2) a `blocks` entry → project the metadata block; (3) a transform-emitted node
  with that `data-name` → place it; (4) otherwise skip. Transform nodes never
  referenced anywhere still append at the end (the "never drop content" rule),
  unless explicitly hidden.

The `event` preamble grouping — the source of the bug above — becomes
declarative instead of hand-built in the schema:

```ts
layout: {
  root: ['preamble', 'metadata', 'body', 'register'],   // metadata, register = blocks; body = slot
  preamble: { tag: 'header', children: ['headline', 'blurb'] },
}
```

The recipe / character content + media split, fully declarative:

```ts
layout: {
  root: ['content', 'media'],
  content: { tag: 'div', children: ['preamble', 'metadata', 'body'] },
  preamble: { tag: 'header', children: ['name'] },
}
```

This **subsumes `projection.group`** (a `tag` entry *is* a group) and
**`projection.relocate`** (you place a slot wherever you name it — no separate
move op). What remains of `projection` is `hide` (explicit drop, since the
default is append-not-drop) and its real role: **reshaping a tree you don't
own** — a theme bending a third-party rune's output by `data-name` without the
rune declaring `layout`. So the boundary is: `layout` is the rune / theme
declaring its *intended* structure; `projection` is post-hoc surgery on
*someone else's* structure. Both kept, boundary drawn correctly.

The machinery is partly prototyped: `composeContainer` already orders / injects
by `data-name`, and `projection.group` already wraps `data-name` children into a
new element — the work is generalising those into the recursive resolver above.

## The computation boundary

Flattening the skeleton forces a sharper question about *computation* — and the
right line is **not** "structure is declarative, everything computed stays in
`postTransform`." It is:

- **Semantic derivation → the rune transform.** Anything that is a *fact about
  the content*, theme-invariant, belongs in the semantic IR.
- **Presentation-dependent computation → `postTransform`.** Only things that
  genuinely need the *assembled, theme-shaped* tree — reading a resolved class,
  injecting a decorative element keyed off final structure.

### Worked example: budget totals belong in the transform

Budget's grand / per-category / per-day totals are currently computed in the
engine's `postTransform`. That is the wrong layer: the sum of the line items is
the same number under every theme — it is data, not presentation. Three
consequences:

1. **Cross-page invisibility.** The registry / aggregate phases read the
   *pre-engine* tree. A total computed post-engine cannot be queried — a
   `collection` of budgets cannot sort by total, `aggregate` cannot sum across
   them. Computed in the transform, the total is a first-class entity field.
2. **It lives in the theme layer.** `postTransform` sits in the rune's *engine
   config* (`coreConfig` / a plugin's `theme.runes`); a presentation override
   should never be able to perturb a number that must be invariant.
3. **No actual engine dependency.** Budget's `postTransform` reads
   `data-currency` / `data-duration` / `data-show-per-day` and the
   `BudgetCategory` children — but those are just the authored attributes and
   the schema's own parsed children, all available *in the transform*. It reads
   them from `data-*` only because it happens to run post-engine.

So the split is: the **transform computes the numbers** (grand, per-category,
per-day) and emits them as semantic data — typed entries in the `SPEC-082`
`fields` bag (`total: 4200`, `perDay: 600`) and per-category totals on the
category nodes. The **theme renders and places them** via `blocks` + `layout`
(a `total` metaField → a block placed in a `footer` container), exactly like
any other field; currency *formatting* is deterministic from authored data, so
it rides a field `transform`, not imperative code. Budget's `postTransform`
shrinks to nothing.

### Caveat — semantic HTML grouping

`<figure>` / `<figcaption>`, `<dl>` / `<dt>` / `<dd>` and similar are genuine
semantics and can stay wherever they read best in the transform; only
*theme-variable* grouping needs to move to declarative `layout`.

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
- **Do not remove `projection` / `postTransform`.** `projection` remains the
  escape hatch for reshaping trees a theme does not own; `postTransform` remains
  for *presentation-dependent* computation only (see The computation boundary).
- **Do not revise the SPEC-080 field / block / layout vocabulary.** This builds
  on it; it does not re-open it.

## Open questions

- **Cycle / diamond resolution.** The recursive `layout` resolver must place
  each transform node once and detect reference cycles (`a → b → a`) — decide
  warn-and-skip vs hard error.
- **`projection.group` / `relocate` deprecation.** They are subsumed by
  recursive `layout`; deprecate immediately, or keep as thin aliases for a
  release?
- **How far to push.** Which runes' transforms become pure interpretation +
  flat emit, and which keep structural code (genuinely presentation-dependent
  cases)?
- **Contract surface.** What does `generateStructureContract` emit for a
  declaratively-grouped skeleton (nested element entries, wrapper membership)?

## Relationship to other specs

Builds on `SPEC-080` (block-and-layout model); sibling to `SPEC-082` (typed
node data channel). SPEC-080 made metadata assembly declarative; this makes the
structural skeleton declarative and rune-owned. Together with SPEC-082 they
make the rune output contract something a third-party theme can build against
with confidence.

{% /spec %}
