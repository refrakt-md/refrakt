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
- how Marquise relates to `@astrojs/markdoc` is open (I5): see section 14.

## 14. Integration packages

*Added 2026-11-13.*

### The Astro integration and `@astrojs/markdoc` (I5)

Read from the docs source on GitHub (`withastro/docs`,
`src/content/docs/en/guides/integrations-guide/markdoc.mdx`), since the live docs site was not
reachable from the session; `@astrojs/markdoc` 2.1.4.

**What it offers:** a `markdoc.config.mjs` with `defineMarkdocConfig({ tags, nodes, functions,
variables, extends })`, accepting "all Markdoc configuration options"; presets through `extends`
(as `shiki()` and `prism()` ship); tags rendering `.astro` components via
`render: component('./src/components/Aside.astro')`, attributes as props and **children in the
default slot only**; framework components only through a hand-written `.astro` wrapper with a
`client:` directive ("Tags and nodes are restricted to `.astro` files"); an overridable `image`
node receiving Astro's `ImageMetadata` for local images; Markdoc's own `{% partial %}`; variables
on `<Content />` or in config; `ignoreIndentation` (refrakt's SPEC-170 equivalent); `.mdoc` files
in content collections only. **Not documented:** a hook over the AST before the transform, or tag
schemas with their own `transform`.

| Marquise needs | On `@astrojs/markdoc` |
|---|---|
| Shapes resolving their content model | probably: a tag's `transform` receives the AST children, as refrakt's `createContentModelSchema` does; undocumented, so a spike confirms it |
| Named slots | not directly (default slot only), but see the host component below |
| Hydrated framework components | needs `.astro` wrappers, which can be generated |
| Images | already solved: `resolveAsset` is Astro's |
| Indentation-tolerant parsing | already there (`ignoreIndentation`) |
| `include` and `data` before the transform | missing: no pre-transform hook, and `partial` resolves too late for content models |
| Findings in the build | unclear; Marquise's CLI and language server work regardless |

**Two tricks:**

- **One host component for every shape.** Each shape's transform returns the shape node as one
  prop to a generic component, `component('@marquise/astro/components', 'Shape')`, which runs
  Marquise's Astro renderer: bindings, named slots (`<Fragment slot="headline">`), middleware,
  nested shapes. The default-slot limit stops mattering; the node being plain data makes it work.
- **Generated wrappers for hydration.** Astro needs static `client:` directives; Marquise knows each
  component's `hydrate` option from the bindings, so the integration generates the wrappers at
  build time into a cache directory. `hydrate: 'visible'` just works, an improvement over plain
  `@astrojs/markdoc`.

**Options:** (A) a preset for `@astrojs/markdoc` (`extends: [marquise()]`): users keep `.mdoc`,
content collections, `render()` and `<Content />`, and adopt one shape at a time, but `include` and
`data` inside shapes fall short; (B) a separate integration replacing `@astrojs/markdoc`: full
control, but a migration and two Markdoc configurations; (C) **A first, then propose a small
pre-transform AST hook upstream**, with B as the fallback if it is not accepted. *Leaning C*
(2026-11-13). The Astro-built docs site is the first real user.

**Spike before committing:**

1. a tag schema with its own `transform` runs in `@astrojs/markdoc` and receives the AST children;
2. a shape node passed as a prop reaches the host component intact, and named slots render from it;
3. generated wrappers in a cache directory are picked up by the build, with working hydration;
4. how Markdoc validation errors from tags surface in `astro build` and `astro dev`.

### Renderers and integrations

Refrakt already splits renderer packages (`react`, `vue`, `svelte`) from adapters (`sveltekit`,
`next`, `nuxt`, `astro`, `eleventy`, `html`). For Marquise the second kind is much thinner: no
routing, no layouts.

| Kind | Does | Depends on | Example |
|---|---|---|---|
| Renderer | turns a shape node into one UI framework's output: bindings, components, context, `render` middleware, element overrides | the UI framework | `@marquise/vue`, for any Vue app: Vite, VitePress, Nuxt |
| Integration | wires Marquise into a meta-framework: config and kits, build transform, reload on shape changes, types in dev, and the framework's images, hydration and i18n plugged into Marquise's callbacks | the meta-framework, plus a renderer | `@marquise/nuxt`: components registered, `resolveAsset` to Nuxt Image, `translate` to Nuxt i18n, `hydrate` to Vue's lazy hydration |

So Vue and Nuxt get a package each: `@marquise/vue` for any Vue project, `@marquise/nuxt` a small
module on top.

**A shared base, `@marquise/vite`:** most meta-frameworks are Vite-based (Astro, Nuxt, SvelteKit,
React Router, SolidStart, plain Vite); Next is the main exception. The plugin loads shapes,
dimensions and kits as a virtual module, reloads on change and regenerates types; integrations add
only what is framework-specific. Refrakt has done similar work (`site-tokens-vite.ts`,
`content-hmr.ts`).

**Content sources differ:** Astro has content collections and `@astrojs/markdoc`; Nuxt has Nuxt
Content with its own MDC syntax (not Markdoc, as far as known), so Nuxt users are not yet Markdoc
users; Next and SvelteKit have no content layer, so the integration offers a minimal loader or
works beside libraries such as Velite.

**Astro is different:** one page can mix frameworks. `@marquise/astro` hosts the UI renderers
rather than replacing them (the generated wrappers import `@marquise/react`, `vue` or `svelte` per
binding); static shapes render through the `.astro` host without hydration; bindings may point at
components from different frameworks in one project, and the binding format should allow it.

| Tier | Packages | When |
|---|---|---|
| Core | `marquise`, `@marquise/cli`, `@marquise/language-server` and VS Code extension, `@marquise/test` | 1.0 |
| Renderers | `@marquise/html`, `@marquise/react`, `@marquise/vue`, `@marquise/svelte` | 1.0 (refrakt has the last three) |
| Build base | `@marquise/vite` | 1.0 |
| Integrations | `@marquise/astro` | 1.0 (docs site, proof project) |
| | `@marquise/nuxt`, `@marquise/next`, `@marquise/sveltekit` | after 1.0, thin, one at a time |
| Add-ons | `@marquise/schema`, `@marquise/data`, later `snippet`, `compose` | as SPEC-199 plans |
| Not first-party | kits, Solid, Preact, Qwik, Eleventy, the editor | community, or later |

**Guards:** integrations stay thin (anything not framework-specific belongs in `@marquise/vite` or
core, or they drift apart as refrakt's adapters did, SPEC-058); every first-party package needs a
real user, so Nuxt, Next and SvelteKit come one at a time, driven by demand.

## 15. The HTML renderer

*Added 2026-11-13.* Without refrakt's engine, a bare HTML renderer would output only the plain
presentation: styleable with CSS, but with a fixed structure. It need not stay that limited, and
no plugin API per templating engine is needed; it is enough to decide what a "component" is with
no UI framework.

**Components are functions that return HTML:**

```ts
import { html, defineHtmlRenderer } from '@marquise/html';

const Hero = ({ headline, blurb, actions, eyebrow }) => html`
  <section class="hero">
    ${eyebrow && html`<p class="hero__eyebrow">${eyebrow}</p>`}
    <h1>${headline}</h1>
    ${blurb && html`<p>${blurb}</p>`}
    <div class="hero__actions">
      ${actions?.map((a, i) => html`<a class=${i === 0 ? 'button primary' : 'button'} href=${a.href}>${a.label}</a>`)}
    </div>
  </section>`;

export default defineHtmlRenderer({ components: { hero: Hero } });
```

- **The `html` tagged template escapes by default.** A `text` field (`eyebrow`) is a string and is
  escaped; slot content arrives as already-rendered, trusted HTML and is inserted as is. This
  contract is what keeps content from becoming an XSS hole.
- **Any templating library fits inside the function** (Handlebars, Nunjucks, Liquid, Eta, EJS):
  compile, then call with the props. "A function that returns HTML" is the common denominator, so
  no per-library plugin. It suits Eleventy users, who already write Nunjucks or Liquid; an Eleventy
  integration could register those templates as shape components.

  ```ts
  const tpl = nunjucks.compile(readFileSync('hero.njk', 'utf8'));
  const Hero = (props) => html.raw(tpl.render(props));   // the template must escape its own output
  ```

- **JSX without a framework** fits the same contract, through libraries that render JSX to
  strings.

**Custom elements as a binding target.** Shape slots map almost one to one onto native web
component slots:

```ts
callout: {
  element: 'wa-callout',
  attributes: { variant: { from: 'tone', map: { danger: 'danger' } } },
  slots: { icon: 'icon', default: 'body' },   // <span slot="icon">…</span>
}
```

The renderer writes `<wa-callout variant="warning"><span slot="icon">…</span>…</wa-callout>`, and
the browser does the rest. That opens framework-free component libraries (Shoelace or Web Awesome,
a team's own Lit components) as kits, as Nuxt UI is for Vue, interactive without a hydration step
because custom elements upgrade themselves. Refrakt is halfway there: its chart, map, diagram and
sandbox runes render as custom elements (`rf-chart`, `rf-map`…). (`wa-callout` and its attributes
are illustrative, from memory.)

**What this settles:**

- the plain presentation is what `@marquise/html` renders for a shape with no component bound
  (answers N3);
- refrakt's engine becomes a presentation plugged into `@marquise/html`, and into other renderers
  through `render` middleware: one more way to render shapes, not something Marquise imitates;
- `@marquise/compose` templates are the Markdoc-native option, later.

So the HTML renderer offers four ways to draw a shape, simplest to richest: the plain presentation,
functions (any templating library inside), custom elements, and later Markdoc templates. Behaviour
for the first three comes from custom elements or the plain-DOM binding of the headless interaction
logic (section 8).

## 16. Seams not yet discussed

*Added 2026-11-13*, to walk through one at a time. The first three matter before 1.0; the last
three are smaller but easy to get wrong.

**Z1. Markdoc itself.** Marquise is built on Markdoc's parser, AST and transform. Refrakt already
wraps parsing (`parse`, SPEC-170), but Markdoc's types (`Node`, `Tag`, schemas, `Config`) leak
everywhere, so Marquise's public API would inherit Markdoc's release pace and decisions. Keep
Markdoc an implementation detail: Marquise exposes its own types (the shape node, a document type,
findings), never Markdoc's, so a fork or patched parser stays possible. Markdoc's recent release
activity is worth checking.

*Explored 2026-11-13: other formats, and Comark.*

**The family.** Several formats express "a named block, with attributes, containing Markdown":

| Format | Block | Inline | Named parts | Attribute types | Logic | Ecosystem |
|---|---|---|---|---|---|---|
| Markdoc | `{% callout type="warning" %}…{% /callout %}` | `{% badge %}New{% /badge %}` | none; Marquise infers them | typed literals | `if`, variables, functions | markdown-it; Astro's official integration |
| MDC / Comark | `::callout{type="warning"}…::` | `:badge[New]{color="green"}` | explicit: `#title` | strings, plus `:prop` for JSON values | none known | Nuxt Content, Nuxt UI prose components; Comark is framework-neutral |
| Generic directives (`remark-directive`, a CommonMark proposal) | `:::callout{type=warning}…:::` | `:abbr[HTML]{title="…"}` | none | strings | none | remark / unified; Docusaurus's `:::tip` |
| Pandoc fenced divs, Djot | `::: {.callout type=warning}` | `[text]{.class}` | none | strings | none | Pandoc, Djot |
| MyST | a fenced `{note}` directive with options | `{role}` text | options and body | typed options | none | Jupyter Book, Sphinx |
| MDX | `<Callout type="warning">…</Callout>` | JSX | props, children | JavaScript | full JavaScript | React, Astro, Next |

Shortcodes (Hugo, Jekyll's Liquid) and fixed-vocabulary alerts (GitHub's `> [!NOTE]`, Obsidian's
callouts) are relatives, less relevant. (MDC, directive and MyST details are from memory except
where the Comark notes below cite a source.)

**MDC is being replaced by Comark.** The `nuxt-content/mdc` README now opens: "`@nuxtjs/mdc` is
being deprecated in favor of Comark. Comark is the successor to MDC — it is faster, AI-friendly,
and no longer bound to Vue or Nuxt"; existing MDC files stay compatible. From Comark's README (npm
registry; comark.dev was not reachable): "an open-source Markdown parser and renderer with
components, attributes and plugins. It streams AI output to React, Vue, Svelte, Angular, HTML and
the terminal"; version 0.9.2 published 2026-11-12, MIT; parses into "a compact, serializable
document" (`['tag', props, ...children]`), "parse once on the server, send the serializable
document to the client, render without re-parsing"; packages `comark`, `@comark/vue` (with a Nuxt
module), `@comark/react` (Next.js, Server Components), `@comark/svelte`, `@comark/angular`,
`@comark/html`, `@comark/ansi`; built on markdown-exit (a TypeScript rewrite of markdown-it);
closes unfinished syntax while AI output streams; plugins (Shiki, KaTeX, Mermaid). The README shows
no content models, typed shapes, validation of a component's content or generated types.

**What this means for the seam.** Marquise's core (content models, shapes, validation, dimensions,
kits, the shape node) works on "a named block with attributes and Markdown children" and does not
depend on syntax. So: **a syntax front end produces Marquise's own document tree, and everything
after it is syntax-neutral.** Markdoc is the first front end. Differences to reconcile if there are
more:

- explicit named parts (`#title`) versus inferred ones: map them onto fields as an explicit
  alternative to matching, possibly useful for Marquise in any syntax (Z1b);
- attribute types: shapes' declared types convert values from strings, so validation is unchanged;
- logic: only Markdoc has `if`, variables and functions; features relying on them work only through
  the Markdoc front end, or through Marquise's own expressions;
- dialect details: CommonMark and GFM differences, indentation rules (the MDC README warns that
  indentation inside a component can break slot detection).

**How Comark relates.** It overlaps on rendering (a serializable tree, renderers for React, Vue,
Svelte, Angular and HTML, plus things not planned for Marquise: a terminal renderer, streaming AI
output). It does not appear to have what is distinctive about Marquise (content models, typed
shapes, validation, kits, schema.org), so Marquise could be the typed layer working with Comark's
syntax and renderers rather than building its own. Nuxt UI's prose components use MDC syntax, so a
Nuxt UI kit for a Markdoc-only Marquise would ask Nuxt users to change syntax; Astro's world uses
Markdoc, Nuxt's is moving to Comark, and two front ends would cover both.

**Suggested:** not several syntaxes in 1.0 (the scope growth that slowed refrakt), but Z1 designed
for it: Marquise's own tree and shape node, Markdoc as the first front end, nothing after parsing
that knows about Markdoc. Look at Comark seriously before building renderers (deep dive below);
perhaps contact its maintainers, as the projects look complementary. Caveat: Comark is at 0.9,
released the day before this was written, and only its README had been read at this point.

#### Deep dive: Comark (2026-11-13)

**Sources:** Comark's repository (`comarkdown/comark`, cloned at its 2026-11-13 head), its docs
source (`docs/content/`), the npm registry, and a spike running `comark@0.9.2` on sample content
(scripts kept outside the repository).

**Maturity and backing.**

| | Markdoc | Comark |
|---|---|---|
| Version | 0.5.12 (2026-11-10) | 0.9.2 (2026-11-12) |
| Release activity | steady through 2026: 0.5.5 (March) … 0.5.12 (November) | first published 2026-02-13; 21 versions; 0.7 → 0.9 between September and November |
| Backing | Stripe | NuxtLabs people among recent committers (Farnabaz, Sébastien Chopin, Daniel Roe); MDC's successor |
| Licence | MIT | MIT |

Both are pre-1.0, so neither promises a stable API yet. Markdoc is not abandoned.

**Comark's own comparison** (`docs/content/11.compare/4.comark-vs-markdoc.md`) is candid:

- shared philosophy: "Markdown is data, components are declared in plain text"; both reject MDX's
  "compiling content into code";
- **"Schema validation of tags: No, components validate their own props"**; "Comark has no schema
  layer"; "A schema layer like Markdoc's is not currently provided"; "For large documentation teams
  that need to enforce content structure editorially, Markdoc's validation layer is a genuine
  advantage";
- variables: bindings via `:prop` and `{{ path }}`; partials "handled in application code";
- syntax lineage: the CommonMark generic directives proposal, and five years of MDC.

**What Comark is, from its docs:**

- **Document:** `{ frontmatter, meta, nodes }`, nodes as tuples `[tag, attributes, ...children]`,
  strings for text; HTML-like tag names (`h1`, `p`, `ul`, `img`), components by name; an optional
  `$` field with parser metadata. Serialisable: parse on the server, render anywhere.
- **Syntax:** block `::name{…}…::`, nesting with more colons, inline `:name[content]{…}`, attributes
  `{prop="v" bool #id .class}`, JSON values via `:prop='…'`, YAML props blocks inside a component
  (`---` or a `yaml [props]` fence) with real types, named slots `#name` (parsed into
  `['template', { name }, …]`).
- **Plugins:** `pre(state)` on the raw string and **`post(state)` on the built tree**, typed
  contributions to `meta`; markdown-it plugins accepted; a `visit()` AST utility.
- **Data binding:** `:prop` values are JSON, or dot paths into `frontmatter`, `meta`, `data`,
  `props` (paths, not arbitrary JavaScript); `{{ path }}` interpolation; conditionals as an
  `::if{:value="…" gte="18"}` component with an `#else` slot.
- **Security plugin:** blocks event handlers, dangerous attributes and protocols, tag allow and
  block lists, image and link prefixes.
- **Renderers:** Vue (with a Nuxt module), React (Next, Server Components), Svelte, Angular, HTML,
  ANSI; a `components` map; React gets named slots as `slot{Name}` props, Vue as named slots; a
  `transformNode` hook to change an element's tag or props at render time; examples for Astro (with
  the React renderer and content collections), Next, Nuxt, SvelteKit, VitePress.
- **Round trip:** `renderMarkdown(document)` serialises a tree back to Comark Markdown.
- **Streaming:** `autoCloseMarkdown` completes unfinished syntax for AI output.
- **Source positions:** limited; the `$` field carries a line for some nodes, not ranges.

**Spike results** (running `comark@0.9.2`):

1. **Refrakt's hero content parses with everything a content model needs.**
   `::hero{align="start"}` with image, `---`, eyebrow, heading, blurb and list became
   `["hero",{"align":"start"},["p",{},["img",…]],["hr",{}],["p",{},"New in 2.0"],["h1",…],["p",…],["ul",…]]`.
   Matchers map directly: heading → `h1`–`h6`, paragraph → `p`, list → `ul`/`ol`, image → `img`
   inside `p` (as refrakt's `imageInParagraph`), `hr` → the delimiter, a component → its name.
2. **Indented nested components parse** (`:::card` indented inside `::grid`).
3. **Markdoc syntax is not understood, and its tag lines vanish silently**: `{% hint type="note" %}
   Hello {% /hint %}` parsed to `["p",{},"\nHello\n"]`. Moving Markdoc content needs a conversion.
4. **Named slots** parse to `template` nodes, and `renderMarkdown` writes them back.
5. **A Marquise content model fits as a `post` plugin.** A toy `hero` plugin (about 20 lines)
   turned the inferred fields into Comark's explicit form: props `eyebrow="New in 2.0"` and
   `:actions='[{"label":"Get started","href":"/docs"},…]'`, slots `#media`, `#headline`, `#blurb`.
   `renderMarkdown` printed it as valid explicit Comark. Any Comark renderer then hands a component
   typed props and named slots, so **on Comark, Marquise would need no renderers of its own**: its
   output is Comark's explicit form.

**Questions this settles or sharpens:**

| Question | Markdoc | Comark |
|---|---|---|
| Does Marquise's niche exist? | partly: Markdoc validates attributes and children, but has no content models | **clearly**: Comark says it has no schema layer; content models, shapes, validation and types are exactly what is missing |
| Renderers | Marquise builds and maintains its own (react, vue, svelte, html) | **already exist**, more of them (Angular, ANSI), with streaming |
| Logic in content | `if`, variables, functions, partials | dot-path bindings and an `if` component; no arbitrary code, which suits the trust boundary (Z3) |
| Source positions | line ranges on nodes | limited; matters for `source()` (SPEC-198), the editor and the write path |
| Write path (Z5) | a formatter exists in Markdoc (from memory; to confirm) | `renderMarkdown` round-trips trees |
| Ecosystems | Astro's official integration | Nuxt (MDC's successor), with examples for Astro, Next, SvelteKit, VitePress |
| Refrakt's content | native | needs conversion; Markdoc logic does not convert |

**Options:**

- **A. Markdoc first** (the current plan), Comark later as a second front end.
- **B. Comark first:** Marquise is the typed content-model layer as a Comark plugin, plus tooling
  (validation, types, language server, kits); no Marquise renderers. Refrakt stays on Markdoc as
  the lab, or migrates later.
- **C. Both from day one**, with Marquise's renderers for Markdoc and Comark's for Comark: two front
  ends and two rendering paths, the scope growth to avoid.

**Leaning:** none recorded yet. B is attractive for Marquise's stated goals (stable, small, the
framework renderers already exist, the AI-streaming audience, a natural fit for a Nuxt UI kit),
with its costs: Astro's official Markdoc integration matters less (Comark runs in Astro through its
React renderer), Markdoc's logic and positions are given up, refrakt's content is Markdoc, and
Comark is younger and moving fast.

**To settle before choosing:**

- talk to Comark's maintainers: interest in a schema layer built on Comark, plugin API stability,
  plans for source positions;
- ~~a deeper B spike~~ *done 2026-11-13* (below);
- check Markdoc's formatter and position support, so A is weighed on the same terms.

#### The deeper B spike (2026-11-13)

`spike/marquise-comark/` (`FINDINGS.md` there has the details and how to run it). About 550 lines.

**Works:**

- **Refrakt's resolver runs unchanged** on Comark's tree through an adapter of about 100 lines
  (Comark tuples to Markdoc-shaped nodes and back); the spike imports the real
  `packages/runes/src/lib/resolver.ts`.
- **Shapes declared as files drive one generic Comark `post` plugin**; nothing is written per
  shape.
- **Its output is Comark's explicit form:** props (`align`, `mediaPosition`, `eyebrow`, `:actions`
  as JSON) and named slots (`#media`, `#headline`, `#blurb`, `#actions`); `renderMarkdown` prints
  valid Comark.
- **SPEC-200 works on this path:** `as: text` became a string prop, `as: inline` a slot of inline
  content, `from` filled each `href`.
- **Explicit slots mix with inference** (Z1b): an author's `#headline` filled the field directly.
- **Findings with lines:** `attribute-type-invalid`, `attribute-unknown`, `content-missing`,
  `content-unmatched`, `field-text-formatting-dropped` at `content/broken.md:3`.
- **Generated React prop types** follow Comark's conventions (`slotHeadline: ReactNode`, unions
  from `matches`, item arrays).
- **`@comark/react` renders** the bound component with typed props, and the plain presentation for
  an unbound shape.
- **Streaming:** with `autoClose`, slots and props fill in as content arrives.

**Gaps:**

1. an unregistered component loses its content in Comark (a bare `<hero>` element, slots gone,
   `[object Object]` attributes), so the plain presentation and `shape-unbound` are necessary;
2. positions exist only for components and only in the markdown-it tokens (`mdc_block_open` line
   maps); finer positions need a token-to-node mapping or positions in Comark's tree;
3. Comark props are JSON and renderables travel only as slots, so SPEC-200 D10's per-item
   `content` became one slot holding the whole list beside the data prop;
4. validation needs a streaming mode: a body not yet arrived was reported as `content-missing`;
5. printing the resolved tree rewrites the author's file into the explicit form, so a write path
   must edit the source form;
6. prop types are per renderer (React's `slot{Name}` props, Vue's named slots).

**Not tested:** Vue, Svelte and Angular renderers, the Nuxt module, nested shapes, performance, a
language server on Comark syntax, Markdoc logic on this path.

**What it settles:** option B is technically sound, and it keeps refrakt's resolver rather than
replacing it. What remains open is not feasibility but direction: Comark's maturity and pace,
positions (gap 2), and the conversation with its maintainers.

#### Markdoc through Comark's renderers (2026-11-13)

Also in `spike/marquise-comark/` (`npm run markdoc`). **Markdoc content can use Comark's renderers:**
Comark's docs call its document "the shared boundary between parsing and rendering", and its
renderers draw a document without running its parser. Shapes become Markdoc tag schemas whose
`transform` runs the same resolver on Markdoc's AST and returns Comark's explicit form; Markdoc's
renderable tree (`Tag { name, attributes, children }`) converts to Comark's tuples in about 15
lines. The same `Hero` component and plain `callout` rendered `content/home.mdoc` exactly as they
rendered the Comark version, with `{% $user.name %}` resolved.

That makes **two front ends, one tree, one set of renderers** plausible: Comark's document as
Marquise's tree (Z1's "own tree"), Comark's renderers, and Markdoc or Comark syntax in front. The
costly part (renderers) is shared and maintained by Comark; refrakt (Markdoc) and Marquise stay on
one tree, so graduation and the ladder survive. Caveats: Comark's document format becomes a
contract Marquise depends on, and Comark is pre-1.0; Comark features that run while parsing
(markdown-it plugins: highlighting, table of contents) do not reach Markdoc content; writing back
(`renderMarkdown`) produces Comark syntax; typed props use Comark's `:`-prefixed JSON.

**If Comark were chosen, the plan otherwise mostly stands.** Unchanged: shapes, content models,
SPEC-200, validation, types, tooling, dimensions, presets, kits, schema, data, the trust boundary,
the stability rules. Changed: the syntax of examples (`::example{#id}`); the shape node becomes a
Comark component node in explicit form (dimensions need a convention, such as one `:dimensions`
prop); renderers become Comark's plus Marquise's plain presentation, bindings and per-renderer types;
`node` middleware maps onto Comark's `transformNode`, `render` middleware onto wrapper components;
lookups become inline components; `include` and `data` become plugins running before Marquise's;
positions get harder (gaps 2, 5); `@astrojs/markdoc` matters less; a Nuxt UI kit gets more natural;
streaming, the security plugin and more renderers come free.

#### Functions and variables (2026-11-13)

**What refrakt's content uses** (counted in `site/content`): variables are almost all loop variables
bound by row templates (`$row` 93, `$item` 29; `$page` 4, `$frontmatter` 2, build info 3); `if`
appears 42 times, many inside code examples, the real ones mostly `{% if $row.required %}` in
data-row templates; functions are formatting and comparison (`humanize` 4, `date` 3, `equals` 2,
`currency` 2, `number`, `join`; registered in `packages/runes/src/functions.ts`). So in refrakt
they serve **data-driven templating, not prose**.

**What Comark has:** `{{ path }}` interpolation and `:prop="path"`, dot paths into `frontmatter`,
`meta`, `data` (the renderer's runtime values) and `props` (the enclosing component's), never
arbitrary JavaScript; conditionals as `::if{:value="…" neq="guest"}` with comparison props and an
`#else` slot; **no functions**. Markdoc resolves variables while transforming, so values are baked
into the output; Comark resolves them **while rendering**, so the tree stays generic.

**Do we need functions?**

| Where | Needed? | How |
|---|---|---|
| Content written by authors | no general functions; authors should not compute, and the trust boundary (Z3) is simpler | formatting moves to components (`:date{:value="row.published"}`, or a typed prop formatted with the locale the component knows); comparisons are `if`'s props |
| Shape definitions (`computes`, SPEC-195) | yes, Marquise's own expression vocabulary in shape files | independent of Markdoc or Comark: it never appears in content syntax |
| Row templates (`@marquise/data`) and later templates (`@marquise/compose`) | loop variables and formatting, yes | Comark's binding covers loop variables (`row` passed as data); formatting through components; `if` with comparison props covers `$row.required` |

**Variables, by effect:**

- values that only display (`{{ user.name }}`, a version, a row's title) resolve **at render time**,
  as Comark does: the tree stays cacheable and personalisation works per request (the same choice as
  for lookups, H1–H3);
- values that change structure (an `if` around content inside a shape) must resolve **before the
  content model**. The spike showed the gap on Markdoc: without evaluating `if` first, `if`-wrapped
  actions disappeared silently. It is worse on Comark, whose `if` is evaluated at render time.

**Conditionals inside shapes, leaning:** conditionals outside shapes are free and resolve at render
time; inside a shape they are evaluated at transform time with host values (the `values` callback),
and an error is reported if a value is not available then (`conditional-in-shape`). Refrakt needs
the same check: its rune content appears to drop `if`-wrapped content silently today (only templates
handle `if`, SPEC-145 D30).

**For the Markdoc-or-Comark choice,** neither syntax's logic is decisive: definitions use Marquise's
own expressions, content barely needs logic, and row templates can be covered by either. What is
left is positions, maturity and which ecosystem matters more.

#### Explicit slots (2026-11-13)

Comark's named slots (`#title`) overlap with what Marquise's content models infer. **Keep them, as
the explicit form of what inference does.** Marquise's output already is explicit slots (the spike
turned inferred fields into `#media`, `#headline`, `#blurb`), so inference is the friendly surface
and explicit slots are what it compiles to, and the way to say it directly.

**Where explicit slots earn their place:**

1. **disambiguation:** an author wants a blurb but no eyebrow and writes it before the heading;
   inference would make it the eyebrow, `#blurb` says it outright;
2. **an unexpected order:** inference follows the model's sequence; a slot places a field anywhere;
3. **parts that cannot be inferred reliably** (a free-form footer region); such fields could be
   explicit-only;
4. **existing content and components:** MDC content and Nuxt UI's prose components already use
   slots; that content validates against shapes as written, so migration is gradual;
5. **machines writing content:** an editor, an AI or a codemod writing explicit form is unambiguous
   and survives round trips; streamed output is sturdier when each part announces itself.

**Rules:**

- a slot name must be a declared field, otherwise `slot-unknown` (catches `#headlin`);
- `#default` means "infer the rest": explicit slots fill their fields, default content goes through
  the content model for the remaining ones (as the spike did with `content/explicit.md`);
- explicit content is validated by what the field delivers (SPEC-200): for `inline` and `text`
  fields any single paragraph or heading is fine, since the element is declared meaningless; for
  `block` fields it must match the field's `match`, otherwise `slot-content-mismatch`;
- a field filled both explicitly and by inference is `slot-filled-twice`;
- neither form is canonical in source: `marquise format` never rewrites one into the other; the
  language server offers both directions as quick fixes.

**In the docs,** lead with inference ("your Markdown already has structure"), and present slots as
being explicit when you need to.

**On the Markdoc side,** the front end needs explicit slots too. Markdoc has, from memory, an
experimental slot syntax (its AST nodes carry a `slots` property); to confirm, with a
Marquise-provided tag as the fallback.

#### Compositions (2026-11-13)

**Three kinds of composition:**

| Kind | Who | Where | Example |
|---|---|---|---|
| Nesting in content | content authors | the page | a `::grid` of `::card`s; a `::hero` containing `::actions` |
| Template composition (`@marquise/compose`) | whoever defines shapes, often not a developer (a site owner, a content designer, a kit author) | a shape's definition file | a `pricing-plan` whose template places `section`, `price` and `feature-list` |
| Component composition | developers | framework code | a React `PricingPlan` rendering `<Section>`, `<Price>`, `<FeatureList>` |

Nesting works on Comark natively, and Marquise resolves nested shapes like any field. Template
composition is a new shape built from existing ones, in Markdown instead of code.

**Why template composition, when components can compose themselves:**

1. no code: someone who cannot write React can still define a shape from existing ones;
2. **it works with every framework and kit at once:** a composed `pricing-plan` renders through
   whatever the active kit provides for its parts; a component-composed one exists in one framework,
   and every kit needs its own copy. The strongest argument, and it grows with kits: a kit supplies
   the parts, compositions build richer shapes without another component;
3. themes rearrange it by overriding the template, without touching content or the definition
   (ADR-045, ADR-048);
4. tooling sees inside it: contracts, structured data, the editor and validation see the parts; a
   component's internals are opaque;
5. content stays portable.

Many teams will just write a component, which is fine; that is why `@marquise/compose` comes after
1.0, and compositions matter most once kits exist.

**On Comark** it works the same way, arguably more simply: expansion happens in Marquise's plugin on
Comark's tree (plain data); on Markdoc, on the AST before the transform. The output is the same
explicit Comark nodes. Order: expand the template, then resolve the content models of the shapes it
placed, then render each through its own component. A template is in effect a pre-written explicit
composition filled with the outer shape's fields, so inference, explicit slots and templates all end
in the same form. On Comark a template would naturally use Comark syntax and binding:

```mdc
::section{:align="attrs.align"}
:slot{name="eyebrow"}
:slot{name="headline"}

::actions
:slot{name="actions"}
::
::
```

**Template syntax, and the cost of two syntaxes** (*added 2026-11-13*). A first thought was that a
project picks one syntax up front, shapes conform to it, and sharing shapes across projects needs a
migration CLI. But both front ends produce the same tree, and expansion works on trees, so a
template written in Markdoc can be loaded into a Comark project as is, parsed by its own syntax
(known from its extension or frontmatter). **If Marquise ships both parsers, sharing is free; if it
ships one, sharing across syntaxes needs a migration CLI.** The extension can also decide the syntax
per file (`.md` for Comark, `.mdoc` for Markdoc, as Astro does), so a project can migrate gradually.

What a second syntax costs:

| Piece | Cost per syntax | Notes |
|---|---|---|
| Parser front end | small: about 100–300 lines | the spike: Comark ~300 (adapter, plugin), Markdoc ~100 (tag schemas, converter) |
| Resolver, validation, shapes, types, plain presentation, renderers | none | shared: everything after parsing sees one tree |
| Explicit slots | small | native in Comark; Markdoc's experimental syntax or a Marquise tag |
| Conditionals and variables | medium | different semantics and timing need equivalent behaviour and tests |
| Source positions | medium | native in Markdoc; token mapping in Comark (gap 2) |
| Formatter | medium | refrakt's is Markdoc's; Comark's `renderMarkdown` normalises |
| Language server | large | completions, hovers and diagnostics depend on recognising each syntax; refrakt's is Markdoc-only |
| Docs and examples | large, ongoing | every example twice, or tabbed |
| Tests | medium, ongoing | every feature against both |
| Migration CLI | medium | needed anyway if one syntax is dropped; tags convert mechanically, Markdoc's logic only partly |

**The runtime is cheap; tooling and docs are expensive.** Options:

1. one syntax plus a one-way migration CLI: cheapest; loses one ecosystem's users;
2. **a primary syntax with full tooling, the other accepted as input** (parsed, validated, rendered;
   no language server, formatter or docs of its own beyond one page), a migration CLI into the
   primary, shapes and templates shared freely: moderate cost, the runtime already proven;
3. both equal: only if both ecosystems prove to matter equally after 1.0.

*Leaning: option 2*, choosing the primary now and raising the secondary only on real demand. It keeps
the ladder between refrakt (Markdoc) and Marquise whichever is primary, and is reversible. Which is
primary depends on the conversation with Comark's maintainers and on whether Astro's Markdoc users
or the Nuxt and Comark ecosystem matter more.


**Z2. Content outlives shapes.** Content lives for years; shapes change (a field renamed, a content
model reorganised, a value retired). Vocabulary versioning covers dimensions, not shapes changing
under existing content. Shapes carry a version, and a breaking change ships with a content
migration that rewrites Markdown mechanically, run with something like `marquise migrate`. Refrakt
has thought about this (SPEC-189: a migration as a composition; codemods); for third-party shape
libraries, migrations must be a published part of a release.

*Explored 2026-11-13.*

**What refrakt learned** (SPEC-189, draft, "Why"): every codemod was hand-written and alike
(`refrakt migrate` has three: `elevation` value renames, `hero` `align="left/right"` to `start/end`,
`cta` renaming `call-to-action`); the runtime side repeats the same facts (a rename written as a
codemod, again as a runtime alias through `DeprecationRule`, and a third time as a warning, or
never); and "removed in a future minor" never happens (aliases from v0.20 and v0.23 still there at
v0.48). SPEC-189's answer: **one migration file, four uses.** Its frontmatter describes the old form,
its body is a template in the new form, and one expansion gives runtime acceptance (old content keeps
building), a codemod (the new form written back), a warning per instance, and an expiry (a test fails
once the migration outlives `removeAfter`). Renames and value maps are frontmatter only.

**Adapted for Marquise** (*leaning*):

1. **Two levels**, to fit the 1.0 scope: frontmatter-only migrations (renaming an attribute or field,
   mapping values) need no template language and can ship with 1.0; structural migrations need a
   template body and wait for `@marquise/compose`, with a small API for hand-written ones meanwhile.
2. **Shape libraries and kits ship their own migrations.** A breaking change is a major version of the
   library, with its migrations in the package. A site upgrades, keeps building with warnings, runs
   `marquise migrate`. `removeAfter` counts the library's own versions.
3. **No version stamps in content.** A migration applies when content matches the old form and not
   the new one (SPEC-189 D6), so content stays clean and content of unknown age still migrates.
4. **Dimension aliases are migrations.** `aliases` with `deprecated: true` (section 6) are
   attribute-value migrations under another name: one mechanism, one warning, codemod and expiry.
5. **Examples double as migration tests:** old example in, new example out (SPEC-197).

**Breaking, for content and for components separately:**

| Change | Breaks content? | Breaks components? |
|---|---|---|
| New optional field or attribute | no | no |
| Field or attribute renamed or removed | yes (migration) | yes (prop renamed) |
| Allowed values narrowed | yes | the type narrows, usually fine |
| Optional field made required | yes | the type changes |
| Content model reordered | maybe | no |
| A field's `as` changed (`block` to `text`) | no | yes: a slot becomes a string prop |
| New allowed value | no | maybe: an exhaustive `switch` misses it |

Migrations fix content; component breaks show up as TypeScript errors from the generated types.
**`marquise diff`** would compare two versions of a shape library and classify every change as
additive, content-breaking or prop-breaking, so an author knows whether a release is major and which
migrations it needs.

**The tie to Z1:** the codemod must write only what changed (SPEC-189 D7), which needs positions.
Markdoc has them; Comark has component lines (enough for attribute changes) but no ranges inside a
component, and `renderMarkdown` rewrites formatting (spike gap 5). Structural codemods are harder on
Comark today: one more reason positions belong in the conversation with its maintainers.

**Z3. The trust boundary.** "Content cannot run code" is a core argument against MDX, especially
with non-developer or AI authors, and only holds if every extension point respects it:

- content is untrusted: it may call registered functions and directives, never define code; raw
  HTML in content is off by default;
- directives reading files are bounded to declared roots; remote data needs an explicit allowlist;
- kits and shape libraries are code, trusted like any npm dependency, said plainly;
- escaping (`html.raw`, templating-library output, R2) is where the guarantee can quietly break.

State the boundary as a guarantee, and test it: hostile content (script tags, `javascript:` links,
attribute injection) through every renderer, none of it executing.

*Explored 2026-11-13.*

**Measured** (`spike/marquise-comark/`, `npm run hostile`; Comark 0.9.2, default settings):

| Input | Without Comark's security plugin | With it, default options |
|---|---|---|
| `<script>alert(…)</script>` | passes through both renderers; React's server output contains the tag verbatim, so it runs on load | still passes through |
| `<img onerror="alert(…)">` | the HTML renderer keeps `onerror`; React drops it with a warning | removed |
| `[click me](javascript:alert(…))` | not made a link (markdown-it refuses `javascript:` links) | same |
| a `javascript:` link in a hero's actions | same: no link, so the extracted `href` is empty | same |

Comark parses raw HTML by default, and its security plugin is a toolkit, not a policy: its documented
defaults are `blockedTags: []` and `allowedProtocols: ['*']`. Markdoc does not parse raw HTML, so it is
safer by default. Refrakt adds raw HTML only for specific runes (`sandbox`), under its security policy:
`trusted` by default, `strict` for hosted products (`packages/types/src/security.ts`).

**Proposal** (*leaning*):

1. **The boundary.** Trusted, treated as code and reviewed: shapes, kits, components, bindings,
   config, and the host values the host chooses to expose. Untrusted: content (authors, AI output, CMS
   entries, streamed text) and data files read by directives. Bindings such as `data.user` reach
   whatever the host passes, so the host passes only what content may see.
2. **Default to untrusted**, the reverse of refrakt's default, because of Marquise's audience
   (non-developers, AI, runtime content); `trusted` is an explicit opt-in for single-author sites.
3. **In untrusted mode Marquise configures the parser strictly:** raw HTML off, or a short allowlist;
   Comark's security plugin blocking `script`, `iframe`, `object`, `embed`, `style`, `link`, `base` and
   `meta`, allowing only `http`, `https`, `mailto`, `tel` and relative URLs, stripping event handlers.
   On the Markdoc path HTML is not parsed, and Marquise applies the same URL rules itself.
4. **Guarantees Marquise adds because it knows the shapes:**
   - only declared attributes reach a component: Comark passes any attribute through, so content could
     otherwise try `style` or `onClick`; `attribute-unknown` closes that for every shape;
   - typed attributes and fields: `type: url` is checked against the protocol allowlist, and so are
     values extracted from content (`extract: href`); React blocks `javascript:` links itself, but not
     every renderer does, and the HTML renderer does not;
   - bindings take dot paths only, refusing `__proto__`, `constructor` and `prototype`;
   - directives read only under declared roots, and fetch nothing remote unless allowlisted;
   - capabilities: a shape or directive that needs trust (raw HTML, a sandbox, remote data) declares
     `requires: trusted` and is disabled with a finding in untrusted mode, generalising refrakt's
     sandbox policy;
   - limits for runtime content (size, nesting depth, item count): content-model patterns are trusted
     but run on untrusted text, and a badly written one could be made very slow;
   - `@marquise/schema` escapes `<` in JSON-LD, so a title containing `</script>` cannot break out.
5. **Tested:** a hostile-content fixture through every renderer, in both modes; `marquise check` runs
   it through a kit's bindings too.

**Z4. Links, and the document itself.**

- `[Pricing](./pricing.md)` must become a site URL, and only the host knows its routes: a
  `resolveLink(href, ctx)` callback beside `resolveAsset`. Checking for broken links needs the
  corpus; rewriting them does not.
- Frontmatter is typed by content collections today (Astro uses schemas). A document's body could
  have a shape too ("an article starts with a heading, then a summary paragraph"); refrakt's plan
  entities are a shape wrapping a whole file. A **document shape** is a natural extension; decide
  whether Marquise or the content layer owns frontmatter.

*Explored 2026-11-13.* Refrakt's precedents: its loader maps files to routes (`<path>.md` and
`<path>/index.md` both resolve, `packages/content/src/edges/index.ts:122`); entity references go
through `ref` and `xref`; one fixed set of frontmatter fields serves every page (title, description,
slug, draft…, `site/content/_data/frontmatter-fields.json`); plan entities wrap a whole file in a
tag (`{% work … %}`).

**Links.** Four kinds appear in content:

| Kind | Example | Who resolves it |
|---|---|---|
| Absolute URL | `https://…` | nobody; checked against the protocol allowlist (Z3) |
| Site route | `/docs/install` | the host (whether it exists) |
| Relative file link | `[Pricing](./pricing.md)`, `../guide.mdoc#setup` | the host, which maps files to URLs |
| Entity reference | `{% ref "SPEC-1" %}` | the corpus layer (parked) |

*Leaning:* a `resolveLink(href, ctx)` callback beside `resolveAsset`, at transform time.

- the host maps files to URLs (Astro its collection entries, Nuxt Content its paths) and returns the
  URL or reports the target missing: `link-unresolved`, broken-link checking without a corpus;
- anchors within the same document Marquise checks itself, knowing the document's heading ids:
  `link-anchor-missing`; anchors in other documents need the host;
- links inside shapes go through it too: an extracted `href` and any `type: url` attribute, so
  `- [Pricing](./pricing.md)` reaches a component as `/pricing` (item extraction must use the
  resolved link);
- included content resolves relative to its own file, not the including page (SPEC-197 D5);
- with no host, links stay unchanged, so Marquise works standalone.

**The document itself.** Frontmatter: where the host has schemas (Astro's content collections),
Marquise defers to them; where it does not (Next, plain projects), a document shape can declare
frontmatter; if both exist, one is generated from the other rather than both written by hand.

A **document shape** is a shape for a whole document:

```md
---
description: A blog article
frontmatter:
  title:  { type: string }
  date:   { type: date, required: true }
content:
  type: sequence
  fields:
    headline: { match: heading:1, as: inline, fills: { title: $text } }
    summary:  { match: paragraph, as: inline }
    body:     { match: any, greedy: true }
---
```

- validation of the whole page ("an article starts with a heading, then a summary paragraph");
- typed page components: a blog layout bound to `article` receives `title`, `slotSummary`, `slotBody`
  with generated types, where a layout today gets untyped content;
- refrakt's "title falls back to the first heading" becomes declarative through `fills` (SPEC-182 D2);
- plan entities lose their wrapper tag: attributes in frontmatter, the body the document shape;
- structured data per page (an `Article` row) from the same place as every shape's.

On Comark a document is `{ frontmatter, nodes }`; a document shape treats the nodes as the children of
an invisible root shape, resolved by the Marquise plugin and rendered through a component in the
components map. On Markdoc, the same on the document's root node. A document gets its shape from
frontmatter (`shape: article`) or a host mapping by folder or collection, probably both with
frontmatter winning.

**Z5. A published schema, and a write path.** CMS editors (Decap, Tina, Keystatic), AI tools and
form builders need to know what a shape accepts. Export shapes and dimensions as a documented,
machine-readable schema (perhaps close to JSON Schema) as public API, so tools build on it, not on
internals. Tools that change content (an editor, an AI applying a fix, a codemod) need to edit a
document by address ("set the hero's `headline`") and write Markdown back without disturbing
anything else; source positions (W1) make it possible. Everything designed so far only reads.

*Explored 2026-11-13.* Refrakt's precedents: four internal readers of rune metadata (`refrakt
reference`, the editor's rune data in `packages/editor/src/server.ts`, the language server's registry,
the AI prompt), each reading internals its own way; a published JSON Schema for config
(`refrakt.config.schema.json`, the configuration reference generated from it, SPEC-126); and a write
path for one domain, `plan update`, editing with line-by-line regular expressions
(`plugins/plan/src/commands/update.ts`; a checkbox is ticked by finding a line that includes the
criterion's text), the brittle string surgery a general write path should replace.

**Two schemas** (*leaning*):

| View | Describes | For |
|---|---|---|
| Input grammar | what an author may write: attributes with types and values, the content model (fields, `match`, order, optional, repeated, `as`), explicit slot names, applicable dimensions, examples | editors and CMS forms, the language server, AI prompts, `reference` docs |
| Output props | what a component receives once resolved: props, slots, items | type generation, form builders, frontmatter schemas (Z4b), validation elsewhere |

JSON Schema fits the output (props are JSON) and fits the input poorly ("a heading, then an optional
paragraph, then a list of links" is a grammar over Markdown nodes). So Marquise publishes its own
versioned schema document for the input, and JSON Schema for the output, from which others derive
validators (Zod) or form definitions.

- **Contents:** shapes, document shapes with frontmatter, dimensions and presets with where they
  apply, directives' attributes, and the catalogue of finding ids, so an AI or CI knows every
  possible error and its meaning.
- **Delivery:** `marquise schema`, a programmatic API, MCP resources (as refrakt's `refrakt://…`);
  the project's schema merged from its kits and the site's shapes.
- **Marquise's own tools read only the published schema** (language server, type generator, AI
  prompt builder, `reference`), which keeps it complete and replaces refrakt's four readers with one.
- CMS-specific adapters (Decap, Tina, Keystatic configurations) are community or kit projects.

**A write path, by address** (*leaning*). Needed by language-server quick fixes, an AI applying a
fix through an MCP tool, migration codemods (Z2), editors and CMS forms, and refactors (renaming a
shape across content).

- **an address** names a document, a shape instance (by position or `#id`) and a part (an attribute,
  a field, an item);
- **operations:** set an attribute, set a field's content, insert or remove a shape, rename a shape,
  switch between explicit and inferred form, apply a migration;
- **the result is a list of text edits** against a known document version, in the language server
  protocol's form; untouched text stays byte for byte identical (unlike printing the tree back,
  spike gap 5); only the changed part is serialised, with each syntax's own printer;
- **every edit is validated**, and returns its findings, so a fix that creates a new problem is
  caught at once;
- **a missing field is inserted where inference will find it** (the content model knows the order:
  an eyebrow goes before the heading); where the position is ambiguous it **falls back to an
  explicit slot** (`#eyebrow`), so explicit slots are the write path's safety net too;
- **tests:** for every operation, parse, edit, parse again; the tree as expected and every byte
  outside the edit unchanged.

**The tie to Z1:** precise edits need precise positions. Markdoc nodes carry their location; Comark
gives line ranges for components through its tokens, nothing at column level, so changing one
attribute inside `{…}` or one field's span needs more. With validation findings and codemods, the
third item pointing at positions as the main thing to raise with Comark.

**Z6. An inventory of public contracts.** Several things became public API along the way: the
shape node format, finding ids (relied on by AI fix loops and CI), the plain presentation markup
(SPEC-199 decision 3), the binding format and kit manifest, cache keys (what invalidates a cached
shape node). Keep one list in SPEC-199, each with its versioning rule; semver protects only what is
listed.

*Explored 2026-11-13; the list now lives in SPEC-199, "Public contracts".* Grouped by who depends on
it: **content authors** (the syntax and Marquise's conventions, a library's shapes, a design
language's dimensions); **shape and kit authors** (the shape, dimension, preset, kit-manifest,
migration and binding formats; the template language later); **developers** (the shape node, generated
types, host callbacks, middleware, the context API, the lookup node, the registries, each renderer's
component contract); **machines** (finding ids, the published schema documents, edit operations, CLI
commands and JSON output, MCP tools and resources); **browsers, stylesheets and search engines** (the
plain presentation markup, JSON-LD structure); and two behavioural promises (determinism, which also
defines cache keys; the trust boundary). Not contracts: internal module paths, message wording,
dev and editor annotations, finding order, anything refrakt-specific.

**Rules:** semver across Marquise's packages, breaking a listed contract means a major with a codemod
or upgrade guide; formats read by outside tools carry a format version; finding ids are never reused;
markup and output change additively; tightening untrusted mode counts as breaking for content; no
experimental flags. **Enforcement** follows refrakt's committed-and-checked pattern
(`contracts/structures.json`, the structured-data baseline): a public API report diffed per pull
request, snapshots of the finding catalogue, schema formats and plain markup, a JSON-LD baseline, the
hostile-content suite (Z3) and round-trip edit tests (Z5). **Under option B** Marquise also depends on
contracts it does not control (Comark's document format, plugin API and renderer conventions): pin
ranges, run a contract test against Comark on every upgrade, track it as a risk.

**With Z6, the six seams have each been explored once.**

Z1 and Z3 should become explicit points in SPEC-199 when Marquise moves forward: both are cheaper
to get right from the start than to retrofit.

## 17. Open questions

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
- I5. Marquise and `@astrojs/markdoc`. *Leaning 2026-11-13:* a preset first, a pre-transform hook
  proposed upstream, a separate integration as fallback (section 14), after a spike.

**Integration packages**

- N1. Which integration comes second after Astro: Nuxt (matching the Nuxt UI kit idea) or Next
  (the largest audience)?
- N2. Nuxt Content: can Marquise plug in as a file type, or does it conflict with MDC? Check its
  current docs.
- N3. *Answered 2026-11-13:* the plain presentation is what `@marquise/html` renders for unbound
  shapes (section 15).
- N4. Next without Vite: a separate small plugin, or a loader that needs no build integration
  (transform at request time)?

**The HTML renderer**

- R1. Sync or async components? Async allows fetching inside a component but complicates streaming
  and caching; the shape node is already resolved, so sync may be enough, and async can be added
  later without breaking anything.
- R2. Escaping guarantees for library templates: with `html.raw` the template engine owns escaping.
  Refuse unescaped output by default, with an explicit opt-in per component?
- R3. Custom-element attribute types: strings map cleanly; booleans, numbers and item lists need
  conventions (boolean attributes, JSON in an attribute, child elements per item).
- R4. Server-side rendering of web components: content inside shadow DOM is not in the initial
  HTML. Light-DOM slots avoid that for content, which suits Marquise; recommend it to kits.

**Seams not yet discussed** (section 16): Z1–Z6, each still open; to be walked through one at a
time.

- Z1a. Build on Comark (syntax, tree, renderers) as well as, or instead of, Markdoc? Options A, B, C
  and what to settle first are in section 16 (deep dive). To be settled
  before renderers are built.
- Z1b. *Answered 2026-11-13:* yes, in both syntaxes, as the explicit form of what inference does
  (section 16, "Explicit slots").
- Z1f. Explicit-only fields: a per-field flag (`infer: false`), or a kind of field (like refrakt's
  `region`)?
- Z1g. Should validation hint when explicit slots match exactly what inference would produce?
  Probably not: noise, and explicit is not wrong.
- Z1h. Markdoc's slot syntax: usable, or a Marquise tag in its place?
- Z1i. Which syntax is primary (leaning: a primary plus the other as accepted input, section 16,
  "Compositions")?
- Z1j. Template variables: Comark's binding (`attrs.align`, `props.x`) or SPEC-195's `$attrs`?
  Decide together with Z1e, so `computes` and templates share one style.
- Z1k. Who may define compositions: the site's `shapes/` and kits only, or also content files (a
  one-off composition inline on a page)? Powerful, but it blurs where shapes are defined.
- Z1c. Formatting components (`date`, `number`, `currency`): shipped by Marquise, or by kits and
  hosts? They need the locale, which suggests kits and hosts.
- Z1d. Comark's `data` namespace is render-time; should the host values Marquise uses at transform
  time use the same names, so `data.user` means one thing in both places?
- Z1e. `computes` expressions: borrow Comark's dot-path style (`attrs.title`) for consistency with
  content, or keep SPEC-195's function syntax?
- Z2a. Old content inside fenced code: refrakt's regex codemods rewrote fenced examples too,
  sometimes wrongly. Should codemods touch fences at all? Probably only `example` blocks, never
  arbitrary code.
- Z2b. `removeAfter` for third-party libraries: Marquise enforces expiry in its own tests, but a
  kit's is the kit's choice. Is a warning to the kit author enough?
- Z2c. Moving between kits with different shapes: a migration too (a mapping file between kits), or
  out of scope?
- Z3a. Raw HTML in untrusted mode: off entirely, or a small allowlist (`kbd`, `sup`, `sub`,
  `details`)?
- Z3b. One default everywhere (untrusted), or by context (trusted for build-time sites, untrusted for
  runtime parsing)? One default is simpler to explain.
- Z3c. Own sanitisation or Comark's plugin? The Markdoc path needs Marquise's own URL and attribute
  rules anyway; Marquise could own those for both paths and use Comark's plugin for HTML tags only.
- Z3d. Raise with Comark's maintainers: a strict preset for the security plugin. Its defaults are
  documented, so not a bug, but `security()` without options looks protective and is not.
- Z4a. How a document gets its shape: frontmatter (`shape: article`), a host mapping by folder or
  collection, or both?
- Z4b. Frontmatter with a host schema (Astro): generate the host's schema from the shape (through the
  published schema, Z5), or the reverse? From the shape keeps Marquise the source.
- Z4c. Broken links: is the host reporting missing targets enough, or do anchors in other documents
  need the corpus layer?
- Z4d. Documents without a shape stay untyped, with no validation of the body. Should a project be
  able to require one?
- Z5a. The input schema's format: Marquise's own, or JSON Schema with custom keywords for content
  models (partly usable by JSON Schema tooling, at the cost of only looking standard)?
- Z5b. Editor hints (multi-line editing, a widget for a value) in the schema, or left to editors?
  Refrakt's `editHints` are partly covered by SPEC-200's `as`.
- Z5c. Edit operations and migrations: a migration is a batch of edits defined by a file; one engine
  for both?
- Z5d. Collaborative editing: text edits against a version work for one editor at a time; in scope
  at all? Leaning no.
- Z6a. Where the list lives: SPEC-199 (where it is now), or its own document every package links to?
- Z6b. Kits have contracts of their own (their shapes and dimensions): give them a checklist or
  tooling (`marquise diff`, Z2)?
- Z6c. Deprecation periods for finding-id and markup aliases: counted in releases or in time?
- Z6d. Before 1.0: are the rules followed from the first 0.x release, or only from 1.0?

## 18. Next topics

- The seams Z1–Z6: all explored once (2026-11-13); their open questions remain (section 17).
- The Astro spike (section 14).
- How kits combine when two overlap (K4).
- The tokens contract (P2).
- Interaction contracts as tests (K5, B1).
