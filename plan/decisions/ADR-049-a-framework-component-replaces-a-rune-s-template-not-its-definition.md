{% decision id="ADR-049" status="proposed" date="2026-11-11" tags="renderer, react, vue, svelte, astro, template, content-model, architecture, dimensions" %}

# A framework component replaces a rune's template, not its definition

## Context

{% ref "ADR-008" /%} gave React, Vue, Svelte and Astro authors a way to override a rune with a
framework component. It is implemented in all four renderers (WORK-119, WORK-123, WORK-124).
The renderer matches a component on `data-rune`, and `extractComponentInterface`
(`packages/transform/src/helpers.ts:160`) sorts the rune's direct children three ways:
`<meta data-field>` becomes a prop, `[data-name]` becomes a named slot, and everything else
becomes `children`. The component replaces the whole rendered rune, root included, and gets
the raw `tag` as an escape hatch.

{% ref "ADR-048" /%} and {% ref "SPEC-194" /%} make every rune a definition: a declared input
(attributes, content model, `computes`, schema row) and a template. ADR-008 was written for
the engine's output, before definitions existed. Measured against definitions, it has four
problems:

1. **Slots are invisible to it.** A template marks placed slot content with `data-slot` and
   `data-owner` (`packages/runes/src/lib/composition.ts:1384`), with no wrapper and no
   `data-name`. `extractComponentInterface` reads only `data-name`, so a composed rune's content
   slots all fall into `children`. The template's groups and meta blocks do carry `data-name`, so
   the component sees the *theme's* arrangement names instead of the rune's content model. Those
   names change whenever a theme replaces the template.
2. **Computed values never reach it.** A composition emits a `meta` for each declared attribute
   (`composition.ts:1262`) and nothing for `$computed`. Once `embed` moves to `prepare`, its
   `provider` and `embedUrl` would stop reaching a component.
3. **It arranges twice.** The component receives output a template has already arranged and
   arranges it again. ADR-008 justified components as "placement, not internal rendering",
   which ADR-048 now gives every theme through template overrides, without code. Nothing says
   which arrangement wins.
4. **It owns the root, so it owns the dimensions.** The engine writes the universal attributes
   (`width`, `tint`, `bg`, `reveal` and the rest) to the root and to inner parts. A component that
   replaces the root has to forward or redraw all of them, and nothing checks that it does.
   ADR-008 open question 4 also told authors to keep styling inside slots with BEM selectors,
   which {% ref "SPEC-196" /%} D8 removes from domain runes.

The use case is still real. Behaviours and web components cover refrakt's own interactive runes.
They do not cover a site that lives in a framework and needs something tied to its own app: a
calculator using the site's state, a live widget, something behind its login. Those authors still
want what a definition gives them: a declared content model, validation, editor support,
structured data, and content an AI can write.

## Options Considered

### 1. Keep ADR-008 and patch the extraction

Teach `extractComponentInterface` to read `data-slot`, and emit computed values as metas.

**Pros:** smallest change; existing components keep working.

**Cons:** the component still re-arranges template output, still owns the root and its
dimensions, and still reads the rune through heuristics over rendered output rather than through
its declared input.

### 2. Drop framework components

Templates, behaviours and web components cover every first-party rune.

**Pros:** one arrangement mechanism, no per-framework renderer logic.

**Cons:** leaves framework sites with no declarative path to app-specific client behaviour. They
would drop to raw framework code and lose the content model, validation and editor support.

### 3. A component is an alternative to the template (chosen)

The definition keeps the input. A component takes the template's place: it receives the
definition's resolved input and draws the root's contents. The engine keeps the root.

**Pros:** one input for every presentation; typed props from the content model; no double
arrangement; dimensions keep working without the component's help; the definition stays free of
code (SPEC-194 D3).

**Cons:** each renderer changes how it calls components; the ADR-008 interface is replaced, so
existing components need a migration.

## Decision

### Decision 1: a rune's presentation is a template or a component

ADR-048 decision 1 reads: a rune is input and template. This decision widens it to **a rune is
input and a presentation, and a presentation is a template or a component.** A framework component
replaces a rune's template. It never replaces or changes the definition: attributes, content model,
`prepare`, `computes`, the schema row, `metaFields`, `registers` and `role` stay in the `.md` and
apply whichever presentation draws the rune.

### Decision 2: the component draws the root's contents; the engine keeps the root

A composed rune already works this way. `createComponentRenderable` builds the root from the
definition's `tag:` key, and the template produces only the root's children. A component replaces
exactly those children:

```
<figure data-rune="calculator" data-width="wide" data-tint="brand" …>   ← engine
  [bg layers, if any]                                                    ← engine
  <Calculator …props />                                                  ← component
</figure>
```

- The root carries `data-rune`, every modifier and dimension attribute, the theme's classes
  (SPEC-196 D2), and the inline styles and custom properties the dimensions write.
- A component cannot change the root's element. This extends SPEC-194 D8's rule for runes whose
  root is a custom element to every rune.
- Behaviours that select the root (`reveal`, and any `[data-rune]` selector) keep working.

### Decision 3: the component receives the definition's resolved input

The props are derived from the definition, not read back out of rendered output:

| Prop | Source | Shape |
|---|---|---|
| each declared attribute, camelCased | `attributes` | its declared type |
| `computed` | `computes`, after `prepare` and expressions | an object, read-only |
| each declared slot | the content model | one renderable; for an `each` slot, a list of items, each `{ content, …per-item values }` (the values `$each` exposes to a template) |
| `dimensions` | the universal attributes the author set | an object, read-only; added by refrakt's layer, not the rune node (decisions 5 and 8) |
| `children` | none | not passed: everything has a name |

- `computed` and `dimensions` get their own props, as `$computed` is its own scope in SPEC-194
  D1, so neither collides with the rune's attributes in ADR-008's flat namespace.
- **Types come from the definition.** `refrakt inspect <rune> --types` and each adapter emit an
  interface with attribute and computed types from the definition, and the framework's own
  renderable type for slots (`ReactNode`, `Snippet`, `VNode`, Astro slots). This settles ADR-008
  open question 6.
- The raw `tag` escape hatch is not passed. A component that needs more than the declared input
  is asking for a field, a computed value or a slot the definition should declare.

### Decision 4: slot content stays live framework content

The renderer draws each slot's content recursively, so a rune nested inside a slot is itself
drawn by its own component or template. Today the React and Vue renderers turn named regions
into HTML strings (`renderToHtml` and `dangerouslySetInnerHTML` in `packages/react/src/Renderer.tsx`),
so a component nested inside a region never renders as a component. That ends with this decision.

Slot content arrives identity-transformed, as ADR-008 open question 4 decided: the component
places a slot; it does not reach inside it.

### Decision 5: universal attributes and dimensions

Which universal attributes a rune accepts is decided from its declared structure (sections, media
slots, `frameTarget`, `provides`; `packages/runes/src/universal-attributes.ts:149`), which
SPEC-194 D5 generates from the definition. So the `.md` decides that `width="wide"` is valid and
`frame` is not, whichever presentation draws the rune. Authors get the same validation, editor
controls and reference docs.

Where each attribute lands, from the handlers in `packages/transform/src/facets/`:

| Kind | Attributes | Where the engine writes it | With a component |
|---|---|---|---|
| Root only | `width`, `spacing`, `inset`, `elevation`, `density`, `tint`, `tint-mode`, `content-measure`, `reveal`, `data-in` | `data-*` attributes, inline styles and custom properties on the root | unchanged: theme CSS targets the root, and tint tokens and `data-color-scheme` reach the component through the cascade |
| Root plus added layers | `bg` (`bg`, `bg-video`, `bg-overlay`, `scrim` layers), `cover` scrims | elements added inside the root | the renderer places the layers in the root, before the component's output |
| On a part | `reading` and `dropcap` (`[data-section="body"]`), `frame` and substrate (the media slot), `stagger` (the items), `prominence` (a header) | an inner part, chosen by declared structure | honoured when the component places that slot: the engine applies the attribute to the slot before handing it over, so the media slot arrives framed and the body arrives with `data-reading` |

- **A part attribute is honoured if the component places the slot or primitive it targets.** If
  the component draws its own header instead of placing one, `prominence` has nowhere to land.
  This is documented, not checked: a component is code, reviewed as code, and no static check can
  see what it draws.
- **The component styles with tokens.** Component CSS uses `--rf-*` tokens, so tint, colour
  scheme and the theme's values carry through. A component that hard-codes colours opts out of
  tint, and that is its author's choice.
- **`dimensions` is for behaviour, not styling.** A chart that picks its tick count from `density`
  reads `dimensions.density`; a component that wants to look denser relies on the root's
  `data-density` and the theme's CSS.

### Decision 6: the binding lives outside the definition, keyed by rune name

- **A site binds a component to a rune by name** in its adapter's component registry, as the
  registries in `packages/{react,vue,svelte,astro}/src/registry.ts` do today. The same definition
  works under SvelteKit and Next with a different component in each, and under the `html` and
  `eleventy` adapters with none.
- **The definition never names a component.** SPEC-194 D3 holds: a definition names code by key
  and never contains it, and a component is presentation, not input.
- **Themes ship templates, not components.** {% ref "ADR-009" /%} keeps themes framework-agnostic.
  A framework-specific package may ship components, and a site registers them.
- **Lookup order**, extending SPEC-177 and SPEC-194 D4: site component, then site template, then
  theme template, then the definition's template.
- **A component replaces every template variant.** SPEC-168 D9's variant selector is available to
  the component as a computed value, so it can branch the same way.

### Decision 7: a definition's template is the fallback, and optional

- A definition with a template still renders in the editor preview, the `html` and `eleventy`
  adapters, feeds and static export without JavaScript, whatever component a site binds.
- **A site-local definition may omit its template** when it exists only for a framework site. The
  rune is then bound to a framework: an adapter with no component for it reports
  `rune-presentation-missing` and does not render it, rather than rendering nothing silently.
- A first-party or plugin definition always has a template.
- **A definition without a template still has a body worth keeping**: its examples
  ({% ref "SPEC-197" /%}). Its templates are always wrapped in `{% template %}`, so having none is
  visible rather than an empty body.

### Decision 8: the renderer receives a rune node; dimensions are refrakt's layer on top

Decision 3's props come from the definition, so the renderer needs the definition's resolved
input, not rendered tags it has to read back. A rune drawn by a component reaches the renderer as
a node that carries that input directly:

```
{ $$mdtype: 'Rune', name, attributes, computed, slots }
```

- **Plain data only**, so it survives the server-to-client boundary as serialized tags do today.
- **It knows nothing of refrakt's vocabulary.** `dimensions`, the engine root and the background
  layers are not in it. Refrakt adds them through two general hooks, which any host could use:
  - **shared attributes:** a host declares attributes every definition accepts, and a rule for
    which definitions accept which. Refrakt registers the universal attributes this way, gated by
    declared structure as `resolveUniversalAttributes` does. The node carries them among
    `attributes`;
  - **a wrapper around a rune and around a slot:** refrakt's wrapper splits the universal
    attributes out of `attributes`, draws the engine root and its layers (decision 2), passes the
    component its `dimensions` prop, and applies part attributes to the slots they target
    (decision 5).
- **The test of the seam:** refrakt's renderer is the generic one plus these hooks, with no
  refrakt-specific case inside it. If dimensions need special handling in the generic renderer,
  the seam is in the wrong place.
- **Why it matters beyond this decision:** the generic renderer and the rune node are what a
  content-model core without refrakt's themes would ship. Keeping refrakt's layer separate now
  keeps that option open without committing to it.

## Rationale

The split ADR-048 made, input in the definition and arrangement in a template, is the line a
framework component should plug into. Everything that makes a rune's content portable
(validation, structured data, the editor, AI authoring) belongs to the input, so it survives any
presentation. Everything a component is good at (client state, app integration, interactivity)
is presentation. Keeping the root with the engine is what makes the dimensions work without
asking each component to reimplement them, and it costs component authors nothing they should
want: the root is the theme's surface, not the component's.

## Consequences

- **ADR-008 is superseded.** Its goal stands; its interface (props and slots read from rendered
  output, root replaced, `tag` escape hatch) is replaced by decisions 2 and 3.
- **`extractComponentInterface` is replaced** by the rune node (decision 8). It
  stays only while native runes without a definition remain, then goes with SPEC-194 D9's removals.
- **Every renderer changes:** it draws the root from engine output, places added layers, then
  calls the component with the derived props, and draws slot content recursively. The Svelte,
  React, Vue and Astro renderers change together, with a shared test over a composed rune.
- **SPEC-194 D4** gains the site component at the head of its lookup order.
- **SPEC-145**'s note that a Svelte component override is the "heavyweight route" past templates
  points here.
- **ADR-008 open question 4's advice** to style slot internals with BEM selectors is withdrawn;
  SPEC-196 D1's data attributes are the stable hooks.
- **Existing component overrides need a migration**: they stop receiving `tag`, `children` and
  the root. The registries ship empty, so first-party code has none to migrate.

## Open questions

1. **Islands.** Most framework needs are probably one interactive part in an otherwise static
   rune. SPEC-194 D8's pattern, an opaque part drawn by code, could let a template place a named
   client component as one slot while the rest stays themeable. This decision does not add it,
   but decision 3's interface is meant to serve it unchanged.
2. **Primitives from a component.** For decision 5's part attributes, a component should be able
   to place refrakt primitives (`section`, `frame`, `caption`) through the renderer. The API for
   that is per framework and not designed here.
3. **Hydration.** Server-rendering follows each framework adapter, as today. Whether refrakt says
   anything about client hydration of a component, or leaves it entirely to the framework, is
   open.

## References

- {% ref "ADR-008" /%}: the interface this replaces
- {% ref "ADR-009" /%}: themes stay framework-agnostic
- {% ref "ADR-048" /%}: a rune is input and template
- {% ref "SPEC-194" /%}: D3 (code by key), D4 (lookup), D5 (vocabulary), D8 (opaque parts)
- {% ref "SPEC-196" /%}: data attributes are the contract; classes are the theme's
- {% ref "SPEC-177" /%}: template lookup and checks
- {% ref "SPEC-197" /%}: a definition's body is blocks, including examples
- {% ref "SPEC-198" /%}: `output()` prints a component-bound rune's node

{% /decision %}
