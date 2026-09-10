{% spec id="SPEC-125" status="implemented" date="2026-09-05" tags="runes,attributes,schema,config,theme,cli,language-server,dx" %}

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
- Applicability gates are *declared capabilities*, not structural facts reused as
  proxies. See **The governing rule** below.

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

#### Direction 2 — roles doing double duty

Three runes map a `body` role from a slot not named `body`:

| Rune | Mapping | |
|---|---|---|
| `Blog` | `content → body` | prose |
| `Showcase` | `viewport → body` | a component preview surface |
| `DataTable` | `table → body` | a table |

Under Phase 3 the latter two would have `reading` and `dropcap` offered in their
schemas, so `{% datatable reading="prose" dropcap=true %}` would validate and
stamp a drop cap onto a table.

**The role is not the problem, and removing it is not the fix.** DataTable's
table genuinely *is* the rune's main content region, and Lumina styles that role
directly — `styles/dimensions/sections.css:42` and `styles/dimensions/density.css:45`
both key on `[data-section="body"]`. Dropping the role would change how these
runes render, for a reason unrelated to rendering.

The real problem is that `body` carries **two meanings that were merged by
accident of timing**:

- **Structural** — "the rune's main content region". Its original purpose,
  consumed by the dimension stylesheets.
- **Editorial** — "prose that a reading register applies to". Added later by
  {% ref "SPEC-108" /%}, which reused the existing structural declaration as a
  *proxy* for a capability it never declared.

The proxy holds for most of the 21 runes with a `body` role and breaks for a real
minority: `DataTable`, `Showcase`, `Form`, `Api`, `Symbol`. (Only four runes set
`defaultReading` at all — `Sidenote`, `PullQuote`, `TextBlock`, `Lore`.)

Separating the two meanings is therefore **not a data fix and does not belong in
Phase 1**. It is a small design change, and it is sequenced into *Phase 4* for a
reason given there.

#### Guard against recurrence

A lint or test that flags a **missing** role (Direction 1) belongs here, so that
drift cannot silently return once corrected. Direction 2 is not a lint target —
those roles are correct.

### The governing rule: declare capabilities, do not infer them

The lesson generalises past `reading`, and is worth stating because it predicts
where the next axis will go wrong. All four applicability gates today:

| Axis | Gate | Kind |
|---|---|---|
| `cover`, `content-place` | rune declares the `media-position` / `content-place` modifier | **exact** |
| `prominence` | a header-ish role | proxy — sound |
| `frame`, `substrate` | a `media` role, or an explicit target | proxy — mostly sound |
| `reading`, `dropcap` | a `body` role | proxy — **lossy** |

The one exact gate is the one whose declaration was made *for that purpose*.
Every proxy gate reuses a structural fact declared for something else, and the
lossy one is where the correlation breaks.

> **Rule.** When an axis needs a capability, have runes declare that capability.
> Infer it from an existing structural fact only when the fact and the capability
> are genuinely *the same thing*. A `media` role really is a frame target — that
> inference is identity. A `body` role merely *usually* contains prose — that is
> correlation, and correlation drifts.

Applied at {% ref "SPEC-108" /%} time this would have caught the `reading` case.
It is the test to apply to the next universal axis anyone adds. If a second axis
turns out to need it, this rule is a candidate for promotion to its own ADR.

### Phase 2 — Lock applicability as rune identity

Extend the `IDENTITY_FIELDS` guard in `packages/transform/src/validate.ts` —
today enforced only against {% ref "SPEC-091" /%} variant deltas — to the theme
override path in `mergeRuneConfig`. `block`, `modifiers` and `sections` become
non-overridable on every merge path.

This is expected to be a no-op in practice (Lumina overrides none of them), which
makes it cheap to land early and independently.

#### Where the applicability data lives — resolved as (b)

Phase 3 needs the gating facts reachable from schema-build time, and today they
live in `RuneConfig`, which the schema layer never sees. `createContentModelSchema`
merges all ~37 universal attributes unconditionally, at module scope, with no
structural input at all:

```ts
// packages/runes/src/lib/index.ts:384
Object.assign(attributes, universalAttributes);
```

Two shapes were considered. **The module graph decides between them.**

**(a) Keep `RuneConfig` as the source and have the schema layer consume it —
rejected.** The dependency direction is `config → tags`, uniformly. Core's
`config.ts` imports four sentinels *from* tag modules
(`BREADCRUMB_AUTO_SENTINEL`, `NAV_AUTO_SENTINEL`, `PAGINATION_AUTO_SENTINEL`,
`XREF_RUNE_MARKER`); no core tag imports config, and **no plugin tag imports its
config either — 0 of 9**.

For a tag module to import config would invert that direction and create a cycle
in core. Because `createContentModelSchema` is called at module scope, the tag
would observe `coreConfig` still uninitialised mid-cycle — a crash, not a subtle
bug. The cycle-free variant (narrow later, at catalog/registry assembly) works
but must run at every assembly point — the core catalog, each plugin's `runes`
record, the merged tag set — and hands config to every consumer. That is the
"teach the consumers to read config" model {% ref "ADR-028" /%} already rejected,
reached by a different route.

**(b) Declare the fact in the tag module and let config reference it — adopted.**

```ts
// tags/card.ts
export const cardSections = { media: 'media', body: 'body' } as const;
export const card = createContentModelSchema({ …, sections: cardSections });
```

```ts
// config.ts — already imports from tags/
Card: { block: 'card', sections: cardSections, … }
```

- `createContentModelSchema` has the fact **in hand at construction**, so
  narrowing is local: no config lookup, no cycle, no build-order question.
- **The engine is unchanged** — it still reads `config.sections` exactly as today.
- No new import direction anywhere. Core already runs this way; plugins would
  start to, in the direction their code already permits.

Narrowing becomes correct *by construction* rather than by ordering discipline,
which is the whole reason to prefer it over the workable form of (a).

**Scope of the move.** The join tables plus `frameTarget`: `sections` (~50
runes), `mediaSlots` (a handful), `frameTarget` (2). Mechanical, but it touches
~50 places across ten packages.

**`modifiers` does not move.** For the gates that read it, the schema already
knows: `cover` and `content-place` gate on the rune declaring a `media-position`
/ `content-place` modifier, and those are author-facing attributes the schema
declares anyway (`refrakt reference card` lists both). That is the *exact* gate
from **The governing rule** above, and it is already schema-side.

**The identity guard remains load-bearing.** Under (b), config *references* the
rune's declaration rather than owning it — but `sections` is still a `RuneConfig`
field, so a theme could shadow it in the merged config. The engine would then use
the theme's value while the schema used the rune's: silent divergence, exactly
what this spec closes. The guard is required under every option, not just under (a).

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

### Phase 4 — Separate the prose capability from the `body` role

Give `reading` and `dropcap` a declared gate instead of the lossy `body`-role
proxy, per the governing rule above. The structural role and every stylesheet
that keys on it are untouched.

**Sequenced after Phase 3, deliberately.** The design question is the default,
and Phase 3 settles it:

- **Default-on** (a `body` role implies prose unless a rune opts out) keeps the
  migration tiny, but preserves the lossy proxy as the default — so the DataTable
  bug simply recurs for the next non-prose rune.
- **Default-off** (a rune must declare that it bears prose) is honest, but a
  forgotten declaration silently disables `reading` — which is today's failure
  mode returning.

Default-off is the right answer **only once schemas have narrowed**: with Phase 3
in place, a forgotten declaration is no longer silent — the attribute is not
offered, and `refrakt reference` says so. Phase 3 converts the risk of default-off
from an invisible regression into a discoverable one. Running Phase 4 first would
forfeit that.

**Shape.** Express the gate as a capability declared by the facet and provided by
the rune, rather than another hard-coded helper alongside `hasBodySection` /
`hasMediaSection` / `hasPageSectionHeader`:

```ts
readingAxis.requires = 'prose'
TextBlock: { provides: ['prose'] }
```

Only one axis needs it initially, so this is close to the narrow fix in cost. It
is worth doing as the general shape now because {% ref "SPEC-124" /%} already gave
every facet a declaration point — `requires` sits beside `contract` and
`describeForRune`, and flows into the structure contract for free. The
alternative, a bespoke `proseSection` field on `RuneConfig`, solves the same case
and leaves the next axis to invent its own.

The ~21 runes carrying a `body` role are audited once for whether they bear
authored prose. Expected non-providers: `DataTable`, `Showcase`, `Form`, `Api`,
`Symbol`.

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
rather than reject them, narrowing in the following minor.

### Decided: narrow directly, no transitional minor

Phase 1 has landed, so the impact is now measured rather than estimated. Every
`{% tag %}` in the repo's markdown — 986 files across `site/content`, `plan`,
the plugins and the `create-refrakt` templates — was scanned for the seven gated
axes and each use attributed to the rune it sits on, then checked against the
structure contract's `unavailable` map:

- **25 uses in live authored content. 0 would be rejected** after narrowing.
- **5 would be rejected, all inside documentation code fences** — illustrative
  examples, not content that builds.

The transitional minor exists to soften a break that does not materialise here,
and it carries a real cost: it preserves the silent no-op as the default
experience for another release, which is the thing this spec exists to remove.
**Narrow directly in Phase 3.**

Two caveats the same scan turned up, both now fixed rather than migrated:

- Three docs taught `{% recipe reading="prose" %}` as the "editorial-header
  composition" — the flagship example of this spec and {% ref "SPEC-108" /%}.
  `recipe` has no `body` slot at all (its content is ingredients, steps and
  tips), so `reading` was always a no-op there and the composition only ever
  half-worked. The user docs now use `blog`, which maps `content → body` and
  carries the whole composition; {% ref "SPEC-108" /%} carries a correction note
  rather than a rewrite.
- `site/content/runes/bg.md` documented `{% bg src="…" scrim="bottom" %}`, but
  `bg` is a hand-written schema that declares no `scrim` attribute, so that
  example was **already** a Markdoc `attribute-undefined` error with the scrim
  silently never applying. The `scrim*` family is universal and belongs on the
  rune the background sits behind; the doc now shows that form.

Neither is a migration concern — both were broken before narrowing. They are
recorded here because the impact scan is what surfaced them, and because they
are the same disease this spec treats: documentation promising an attribute the
schema does not carry.

## Acceptance criteria

- [ ] The ~10 missing-role mismatches are individually assessed and resolved;
      each change carries its own test and the reasoning is recorded
- [ ] A lint or test flags a **missing** section role, so Direction 1 drift
      cannot recur
- [ ] `reading` and `dropcap` gate on a declared prose capability, not on the
      `body` role; the structural role and every stylesheet keying on
      `[data-section="body"]` are unchanged
- [ ] The capability is declared by the facet and provided by the rune, so the
      next axis needing one does not invent a bespoke field
- [ ] The ~21 body-role runes are audited for whether they bear authored prose;
      `DataTable`, `Showcase`, `Form`, `Api` and `Symbol` no longer offer
      `reading`/`dropcap`
- [ ] `IDENTITY_FIELDS` is enforced on `mergeRuneConfig`, not only on variant deltas
- [ ] The join tables (`sections`, `mediaSlots`) and `frameTarget` are declared in
      their tag modules and referenced from config, so `createContentModelSchema`
      has them at construction; the engine's read path is unchanged
- [ ] `modifiers` stays in `RuneConfig` — the schema already declares the
      attributes its gates read
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
