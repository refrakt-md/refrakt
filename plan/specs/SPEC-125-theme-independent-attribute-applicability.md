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

Applicability is derived from `sections`, and `sections` is currently incomplete.

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

A lint that flags a slot/role mismatch belongs here too, so the drift cannot
silently recur.

### Phase 2 — Lock applicability as rune identity

Extend the `IDENTITY_FIELDS` guard in `packages/transform/src/validate.ts` —
today enforced only against {% ref "SPEC-091" /%} variant deltas — to the theme
override path in `mergeRuneConfig`. `block`, `modifiers` and `sections` become
non-overridable on every merge path.

This is expected to be a no-op in practice (Lumina overrides none of them), which
makes it cheap to land early and independently.

**Open question — where applicability data lives.** Phase 3 needs
`sections`/`modifiers` reachable from schema-build time, and today they live in
`RuneConfig`, which the schema layer never sees. Two shapes:

- **(a) Keep `RuneConfig` as the source; export a resolved applicability map**
  that `createContentModelSchema` consumes. Smaller change; keeps one definition
  of `sections`; introduces a build-order coupling between config and schemas.
- **(b) Move `sections` onto the rune definition**, engine reads it from there.
  Conceptually cleanest — the guard becomes unnecessary because there is nothing
  to override — but a migration across ~50 rune configs.

{% ref "ADR-028" /%} deliberately leaves this open as an implementation question.
Resolve it here, in its own work item, before Phase 3 starts.

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

- [ ] The ~10 slot/role mismatches are individually assessed and resolved; each
      change carries its own test and the reasoning is recorded
- [ ] A lint or test flags a `body`/header slot with no corresponding section
      role, so the drift cannot recur
- [ ] `IDENTITY_FIELDS` is enforced on `mergeRuneConfig`, not only on variant deltas
- [ ] Applicability data placement is decided and recorded before Phase 3 begins
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
