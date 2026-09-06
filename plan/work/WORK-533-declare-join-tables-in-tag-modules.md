{% work id="WORK-533" status="ready" priority="high" complexity="complex" source="SPEC-125" tags="runes,config,schema,refactor" milestone="v0.31.0" %}

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

- [ ] `sections`, `mediaSlots` and `frameTarget` are declared in their tag modules
      and referenced from config
- [ ] `createContentModelSchema` receives them, so the facts are available at
      construction — even though narrowing itself lands in {% ref "WORK-534" /%}
- [ ] The engine's read path is **unchanged**: it still reads `config.sections`,
      `config.mediaSlots`, `config.frameTarget`
- [ ] No new import direction anywhere; `config → tags` still holds and no cycle
      is introduced in core or in any plugin
- [ ] `frameTarget` is added to the guarded identity set, closing the gap
      {% ref "WORK-528" /%} deliberately left
- [ ] Transform output is byte-identical — this is a pure relocation
- [ ] `refrakt contracts --check` passes with no regeneration
- [ ] `npm run build` and the full repo suite pass

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

{% /work %}
