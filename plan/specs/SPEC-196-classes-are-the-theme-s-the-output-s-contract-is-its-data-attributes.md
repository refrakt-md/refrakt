{% spec id="SPEC-196" status="draft" tags="theme, classes, bem, contracts, vocabulary, css, behaviors, architecture" %}

# Classes are the theme's: the output's contract is its data attributes

## Summary

The identity transform puts the same facts on its output twice: as data attributes
(`data-rune`, `data-name`, `data-section`, `data-zone-layout`, modifier values) and as BEM
classes built from them (`rf-codegroup__topbar`, `rf-hint--warning`). This spec makes the data
attributes the contract, and makes classes a theme setting:

- **`classes: "bem"`** is a built-in generator that reproduces today's output byte for byte. It
  is the default, so nothing changes for Lumina or for any site's CSS;
- **`classes: "none"`** emits no classes, for classless stylesheets;
- **a mapping table** adds the classes a theme names, so a theme can be built on a CSS framework
  with fixed class names (DaisyUI, Bootstrap) or on utility classes.

It also settles which runes get BEM classes. That question is no longer about a rune's
implementation (native or composed) or its role (primitive or domain rune). Every rune's output
carries the same data attributes, and the theme's setting decides what classes follow.

## Context

- **{% ref "ADR-043" /%} decision 3 already made this move once.** The engine stopped adding
  `rf-badge` to field values because "the engine emits meaning, not shape"; pill geometry moved
  to CSS keyed on `[data-meta-type]`. BEM classes are the remaining shape the engine decides.
- **The class prefix is already the theme's** (`ThemeConfig.prefix`,
  `packages/transform/src/types.ts`), so class naming is partly a theme setting today.
- **The question that prompted this.** Under {% ref "SPEC-194" /%} D5, a native rune that moves
  to a definition keeps its `block`, and so its BEM classes. A composed rune has none
  ({% ref "SPEC-145" /%} D2). Theme authors would face two kinds of output, split by how each
  rune happens to be implemented: the boundary {% ref "ADR-048" /%} set out to remove. Options
  considered were blocks by implementation, blocks by role (primitives and drawings only), and
  blocks for every definition. Each kept the engine deciding the theme's class names.

## What exists, measured

*Measured on 2026-11-09.*

- **Where the engine makes classes** (`packages/transform/src/engine.ts`,
  `packages/transform/src/facets/`):

  | Class | Made by | Data-attribute twin today |
  |---|---|---|
  | block, `rf-{block}` | `transformRune` (`engine.ts:351`) | `data-rune` on the root |
  | element, `rf-{block}__{name}` | `applyBemClasses` (`engine.ts:711`) | `data-name` |
  | modifier, `rf-{block}--{value}` | `modifiersFacet` | yes, `data-{modifier}` |
  | width, spacing, inset (`--{value}`, `--spacing-…`, `--inset-…`) | `facets/box.ts` | yes, from the axis values |
  | `--has-bg` | `facets/bg.ts` | yes, `data-bg` |
  | `--tinted` | `facets/tint.ts`, only when tint tokens resolve | **unclear**: `data-tint-dark` and colour-scheme attributes exist, but no attribute says "tokens resolved" |
  | context modifier, `--{suffix}` when nested in a named parent (`rf-card--in-recipe`) | `contextModifiersFacet` | **none** |
  | static modifier, always applied | `staticModifiersFacet` | **none** |
  | `rf-{block}__ordinal` on sequence items | `numberItems` (`engine.ts:905`) | **none** |

- **JavaScript selects by class.** `@refrakt-md/behaviors` has 29 hard-coded `.rf-` selectors
  (for example `.rf-datatable__sort-indicator`, `.rf-chart__bar`, `.rf-codeblock`), beside 40
  that already use `data-name` or `data-rune`. Because the prefix is configurable, these break
  today for any theme with another prefix: a latent bug, whatever this spec decides.
- **The contracts record class selectors.** `contracts/structures.json` (and its copy in
  `packages/lumina/contracts/`) records each rune's `root` (`.rf-accordion`), element
  `selector`s (`.rf-accordion__preamble`) and axis selectors (`.rf-accordion--tinted`). The CSS
  coverage test (`packages/lumina/test/css-coverage.test.ts`) derives expected BEM selectors
  from config and checks they exist in Lumina's CSS.
- **Lumina is written in BEM.** Its rune stylesheets hold 1,780 `.rf-` selectors and 894
  `[data-*]` selectors. 766 of the `.rf-` selectors are in stylesheets for runes planned to
  become compositions, which lose their block under SPEC-145 D2 anyway.
- **The three composed runes need no rune CSS.** `hero`, `cta` and `testimonial` are styled only
  through the primitives they place: no selector names them in Lumina, the skeleton or the
  marketing plugin.

## Decisions

### D1: the output's contract is its data attributes

What a rune's output means is carried by data attributes: `data-rune`, `data-name`,
`data-section`, `data-zone-layout`, `data-meta-type`, the modifier and axis attributes, and the
rest of the vocabulary ADR-043 names. Classes carry nothing the attributes do not. A theme,
behaviour script, component or test that needs to recognise something in the output reads its
attributes.

### D2: the theme's `classes` setting

```js
classes: "bem"        // the default: today's classes, byte for byte
classes: "none"       // no classes at all
classes: [ … ]        // a mapping table (D3)
classes: { bem: { prefix: "rf" }, add: [ … ] }   // BEM plus mapped classes
```

- **`"bem"` reproduces today's output exactly.** It uses a rune's declared `block` as the
  block name where it has one (`codegroup` for `data-rune="code-group"`, `toc` for
  `table-of-contents`), and its `data-rune` name otherwise. `ThemeConfig.prefix` becomes this
  generator's option.
- **`"none"`** serves classless stylesheets (Pico, Water.css), and themes written entirely
  against data attributes.
- **The setting is declarative.** It is data in the theme's config, never a function. A theme
  stays possible without code ({% ref "ADR-035" /%}'s skin format), and no theme code runs in
  the hosted story.
- **It only adds classes.** It cannot add or remove attributes or elements, or remove classes an
  author wrote. So it can never become a way around SPEC-194 D11.
- **A site may extend its theme's setting**, as it overrides tokens: its `add` entries are
  appended after the theme's.

### D3: the mapping table

```js
classes: [
	{ match: { rune: "hint" },                         add: "rounded-lg border p-4" },
	{ match: { rune: "hint", "hint-type": "warning" }, add: "border-amber-400 bg-amber-50" },
	{ match: { "zone-layout": "bar" },                 add: "flex items-center gap-2" },
	{ match: { section: "header" },                    add: "font-semibold" },
	{ match: { "meta-type": "status" },                add: "badge" },
]
```

- **Match keys are the vocabulary.**
  - `rune`: the element's owning rune (D4);
  - `name`: its `data-name`;
  - `root: true`: the rune's root element;
  - `section`, `zone-layout`, `meta-type`, `media`: their attributes;
  - any other key matches the `data-<key>` attribute;
  - `parent`: the parent rune, for what context modifiers express today.

  Every key in an entry must match. An unknown key, or a value outside a closed vocabulary set,
  is reported when the theme loads.
- **All matching entries apply**, in table order, and their classes are joined. There are no
  priorities and no removal.
- **Class names appear literally in the table**, so Tailwind's content scanner, pointed at the
  theme's config, sees every utility the table uses.
- **Matching on `rune` is presentation, not rune configuration.** It is the same power as CSS on
  `[data-rune]`, which ADR-043 lists as the theme's special-case hook. The add-only rule (D2) is
  what keeps it presentation.

### D4: an element's owner is its nearest ancestor with `data-rune`

BEM element classes are owned: today the engine gives `rf-codegroup__topbar` only to
codegroup's own elements, never to an element of a rune nested in one of its slots. The class
setting keeps that. An element belongs to its nearest ancestor that carries `data-rune`, and
`rune` in a match (and the block in `"bem"`) is that owner. This is exactly the owner the engine
uses today.

The setting is applied in the engine's existing pass, where `applyBemClasses` runs now. It does
not add a second walk over the tree.

### D5: every fact a class carries becomes an attribute first

Before classes become optional, each fact that only a class carries today gets a data
attribute. The engine then emits both, so that nothing is lost when a theme chooses `"none"`:

| Class only today | Proposed attribute |
|---|---|
| context modifier (`rf-card--in-recipe`) | the parent rune, for example `data-in="recipe"` |
| static modifier | `data-<name>` |
| `rf-{block}__ordinal` | `data-name="ordinal"`, as other named parts have |
| `--tinted` (tokens resolved) | `data-tinted`, if no existing attribute already says it |

The names are provisional and are settled in the first work item. Each is additive: no existing
selector stops matching.

### D6: behaviour scripts and components select by attribute only

The 29 `.rf-` selectors in `@refrakt-md/behaviors` move to `data-name` and `data-rune`, and a
test fails on any `.rf-` selector there. Svelte components are checked the same way. This is
worth doing first and regardless: it fixes the latent prefix bug.

### D7: contracts in two layers

- **The vocabulary contract** is theme-neutral. It records each rune's structure in data
  attributes (`[data-rune="accordion"]`, `[data-name="preamble"]`, axis attributes), where
  `structures.json` records `.rf-` selectors today. It is what `refrakt contracts --check` gates,
  and what ADR-043 decision 5's vocabulary coverage check reads.
- **A theme's class contract** records the classes its setting produces for each element. It is
  generated by running the setting over the vocabulary contract, and shipped in the theme's
  `contracts` export, as Lumina ships `structures.json` today (and as ADR-045 already makes
  contracts per theme for templates).
- **Lumina's CSS coverage test** reads its expected selectors from Lumina's class contract
  instead of deriving BEM from config. With `"bem"`, the selectors it checks are the ones it
  checks today.
- The two committed copies of `structures.json` stay in lock-step as now. The vocabulary
  contract replaces them, and Lumina's class contract is added beside its copy.

### D8: compositions get classes too, under `"bem"`

Under `"bem"`, the generator gives a composed rune `rf-{rune}` classes from its `data-rune` and
`data-name`s, as it does any other rune. That amends SPEC-145 D2's "a composed rune has no
block":

- **What stands:** a composed rune **ships no CSS**, D2's load-bearing half, which keeps
  untrusted CSS out of the hosted story. D2a's block-less engine config also stands.
- **What changes:** classes are the theme's to generate, for every rune alike.

Whether Lumina *writes* rune-specific CSS against those classes is a separate question, governed
by {% ref "ADR-044" /%}: its per-rune stylesheets drain as runes compose, and `hero`, `cta` and
`testimonial` show that no rune CSS is needed where the vocabulary suffices.

### D9: migration

- **Nothing changes by default.** `"bem"` is byte-identical, so Lumina's CSS, every site's CSS,
  and the SEO and structure baselines are untouched.
- **D5 is additive** (new attributes only), and D6 is internal to refrakt's packages.
- **D7 changes the contract file's shape.** That is a breaking change for anyone reading
  `structures.json`, and it ships through {% ref "SPEC-189" /%}'s migration table.

## Rationale

- **It moves a presentation decision to the presentation layer.** Class names are how a
  stylesheet is organised. They have never been meaning, and the output already carries the
  meaning separately.
- **It ends the native/composed split in CSS without choosing which runes deserve classes.**
- **It makes existing CSS frameworks usable as themes.** A framework with fixed class names
  (DaisyUI's `btn` and `alert`, Bootstrap's `card`) cannot be retargeted with selectors; a
  mapping is the only way to use it. Utility-first themes gain less: a Tailwind site can already
  write `[data-rune="hint"] { @apply … }` against today's output. Classless stylesheets gain
  `"none"`.
- **It costs nothing by default** and runs in a pass the engine already makes.

## Acceptance criteria

- [ ] Every fact a class carries today also has a data attribute (D5), and a test derives the list of classes from the engine and fails on one without a twin
- [ ] `@refrakt-md/behaviors` and the Svelte components contain no `.rf-` selectors, and a test enforces it (D6)
- [ ] `classes: "bem"` produces byte-identical output to today across the structure contracts, the SEO baseline and Lumina's CSS coverage test
- [ ] `classes: "none"` produces output with no engine-made classes, and every behaviour still works
- [ ] A mapping table adds classes by vocabulary match, joins all matching entries in order, reports unknown keys and values, and cannot add attributes or elements
- [ ] An element's owner for matching and for `"bem"` is its nearest ancestor with `data-rune` (D4), with a test on nested runes
- [ ] The vocabulary contract records data-attribute selectors, and Lumina ships a class contract generated from its setting (D7)
- [ ] A fixture theme built on a mapping table renders `hint`, `codegroup` and a composed `hero` with framework classes only
- [ ] The theme-authoring docs describe the setting, with `"bem"`, `"none"` and a mapping-table example

## Open questions

- **The attribute names in D5.** `data-in` for a parent context, and whether `--tinted` needs
  its own attribute.
- **Combining settings across themes.** A theme that extends Lumina may want Lumina's BEM plus
  its own mapped classes; `{ bem, add }` covers that. Whether a child theme can also *drop* the
  parent's mapping is undecided; add-only suggests not.
- **Specificity.** Rules written against data attributes and descendant combinators have
  different specificity from single classes. A theme moving from BEM to attribute selectors may
  need `@scope` or `:where()` to keep its cascade. That is guidance for theme authors, not a
  constraint on this spec, but the docs should say it.
- **The editor.** Its previews show the active theme's classes. Nothing should depend on them,
  but it is worth checking that the editor reads attributes, as D6 requires of behaviours.

## References

- {% ref "ADR-043" /%}: decision 3 (the engine emits meaning, not shape) and decision 5 (vocabulary coverage).
- {% ref "ADR-044" /%}: Lumina's per-rune CSS drains as runes compose.
- {% ref "ADR-045" /%}: contracts per theme.
- {% ref "ADR-035" /%}: the skin format, which is why the setting is declarative.
- {% ref "ADR-048" /%}, {% ref "SPEC-194" /%}: the native/composed boundary this removes from CSS; SPEC-194 D5 keeps `block` as the BEM name.
- {% ref "SPEC-145" /%}: D2 and D2a, amended by D8.
- {% ref "SPEC-189" /%}: the migration table for the contract change.

{% /spec %}
