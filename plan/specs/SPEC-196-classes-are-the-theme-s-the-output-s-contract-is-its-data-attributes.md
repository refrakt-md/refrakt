{% spec id="SPEC-196" status="draft" tags="theme, classes, bem, contracts, vocabulary, css, behaviors, architecture" %}

# Classes are the theme's: the output's contract is its data attributes

## Summary

The identity transform puts the same facts on its output twice: as data attributes
(`data-rune`, `data-name`, `data-section`, `data-zone-layout`, modifier values) and as BEM
classes built from them (`rf-codegroup__topbar`, `rf-hint--warning`). This spec makes the data
attributes the contract, and makes classes a theme setting:

- **`classes: "bem"`** is the default built-in generator. It classes **the vocabulary**:
  primitives and drawings. Domain runes get no rune classes (D8). A rune not yet moved to a
  definition keeps today's classes, so nothing changes until each rune is converted;
- **`classes: "none"`** emits no classes, for classless stylesheets;
- **a mapping table** adds the classes a theme names, so a theme can be built on a CSS framework
  with fixed class names (DaisyUI, Bootstrap) or on utility classes.

It also settles which runes get BEM classes, by what a rune is for, not by how it is built.
Converting a rune aims at a simpler design language, not at parity with its current look: a
domain rune is styled through the primitives it places and the universal dimensions, and its
own stylesheet is triaged away at conversion (D11).

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
  | `--tinted` | `facets/tint.ts`, only when tint tokens resolve | **almost**: `data-tint` differs only for an unknown tint name or `tint="custom"` with no tokens (D5) |
  | context modifier, `--{suffix}` when nested in a named parent (`rf-card--in-recipe`) | `contextModifiersFacet` | **none** |
  | static modifier, always applied | `staticModifiersFacet` | **yes, in every first-party use** (D5) |
  | `rf-{block}__ordinal` on sequence items | `numberItems` (`engine.ts:905`) | **yes**, `data-name="ordinal"` (D5) |

  *Corrected 2026-11-09* after the D5 measurement: an earlier draft listed the last two as
  having no twin.
- **Classes made outside the engine.** Some output carries hard-coded classes that no theme
  setting reaches, and some of them are read back by code:
  - the code-block wrapper `rf-codeblock` (`packages/runes/src/nodes.ts:146`) and
    `rf-table-wrapper` (`nodes.ts:426`), read back by `datatable.ts:48` and `compare.ts:52`;
  - `rf-nav--collapsible`, written by the `nav` schema itself (`packages/runes/src/tags/nav.ts:331`);
  - the layout chrome in `packages/transform/src/layouts.ts`: the mobile panel, the search
    trigger's key hint and the docs sidebar (`rf-docs-sidebar`, which `ThemeShell.svelte`
    selects at lines 76 and 95).

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

- **`"bem"` classes primitives and drawings** (D8), naming each block after the rune's
  `data-rune` (D10). A rune still configured in code keeps its configured `block` and today's
  classes until it moves to a definition, so the setting changes no output on the day it
  lands. `ThemeConfig.prefix` becomes this generator's option.
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
| context modifier (`rf-card--in-recipe`) | **`data-in="<parent rune>"`** on runes that declare the parent |
| static modifier | **none needed**: retarget the CSS |
| `rf-{block}__ordinal` | **none needed**: already `data-name="ordinal"` |
| `--tinted` (tokens resolved) | **`data-tinted`**, a presence flag, or retire the class |

*Settled 2026-11-09* by a measurement of every producer and every CSS selector:

- **Context modifiers are the only fact truly lost under `"none"`.** 9 runes declare them
  (`hint` in `hero` and `feature`, `actions` in `bar`, `showcase` in `bento-cell`, three design
  runes in `design-context`, `preview` and `feature`). Lumina and the skeleton use them in 31
  selectors, most often `actions--in-bar` (11) and `showcase--in-bento-cell` (6). The parent's
  `data-rune` is on an ancestor, but no ancestor selector says "the nearest enclosing rune".
  Every suffix is exactly `in-` plus the parent's name, so `contextModifiers` reduces to a list
  of parents, and `data-in` carries it.
- **Static modifiers are already said by attributes** in every first-party use:
  `rf-featured-tier--featured` by `data-rune="featured-tier"`, and the `cover` modifier on
  `card`, `section` and `recipe` by `data-media-position="cover"` and `data-cover-scope`. The 14
  selectors using them (9 `section--cover`, always beside `[data-media-position="cover"]`, and
  5 `tier--featured`) are retargeted, and the field is deprecated (SPEC-194 D5).
- **The ordinal is already satisfied.** The engine emits `data-name="ordinal"` and
  `data-meta-type="quantity"` on it (`engine.ts:903`), and every rule styling it uses
  `[data-sequence="numbered"] > li > [data-name="ordinal"]`. No CSS uses the class.
- **`--tinted` is styled nowhere** (0 selectors; `[data-tint]` has 16). It differs from
  `data-tint` only for an unknown tint name or `tint="custom"` with no tokens. `data-tinted=""`
  follows the `data-tint-dark=""` convention. `data-tint` is not narrowed, since that would
  change what existing `[data-tint]` rules match.
- **The names are free.** `data-in`, `data-tinted`, `data-cover` and `data-featured` appear
  nowhere in the packages or plugins. `data-parent` is taken (a `realm` field), which is why
  `data-in` is used.

Each addition is additive: no existing selector stops matching.

### D6: behaviour scripts and components select by attribute only

Selectors in `@refrakt-md/behaviors` and the Svelte components move to `data-name`, `data-rune`
and the other vocabulary attributes, and a test fails on any `.rf-` selector there. This is
worth doing first and regardless: it fixes the latent prefix bug.

**Measured 2026-11-09** (every behaviour and web component read; a few toolbar builders
skimmed):

- **27 class-selector sites**, plus 2 in Svelte (`ThemeShell.svelte` selects `rf-docs-sidebar`):
  - **13 select classes the behaviour injected itself**, and keep matching under `"none"`;
  - **14 select classes something else emits**, and break. Their swaps:

    | Behaviour | Selects | Becomes |
    |---|---|---|
    | `drawer` | `.rf-drawer__close` | `[data-name="close"]` (exists) |
    | `rf-diagram` | `.rf-diagram__container`; returns before rendering under `"none"` | `[data-name="container"]` (exists) |
    | `rf-map` | `.rf-map__container`, `ol` | `[data-name="container"]`, `[data-name="pins"]` (exist) |
    | `mockup` | `.rf-mockup__frame`, and `parentElement` of the host | `[data-name="frame"]` (exists), `closest('[data-section="media"]')` |
    | `datatable` | `.rf-datatable__scroll` | `[data-name="scroll"]` (exists) |
    | `copy` | `rf-codeblock` (×2) | **a new attribute** on the code-block wrapper |
    | `mobile-menu` | `.rf-mobile-panel` and `--nav` (×3) | **new attributes** on the layout chrome |
    | `search` | `.rf-search-trigger__kbd` | **a new attribute** on the layout chrome |

    Three of the 14 are dead: `.rf-map__fallback` and `section-nav`'s `.rf-plan-relationships`
    (×2) have no emitter anywhere.
- **Classes written onto rune-owned elements** must stop, since under `"none"` they put classes
  back: `reveal` (`rf-reveal-step--visible`/`--hidden`), `tabs` (an `--active` class derived from
  the first button's class, which a mapping would turn into junk like `px-3--active`), the audio
  player (`rf-track--active`) and `copy`. Each already has, or gets, `data-state`, and the CSS
  moves to it.
- **Classes on elements a behaviour creates** (about 70 `className =` writes: toolbars, buttons,
  indicators) are the behaviour's own UI. They also get a `data-name`, so the CSS styling them
  can move to attributes and `"none"` holds for the whole page. They are lower priority than
  the two kinds above, because nothing breaks while they keep their classes.
- **Classes made outside the engine** (listed under "What exists") get data-attribute twins, so
  the swaps above have something to select.
- **A bug found on the way:** `nav-menubar` looks for each group's list as `:scope > ul,
  :scope > ol` (`packages/behaviors/src/behaviors/nav-menubar.ts:30`), but `nav-group` always
  wraps its items in `<div data-name="panel">` (`packages/runes/src/tags/nav.ts:252`), so every
  group is skipped. It was confirmed by reading, not run, and there is no menubar behaviour test.
  The swap to `[data-name="panel"]` fixes it. Filed as {% ref "BUG-048" /%}, to be fixed on its
  own, ahead of this spec.

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

### D8: `"bem"` classes primitives and drawings, never domain runes

*Revised 2026-11-09.* An earlier draft gave every rune classes under `"bem"`, composed ones
included, so that existing rune CSS would keep matching after conversion. Parity is the wrong
goal: a class that exists invites a rule that names the rune, which is the per-rune styling
{% ref "ADR-044" /%} drains. So `"bem"` classes only what the shared design language is made
of:

| A definition's `role` | What it is | Classes under `"bem"` |
|---|---|---|
| `primitive` | something other runes place: `section`, `card`, `grid`, `tab-group`, the value primitives, `nav`'s tree | `rf-{rune}` and its elements: these *are* the vocabulary themes style |
| `drawing` | a rune whose inside the vocabulary cannot express: `chart`, `map`, `diagram`, `audio`, `juxtapose` (SPEC-194 D8) | `rf-{rune}` and its elements, as hooks for its own token-only CSS (ADR-044 tier 3) |
| domain (the default) | a rune that arranges primitives: `recipe`, `hero`, `codegroup`, `pagination`, `collection` | **none**. It carries `data-rune` and its parts' `data-name`s like every rune, and is styled through the primitives it places |

- **`role` is declared in the definition** ({% ref "SPEC-194" /%} D1). It defaults to domain, so
  a rune has to claim to be part of the vocabulary.
- **For composed domain runes this is SPEC-145 D2 unchanged:** no block, and no CSS shipped. A
  composed *primitive* (`card` once SPEC-160 D3 composes it) does get classes, which is the one
  amendment to D2.
- **The rare special case** a theme needs for one domain rune is CSS on `[data-rune]`, which
  ADR-043 lists as the theme's special-case hook, and which D11's lint keeps on a reviewed list.
- **A theme that wants per-rune classes** can add them with a mapping entry
  (`{ match: { rune: "recipe" }, add: "…" }`). It is possible, explicit, and never the default.

The three composed runes show that this works: `hero`, `cta` and `testimonial` have no rune CSS
anywhere and render through `section`, `pullquote` and the universal dimensions.

### D9: migration

- **Nothing changes on the day the setting lands.** Every rune is still configured in code (and
  keeps its classes) or is a composed domain rune (which has none already), so Lumina's CSS,
  every site's CSS and the SEO and structure baselines are untouched.
- **Classes then change one rune at a time**, when the rune becomes a definition: a domain rune
  loses its classes through D11's triage, and a primitive keeps them under its D10 name. Each is
  a breaking change for that rune, recorded in its migration note, as SPEC-181 already does for
  each composition's go-live.
- **D5 is additive** (new attributes only), and D6 is internal to refrakt's packages.
- **D7 changes the contract file's shape.** That is a breaking change for anyone reading
  `structures.json`, and it ships through {% ref "SPEC-189" /%}'s migration table.

### D10: the BEM name is the rune name

*Decided 2026-11-09.* The `"bem"` generator names every block after the rune's `data-rune`, and
`block` stops being a separate name. Definitions already reject a `block` key (`STYLE_KEYS`,
`packages/runes/src/lib/composition.ts:1735`), and its only remaining consumer would be the BEM
generator, so the alias is removed rather than admitted.

Nine runes have a configured `block` that differs from their `data-rune` (*measured
2026-11-09*). What happens to each depends on its role (D8). Selector counts are `.rf-`
selectors across Lumina, the skeleton and plugin styles, by pattern, so approximate:

| Rune (`data-rune`) | Classes today | Role (provisional) | Outcome | Selectors |
|---|---|---|---|---|
| `tab-group` | `rf-tabs` | primitive | renamed `rf-tab-group` | ~10 |
| `data-table` | `rf-datatable` | primitive | renamed `rf-data-table` | ~20 |
| `pull-quote` | `rf-pullquote` | primitive (placed by `testimonial`) | renamed `rf-pull-quote` | ~21 |
| `media-text` | `rf-mediatext` | primitive | renamed `rf-media-text` | ~35 |
| `text-block` | `rf-textblock` | primitive, to confirm | renamed `rf-text-block` | ~31 |
| `code-group` | `rf-codegroup` | domain | no classes once it is a definition; its CSS is triaged (D11) | ~26 |
| `table-of-contents` | `rf-toc` | domain | likewise | ~12 |
| `how-to` (learning) | `rf-howto` | domain, a planned composition | likewise | ~13 |
| `featured-tier` (marketing) | `rf-tier`, shared with `tier` | domain, a planned composition | likewise, with the `pricing` composition | ~20, shared |

*Revised 2026-11-09* with D8: an earlier draft renamed all nine. Only runes that keep classes
are renamed; a domain rune's classes go when it becomes a definition, so renaming it first would
change its selectors twice.

- **The renames ship through {% ref "SPEC-189" /%}'s migration table.** For one release the
  generator emits both names, old and new, and a warning names every selector still using an
  old one. The old names are then removed. The rename is a fixed map, so a codemod rewrites
  selectors in CSS.
- **Which runes are primitives is settled rune by rune.** The roles above are provisional.
  `text-block` in particular may be a domain rune; each is confirmed in the work item that gives
  it a definition.

### D11: a converted rune ships no rune CSS: its stylesheet is triaged

*Decided 2026-11-09.* Converting a rune, to a composition or to a native definition, aims at a
simpler design language that relies on primitives and universal dimensions, not at parity with
how the rune looks today. So conversion is where its stylesheet is dealt with, rule by rule.

**Every rule in the rune's stylesheet ends in one of three places:**

| Outcome | When | Example |
|---|---|---|
| **dropped** | the difference is an accepted simplification | a rune-specific gap or border the primitive's own spacing replaces |
| **promoted** | the rule expresses something other runes need too | a new universal dimension value, an arrangement, a primitive option, a vocabulary value (`data-meta-type`, `data-sentiment`) |
| **an exception, on the list** | the rune is a drawing (D8), or a reviewed special case on `[data-rune]` | `map`'s tiles, `chart`'s bars |

Visual differences after conversion are expected. Each one is either accepted or becomes a
vocabulary improvement that every rune gets.

**A lint holds the line where CSS is written.** Lumina's coverage test fails on any selector
naming a domain rune (`.rf-<rune>…` or `[data-rune="<rune>"]`) that is not on a reviewed
allowlist:

- the allowlist starts as today's rune stylesheets, so nothing fails on the day the lint lands;
- it may only shrink: a test fails if an entry is added without a drawing role or a recorded
  reason;
- each conversion removes its rune from the list, which is its triage gate
  ({% ref "SPEC-181" /%}'s fifth go-live gate);
- drawings keep their entries, with their CSS in tokens only (ADR-044 tier 3).

**The scale is real.** About 1,000 of Lumina's 1,780 rune-stylesheet selectors belong to runes
that stay native, mostly domain runes (`collection`, `pagination`, `codegroup`, `form`, `blog`,
`relationships`, `actions` and others). `nav` alone has 229, and most of those stay with its
tree primitive. Triaging them is design work, not a mechanical migration. The allowlist lets it
happen one rune at a time.

## Rationale

- **It moves a presentation decision to the presentation layer.** Class names are how a
  stylesheet is organised. They have never been meaning, and the output already carries the
  meaning separately.
- **It ends the native/composed split in CSS.** Whether a rune has classes follows from what it
  is for (D8), never from how it is built.
- **It keeps pressure on the vocabulary.** A domain rune that cannot be styled through
  primitives and dimensions shows a gap in them. D11 turns that gap into a vocabulary
  improvement instead of another rune stylesheet.
- **It makes existing CSS frameworks usable as themes.** A framework with fixed class names
  (DaisyUI's `btn` and `alert`, Bootstrap's `card`) cannot be retargeted with selectors; a
  mapping is the only way to use it. Utility-first themes gain less: a Tailwind site can already
  write `[data-rune="hint"] { @apply … }` against today's output. Classless stylesheets gain
  `"none"`.
- **It costs nothing by default** and runs in a pass the engine already makes.

## Acceptance criteria

- [ ] Every fact a class carries today also has a data attribute (D5), and a test derives the list of classes from the engine and fails on one without a twin
- [ ] `@refrakt-md/behaviors` and the Svelte components contain no `.rf-` selectors, and a test enforces it (D6)
- [ ] On the day `classes: "bem"` lands, output is byte-identical to today across the structure contracts, the SEO baseline and Lumina's CSS coverage test (every rune is still configured in code or is a composed domain rune)
- [ ] Under `"bem"`, a definition with `role: primitive` or `role: drawing` gets `rf-{rune}` classes, and a domain definition gets none (D8)
- [ ] Lumina's coverage test fails on a selector naming a domain rune that is not on the allowlist; the allowlist starts as today's rune stylesheets and a test fails when an entry is added without a drawing role or a recorded reason (D11)
- [ ] `classes: "none"` produces output with no engine-made classes, and every behaviour still works
- [ ] A mapping table adds classes by vocabulary match, joins all matching entries in order, reports unknown keys and values, and cannot add attributes or elements
- [ ] An element's owner for matching and for `"bem"` is its nearest ancestor with `data-rune` (D4), with a test on nested runes
- [ ] The vocabulary contract records data-attribute selectors, and Lumina ships a class contract generated from its setting (D7)
- [ ] A fixture theme built on a mapping table renders `hint`, `codegroup` and a composed `hero` with framework classes only
- [ ] The renames in D10 ship through SPEC-189 with one release emitting both names, for the runes that keep classes only
- [ ] The theme-authoring docs describe the setting, with `"bem"`, `"none"` and a mapping-table example

## Open questions

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
- {% ref "SPEC-145" /%}: D2 and D2a, which D8 keeps for domain runes and amends for composed primitives.
- {% ref "SPEC-181" /%}: the go-live gates D11 adds a fifth to.
- {% ref "SPEC-189" /%}: the migration table for the contract change.

{% /spec %}
