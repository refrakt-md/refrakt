{% decision id="ADR-028" status="proposed" date="2026-09-05" source="SPEC-125" tags="runes,attributes,schema,config,theme,architecture" %}

# Attribute applicability is rune identity, not theme configuration

## Context

Every rune built with `createContentModelSchema` gets ~37 universal attributes
merged into its Markdoc schema — `tint`, `width`, `reading`, `dropcap`,
`elevation`, `prominence`, `frame*`, `substrate*`, `scrim*` and the rest
(`UNIVERSAL_ATTRIBUTE_NAMES` in `packages/runes/src/attribute-presets.ts`).
`refrakt reference` prints them under the heading **"Universal attributes
(available on every rune)"**.

That heading is false, and the falsity is not marginal. Several of those
attributes are silently or noisily inert depending on the rune's entry in
`ThemeConfig.runes`:

| Attribute | Gated on | Diagnostic when inert |
|---|---|---|
| `prominence` | `sections` has a header-ish role | warns |
| `dropcap` | resolved reading register is `prose` | warns |
| `frame*` | `frameTarget`, or `sections` has a `media` role | warns |
| `substrate-target="media"` | `sections` has a `media` role | warns |
| `reading` | `sections` has a `body` role | **silent** |
| `content-place` | rune declares a `content-place` modifier | **silent** |
| `scrim*` (cover) | rune declares a `media-position` modifier | **silent** |

The measurement that surfaced this is on {% ref "WORK-527" /%}: the structure
contract now records 686 per-rune unavailability entries across the 132-rune
catalog. 111 runes can never carry `data-reading`; 92 can never carry
`data-prominence`. None of that was inspectable before.

Three facts make this a decision rather than a bug report:

- **`sections` lives in `ThemeConfig.runes`, and `mergeRuneConfig` shallow-merges
  it.** A theme can write `runes: { Card: { sections: {} } }` and silently
  disable `reading` on every card in a site. Nothing prevents it. (Lumina does
  not; the capability is unused, not absent.)
- **The project has already classified `sections` as identity.**
  `packages/transform/src/validate.ts` enforces
  `IDENTITY_FIELDS = ['block', 'modifiers', 'sections', 'variants']` against
  {% ref "SPEC-091" /%} variant deltas, with the rule that a delta "restructures a
  rune, never redefines it". The same field is unguarded on the theme-override
  path. This is one position applied to one of two merge paths.
- **The schema layer cannot see any of it.** Markdoc schemas are built from rune
  definitions and know nothing about `RuneConfig`. That is why `refrakt
  reference` prints the blanket claim, and why the language server's
  `completeAttributeNames` offers every universal attribute on every rune: from
  where they stand, applicability is invisible.

## Decision

**Attribute applicability is a property of the rune, never of the theme.** It is
derived from rune-structural facts (which sections a rune has, which modifiers it
declares), and those facts are identity fields that a theme override may not
redefine.

Concretely:

1. The `IDENTITY_FIELDS` rule already enforced for variant deltas extends to
   theme overrides. `block`, `modifiers` and `sections` become non-overridable on
   every merge path into `RuneConfig`.
2. Applicability becomes visible at **schema-build time**, so a rune's Markdoc
   schema offers only the universal attributes that can do something on it. Every
   downstream consumer — `refrakt reference`, the language server, Markdoc
   validation — then becomes correct without loading theme config at all.
3. Whether a rune offers universal attributes is answered by a **declared rule**,
   not by which schema constructor it happened to use.

### The two senses of "a theme not supporting an attribute"

These were conflated in the discussion that produced this ADR, and separating
them is most of the decision:

- **Styling** — the theme's CSS does nothing with `data-elevation`. This is
  entirely the theme's business and is **already fully decoupled**: a theme that
  ignores an axis simply ships no rule for it. Nothing needs building, and
  nothing here restricts it.
- **Emission** — the engine does not put `data-elevation` on the element.

Emission stays theme-agnostic, and **no mechanism will be added for a theme to
suppress it**. A theme opting out of an axis is a CSS non-decision, not a config
switch.

### Theme-agnostic is not the same as universal

`reading` remains inapplicable on a rune with no body text. That is a *rune*
fact and a permanent one. The rule being adopted is "applicability varies by
rune, never by theme" — not "every attribute applies everywhere".

## Consequences

**Content becomes portable in fact, not just in principle.** Today the same
markdown can mean different things under different themes, because a theme can
change which attributes do anything. Markdown is the source of truth in this
project; a theme that can redefine what an author is allowed to express breaks
that premise. This closes it.

**The tooling becomes correct for free.** Once schemas encode applicability,
`refrakt reference`, editor completion and Markdoc validation all stop
over-promising without any of them learning to read theme config. That is the
main practical payoff, and it is why the fix belongs at schema-build time rather
than in each consumer.

**Silently-ignored attributes become validation errors.** `{% card
reading="prose" %}` moves from a silent no-op to a Markdoc error. This is the
intended outcome — an author who writes it today gets no feedback at all — but it
is a breaking change for existing content and needs a migration path.
{% ref "SPEC-125" /%} owns that.

**A data audit becomes a prerequisite.** Applicability is only worth freezing
into schemas if the underlying data is right, and it is not. Six runes have a
`body` slot but no `body` section role — **Card, BentoCell, Character, Realm,
Faction, Playlist** — and six have a title/header slot with no header-ish role —
**AccordionItem, BentoCell, CharacterSection, RealmSection, FactionSection,
ItineraryDay**. Card is the clearest: its layout is
`content: { children: ['eyebrow', 'body', 'footer'] }` and its content model is
literally "`body` (optional, repeatable any block)", yet `sections` is
`{ media: 'media' }`. A card obviously has body text; the role mapping was simply
never declared. Narrowing schemas before fixing this would freeze six wrong
exclusions and reject content whose author is right and whose config is wrong.
The remaining 105 runes with neither a body role nor a body slot are genuinely
bodyless, so the audit is small.

**Some theme flexibility is deliberately given up.** A theme can no longer
restructure a rune's semantic roles. It retains `layout`, `structure`, `styles`,
`contentWrapper`, `staticModifiers`, `autoLabel`, `editHints` and `projection` —
the same split {% ref "SPEC-091" /%} already draws for variants — so it can hide,
reorder, re-wrap and re-decorate, just not redefine what a section *is*.

## Alternatives considered

**Leave applicability in theme config and teach the consumers to read it.**
`refrakt reference` and the language server would load `refrakt.config.json`,
resolve the merged theme, and annotate or filter accordingly. Rejected on two
counts. It does not fix portability — a theme could still change what content
means — and it pushes config resolution into every consumer, including an
editor completion path that must stay fast and that today needs no theme at all.
The structure contract's `unavailable` map would make this *possible*; it does
not make it right.

**Keep schemas permissive; annotate rather than reject.** Schemas keep offering
every universal attribute, and tooling marks the inapplicable ones as inert.
Avoids the breaking change and keeps `{% card reading="prose" %}` working
(harmlessly). Rejected as the primary model because it preserves the silent
no-op as the default experience: the author still gets nothing unless they happen
to be in an editor that surfaces the annotation. It is, however, a reasonable
*transitional* mode, and {% ref "SPEC-125" /%} may adopt it as the migration step
before schemas narrow.

**Move `sections` out of `RuneConfig` entirely, onto the rune definition.**
Conceptually the cleanest expression of "this is rune identity" — the field would
live where the schema can already see it, and the guard would be unnecessary
because there would be nothing to override. Not decided here: it is a migration
across ~50 rune configs with real churn, and the applicability guarantee does not
depend on it. {% ref "SPEC-125" /%} evaluates placement as an implementation
question.

## References

- {% ref "SPEC-125" /%} — the spec this decision governs
- {% ref "SPEC-091" /%} — engine config variants; the source of the identity-field rule
- {% ref "SPEC-124" /%} — facet registry; made the universal axes inspectable
- {% ref "WORK-527" /%} — the measurement that surfaced this
- {% ref "SPEC-108" /%} — reading register; the silent-drop case
- {% ref "SPEC-107" /%} — elevation and prominence
- {% ref "SPEC-028" /%} — rune output standards

{% /decision %}
