# Marquise foundation: brainstorm notes

**Status: brainstorm.** Nothing here is decided unless marked *decided*, and nothing here is a
promise to build. When an idea is decided it moves into a spec, and this document links to it.

**Started:** 2026-11-12. **Last updated:** 2026-11-13.

**Related, already written as specs:**

- SPEC-199: Marquise, the content model as its own project (audience, boundary, 1.0 scope,
  vocabulary, plain presentation, worked hero example)
- SPEC-200: a field declares whether it delivers its element, its inline content or its text
- ADR-049: a framework component replaces a rune's template
- SPEC-197, SPEC-198: definition bodies and examples; `source()` and `output()`

Terms used below follow SPEC-199 decision 1: authors write **tags**, developers define **shapes**.

---

## 1. Starting points

- **Refrakt is the lab; Marquise is the stable product** (SPEC-199). Refrakt grew in too many
  directions to reach 1.0. Marquise is cut from what is built and settled, and ideas graduate
  into it one way.
- **Marquise ships mechanisms, not vocabularies.** No dimensions, presets, bindings or design
  language of its own. Anyone can build a shape library, a design language or a kit on top.
- **Design the next layer from refrakt's lessons, not to fit refrakt.** Refrakt should end up
  as one user of the foundation among others.
- **The recurring lesson:** refrakt mixes *vocabulary* (what exists and what it is called) with
  *implementation* (how it looks and behaves) in the same TypeScript. Most of the redesign is
  pulling those apart: vocabulary declared as content, implementation as code.
- **Plan is out of focus** (2026-11-13). It is not fundamental, even to refrakt.

## 2. The stack, by distance from Marquise

```
 4  Products          refrakt (the opinionated framework): site + design + libraries + tools
 3  Site layer        routing, layouts and regions, navigation, cross-page SEO, adapters, i18n
 2  Corpus layer      many documents: index, entities, cross-document refs, graphs, history
    Design languages  dimensions, presets, tokens contract, interaction contracts
    Implementations   themes, component libraries, bound third-party libraries (kits)
    Shape libraries   marketing, docs, learning… as shapes; presentations per implementation
 1  Marquise          shapes, content models, validation, shape node, renderers, tooling
 0  Markdoc
```

- **Shape libraries split** into the shape (portable, Marquise-level) and its presentation
  (per implementation). Refrakt's `hero` or `faq` shapes then become useful to anyone bringing
  their own components.
- **Refrakt becomes a distribution:** site layer + its design language and theme + its shape
  libraries + `create-refrakt` and the editor.
- **Measured coupling** (2026-11-12): Lumina depends on `runes`; `content` depends on
  `highlight` (site on presentation); the editor depends on nearly everything.
- **A cheap first step in the lab:** a layer map plus a test that fails when a package depends
  on a higher layer, or across layers that should stay independent. Each violation becomes a
  concrete work item.

## 3. Corpus layer (parked)

Two engines index documents today: the site's entity registry and plan's scanner. Ideas, kept
for when this comes back into focus:

- shapes declare what they register (refrakt's `registers` key), with no plugin hooks;
- references are typed fields ("a list of references to `spec` or `decision`"), checked for
  dangling ends, cycles and duplicate ids;
- the corpus offers lookup, queries (the shared filter grammar), relations and graph checks;
  turning an entity into a URL is the site's job;
- history (git) is a pluggable, opt-in source;
- incremental updates, so the language server and builds share one engine;
- a generic MCP surface over any corpus.

## 4. The theme contract

A theme is not "CSS for refrakt's markup". It is anything that **implements a design language**.

**The design language (the contract):**

- dimensions and their values, with descriptions (section 6);
- which shapes or parts each applies to;
- presets, as named values with typed payloads (section 7);
- a tokens contract;
- interaction contracts: keyboard and ARIA expectations (section 8);
- the capability vocabulary shapes declare with `provides` (open question D4).

**Implementations come in three kinds:**

| Kind | How it implements the language | Example |
|---|---|---|
| CSS theme | stylesheets over plain or template output, keyed on `data-*`; plain-DOM behaviours | Lumina today |
| Component theme | its own framework components, one per shape or primitive | a team's React design system |
| Bound library | a binding table onto a third-party library's props and slots; behaviour and accessibility from the library | Nuxt UI, shadcn/ui, Vuetify, MUI |

**Coverage is part of the contract.** An implementation declares which dimensions and values it
honours. Authors get `dimension-unsupported` instead of a value silently doing nothing. Refrakt's
CSS coverage tests are the seed of this, generalised.

**Name values by meaning, not by look.** `tone: danger` maps onto any library's colour prop;
`colour: red` maps onto nothing reliably. Refrakt's `sentiment` already follows this.

## 5. Kits: third-party packages on the foundation

*Direction agreed 2026-11-13:* Marquise does not ship dimensions or bindings. A third party can
publish, say, `marquise-nuxt-ui` with its own dimensions and mappings. Marquise provides what
makes that possible.

**A kit might contain:**

```
marquise-nuxt-ui/
  marquise.kit.json      ← manifest: name, version, what it provides, peer deps
  dimensions/*.md        ← vocabulary, as content
  tints/*.md             ← presets
  shapes/*.md            ← optional: shapes matching the library's components
  bindings/vue.ts        ← shapes and dimension values onto the library's props and slots
```

A kit may provide a design language only, an implementation of someone else's, or both.

**What the foundation provides:**

1. declaration formats as content: dimensions, presets, optionally interaction contracts;
2. a binding mechanism in each renderer (`defineBindings`): props from fields, value maps, item
   arrays, prop or slot by SPEC-200's `as`, an optional wrapper where a binding asks for one;
3. a kit manifest and how kits combine: listed in config, explicit collisions, site overrides
   per shape;
4. coverage and validation: `dimension-unsupported`, `shape-unbound`, and `marquise check` for
   kit authors;
5. tooling that reads the active kits: completions with descriptions, generated types, the
   reference and AI grammar describing the project's actual vocabulary;
6. versioning rules for vocabularies: removing a value is breaking; deprecation is declared;
7. a test kit for kit authors: render all examples through the bindings, check coverage, run
   interaction contracts;
8. a guide: "Build a Marquise kit for your UI library".

**Two things to watch:**

- **Chicken and egg.** With no built-in vocabulary, a fresh project does nothing visual until a
  kit exists. Have a first kit (Nuxt UI or shadcn/ui) written **outside** Marquise, clearly
  labelled as one kit among others.
- **Refrakt is a kit author too:** its design language and Lumina built only on the published
  foundation. If refrakt needs something a third party could not do, the foundation is missing a
  piece.

**Pending changes to SPEC-199 when this is decided:** "shared attributes" becomes declared
attribute sets; bindings join the renderer section; kit manifest, combination, coverage,
vocabulary versioning and kit tests join Marquise's scope; the "what Marquise ships" list says no
dimensions, presets or bindings. ADR-049 decision 8 changes: the shape node carries `dimensions`
in its own field (section 6).

## 6. Dimension file format (sketch)

**A closed dimension:**

```md
---
dimension: tone
description: The meaning a block conveys, for colour and iconography
values:
  neutral: { description: "No particular meaning; the default surface" }
  info:    { description: "Background information worth knowing" }
  success: { description: "Something went well or is confirmed" }
  warning: { description: "Something needs attention" }
  danger:  { description: "Something is wrong or destructive" }
default: neutral
appliesTo: { shapes: [callout, badge, banner] }
---

{% example #all-tones %}
{% callout tone="warning" %}
Renaming a workspace changes its URL.
{% /callout %}
{% /example %}
```

**Aliases, deprecations and a target**, modelled on refrakt's real `elevation` history:

```md
---
dimension: elevation
description: How far a surface sits above or below the page
values:
  sunken: { description: "Recessed into the page" }
  flush:  { description: "Level with the page, no surface" }
  flat:   { description: "A surface without shadow" }
  raised: { description: "Lifted slightly" }
  floating: { description: "Clearly above the page" }
  overlay:  { description: "Above everything, like a dialog" }
aliases:
  none: { use: flat,     deprecated: true }
  sm:   { use: raised,   deprecated: true }
  md:   { use: raised,   deprecated: true }
  lg:   { use: floating, deprecated: true }
default: flat
appliesTo: { provides: surface }
on: root
---
```

**An open dimension, inherited by nested shapes:**

```md
---
dimension: tint
description: A colour scheme applied to a block and everything inside it
open: true
presets: { dir: tints/, fields: { surface: { type: color }, text: { type: color }, accent: { type: color } } }
inherit: true
appliesTo: all
---
```

**The shape side:** shapes do not list the dimensions they accept; `appliesTo` decides. A shape
declares capabilities, sets defaults and may opt out:

```yaml
provides: [surface, media, body]
defaults: { elevation: flush, tone: neutral }
dimensions: { exclude: [tint] }
plain: { tag: section }
```

**A shape does not own its element** (*leaning, 2026-11-13*). The element is presentation: a
component, binding or template chooses it. Marquise core has no wrapper; refrakt's `tag:` stays a
refrakt-specific key because its engine builds the root from it (ADR-049 decision 2). The plain
presentation still needs an element, so the only element setting is scoped to it:
`plain: { tag: section }`, used only when nothing else draws the shape, `div` without it.
Semantics that SPEC-194 D11 tied to elements have better homes here: structured data is JSON-LD
from the shape node, and landmarks are interaction-contract territory (section 8), testable
against whatever a component renders.

**In the shape node**, dimensions travel separately and already resolved (aliases mapped,
defaults applied, inherited values filled in):

```json
{ "$$mdtype": "Shape", "name": "callout", "attributes": {},
  "dimensions": { "tone": "warning", "elevation": "flat", "tint": "ocean" }, "slots": { … } }
```

The plain presentation writes them as `data-*` on the root or on the part `on` names; a binding
maps them onto props.

| Key | Required | Meaning |
|---|---|---|
| `dimension` | yes | the attribute authors write; matches the file name |
| `description` | yes | shown in the editor, the reference and the AI grammar |
| `values` | unless `open` | the closed set, each with `description` |
| `aliases` | no | other spellings mapped onto a value; `deprecated: true` reports them |
| `open`, `presets` | no | values come from preset files (section 7) |
| `default` | no | when neither author nor shape sets one |
| `appliesTo` | yes | `all`, `{ shapes: [...] }` or `{ provides: [...] }` |
| `on` | no | `root` (default), or `{ provides: … }` / `{ slot: … }` for a part |
| `inherit` | no | nested shapes without a value receive their ancestor's |

**Suggested error ids:** `dimension-value-invalid`, `deprecated-attribute-value`,
`dimension-name-collision`, `dimension-default-invalid`, `dimension-unsupported`.

## 7. Presets

A preset is **a named value of an open dimension, carrying a payload**. Refrakt has four kinds
today, and only some are token sets:

| Preset | Holds | Where |
|---|---|---|
| Tint | colour token overrides | tint facet |
| Theme presets (`tideline`…) | a whole token set | `preset-loader.ts` |
| Background | raw CSS, a token-driven gradient, render params, even a live sandbox scene | `BgPresetDefinition`, `packages/transform/src/types.ts:730` |
| Frame | no tokens: a bundle of other settings (`aspect`, `displace`, `offset`, `shadow`…) | `FramePresetDefinition`, `types.ts:758` |

**Payload kinds:** token bundles; bundles of other dimension values; structured parameters for
the implementation; content or assets.

**The dimension declares its preset schema**, with typed fields, as a shape declares attributes.
Field types, a small closed set: `color`, `token`, `ratio`, `number`, `asset`, `content` (a file
or `file#id`), `dimension: <name>`, `enum`.

```yaml
# dimensions/frame.md
presets:
  dir: frames/
  expands: true
  fields:
    aspect:   { type: ratio }
    shadow:   { dimension: shadow }
    displace: { dimension: displace }
```

**Two resolution modes:**

- **Expanding** (`expands: true`): Marquise resolves the preset into other dimensions' values in
  the shape node; an author's inline value wins. Kits never need to know the preset exists. The
  most portable kind.
- **Passed through:** the payload is the implementation's (colours, gradients, scenes). The node
  carries the name; renderers get the payload from a preset registry.

**Raw CSS stays out of presets.** It ties a preset to one implementation. An implementation keeps
its raw styling in its own files, keyed by preset name.

**Who provides presets:** kits ship defaults; sites add their own and may override a kit's by
name; `extends` stays one level deep.

## 8. Behaviours

Two different things, owned by different layers:

- **Interaction contracts**: what tabs, an accordion, a disclosure or a carousel must do (keys,
  ARIA, focus). Accessibility and meaning, not taste, so they belong to the **design language**,
  stated and testable, not reimplemented by every theme.
- **Feel**: motion, reveal, transitions. Belongs to the **theme**.

**Logic once, bindings per framework.** Interaction logic stays framework-neutral ("headless"
state machines), and each implementation binds it in its framework. Zag.js works this way and is
worth a look. Today's `@refrakt-md/behaviors` is roughly the plain-DOM binding without the
separated logic. In a framework world, a component theme is a component library for a design
language using the headless logic; a bound library brings its own (Nuxt UI builds on a headless
primitives library), and the contract becomes a test against the output.

## 9. Bindings (sketch)

```ts
// bindings/vue.ts in a Nuxt UI kit
import { UAlert, UPageHero } from '#components';

export default defineBindings({
  callout: {
    component: UAlert,
    props: {
      title: 'headline',
      description: 'body',
      color: { from: 'tone', map: { danger: 'error' } },
      variant: 'emphasis',
    },
  },
  hero: {
    component: UPageHero,
    props: {
      headline: 'eyebrow',
      title: 'headline',
      description: 'blurb',
      links: { from: 'actions', each: { label: 'label', to: 'href' } },
    },
  },
});
```

- The Nuxt UI component and prop names are **from memory**; verify against its docs before any
  of this is written into a spec.
- SPEC-200's `as` decides prop or slot; SPEC-200's item records map onto array props.
- Marquise core adds no wrapper element: the library component is the output.
- Two ways to relate a kit to a library: **map your language onto the library** (portable), or
  **adopt the library's vocabulary as the language** (zero friction, less portable). Both are
  possible; kits choose.

## 10. Tags that are not shapes

*Added 2026-11-13.* Refrakt's non-shape tags fall into a few kinds, and most fit the same
pattern: vocabulary declared as content, implementation as code registered under a name.

| Kind | Examples in refrakt | What it does | Who writes it |
|---|---|---|---|
| Directives | `include`, `data`, `snippet` | resolve to content before the transform | content authors |
| Template structure | `slot`, `fragment`, `template`; Markdoc's `if` / `else` | describe how a template is built; no output of their own | template authors |
| Primitives | `group` (`layout="bar"`, `"ladder"`), `metablock`, `section` | arrangement and design vocabulary placed by templates | template authors |
| Lookups | `t` (SPEC-145 D29), `field`, `icon` | a value from somewhere other than the content: a dictionary, the shape's values, an icon set | template authors, sometimes content authors |
| Site tags | `layout`, `region` | page structure | site authors |
| Cross-document | `ref`, `xref` | point at another document's entity | content authors |

Markdoc's own built-ins (`if`, `else`, `partial`, variables, functions) stay Markdoc's.

**Primitives are shapes too** (SPEC-194 D13 already says "a primitive is a definition too"):

- `group` is a shape whose content is whatever is placed inside it, with a flag that only
  templates may place it (something like `placeableBy: templates`), so content authors never see
  it in completions;
- its `layout` is a dimension: an arrangement vocabulary (`bar`, `ladder`, `stack`, `grid`…)
  declared as content;
- it is provided by the design language, not by Marquise or `@marquise/compose`, which provides
  only the template language itself (`slot`, `fragment`, `template`);
- kits implement it like any shape: a CSS theme styles `[data-layout="bar"]`, a Nuxt UI kit binds
  it to a stack component, and the template is unchanged;
- the same holds for `metablock` and `section`.
- **The test:** if it renders something, it is a shape, possibly one only templates may place. If
  it only describes how a template is built, it belongs to the template language.

**Lookups are hooks the host fills, not engines Marquise ships** (*leaning, 2026-11-13*). `t` is
not content and not a shape: it asks for the string for a key in the current locale, with a
fallback. Refrakt has a full engine for it (SPEC-145 D29: one dictionary per site, English
fallback, plural maps, `i18n-extract`). Marquise should not:

- i18n is large, solved and opinionated (vue-i18n, Nuxt i18n, i18next, next-intl, FormatJS),
  with different message syntaxes, plural rules and locale negotiation; an engine would compete
  with what every framework user already has;
- a dictionary format with precedence rules is the kind of vocabulary Marquise does not ship;
- content is translated as whole documents, so content authors do not need `t` (answers T1);
- components already use their framework's i18n.

What Marquise provides instead (detailed in section 11): a `translate(key, fallback, params)`
callback the host supplies, a lookup node so templates and components resolve strings the same
way, a `$locale` host value for `Intl` formatting, and a kit manifest field listing message files
it does not interpret. Recommending one format (ICU message syntax in JSON is the closest to a
standard) would help kits interoperate. The host bridge is the only mechanism (answers T2).
Refrakt keeps its own `t`, dictionaries and `i18n-extract`, built on the same callback.

`icon` follows the same reasoning (leaning on T4): icon systems are also solved (Iconify, Nuxt
Icon, lucide), so Marquise defines an `icon(name)` callback and a manifest field for kits that ship
sets, not an icon registry. `field` is a lookup into the shape's own values and belongs to the
template language.

**Directives get a declaration file too**, mirroring shapes with `prepare` (SPEC-194 D1): `data.md`
declares its attributes (`src`, `where`, `sort`…) for validation, completions and docs, and names
its registered code with `preprocess: data`. Tooling then treats every tag the same way.

| Tag kind | Contract defined by | Declared as | Implemented by | Provided by |
|---|---|---|---|---|
| Shapes, including primitives | Marquise | shape file | components, templates, plain presentation | shape libraries, design languages, kits |
| Dimensions (including `layout`) | Marquise | dimension file | themes and kits | design languages, kits |
| Directives | Marquise (preprocess hook) | file with attributes and `preprocess: <key>` | registered code | Marquise core (`include`), add-ons (`data`, `snippet`), anyone |
| Template structure | `@marquise/compose` | built in | `@marquise/compose` | `@marquise/compose` |
| Lookups (`t`, `icon`) | Marquise (signature and lookup node only) | message files and icon sets listed in kit manifests | the host's callbacks | hosts, kits |
| Site and cross-document tags | site layer, corpus layer | their own | their own | refrakt, other site layers |

## 11. Extension points

*Added 2026-11-13.* What SPEC-199 calls "hooks" are three different things; only the third is
functions the host passes in.

| Kind | What it is | Examples |
|---|---|---|
| Declarations | files Marquise reads; no code | shapes, dimensions, presets, kit manifests |
| Registries | code registered under a name, which declarations refer to | directives (`preprocess: data`), `prepare` stages, components and bindings, presentations |
| Callbacks | functions the host supplies for what only the host knows | values, files, translate, icons, findings |

**Transform time, passed to `marquise`:**

```ts
// marquise.config.ts
export default defineConfig({
  kits: [nuxtUi()],
  shapes: 'shapes/',
  values: ({ document }) => ({ locale: document.frontmatter.lang ?? 'en' }),
  files: nodeFiles({ root: '.', roots: { partials: '_partials/' } }),
  onFinding: (finding) => console.warn(finding),
  presentFinding: (finding) => null,
});
```

| Callback | Signature | Used by | Default |
|---|---|---|---|
| `values` | `(ctx) => Record<string, unknown>` | `$locale`, `$page`, `$site` and other host values in expressions and conditions | `{}` |
| `files` | `{ read(path), resolve(root, path) }`, bounded to declared roots | `include`, `data`, anything reading files (refrakt's `ProjectFiles`, SPEC-113) | Node's filesystem, bounded to the project root |
| `onFinding` | `(finding) => void` | every validation finding | collected into the `findings` result |
| `presentFinding` | `(finding) => node \| null` | failures that should stay visible on the page | `null`; refrakt returns its `hint` callout |

Deferred definitions are an API, not a callback: `transform()` returns placeholders, and the host
calls `expand(placeholder, values)` once it has the values.

**Lookups resolve at render time.** A `t` in a template becomes a node, not a string:

```json
{ "$$mdtype": "Lookup", "kind": "translate", "key": "recipe.servings", "fallback": "Serves", "params": {} }
```

The shape node stays independent of locale (cacheable, served in every language); it matches how
framework i18n resolves reactively; templates and components share one path.

**Render time, given to each renderer package:**

```ts
// @marquise/vue, installed by the host or a kit's Nuxt module
app.use(marquise, {
  components: { callout: UAlert /* … */ },
  bindings,
  translate: (key, fallback, params) => i18n.t(key, params) ?? fallback,
  icon: (name) => h(UIcon, { name }),
  middleware: [],
});
```

| Provided | What it does | Default |
|---|---|---|
| `components`, `bindings` | shape name to component, or to a binding onto a library component | the plain presentation |
| `translate(key, fallback, params)` | resolves translate lookups; what components call | the fallback, params filled in |
| `icon(name)` | resolves icon lookups to the framework's renderable | nothing, reporting `icon-unresolved` |
| `middleware` | process each shape node before rendering, and intercept its rendering (section 12) | none |
| element overrides | replace an HTML element everywhere (`table`, `pre`) | none |
| context API | `useMarquise()` (Vue, React), `getMarquise()` (Svelte): `translate`, `icon`, `locale`, the current shape | always provided |

`translate` and `icon` have **fixed signatures** so kits interoperate; anyone can register more
lookup kinds under their own names.

**Order:** kits may supply defaults (a Nuxt UI kit's module plugging `translate` into Nuxt i18n and
`icon` into Nuxt Icon); the site's config wins over any kit; two kits registering the same name
is an error unless config chooses.

**Not provided:** a translation engine, message format or locale negotiation; an icon set; any
filesystem policy beyond bounding reads to declared roots.

**SPEC-199's hooks, regrouped:**

| SPEC-199 hook | Becomes |
|---|---|
| shared attributes, extra definition keys | declarations |
| preprocess tags, `prepare` stages, presentations, template tags | registries |
| file roots, host values, error presentation | callbacks (`files`, `values`, `presentFinding`) |
| wrapper around a rune or slot | middleware (section 12) |
| deferred definitions | an API (`transform` returns placeholders; the host calls `expand`) |

Two callbacks are new: `translate` and `icon`.

## 12. Middleware

*Added 2026-11-13*, replacing the earlier `wrapShape` and `wrapSlot` sketch.

**What the wrappers were for, and what is left.** They came from four problems; two are now
solved another way.

| Problem | Where it came from | Still needs it? |
|---|---|---|
| Dimensions reach the output even if a component ignores them | ADR-049 decision 2: the engine draws the root | no: dimensions are in the shape node, bindings map them, coverage reports gaps (`dimension-unsupported`) |
| Refrakt's engine root and background layers | `bg` builds its own layers inside the root | yes, but only refrakt |
| Dimensions aimed at a part (`frame` on media) | the engine applies them to the slot | no: the node says where a part dimension goes (below) |
| A library cannot express a dimension (`width`) | K3 | sometimes, as a binding's own option (below) |

What remains is cross-cutting work on every shape, whatever draws it: editor hints, source line
numbers, error boundaries, hydration boundaries, instrumentation, refrakt's engine root. Most of it
adds no element, so "wrapper" was the wrong word: it is **middleware**.

**One concept, two hook points**, as a Vite plugin implements whichever hooks it needs:

| Hook | Receives | Changes children? | Framework-specific? | Examples |
|---|---|---|---|---|
| `node` | the shape node (data), before rendering | yes, freely | no | edit hints, source lines, lazy-loading images, dropping draft content in production |
| `render` | the node and `next()`, during rendering | only by passing a changed node to `next()` | yes | error boundaries, hydration islands, instrumentation, refrakt's engine root |

```ts
const sourceLines = defineMiddleware({
  name: 'source-lines',
  node: (node, ctx) => annotate(node, { 'source-line': node.source.line }),
});

const errorBoundary = defineMiddleware({
  name: 'error-boundary',
  render: (node, next, ctx) => <ErrorBoundary fallback={<Plain node={node} />}>{next(node)}</ErrorBoundary>,
});
```

Changing children belongs in `node`: plain data, testable, the same in every renderer including
the HTML one. Changing rendered output after the fact (React elements, Vue VNodes) is fragile and
per framework, so `render` is kept for what only a framework can do. The name `middleware` fits
because it processes what passes through, as Express middleware may change a request and call
`next`; "around" suggested wrapping only.

**Context decides which middleware runs.** Marquise puts a `mode` in the context, with
conventional values `production`, `development`, `editor`, `preview` (hosts may add their own):

```ts
middleware: [
  sourceLines({ when: ['development', 'editor'] }),
  editHints({ when: 'editor' }),
  errorBoundary(),
],
```

`node` middleware runs at render time, not transform time, so one transformed tree serves every
mode, and the cached shape node never holds editor or dev annotations.

**How `node` middleware walks the tree:**

- called once per shape node, parents before children, so a parent can pass information down;
- inside a shape it may change anything that is not a nested shape: attributes, slot content,
  plain elements; nested shapes get their own call;
- it may visit plain elements across the tree with a selector, as a rehype plugin does:
  `visit: { img: (el) => ({ ...el, attributes: { ...el.attributes, loading: 'lazy' } }) }`,
  generalising today's render-time element overrides;
- it may not change a shape's contract: no undeclared slots or attributes, so a component never
  receives props its types do not mention.

**Annotations** are what middleware adds that is not a shape attribute (edit hints, line numbers):
a separate field on the node, written out as `data-*`. Reaching a component's DOM differs per
framework:

- **Vue** passes undeclared attributes through to a single-root component's root element, so
  annotations just work;
- **React and Svelte** have no fallthrough: the component spreads `rootProps` from `useMarquise()`
  on its root, or the renderer adds a `display: contents` wrapper, acceptable in editor and dev
  modes since it never runs in production;
- the plain presentation writes them on its root.

**Part dimensions travel in the node** instead of through a slot wrapper:

```json
"dimensions": { "tone": "warning", "frame": { "value": "polaroid", "on": "media" } }
```

A binding maps `frame` onto whatever draws the media, a component applies it itself, and the plain
presentation writes `data-frame` on the `media` slot wrapper.

**A library that cannot express a dimension** gets a wrapper from its binding, for that shape
only, declared and visible in coverage:

```ts
hero: { component: UPageHero, props: { /* … */ }, wrapper: { dimensions: ['width', 'spacing'] } }
```

**Rules:** `render` middleware calls `next()` exactly once; adding an element is an explicit choice,
never a default (extra elements break grid and flex children, child selectors and `ul > li`); the
site's middleware runs outermost, then kits in config order; output is the same on server and
client, or hydration fails.

**What this replaces:** `wrapShape` becomes `render` middleware; `wrapSlot` disappears (slot changes
are `node` middleware); element overrides stay, but plain element changes can move to `node`
middleware; refrakt's engine root is `render` middleware refrakt registers.

## 13. Islands and images

*Added 2026-11-13.* Both are solved and opinionated, so the principle holds: Marquise provides the
plug points, the host's framework does the work. Each splits into facts that belong to the content
and facts that belong to the presentation.

**What refrakt does today:** an `asset:` scheme that indirects image sources through project config
(SPEC-115) and custom image schemes (`placeholder`, `icon`; `lib/image-schemes.ts`), but no
resizing, `srcset` or format conversion; and an Astro adapter that includes the behaviours script
only on pages with interactive runes (`packages/astro/src/behaviors.ts`), island thinking at page
level.

**Hydration islands.** Astro renders every component to HTML and hydrates only components marked
with a `client:` directive (`load`, `idle`, `visible`, `media`, `only`). Next has React Server
Components with `'use client'` boundaries; recent Vue and Nuxt have lazy hydration strategies;
Svelte has no built-in partial hydration as far as known.

- **Whether something hydrates is a fact about the component, not the shape.** One theme's hero
  is a carousel, another's is static. So it belongs to the component or binding:

  ```ts
  calculator: { component: PriceCalculator, hydrate: 'visible' },
  hero:       { component: Hero },
  ```

- Marquise provides a `hydrate` option (`load`, `idle`, `visible`, `none`; absent means the
  framework's default); each renderer translates it into its framework's mechanism, and says so
  where there is none.
- The shape node is already right for islands: props must serialise from server to client, and the
  node is plain data for that reason (ADR-049 decision 8).
- Shapes with no component render as plain HTML, so a page of content alone ships no JavaScript.
- Refrakt's behaviours are the plain-DOM version: load a behaviour's script only when its shape is
  present.

**Images.** Astro's `astro:assets` (`<Image>`, `getImage()`), `next/image` and Nuxt Image
(`<NuxtImg>`) resize to several widths with `srcset` and `sizes`, convert to WebP or AVIF, set
`width` and `height` against layout shift, and lazy-load with priority for the main image.
Marquise builds none of it, but sorts the facts by who knows them:

| Fact | Who knows it | Where it lives |
|---|---|---|
| The image, alt text, caption, credit | the author | the content: `![alt](src)` |
| Focal point (what stays visible when cropped) | the author: it is about what the photo shows | an attribute on the image; refrakt has `anchor` on frame presets |
| Width, height, available formats | the asset pipeline | resolved at transform time, carried in the node |
| `sizes` (displayed width per breakpoint) | the presentation: a hero's media is full width, an avatar 64px | the component or binding |
| Priority (eager loading for the main image) | the presentation and the page position | the binding, or middleware that knows the first shape |
| Output formats, quality | the host | the host's image tool configuration |

Marquise's plug points:

1. **An asset callback at transform time**, `resolveAsset(src, ctx) => { src, width, height, … }`,
   filled by the host (an Astro integration calls `getImage()`; a Vite setup imports the file).
   It sits beside `files`; refrakt's `asset:` scheme is a candidate to graduate into it.
2. **An image element override per renderer**, delegating to the host's component (`<Image>`,
   `<NuxtImg>`, `next/image`).
3. **Presentation hints in bindings and components**, for example
   `slots: { media: { images: { sizes: '(min-width: 1024px) 50vw, 100vw', priority: true } } }`,
   reaching the image override through render context: the component placing a slot knows its
   size; the images inside it do not.
4. **Default policies as middleware**: lazy loading everywhere except images in the first shape on
   a page, `node` middleware with tree position (section 12).

And one finding for core: **`image-alt-missing`**. Alt text is the author's job and part of the
content's meaning.

**Astro is a natural home** (*agreed 2026-11-13*). It is content-first, renders React, Vue, Svelte
and Solid components side by side, has islands, an image pipeline, content collections (a corpus
layer in this document's terms), and **official Markdoc support** (`@astrojs/markdoc`), so its users
already know the format and stand to gain most from typed shapes. Marquise stays framework-neutral,
but Astro gets extra consideration:

- *Decided:* **the Marquise docs site is built with Astro** (SPEC-199's order said "built with
  refrakt"; updated there);
- Astro is a strong candidate for the proof project in SPEC-199's order, alongside the Nuxt UI kit
  idea;
- how Marquise relates to `@astrojs/markdoc` is open (I5).

**Stack**

- S1. Corpus layer branding: part of Marquise's family (`@marquise/corpus`), or its own package?
- S2. Should a design language be a separate package from any theme, so Lumina is one
  implementation among several?

**Kits and bindings**

- K1. The name "kit".
- K2. Where bindings live: a TypeScript file whose body is plain data, or a data file with
  component references resolved by the renderer?
- K3. Dimensions a library cannot express on one component (`width`, `spacing`): an optional
  wrapper element the binding asks for?
- K4. How two kits combine when they overlap: precedence rules, explicit choice in config?
- K5. Interaction contracts with a bound library: a test run against output, or trust?

**Dimensions**

- D1. Values not from a list (ratios, numbers): enums and presets only in a first version, typed
  formats later?
- D2. Dimensions that belong together (`tint` and `tint-mode`): one dimension with a
  sub-attribute, or two linked files?
- D3. Responsive values (`density="compact"` on small screens only): a kit concern, or room in
  the format?
- D4. The `provides` vocabulary: declared by the design language, so capabilities mean the same
  across kits?

**Presets**

- P1. Should the shape node record that expanded values came from a preset (useful for the
  editor, noisier node)?
- P2. Where token names are declared (the tokens contract), so `token` fields can be checked.
- P3. Are whole-theme presets (`tideline`) presets of a dimension at all, or a site-level choice
  of all tokens at once? Hunch: the latter.

**Behaviours**

- B1. Write the headless logic, or build on an existing headless library?

**Tags that are not shapes**

- T1. *Answered 2026-11-13:* no `t` for content authors; content is translated as whole
  documents (section 10).
- T2. *Answered 2026-11-13:* the host bridge is the only mechanism; Marquise ships no engine
  (sections 10, 11).
- T3. Placement rules for primitives: "only templates may place this" is the first; refrakt also
  has `requiresParent` ("only inside X"). Do placement rules belong on shapes generally?
- T4. Icon sets: a lookup tag, or an open dimension with presets? *Leaning 2026-11-13:* a lookup
  callback (`icon`), plus a manifest field for kits that ship sets.

**Extension points**

- H1. Lookups that must resolve without a framework (static HTML export, the plain presentation):
  the HTML renderer calls the same `translate`; confirm for every output path.
- H2. Translated attribute values (an `aria-label`, a `summary` a template sets): a lookup node
  inside an attribute value needs support in each renderer.
- H3. Lookups in structured data: JSON-LD is built at transform time, so a translated label there
  needs transform-time translation, or structured data stays in the source language.

**Middleware**

- W1. What `node.source` holds: a line, a range, or a file and range. It matters for SPEC-198's
  `source()` too, and for included content, whose file is not the page.
- W2. Typed annotations (`edit-hint`, `source-line`) so the editor knows what it reads, or free-form
  `data-*` names with conventions?
- W3. The React and Svelte fallthrough gap: tell kits to spread `rootProps` on every component as a
  rule, with `marquise check` warning when one does not?
- W4. Can middleware add whole shapes (an editor's "add block here" between shapes)? A structural
  change, which may need its own deliberate API.

**Islands and images**

- I1. Author-level image attributes: Markdown has no place for a focal point. Markdoc annotations
  on images (`{% focus="top" %}`) may work if Markdoc supports annotating image nodes (to check);
  otherwise the image goes inside a small shape.
- I2. Should authors override `hydrate` per instance (`{% calculator hydrate="load" %}`)? Probably
  not, as it is a performance decision, but a calculator at the top of a page might want it eager.
- I3. Images inside slots a component places: does render context reliably reach them in every
  framework, or do some renderers need hints passed down explicitly?
- I4. Other media (video, audio, embeds) have similar facts (poster, captions file, preload):
  same pattern, or later?
- I5. Marquise and `@astrojs/markdoc`: build on its config (`markdoc.config.mjs` with tags and
  nodes), so existing Astro Markdoc users adopt incrementally, or ship a separate Astro
  integration that replaces it? Incremental adoption argues for the first.

## 15. Next topics

- The Astro integration and `@astrojs/markdoc` (I5).
- How kits combine when two overlap (K4).
- The tokens contract (P2).
- Interaction contracts as tests (K5, B1).
