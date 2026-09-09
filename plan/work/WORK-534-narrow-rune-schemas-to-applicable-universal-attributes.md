{% work id="WORK-534" status="done" priority="high" complexity="complex" source="SPEC-125" tags="runes,schema,markdoc,breaking" milestone="v0.32.0" %}

# Narrow rune schemas to applicable universal attributes

`createContentModelSchema` merges all ~37 universal attributes unconditionally:

```ts
// packages/runes/src/lib/index.ts:384
Object.assign(attributes, universalAttributes);
```

With {% ref "WORK-533" /%} landed, the gating facts are in hand at construction.
Merge only what can affect the rune.

Every downstream consumer then becomes correct **without loading theme config** —
which is the whole reason the fix belongs here rather than in each consumer.
Language-server completion narrows for free, because it reads `rune.attributes`
straight from the schema.

## The rule must be declared, not inherited from a constructor

Six runes carry hand-written schemas and therefore no universal attributes at
all, and the split is mostly principled:

| Rune | Reason | |
|---|---|---|
| `xref`, `badge` | `inline: true` | correct — block axes are meaningless on a span |
| `tint`, `bg` | configurator runes that *supply* axis values to a parent | correct — a `{% tint %}` with its own `tint=` is circular |
| `icon` | effectively an inline glyph | probably correct; confirm |
| `expand` | block-level disclosure | probably wrong; reads as legacy |

So availability needs at least three inputs — inline-ness, configurator-ness, and
rune-structural applicability — expressed as a rule rather than left to which
constructor a schema happened to use.

**Migrating these six to `createContentModelSchema` is a non-goal.** Four would
end up declaring "no universal attributes" anyway.

## Acceptance Criteria

- [x] `createContentModelSchema` merges only the applicable universal attributes
- [x] Availability is governed by a declared rule accounting for inline-ness,
      configurator runes, and structural applicability — not by constructor choice
- [x] `expand` and `icon` are each explicitly assessed and their outcome recorded
- [x] Language-server completion narrows with **no theme-config loading added to
      the completion path**; covered by a test
- [x] The structure contract's `unavailable` entries and the narrowed schemas
      agree — the two derivations must not diverge, and a test enforces it
- [x] The migration path is decided from real impact and documented; a breaking
      changeset accompanies it
- [x] Transform output is unchanged — this changes what may be *written*, not
      what is emitted
- [x] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

**This is the breaking change.** `{% card reading="prose" %}` moves from a silent
no-op to a Markdoc validation error. Intended — the author gets no feedback at all
today — but it will fail builds on existing content.

### The migration is decided: narrow directly

{% ref "SPEC-125" /%} deferred the choice between narrowing outright and a
transitional annotate-only minor until "Phase 1 has quantified the real-world
impact". It has, and the answer is that there is almost none: a scan of all 986
markdown files in the repo found **25 uses of a gated universal attribute in
live content, none of which a narrowed schema would reject**. The five that
would be rejected are all inside documentation code fences, and were corrected
in v0.31.0 rather than migrated.

So the transitional minor buys nothing and costs a release of the silent no-op
it is meant to replace. Narrow here. The spec's Migration section carries the
numbers and the two doc corrections the scan surfaced.

Note that this measures *this* repo. Downstream sites may hold content the scan
cannot see, which is what the breaking changeset is for — but the shape of the
break is now known to be narrow, not broad.

### `declaredSlots()` is not a gating input

{% ref "WORK-532" /%} left a shared `declaredSlots(config)` helper and predicted
this item would want it. Use it for diagnostics if useful, but **not** to decide
applicability: it reads slots out of `layout`/`structure`/`autoLabel`/`blocks`/
`contentWrapper` and is deliberately a *lower bound*, because slots a schema
emits as bare `data-name` attributes are invisible from config. Card's `title`
is one such slot. Gating comes from `sections` and `modifiers`, which are now
reachable from the schema via `schemaRuneStructures` ({% ref "WORK-533" /%}).

Exposure is probably low: most of it is content setting an attribute that never
did anything, on a rune that never could honour it, so the likely source is
copy-paste between runes. And {% ref "v0.31.0" /%} removed the sharpest cases in
advance — the runes an author is most likely to have written `reading` on are the
six whose roles were missing, and those now work rather than erroring.

Before committing to rejection, measure. {% ref "ADR-028" /%} keeps a transitional
alternative open: keep schemas permissive for one minor and have the tooling
*annotate* rather than reject, narrowing in the release after. Decide from the
real numbers, not from the estimate above.

The "declared slots for a rune" helper from {% ref "WORK-532" /%} is likely reusable
here.

## Blocked by
- {% ref "WORK-533" /%}

## References

- {% ref "SPEC-125" /%} — Phase 3
- {% ref "ADR-028" /%} — including the annotate-don't-reject alternative

## Resolution

Completed: 2026-09-09

Branch: `claude/milestone-v0-31-0-e5ihxr`

### What was done

`createContentModelSchema` now merges only the universal attributes that can affect the rune it is building. **84 tags lost 1,651 attribute slots**; transform output is unchanged.

- **`packages/runes/src/universal-attributes.ts`** (new) — the declared rule.
  `AXIS_ATTRIBUTES` maps each axis to the author-facing attributes it owns (the
  registry's `contract.inputs` can't serve: for `meta`-source axes those are
  engine-side `data-field` names). `resolveUniversalAttributes()` takes posture,
  the rune's join tables and its declared attributes, and answers axis by axis by
  calling `UniversalAxisFacet.describeForRune` — the *same call* the structure
  contract uses, so the two derivations are one, not two implementations kept in
  step. Carries the six-rune assessment table.
- **`packages/runes/src/lib/index.ts`** — the merge site. `declaredAttributes` is
  what has been merged so far, which is what lets the `cover`/`content-place`
  gates read modifiers the rune declares as its own attributes; that is why
  `modifiers` did not need to move out of config in WORK-533.
- **`packages/transform/src/types.ts` / `contracts.ts`** — new
  `RuneConfig.universalAttributes` posture (`auto` | `inline` | `configurator` |
  `none`). `contracts.ts` branches on it before the per-axis gates.
- **`packages/transform/src/identity-fields.ts`** — `universalAttributes` joins
  `IDENTITY_FIELDS`. It decides what an author may *write* on the rune, so a
  theme redefining it would change what the same markdown means (ADR-028).
- **`packages/transform/src/facets/describe.ts`** — `UNIVERSAL_POSTURE_REASONS`,
  re-exported so the schema layer and the contract give the same prose.
- **`packages/runes/src/config.ts`** — postures set: `Badge: 'inline'`,
  `Tint`/`Bg: 'configurator'`, `Expand: 'none'` with a comment recording that
  this one is legacy and **not** principled.
- **`packages/runes/src/tags/icon.ts`** — icon's assessment, recorded where icon
  actually lives.
- **`contracts/structures.json`** (+ Lumina's copy) — regenerated; exactly the
  four posture runes changed.
- **Docs** — `site/content/runes/surfaces.md` gains a "universal, but not
  unconditional" note: what is gated on what, that it is now a build error rather
  than silence, and what nothing-on-screen-changed means.
- **Changeset** — `.changeset/heavy-pears-repeat.md`, breaking, with the migration
  numbers and the shape of the break.

### Tests

- `packages/runes/test/universal-attributes.test.ts` (13) — the rule itself:
  posture short-circuits, each structural gate, the "never both available and
  explained away" invariant, and the shipped schemas actually reflecting it.
- `packages/lumina/test/schema-contract-agreement.test.ts` (5) — schema vs
  contract across 58 paired runes in both directions, plus a
  narrowing-actually-happened guard so the agreement can't pass trivially.
- `packages/language-server/test/universal-attribute-completion.test.ts` (5) —
  completion narrows, and does so with the config loader **mocked to throw**, so
  a future change that starts resolving a site config on the completion path
  fails every case.

Direction-checked: with narrowing disabled the completion test fails 2/5 and the
agreement test fails; both pass with it on.

### Notes

- **The migration is decided: narrow directly.** SPEC-125 deferred the choice
  until Phase 1 quantified impact. It did: 986 markdown files, 25 uses of a gated
  universal attribute in live content, **zero** that a narrowed schema rejects.
  Re-verified after narrowing by validating every file in `site/` and `plan/`,
  plus every Markdoc fence in them — clean. The five that would be rejected were
  documentation fences, corrected in v0.31.0. A transitional annotate-only minor
  buys nothing and costs a release of the silent no-op it replaces.
- **`expand` is recorded as a gap, not a decision.** It is a block-level
  disclosure, so `tint`/`bg`/`width`/`elevation` would all mean something on it;
  it has none because its schema predates the universal set. Giving it those axes
  means migrating it to `createContentModelSchema`, which this item scopes out.
  `none` names the gap instead of letting it pass as principle.
- **`icon` is correct.** It resolves to a bare inline `<svg>` (or an
  `<span class="rf-icon">` fallback) with no `data-rune` marker and no
  `coreConfig` entry, so the identity transform never sees it as a rune — there
  is no pass that would read a universal attribute on it even if declared. The
  assessment lives in `tags/icon.ts` because icon has no `RuneConfig` to hold it.
- **`declaredSlots()` was not used as a gating input**, as WORK-532 warned: it is
  deliberately a lower bound (card's `title` is invisible from config). Gating
  comes from `sections`/`mediaSlots`/`frameTarget` and declared modifiers.
- **`refrakt reference` still prints "Universal attributes (available on every
  rune)" with all 37.** That line was merely imprecise before; it is now wrong for
  most runes, which sharpens WORK-535's premise. The docs note points authors at
  editor completion rather than at `reference` until WORK-535 lands.

{% /work %}
