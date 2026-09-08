{% work id="WORK-533" status="done" priority="high" complexity="complex" source="SPEC-125" tags="runes,config,schema,refactor" milestone="v0.31.0" pr="refrakt-md/refrakt#591" %}

# Declare join tables in tag modules

Move the schema↔engine join tables out of `RuneConfig` and into the tag modules
that own them, with config referencing the declaration rather than owning it.
This is what makes {% ref "WORK-534" /%} possible: `createContentModelSchema`
needs the gating facts **at construction time**, and today it has none.

```ts
// tags/card.ts
export const cardSections = { media: 'media', body: 'body' } as const;
export const card = createContentModelSchema({ …, sections: cardSections });
```

```ts
// config.ts — already imports from tags/
Card: { block: 'card', sections: cardSections, … }
```

## Why this direction and not the other

The module graph decides it. The dependency direction is `config → tags`,
uniformly: core's `config.ts` imports four sentinels *from* tag modules
(`BREADCRUMB_AUTO_SENTINEL`, `NAV_AUTO_SENTINEL`, `PAGINATION_AUTO_SENTINEL`,
`XREF_RUNE_MARKER`); no core tag imports config, and **no plugin tag imports its
config — 0 of 9**.

Having tags import config instead would invert that and cycle in core, and since
`createContentModelSchema` runs at module scope the tag would observe
`coreConfig` uninitialised — a crash, not a subtle bug.

## Scope

- `sections` — ~50 runes across core and nine plugins
- `mediaSlots` — a handful
- `frameTarget` — 2 (`Figure`, `Showcase`)

**`modifiers` does not move.** The gates that read it (`cover`, `content-place`)
key on modifiers the schema already declares as author-facing attributes, so that
gate is already schema-side.

## Acceptance Criteria

- [x] `sections`, `mediaSlots` and `frameTarget` are declared in their tag modules
      and referenced from config
- [x] `createContentModelSchema` receives them, so the facts are available at
      construction — even though narrowing itself lands in {% ref "WORK-534" /%}
- [x] The engine's read path is **unchanged**: it still reads `config.sections`,
      `config.mediaSlots`, `config.frameTarget`
- [x] No new import direction anywhere; `config → tags` still holds and no cycle
      is introduced in core or in any plugin
- [x] `frameTarget` is added to the guarded identity set, closing the gap
      {% ref "WORK-528" /%} deliberately left
- [x] Transform output is byte-identical — this is a pure relocation
- [x] `refrakt contracts --check` passes with no regeneration
- [x] `npm run build` and the full repo suite pass

## Approach

Sequenced **after** the audit items so the migration moves final values. Doing it
first would mean editing the same ~50 places twice.

Relocation only — no value changes. Any correction that surfaces mid-migration
belongs back in {% ref "WORK-529" /%}–{% ref "WORK-531" /%} (or a follow-up), not
folded in here, so that "output is byte-identical" stays a usable check.

The `frameTarget` move also collapses frame applicability to a single source.
Without it, a theme could add `frameTarget: 'self'` to a rune whose narrowed
schema rejects `frame=` — config granting what the schema forbids, the same
divergence inverted. See {% ref "SPEC-125" /%} Phase 2 for the three resolutions
considered and why moving it won.

## Blocked by
- {% ref "WORK-529" /%}
- {% ref "WORK-530" /%}
- {% ref "WORK-531" /%}

## References

- {% ref "SPEC-125" /%} — Phase 2, *Where the applicability data lives*
- {% ref "ADR-028" /%} — the governing decision

## Resolution

Completed: 2026-09-07

Branch: `claude/milestone-v0-31-0-e5ihxr`

### The move

**72 declarations** across core and the nine plugins — 59 `sections`, 11 `mediaSlots`, 2 `frameTarget` — now live in the tag module that owns each rune, with `ThemeConfig.runes` referencing the declaration rather than defining it. (The scope note estimated ~50 + a handful + 2; the true count is a little higher.)

```ts
// tags/card.ts
export const cardSections = { media: 'media', body: 'body' } as const;
export const card = createContentModelSchema({ sections: cardSections, … });

// config.ts
Card: { block: 'card', sections: cardSections, … }
```

`createContentModelSchema` accepts all three and records them on a new `schemaRuneStructures` WeakMap, following the existing `schemaContentModels` pattern exactly. Nothing reads them yet — {% ref "WORK-534" /%} does. Passing them is the point: it is what makes the gating facts reachable at schema-build time at all.

Exported from `@refrakt-md/runes` as `schemaRuneStructures`, with `RuneStructure` and `SectionRole` types.

### Verification that it is a pure relocation

- **`refrakt contracts --check` passes with no regeneration** — the 132-rune contract is byte-identical, which is the strongest available check that no value moved.
- **The engine is untouched.** `git diff packages/transform/src/engine.ts` is empty; it still reads `config.sections`, `config.mediaSlots`, `config.frameTarget`.
- **No inverted imports.** Zero tag modules import a config module, in core or in any plugin, so `config → tags` still holds uniformly and no cycle was introduced.
- Full suite 4157/4157 across 341 files.

Per the Approach, no corrections were folded in — this is relocation only, which is what keeps "byte-identical" a usable check.

### `frameTarget` guarded

Added to `IDENTITY_FIELDS` alongside `mediaSlots`, closing the gap {% ref "WORK-528" /%} deliberately left. It has to be guarded: frame applicability resolves as `config.frameTarget ?? (hasMediaSection(config.sections) ? 'media' : null)` and the type has no `'none'`, so it can only ever **grant**. With `sections` moved and `frameTarget` left behind, a theme could add `frameTarget: 'self'` to a rune whose narrowed schema rejects `frame=` — config granting what the schema forbids, the same divergence inverted.

A test pins that `Figure` and `Showcase` remain the only two runes setting it, both to `'self'`.

### A find the tests caught

The migration was scripted, and its field matcher was line-anchored — so it silently skipped every **single-line** config entry. Seven runes were left behind: `Accordion`, `TabGroup`, `Changelog`, `CallToAction`, `Steps`, `Pricing`, `StoryboardPanel`.

Nothing about the build or the contract would have shown this: the config still worked, the values were still correct, and the only symptom was that those seven schemas never received their join tables — exactly the gap this work exists to close, and it would have surfaced as a mysterious narrowing failure in {% ref "WORK-534" /%}.

It was caught by writing the invariant as a test rather than trusting the script: *every rune whose config declares `sections` has them recorded on its schema*. That test failed with `['Accordion']` on the first run. A follow-up scan confirmed all 72 declarations are now references and none remain inline.

### The test asserts identity, not equality

`packages/lumina/test/join-tables.test.ts` checks that `config.sections === schemaRuneStructures.get(schema).sections` — the same object, not an equal one. A copy would satisfy `toEqual` and still allow the two to drift apart later, which is precisely the divergence ADR-028 closes. Same for `mediaSlots` and `frameTarget`.

### Files changed

- `packages/runes/src/lib/index.ts` — `RuneStructure`, `SectionRole`, `schemaRuneStructures`; the three new constructor options and their registration
- `packages/runes/src/index.ts` — exports
- `packages/transform/src/identity-fields.ts` — `mediaSlots` and `frameTarget` added to `IDENTITY_FIELDS`
- `packages/runes/src/config.ts` + nine plugin `config.ts` files — 72 inline literals replaced by references, with imports added
- 40+ tag modules — the declarations, each with the rationale that used to sit in config moved alongside its value
- `packages/lumina/test/join-tables.test.ts` (new, 4 cases)
- `packages/transform/test/identity-fields.test.ts` — updated for the widened guard, with a per-field override value since `frameTarget` is a scalar
- `site/content/extend/theme-authoring/config-api.md`
- `.changeset/tidy-jokes-tap.md`

### Notes

- Where a Phase 1 rationale comment described a *value* (card's body role, the bento cell's two roles, the storytelling entities, playlist, itinerary-stop), it moved to the tag module to sit with the declaration. The `sectionRoleExceptions` reasoning stayed in config, correctly — an exception is a config field.
- Verified: `npm run build` clean, full suite 4157/4157 across 341 files, `refrakt contracts --check --site main` up to date with no regeneration.
- The `pr` attribute is not set — no pull request was opened for this branch.

{% /work %}
