{% decision id="ADR-043" status="proposed" date="2026-10-12" source="SPEC-145" tags="theme, composition, metadata, vocabulary, config, identity, architecture" %}

# A theme renders a vocabulary; it configures no rune

## Context

{% ref "ADR-028" /%} drew the line between a rune and its theme *inside* each rune's config.
Identity fields (`sections`, `schema`, `metaFields.*.metaType`, …) are the rune's, and
everything else may be overridden by the theme (`packages/transform/src/identity-fields.ts`).
That fitted a world where every rune was written once, in code, and kept deliberately neutral.
The only way to give a rune a look beyond CSS was to change its config, so the theme was given
that power.

Composition moves the definition into content. A rune can be defined by a plugin's file or by
a site's own `runes/` directory, and two sites can define `recipe` differently.
{% ref "ADR-042" /%} drew the first consequence: a theme cannot override a composed rune's
config, because it cannot know which definition it is facing. This decision draws the rest:
**what a theme is, once it cannot configure runes.**

Three facts frame the answer:

- **The reference theme already lives this way.** Lumina's config overrides no rune at all. It
  contributes tints and icons, and the comment on `luminaOverrides`
  (`packages/lumina/src/config.ts`) says so: *"it overrides no rune at all"*. Everything Lumina
  makes look different, it does in CSS, keyed on the shared vocabulary.
- **The vocabulary is closed and already in the output.** Primitive classes, `data-section`,
  `data-zone-layout`, `data-meta-type`, `data-meta-sentiment`, `data-media`, `data-sentiment`
  ({% ref "SPEC-163" /%}), `data-glyph` ({% ref "SPEC-164" /%}) and the universal axes are all
  closed sets. SPEC-145 D28 makes the value element of a field part of that contract.
- **One presentation decision is still made by the engine, not the theme.** `CHIP_METATYPES`
  in `packages/transform/src/engine.ts` gives `status`, `category` and `tag` values the
  `rf-badge` class, so the engine decides that those values look like pills.

## Options Considered

1. **Keep per-rune theme config for native runes indefinitely, and leave composed runes to
   CSS.** Two models side by side, with the boundary depending on how each rune happens to be
   implemented. A theme author has to know which kind every rune is.
2. **Give themes a new per-composition hook**, for example overrides keyed by `data-rune` that
   apply when the definition declares matching fields. This is ADR-042's rejected option 1 in a
   new form: still a guess about a definition the theme cannot see.
3. **The theme renders the vocabulary and configures no rune.** Its levers are global and
   rune-agnostic; everything about a particular rune belongs to the rune's definition.

## Decision

**Option 3.**

1. **A theme owns how each piece of meaning looks, and nothing about which meaning a rune
   has.** What it supplies:

   | The theme supplies | Through |
   |---|---|
   | How each piece of meaning looks: meta types, sentiment, zone layouts, axes, primitive classes | CSS, in the structure (skeleton) and skin layers |
   | Design values | tokens |
   | Named looks an author can choose | presets: tints, backgrounds, frames |
   | Drawings | glyph and ornament sets (SPEC-164) |
   | How each kind of value is formatted | `formats` (decision 4) |
   | Page chrome and interactive behaviour | layouts, components |
   | Special cases | CSS on `[data-rune]`, `[data-field]`, `[data-value]` |

   What it does not supply:

   | Not the theme's | Whose |
   |---|---|
   | Which fields a rune shows, their order, layout, labels, and sentiment mapping | the rune's definition |
   | Translations of a rune's text | the definition's owner, overridable by the site (SPEC-145 D29) |
   | A rune's structure | the definition, or core for a primitive |

   *(Amended by {% ref "ADR-045" /%}: for a composed rune, the order, layout and structure
   rows are the definition's by default, and a theme or site may arrange them with a
   replacement template. Which fields, labels and sentiment mapping stay the definition's.)*

2. **All of `metaFields` is the definition's.** {% ref "SPEC-158" /%} D3 made
   `metaFields.*.metaType` identity and left `label`, `sentimentMap` and `transform`
   presentational, so that a theme had something to override. Seen without that need, all
   three are claims about content:
   - `sentimentMap` says that "hard" is cautionary, which is the content author's statement;
   - `label` is copy, which SPEC-145 D29 translates as such;
   - `transform` names a kind of formatting, whose *style* is decision 4's.

   `metaFields` becomes identity as a whole, for every rune.

3. **The engine emits meaning, not shape.** The engine stops adding `rf-badge` to field values.
   - Pill geometry comes from the base stylesheet (`@refrakt-md/skeleton`), keyed on
     `[data-meta-type="status"]`, `"category"` and `"tag"`, and a theme restyles it like any
     other rule.
   - `{% badge %}` keeps its `rf-badge` class, because a badge is an authored pill. It already
     emits `data-meta-type="tag"` by default (`packages/runes/src/tags/badge.ts`), so the base
     rule covers it either way.
   - This closes SPEC-145 D28's open question on which values are chips. Under D28 decision 8,
     a chip and a plain value are already the same element; this removes the last difference
     the engine imposes.

4. **Formatting style is a theme-wide setting: `formats`.** "15m" or "15 minutes", "Oct 12" or
   "12 October 2026" is a presentation choice, but today it is fixed per field (`transform:
   'duration'`, and the locale-aware `formatDurationLocale`). Instead:
   - the output always carries the machine value: `<time datetime="PT15M">`, `data-value`;
   - the definition says what kind of value it is (`metaType: temporal`, `transform: duration`);
   - the theme says how that kind of value is displayed, once, for every rune:
     `formats: { duration: "long", date: "medium", number: "compact" }`;
   - a site may override the theme's `formats`, as it overrides tokens.

   It is the one config lever about fields that a theme gains, and it is global, so it never
   names a rune or a field.

5. **Coverage replaces per-rune guarantees.** A theme that cannot configure a rune cannot
   promise that the rune looks right, and does not need to: it needs to cover the vocabulary. A
   check reports, for every vocabulary value (each `metaType`, sentiment, zone layout, axis
   value and glyph concept), whether the theme styles it or leaves it to the base stylesheet.
   It extends Lumina's existing selector coverage test
   (`packages/lumina/test/css-coverage.test.ts`) from BEM selectors to vocabulary values.
   A theme that covers the vocabulary renders every composed rune, including runes written
   after it shipped.

6. **Native runes keep their theme override path as legacy.** ADR-028's guard still applies to
   them, and the `runes:` section of a theme's config stays valid for them until ADR-042's
   follow-up settles each one. No new theme lever is added there. Site-level component
   overrides (`overrides`, by `typeof`) are untouched: they replace a component, not a config,
   and are the site's choice, not the theme's.

## Rationale

- **It is where the reference theme already is.** Lumina overrides no rune. This decision
  states that as the model rather than as Lumina's habit.
- **It makes themes portable across definitions.** A theme written against the vocabulary
  renders a site's own `recipe`, a plugin's `recipe`, and a rune nobody had written when the
  theme shipped. Per-rune config could never offer that.
- **It completes ADR-028 rather than reversing it.** ADR-028's idea, that identity is not the
  skin's to change, stands. Only its location moves: from a line inside one config to the line
  between a definition and a theme.
- **The theme loses fine-grained control over a single rune.** CSS on `[data-rune]`,
  `[data-field]` and `[data-value]` covers most of what that control was used for. What a theme
  can never do again is restructure a rune, which under composition is correct.
  *(Narrowed by {% ref "ADR-045" /%}: a theme may arrange a composed rune's template, never
  redefine its input.)*

## Consequences

- **SPEC-158 D3 changes.** `metaFields` is identity in full, not only `metaType`.
  `IDENTITY_FIELDS` names `metaFields`, and a theme override of any part of it is reported and
  dropped, for native runes as well as composed ones.
- **SPEC-145 D28's open question is closed** by decision 3. D28 gets a pointer here.
- **The engine and the stylesheets change together.** The engine stops emitting `rf-badge` on
  field values in the same change that adds the base chip rule, so no theme sees a value lose
  its pill. The contract diff is reviewed.
- **`formats` needs a spec.** It names the value kinds (duration, date, time, number,
  currency), the styles each accepts, how a style combines with the locale, and how a site
  overrides it.
- **The theme-authoring docs are reorganised around the vocabulary.** They say:
  - what a theme supplies and what it does not (decision 1);
  - styling meaning before special cases (SPEC-145 D28's reading order);
  - overriding a composed rune's config is not possible, and why.
- **The coverage check becomes part of a theme's definition of done**, beside
  `refrakt contracts --check`.
- **Themes that override native runes' presentational `metaFields` keys**
  (`label`, `sentimentMap`, `transform`) **break** under decision 2. None of the first-party
  themes does; a third-party theme's override is reported and dropped, with a migration note.

{% /decision %}
