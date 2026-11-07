{% spec id="SPEC-194" status="draft" tags="composition, template, theme, content-model, native, architecture, engine" %}

# Every rune is input and template; native runes add a prepare stage

## Summary

{% ref "ADR-048" /%} makes every rune one definition: a declared input and a template. A native
rune is a definition that also names a **`prepare`** stage, TypeScript that computes values from
already-parsed content. This spec is the mechanism:

- the definition format for a native rune: `prepare` and `computes` (D1, D2);
- where code may live (D3);
- template override for every rune (D4);
- what engine config keeps and what it loses (D5);
- the inventory of `custom` content models (D6) and the grammar extensions that replace them
  (D7);
- opaque visuals (D8);
- when the legacy levers are removed (D9), and the migration order (D10);
- a template never names an HTML element (D11).

## Prerequisites

| Needs | From | State on 2026-11-05 |
|---|---|---|
| Theme and site templates, their lookup and checks | {% ref "SPEC-177" /%} | draft |
| First-party definitions loaded from `.md` rune directories | {% ref "SPEC-153" /%} | see spec |
| Content-model groups, nested models and `position: last` | {% ref "SPEC-186" /%} | accepted |
| Paragraph `itemModel` and `fills` | {% ref "SPEC-182" /%} | implemented |

D1–D3 and D6–D7 can be built before SPEC-177: a native rune with a template is useful as soon as
its template replaces its engine structure, even before anyone can override it. D4 needs SPEC-177.

## What exists, measured

- **A composed definition is one Markdoc file.** Frontmatter holds `attributes`, `content`,
  `metaFields`, `blocks`, `schema` and `defaults`, and the body is the template
  (`plugins/marketing/runes/testimonial.md`). `defineComposedRune` builds the rune from it, and
  `composedRuneConfig` (`packages/runes/src/lib/composition.ts`) generates its engine config,
  marked `composed: true`.
- **A template places** slots (`{% slot %}`), metadata blocks (`{% metablock %}`), core runes
  and repeated items. `$each.<name>` exposes exactly the content model's `emitAttributes`.
- **A native rune is two artifacts.**
  - A `createContentModelSchema` transform builds a tree with `createComponentRenderable`.
  - A `RuneConfig` entry (`packages/runes/src/config.ts`, 2,846 lines, plus about 1,600 lines
    across the plugin configs) adds structure on top of that tree.
- **Fourteen runes use `type: 'custom'`**, listed in D6. `packages/runes/src/reference.ts`
  reports such a model as `{ type: 'custom', description }` and nothing more.
- **No theme overrides any rune** (`luminaOverrides`, `packages/lumina/src/config.ts`).
  Composed runes refuse overrides ({% ref "WORK-669" /%}).

## Decisions

### D1: a native rune is a definition file that names a `prepare` stage

```md
---
tag: section
attributes:
  title:    { type: string, description: "Filename shown in the topbar" }
  labels:   { type: string, description: "Comma-separated custom tab labels" }
  overflow: { type: string, matches: [scroll, wrap, hide], default: scroll }
content:
  type: sequence
  fields:
    panels: { match: fence, greedy: true, emitAttributes: { language: $node.language, source: $node.source, lines: $node.lines, label: $node.label } }
prepare: codegroup
computes:
  panels.label: { type: string }
  single:       { type: boolean }
metaFields:
  title: { metaType: code, condition: title, renderWhenEmpty: true }
blocks:
  topbar: { fields: [title], layout: bar }
---
```

The body is a template, as for any composition (D4 has the example).

- **The same keys as a composition, plus two.**
  - `prepare` names a registered stage (D3).
  - `computes` declares every value the stage returns: its name, its type, and whether it sits
    on the rune or on each item of a repeated slot (`panels.label`).
- **Nothing else about the format changes.** A definition without `prepare` is a composition,
  exactly as today.
- **Computed values are values, not slots.**
  - A rune-level computed value is readable in the template as `$computed.<name>`.
  - A per-item value is added to what `$each` exposes, beside the content model's
    `emitAttributes`.
  - A computed value may also feed `metaFields` and the `schema` row by name, so a subtotal can
    be both shown and published.

- **A matched node's own attributes.** The example reads a fence's attributes through
  `$node.<name>` in `emitAttributes`. Today `emitAttributes` reads only item-model fields and
  heading-extracted values, so this is a small addition, made with `codegroup` (D10).

- **`$computed` is its own scope** (*decided 2026-11-07*). Computed values never join `$attrs`.
  SPEC-177 D3's precedence tells an author's explicit value from a default, and a computed
  value is neither, so mixing the scopes would blur both.

### D2: `prepare` computes; it does not parse or build

```ts
export const prepareCodegroup: Prepare<CodegroupInput, CodegroupComputed> = ({ fields, attrs }) => {
	const custom = attrs.labels?.split(',').map((s) => s.trim()) ?? [];
	return {
		single: fields.panels.length === 1 && custom.length === 0,
		panels: fields.panels.map((p, i) => ({
			label:
				custom[i] || p.label || labelFromSource(p.source, p.lines) || prettifyLanguage(p.language || 'shell'),
		})),
	};
};
```

- **Input:**
  - the resolved fields, with emitted attributes and item-model values already extracted;
  - the attributes, after defaults;
  - a context of locale, site and source path.

  It never receives raw AST.
- **Output:** exactly the values `computes` declares, nothing else.
  - An undeclared key is an error (`prepare-undeclared-value`).
  - A missing required key is an error (`prepare-missing-value`).
  - Both are checked in development and in tests. Production trusts the declaration.
- **It cannot touch structure.** It returns no tree, creates no slot, and cannot remove,
  reorder or filter the items of a slot. If items need to be filtered or reordered, that is a
  content-model or template concern.
- **It is pure and synchronous.** Data fetching stays where it is today, in the cross-page
  pipeline hooks. `prepare` can read what a hook put in its context, but cannot start I/O.
- **Facts, not arrangement.** Where a transform today chooses an arrangement while it parses
  (`codegroup`'s single-fence branch), `prepare` reports the fact (`single: true`) and the
  template decides what to do with it.

### D3: code is registered by a package, never written in a definition

- A plugin registers stages beside its runes: `Plugin.prepare: Record<string, Prepare>`. Core
  registers its own the same way.
- A definition names a stage by key. A name that no loaded package registers reports
  `prepare-unknown` and the rune is not loaded.
- **A site's `runes/` directory may name a registered stage but never define one.** A
  site-authored definition stays code-free, so this restates {% ref "SPEC-161" /%} D3 precisely:
  a template never runs code, and a definition file never contains it.
- **A stage is private to its rune** (*decided 2026-11-07*). It may be named only by the
  definition its package ships. Letting other runes name it would make every stage's input and
  output a public API, versioned like a rune, and no case needs that yet. Shared logic is
  reused another way; see "Future: reusing computation" below.

### D4: every rune with a template is arrangeable

{% ref "SPEC-177" /%} applies to a native rune's template without change:

- lookup is site, then theme, then definition, per template value and per `defaults` key;
- every slot must be placed;
- a replacement file carries only `defaults` and a body, and any input key in it, now
  including `prepare` and `computes`, reports `template-override-input`;
- structured data is compared with the definition's own template.

The checks read slots from the content model and values from `computes`, so they run when the
site loads, without content and without running `prepare`.

`codegroup`'s own template:

```md
{% if $attrs.title !== undefined %}
	{% metablock name="topbar" /%}
{% /if %}

{% if $computed.single %}
	{% slot name="panels" /%}
{% else /%}
	{% tabs %}
		{% slot name="panels" each %}
			{% tab label=$each.label %}
				{% slot /%}
			{% /tab %}
		{% /slot %}
	{% /tabs %}
{% /if %}
```

An editorial theme's `templates/codegroup.md`, which prints code groups as stacked, captioned
figures:

```md
{% metablock name="topbar" /%}

{% slot name="panels" each %}
	{% figure caption=$each.label %}
		{% slot /%}
	{% /figure %}
{% /slot %}
```

It places every slot and changes no input: the label fallback chain and the `labels` attribute
are untouched.

### D5: engine config keeps vocabulary and loses assembly

Each `RuneConfig` field (`packages/transform/src/types.ts`) falls into one of three groups:

| Group | Fields | Fate |
|---|---|---|
| Identity and vocabulary | `block`, `modifiers`, `contextModifiers`, `metaFields`, `blocks`, `sections`, `provides`, `universalAttributes`, `mediaSlots`, `frameTarget`, `substrateTarget`, `rootAttributes`, `interactive`, `editHints`, `sequence`, `sequenceDirection`, `staggerItems`, `parent`, `requiresParent`, `sectionRoleExceptions`, `guestFit`, `composed`, the axis defaults (`defaultWidth`, `defaultSpacing`, `defaultInset`, `defaultReading`, `contentMeasure`, `defaultDensity`, `defaultElevation`, `defaultProminence`, `childDensity`) | kept; generated from the definition |
| Structure assembly | `structure`, `layout`, `contentWrapper`, `autoLabel`, `projection`, `postTransform` | deprecated; the template does it |
| To classify | `variants`, `styles`, `staticModifiers`, `checklist`, `scope` | decided field by field in the first work item; each is either vocabulary or assembly |

- **A rune with a definition gets its engine config generated**, as `composedRuneConfig` does.
  `config.ts` keeps only runes that have not moved.
- **A deprecated field on a rune that has a template is an error**
  (`engine-config-assembly-with-template`). It also reports while that rune keeps its config,
  so the two cannot overlap on one rune.
- **`postTransform` has no replacement in config.** The code it holds goes into `prepare` when
  it computes a value. When it rearranges, the arrangement goes into the template.

### D6: the `custom` content models, sorted

Each `processChildren` mixes a parse with a computation. Sorted by what is left once the
computation moves to `prepare`:

**Declarable today**

| Rune | Declarative model | `prepare` |
|---|---|---|
| `nav` | `sections` on `heading:1`, with `implicitSection` for a flat list | none (slug resolution is a pipeline step) |
| `symbol` (group kinds) | `when: { attribute: kind, in: [class, interface, module] }`, then `sections` on `heading:3` + `emitTag: symbol-group` | none |
| `symbol-group` | `sections` on `heading:4` + `emitTag: symbol-member` | none |
| `definition` | sequence: a term group (headings, and paragraphs read by an `itemModel` for image, icon or bold text), then the description | none (`processChildren` is the identity function today; the split is in `transform`) |
| `bento` | `sections` for cells | none; pushing frame attributes down to cells is the template's (SPEC-145 D32) |

**Needs a D7 extension**

| Rune | Extension | `prepare` |
|---|---|---|
| `storyboard` | node-started groups: each image starts a panel | none |
| `preview` | a field taken from anywhere: the fence | none |
| `tabs` | inline extraction from headings: a tab's image | none |
| `form` | repeated choice, a SPEC-186 D1 group for blockquote + list, `position: last` for the submit paragraph | field type inference (option count, modifier words) |

**Declarable, with a computation left**

| Rune | `prepare` |
|---|---|
| `budget`, `budget-category` | subtotals, or none once {% ref "SPEC-162" /%}'s `tally` lands |
| `conversation` | speaker fallback `speakers[i % n]` (the bold speaker is a nested model) |
| `comparison` | aligning rows across columns against a master label list |
| `map` | parsing coordinates into numbers (name, description and link are an `itemModel`) |

This sorting is a hypothesis. `form` was read in full; the others from their `processChildren`
descriptions and the opening of their transforms. The first work item for each rune confirms
its row or moves it.

### D7: four content-model extensions

Each is a general grammar feature, available to every definition and reported by
`refrakt reference` like the existing patterns.

1. **Node-started groups.** `sections` takes any node type as its delimiter
   (`sectionHeading: image`), and the delimiter node stays in its group. Without `emitTag`, a
   group's leading node is bound like a heading.
2. **A field from anywhere.** `position: any` on a field takes the first node that matches it,
   wherever it sits, before the rest of the sequence is walked. It is a sibling of SPEC-186 D3's
   `position: last`, with the same "only one per model" limit.
3. **Inline extraction from headings.** `headingExtract` fields accept the inline matches an
   `itemModel` accepts (`image`, `strong`, `link`, `code`), not only `text`.
4. **Repeated choice.** `{ type: repeat, of: [ …fields or groups… ] }` matches, in any order and
   any number of times, whichever alternative fits next, and yields an ordered list of tagged
   items. The template places them with `{% slot name="…" each %}` and branches on
   `$each.kind`.

Each extension is specified and implemented with the first rune that needs it, not in advance.

### D8: an opaque visual is one slot

`map`, `chart`, `diagram` and `juxtapose` draw something no template can rearrange.

- Their drawing is one slot.
- Their title, legend, caption, controls and fallback content are fields and slots around
  it, which a theme may arrange.
- The drawing's own CSS stays with the plugin, in tokens only ({% ref "ADR-044" /%} tier 3).

A theme can put a map's legend under the map. It cannot restyle the map's tiles except through
tokens.

### D9: when the legacy levers are removed

- **`CustomModel`** is removed in the release after the last first-party rune leaves it. Until
  then it is marked deprecated in its type, and `refrakt validate` warns on a third-party plugin
  rune that uses it.
- **Structure-assembly config fields (D5)** are removed in the release after the last
  first-party rune leaves them. Their removal is a breaking change for third-party plugins and
  ships through {% ref "SPEC-189" /%}'s migration table.
- **A theme's `runes:` section** ({% ref "ADR-043" /%} decision 6) is removed in the same
  release. By then every lever it offered is either identity (refused already) or assembly
  (gone), so nothing is left to override.

### D10: migration order

1. **`codegroup`** is the acceptance case. Its parse is declarative already, its computation is
   small, and its arrangement (tabs, or a single panel with chrome) is one a theme plausibly
   wants to change.
2. **The "declarable today" runes in D6**: they need no new grammar and no `prepare`, so each
   one probably becomes a plain composition (ADR-044 tier 1) rather than a native rune with a
   template.
3. **Each D7 extension**, with its first rune: `storyboard`, `preview`, `tabs`, then `form`.
4. **The computed rows of D6**, after `budget` follows SPEC-162.
5. **The remaining native runes without a `custom` model**, ordered by how much engine
   structure they carry.
6. **The opaque visuals (D8)** last: they gain the least.

Rune by rune, each moves under {% ref "SPEC-181" /%}'s staging process, as plugin runes moving
to compositions do now.

### D11: a template never names an HTML element

A template places slots, fields, metadata blocks, groups and runes. It has no tag that emits
an element by name (`{% tag name="div" %}`), and no tag that takes free attributes.

- **Elements come from facts the definition declares.**
  - A group's arrangement picks its element: a `ladder` is `<ol>` when the rune declares a
    `sequence`, `<ul>` otherwise ({% ref "SPEC-156" /%} D3).
  - A value's `metaType` picks the value element (SPEC-145 D28).
  - A primitive picks its own elements.
- **Why not a free element tag:**
  - **The theme boundary.** An element no vocabulary describes is structure no theme
    knows, which {% ref "ADR-043" /%} and {% ref "ADR-044" /%} bound away.
  - **Meaning.** `ol`, `aside`, `header` and `time` are claims about content. A free tag
    could assert an order or a role the definition never declared.
  - **Engine-owned attributes.** Free attributes could write `data-rune` (a name-resolution
    boundary that silently drops schema properties, SPEC-145 D19), `data-field`,
    `data-zone-layout` or `data-sequence`.
  - **No code in templates.** {% ref "ADR-045" /%} decision 2 holds only if `script`,
    `iframe`, `style` and `on*` cannot be written. Theme and plugin templates ship in
    third-party packages.
  - **Checks.** A contract records such an element, but no check can say anything about it,
    and the editor has no edit hint for it.
- **The needs a free tag would serve, and where they go:**

  | Need | Where |
  |---|---|
  | Grouping or arranging parts | `{% group name layout %}` (SPEC-156 D2) |
  | A header, body or footer zone | the `section` primitive's zones ({% ref "SPEC-160" /%}) |
  | A semantic wrapper (`aside`, `footer`) | a closed `as=` on `group`, admitted one value at a time with its first case, as `layout` admits topologies |
  | An inline wrapper around part of a line | an inline `group`, same rules (missing today) |
  | Decoration (ornament, divider, flourish) | glyph and ornament sets ({% ref "SPEC-164" /%}), or CSS |
  | An icon beside a value | `metaFields` icons |
  | Structure the vocabulary cannot express | an opaque slot drawn by the plugin (D8) |

- **The same rule binds `prepare`** (D2): it returns no tree, so it cannot emit an element
  either. Elements that native transforms build today (`breadcrumb`'s `nav`, `ol` and `li`)
  move to the template and follow this rule.

**What names an element today, measured on 2026-11-06.** The `structure` field itself is
unused in first-party configs; elements are named in three other places:

| Where | What | Maps to |
|---|---|---|
| `layout` created wrappers | eleven `{ tag: 'div' }` wrappers (nine content wrappers, two nested) and nine `{ tag: 'header' }` preambles, some inside `variants` (core, docs, learning, marketing, media, places, storytelling) | `section`'s header and body zones; a `group` where a wrapper is styled; nothing where it is not |
| `contentWrapper` | two `div`s (`packages/runes/src/config.ts`, `plugins/places/src/config.ts`) | a `group`, or nothing |
| `metaFields.*.tag` | `time` on plan's temporal fields (`plugins/plan/src/config.ts`) | the value element from `metaType: temporal`, which D28 already implies |

Each rune's work item confirms its rows. An entry that maps to no row is a vocabulary gap,
recorded and closed the way D7 closes content-model gaps. A `div` that exists only so that CSS
has something to select needs no replacement: the template places its children directly.

## Acceptance criteria

- [ ] A definition may declare `prepare` and `computes`; a definition without them loads as a composition, unchanged
- [ ] `prepare` receives resolved fields and attributes, never AST, and its output is checked against `computes` in development and tests (`prepare-undeclared-value`, `prepare-missing-value`)
- [ ] Computed values are readable in the template as `$computed.<name>` and, per item, through `$each`, and may feed `metaFields` and the schema row
- [ ] A plugin registers stages in `Plugin.prepare`; a definition naming an unregistered stage reports `prepare-unknown`; a site definition cannot contain code
- [ ] `codegroup` is a definition with a `prepare` stage and a template; its contract and SEO baseline are unchanged, or every difference is explained
- [ ] A theme `templates/codegroup.md` replaces its arrangement and passes SPEC-177's checks
- [ ] A rune with a template that also declares a D5 assembly field reports `engine-config-assembly-with-template`
- [ ] `refrakt reference` reports a full grammar, not a description, for every rune moved off `custom`
- [ ] The template language has no tag that emits an element by name or takes free attributes, and a test pins it (D11)
- [ ] Every element-naming config entry of a moved rune maps to a D11 row, or is recorded as a vocabulary gap
- [ ] The theme-authoring and plugin-authoring docs describe one arrangement convention for every rune

## Open questions

- **Edit hints.** The block editor reads edit hints from output. A computed value is not
  editable. Does `computes` mark it so, or does the editor infer it from the value not being
  in the content model?
- **Interactive runes whose behaviour depends on DOM shape.** The template places primitives
  that carry the behaviour (`tabs`), so a theme's template keeps it. A rune whose behaviour
  script reads its own private structure would break under a replacement template. Either such
  behaviour moves into a primitive, or the definition marks that part as one opaque slot (D8).

## Future: reusing computation

Not decided here. Recorded because D3 closes one route to reuse, and the code shows the
pressure is real.

**What repeats today, measured on 2026-11-07:**

| Computation | Where | How it differs |
|---|---|---|
| A label per item: an author's comma list by index, else a fallback chain | `codegroup` (`labels` → fence label → source basename → prettified language), `compare` (`labels` → raw `data-language` → "Panel N"), `juxtapose` (`labels` → none), `conversation` (`speakers`, cycled, after the bold speaker) | the two code-panel runes disagree: `compare` neither prettifies the language nor reads the source |
| Parsing and formatting durations | `parseIsoDuration` and `formatDurationLocale` in `packages/transform/src/engine.ts`; `parseDuration` and `formatDuration` in `plugins/media/src/duration.ts`, used by `track`, `audio` and `playlist` | two implementations of one value kind |
| Adding values up | `budget`'s subtotal; `recipe`'s `totalTime` (SPEC-145's open `{% let %}` question) | no shared operation |
| Domain-specific rules | `comparison`'s row alignment, `form`'s field-type inference, `codegroup`'s language-name table | none: genuinely per rune |

**Three kinds of reuse, none of which needs a shared stage:**

1. **Value kinds belong to the value primitives.** Parsing and formatting a duration, an
   amount, a number or a coordinate is {% ref "SPEC-166" /%}'s contract, and the format is the
   theme's `formats` (ADR-043 decision 4). The two duration implementations collapse into one
   there, and no `prepare` stage parses a duration.
2. **Small, generic computations become registered functions**, written in `computes` with
   Markdoc's own call syntax, the same functions templates and pages already call:

   ```yaml
   computes:
     panels.label: first(item($attrs.labels, $index), $node.label, basename($node.source), language($node.language))
     totalTime:    sum($attrs.prepTime, $attrs.cookTime)
   ```

   A function needs no code in the definition, so **site-authored definitions can use them
   too**. {% ref "SPEC-195" /%} specifies the function set, its typed signatures, the
   `matches()` bridge to the SPEC-070 filter grammar, and the rule that the place decides the
   result: under `computes` it is a field, in a template it is display text. That rule is what
   keeps these values in the input half, where a theme's replacement template cannot change
   or lose them and a schema row may read them (ADR-045 decision 4).

   *Revised 2026-11-07.* An earlier draft of this section proposed YAML named patterns
   (`pattern: item-label`). They were dropped: they would have been a third syntax beside
   Markdoc's function calls and the SPEC-070 grammar, for the same operations.
3. **Shared domain logic becomes a primitive.** If two runes really need the same rule (say
   `compare` and `codegroup` agree on what a code panel's label is), the ADR-044 shape applies:
   a primitive owns the code (a `code-panel` that computes its own label), and both runes place
   it.

**What would remain for `prepare`** is the last row of the table: rules that belong to one rune.
That is the case where privacy (D3) costs nothing.

## References

- {% ref "ADR-048" /%}: the decision this spec implements.
- {% ref "ADR-043" /%}, {% ref "ADR-044" /%}, {% ref "ADR-045" /%}: the theme boundary this completes.
- {% ref "ADR-029" /%}, {% ref "ADR-031" /%}: proposed config-override routes that templates replace.
- {% ref "SPEC-145" /%}: composed runes and the template language.
- {% ref "SPEC-161" /%} D3: a primitive may own code, a composition may not.
- {% ref "SPEC-177" /%}: theme and site templates.
- {% ref "SPEC-186" /%}, {% ref "SPEC-182" /%}: the content-model features D7 builds on.
- {% ref "SPEC-195" /%}: the value vocabulary `computes` is written in.

{% /spec %}
