{% spec id="SPEC-125" status="draft" date="2026-09-05" tags="runes,attributes,schema,config,theme,cli,language-server,dx" %}

# Theme-independent attribute applicability

Make a rune's universal-attribute applicability a rune-structural fact, visible
at schema-build time, so authoring tools stop promising attributes that cannot
do anything.

Governed by {% ref "ADR-028" /%}, which settles the principle: applicability is
rune identity, never theme configuration; a theme may decline to *style* an axis
but never to *suppress its emission*.

## Problem

`refrakt reference card` prints, today:

> **Universal attributes (available on every rune):** tint, tint-mode, bg, width,
> reading, dropcap, spacing, inset, elevation, prominence, reveal, stagger,
> frame, …

On a card, `reading`, `dropcap` and `prominence` do nothing. The CLI states as a
fact something false about the rune it is describing. The language server's
`completeAttributeNames` has the same blind spot: it iterates the rune's Markdoc
schema attributes with no applicability filter, so the editor autocompletes
`prominence` on runes where the engine will drop it with a warning.

Both are correct *from where they stand* — schemas are theme-agnostic and
applicability currently lives in `ThemeConfig.runes`, which neither loads.

{% ref "WORK-527" /%} made the scale visible for the first time: 686 per-rune
unavailability entries across 132 runes. 111 runes can never carry
`data-reading`; 92 can never carry `data-prominence`.

Four of the seven gated axes warn when they are dropped. Three — `reading`,
`content-place` and the cover `scrim*` family — are entirely silent.

## Goals

- A rune's Markdoc schema offers only the universal attributes that can affect it.
- `refrakt reference`, editor completion and Markdoc validation become correct
  **without loading theme config**.
- Applicability cannot be changed by a theme.
- Universal-attribute availability is answered by a declared rule, not by which
  schema constructor a rune happened to use.
- Every inapplicable attribute an author writes produces feedback — no silent
  no-ops.

## Non-goals

- Letting a theme suppress attribute *emission*. Explicitly rejected in
  {% ref "ADR-028" /%}.
- Restricting what a theme may do with `layout`, `structure`, `styles`,
  `contentWrapper`, `staticModifiers`, `autoLabel`, `editHints` or `projection`.
- Migrating the six hand-written schemas to `createContentModelSchema`. See
  *Phase 3*.
- Changing any HTML the engine emits. This spec is about what authors may
  *write* and what tools *promise*; transform output is unchanged throughout.

## Phases

The ordering is load-bearing: **the data audit must land before schemas narrow**,
or wrong exclusions get frozen into validation errors.

### Phase 1 — Audit and correct the section-role data

Applicability is derived from `sections`, and `sections` is currently both
incomplete and, in places, over-declared. **The audit runs in both directions** —
a role that is missing wrongly denies an attribute, and a role that is present
wrongly offers one. Both become hard facts once schemas narrow, so both are worth
settling first.

#### Direction 1 — roles that are missing

Six runes declare a `body` **slot** in their layout but never map it to the
`body` **role**: `Card`, `BentoCell`, `Character`, `Realm`, `Faction`,
`Playlist`.

Card is the clearest case. Its config is:

```js
sections: { media: 'media' },
layout: { root: ['media', 'content'],
          content: { tag: 'div', children: ['eyebrow', 'body', 'footer'] } }
```

The content model is literally "`body` (optional, repeatable any block)" — body
text is the main thing a card contains. `sections` simply never declares it, so
`applyBemClasses` never sets `data-section="body"`, so `data-reading` never
lands. That is a config gap, not a statement that cards have no body.

Six more declare a title/header slot with no header-ish role: `AccordionItem`,
`BentoCell`, `CharacterSection`, `RealmSection`, `FactionSection`,
`ItineraryDay`.

The remaining 105 runes have neither a body role nor a body slot and are
genuinely bodyless (badges, icons, table cells) — those exclusions are correct
and must not be "fixed".

Each of the ~10 runes needs a per-rune judgement: is the missing role an
oversight, or is the slot deliberately not a semantic section? Adding a role is
**not** output-neutral — it adds `data-section` and enables `data-reading` — so
each change needs its own justification and test.

#### Direction 2 — roles that may not belong

Three runes map a `body` role from a slot not named `body`, and only one is
obviously right:

| Rune | Mapping | Assessment |
|---|---|---|
| `Blog` | `content → body` | correct — it is prose |
| `Showcase` | `viewport → body` | **questionable** — a component preview surface is not body text |
| `DataTable` | `table → body` | **questionable** — a table is not prose |

Under Phase 3 these two would have `reading` and `dropcap` offered in their
schemas, so `{% datatable reading="prose" dropcap=true %}` would validate and
stamp a drop cap onto a table. Removing a role is likewise not output-neutral —
it drops `data-section`, which Lumina's CSS may style — so each needs the same
per-rune justification and test as Direction 1.

#### Guard against recurrence

A lint or test that flags a slot/role mismatch in both directions belongs here,
so the drift cannot silently return once corrected.

### Phase 2 — Lock applicability as rune identity

Extend the `IDENTITY_FIELDS` guard in `packages/transform/src/validate.ts` —
today enforced only against {% ref "SPEC-091" /%} variant deltas — to the theme
override path in `mergeRuneConfig`. `block`, `modifiers` and `sections` become
non-overridable on every merge path.

This is expected to be a no-op in practice (Lumina overrides none of them), which
makes it cheap to land early and independently.

**Open question — where applicability data lives.** Phase 3 needs the gating
facts reachable from schema-build time, and today they live in `RuneConfig`,
which the schema layer never sees. Two shapes:

- **(a) Keep `RuneConfig` as the source; export a resolved applicability map**
  that `createContentModelSchema` consumes. Smaller change; keeps one definition
  of each field; introduces a build-order coupling between config and schemas.
- **(b) Move the gating fields onto the rune definition**, engine reads them from
  there. Conceptually cleanest — the guard becomes unnecessary for a moved field,
  because there is nothing left to override — but a migration across ~50 rune
  configs.

{% ref "ADR-028" /%} deliberately leaves this open as an implementation question.
Resolve it here, in its own work item, before Phase 3 starts.

#### The line to draw: join tables vs postures

The question is not "does `sections` move" but **which fields are schema↔engine
join tables and which are genuine theme postures**. `sections` turns out to be
the clearest case of the former:

```js
Accordion: { sections: { preamble: 'preamble', headline: 'title', blurb: 'description' } }
```

- **Keys** are the rune's own slot names, emitted as `data-name` by its schema
  transform. A theme cannot invent one — it does not control what the transform
  emits.
- **Values** are a closed vocabulary the engine owns
  (`header | preamble | title | description | body | footer | media`,
  `types.ts:341`).

The theme owns neither side. All a theme can do is **rewire an existing pair** —
exactly the capability {% ref "ADR-028" /%} removes.

Its only emission consumer is `applyBemClasses` (`engine.ts:560`), which turns
the role into `data-section`, plus `data-reading`/`data-dropcap` on a `body` role
and `data-guest-fit` on a `media` role. **Lumina's CSS reads the emitted
`data-section` attribute, never the `sections` config**
(`styles/dimensions/sections.css` and ~10 rune stylesheets), so moving the field
touches no stylesheet at all. The theme's real relationship to `sections` is
entirely downstream of emission: it styles roles, it does not define them.

Applying the same test to the fields that travel with it:

| Field | Shape | Verdict |
|---|---|---|
| `sections` | `data-name` → closed engine role | **join table** — move |
| `mediaSlots` | `data-name` → closed vocabulary (`portrait`/`cover`/…) | **join table** — same argument, move with it |
| `guestFit` | `'clip' \| 'bleed'` containment posture | **posture** — stays; gates nothing |
| `substrateTarget` | `'media' \| 'self'`, defaults to `'self'` | **posture** — stays; see below |
| `frameTarget` | `'media' \| 'self'` | **the exception** — see below |

#### `substrateTarget` gates nothing

It defaults to `'self'`, so `substrate` is applicable on **every** rune, and it
is set on **zero** runes in the catalog. The only unavailability path —
`substrateTarget: 'media'` on a rune with no media section — is a
misconfiguration, not an authored intent, and cannot currently occur. It is a
genuine theme posture ("put the pattern on the media well rather than the whole
surface") and can stay in `RuneConfig` without splitting anything. This spec's
earlier framing of it as a fuzzy applicability gate was wrong.

#### `frameTarget` splits frame applicability across two homes

Frame applicability resolves as
`config.frameTarget ?? (hasMediaSection(config.sections) ? 'media' : null)`.
The type has no `'none'`, so **`frameTarget` can only ever grant, never revoke**.

It is set on exactly two runes — `Figure` and `Showcase`, both `'self'`, both
with no media section. In both cases it grants frame applicability to a rune that
would otherwise have none, and it means "frame *me*, because I am the media" —
which reads as a structural fact about the rune, not a decoration.

That creates a concrete hazard if `sections` moves and `frameTarget` does not.
Frame applicability would have two sources, one of them still theme-overridable,
so a theme could add `frameTarget: 'self'` to a rune whose narrowed schema
**rejects** `frame=`. Config would grant what the schema forbids — the same
divergence this spec exists to close, inverted.

Three resolutions, to be decided in the placement work item:

- **(a) `frameTarget` moves with `sections`.** Both become rune identity. Cheapest
  and most consistent; the migration is two runes.
- **(b) Narrow `frameTarget` so it can only redirect among surfaces the rune
  already has.** Then `Figure`/`Showcase` would need a media section to be framed
  — awkward, since the whole rune *is* the media.
- **(c) Introduce an explicit "this rune is its own media surface" structural
  fact** and retire `frameTarget: 'self'`. The most honest modelling; the most
  churn.

**(a) is the decision.** (c) is recorded below as a follow-on with an explicit
trigger, because the evidence for it today is thin and (a) does not foreclose it.

#### Why (c) is deferred rather than rejected

The engine has one media model, and it assumes media is a **sub-zone holding a
guest**: `sections: { x: 'media' }` declares the well, `guestFit` says how the
well contains its guest, `mediaSlots` sizes it, `findMediaZone()` walks children
for `data-section="media"`, and `frameTarget` defaults to `'media'` when such a
zone exists.

`Figure` and `Showcase` do not host media — the image *is* the figure. There is
no guest. That fact has **no representation in config**: the only way to express
it is a side effect of `frameTarget: 'self'`, which states the consequence
("frame chrome lands on my root") rather than the cause ("I am the media
surface").

(c) would name the cause — e.g. `mediaSurface: 'self'`, mutually exclusive with a
`media` section role — so that every media-aware axis derives from one fact:
*chrome lands on the media surface, which is either the root or
`[data-section="media"]`*.

The argument for it is that `substrateTarget` is **already the second instance of
the same escape hatch** — same `'media' | 'self'` type, same question, added
independently, and it too never learned about these two runes. Today
`{% figure substrate="dots" substrate-target="media" %}` warns "has no media
section" and does nothing, on a rune that plainly has a media surface.

The argument against is that this is two runes and two axes, one of which is set
on **zero** runes in the catalog. That is a duplicated pattern, not a
demonstrated cost, and (c) carries a new config field, a vocabulary, its
interaction with `sections`, both facets' resolution logic, docs, contract
description and tests.

**Trigger for revisiting:** if a third media-aware axis needs a `'self'` target,
stop adding escape hatches and name the fact. Until then (a) holds, and the
migration (c) would need is the same two runes either way.

### Phase 3 — Narrow schemas and fix the consumers

With correct data and a reachable source, `createContentModelSchema` merges only
the applicable universal attributes.

**The rule must be declared, not inherited from a constructor.** Six runes use
hand-written schemas and therefore carry no universal attributes at all: `icon`,
`tint`, `bg`, `xref`, `expand`, `badge`. That split is mostly principled and
should be *expressed* rather than migrated away:

| Rune | Reason | Assessment |
|---|---|---|
| `xref`, `badge` | `inline: true` | correct — block axes are meaningless on an inline span |
| `tint`, `bg` | configurator runes that *supply* axis values to their parent | correct — a `{% tint %}` with its own `tint=` is circular |
| `icon` | effectively an inline glyph | probably correct; confirm |
| `expand` | block-level disclosure | probably wrong; reads as legacy |

So the rule needs at least three inputs: inline-ness, configurator-ness, and
rune-structural applicability. Migrating these six to
`createContentModelSchema` is **not** required — four would end up declaring "no
universal attributes" anyway.

Consumers then fall out:

- **`refrakt reference`** stops printing "available on every rune" and reports
  the rune's actual set. No config loading.
- **Language server completion** narrows automatically — it reads
  `rune.attributes`, which is the schema.
- **`reading`, `content-place` and cover `scrim*`** gain the dev warning their
  four siblings already have, for the case where an attribute is written but the
  facet never runs. Still needed: schema narrowing catches authored attributes,
  not values arriving through scoped defaults or embed overrides
  ({% ref "ADR-027" /%}).

### Migration

Narrowing turns `{% card reading="prose" %}` from a silent no-op into a Markdoc
validation error. That is the intended outcome — the author gets no feedback at
all today — but it will break existing content.

Phase 1 removes most of the sting: the runes an author is most likely to have
written `reading` on are exactly the six whose roles were missing. What remains
is content targeting a genuinely bodyless rune, where the error is correct.

The transitional option from {% ref "ADR-028" /%}'s rejected alternatives is
available if the break proves too sharp: keep schemas permissive for one minor
and have `refrakt reference` and the editor *annotate* inapplicable attributes
rather than reject them, narrowing in the following minor. Decide once Phase 1
has quantified the real-world impact.

## Acceptance criteria

- [ ] The ~10 missing-role mismatches are individually assessed and resolved;
      each change carries its own test and the reasoning is recorded
- [ ] The three non-`body`-slot body roles (`Blog`, `Showcase`, `DataTable`) are
      assessed for whether the role belongs at all
- [ ] A lint or test flags a slot/role mismatch **in both directions**, so the
      drift cannot recur
- [ ] `IDENTITY_FIELDS` is enforced on `mergeRuneConfig`, not only on variant deltas
- [ ] Applicability data placement is decided and recorded before Phase 3 begins,
      on the join-table vs posture test rather than field by field
- [ ] `frameTarget` moves with `sections` (resolution (a)), so frame
      applicability has a single source — no path by which theme config can grant
      an attribute the narrowed schema rejects
- [ ] `createContentModelSchema` merges only applicable universal attributes
- [ ] Universal-attribute availability is governed by a declared rule that
      accounts for inline-ness and configurator runes — not by which constructor
      a schema used
- [ ] `refrakt reference <rune>` reports the rune's actual universal attributes
      and no longer claims "available on every rune"
- [ ] Language server completion offers only applicable universal attributes,
      with no theme-config loading added to the completion path
- [ ] `reading`, `content-place` and the cover `scrim*` family warn when dropped
- [ ] The structure contract's `unavailable` entries agree with the narrowed
      schemas — the two derivations must not diverge
- [ ] Transform output is unchanged except where Phase 1 deliberately adds a
      section role; those changes are enumerated
- [ ] Migration path decided and documented; a breaking change carries a changeset
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## References

- {% ref "ADR-028" /%} — the governing decision
- {% ref "SPEC-091" /%} — engine config variants; source of the identity-field rule
- {% ref "SPEC-124" /%} — facet registry; gave each axis an exported vocabulary
- {% ref "WORK-527" /%} — universal axes in structure contracts; the measurement
- {% ref "SPEC-108" /%} — reading register and dropcap
- {% ref "SPEC-107" /%} — elevation and prominence
- {% ref "ADR-027" /%} — scoped attribute bags; the non-authored input path
- {% ref "SPEC-028" /%} — rune output standards

{% /spec %}
