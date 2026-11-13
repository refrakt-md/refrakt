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
```

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

## 10. Open questions

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

## 11. Next topics

- How kits combine when two overlap (K4).
- The tokens contract (P2).
- Interaction contracts as tests (K5, B1).
