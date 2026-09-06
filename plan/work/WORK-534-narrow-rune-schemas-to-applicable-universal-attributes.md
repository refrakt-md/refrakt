{% work id="WORK-534" status="ready" priority="high" complexity="complex" source="SPEC-125" tags="runes,schema,markdoc,breaking" milestone="v0.32.0" %}

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

- [ ] `createContentModelSchema` merges only the applicable universal attributes
- [ ] Availability is governed by a declared rule accounting for inline-ness,
      configurator runes, and structural applicability — not by constructor choice
- [ ] `expand` and `icon` are each explicitly assessed and their outcome recorded
- [ ] Language-server completion narrows with **no theme-config loading added to
      the completion path**; covered by a test
- [ ] The structure contract's `unavailable` entries and the narrowed schemas
      agree — the two derivations must not diverge, and a test enforces it
- [ ] The migration path is decided from real impact and documented; a breaking
      changeset accompanies it
- [ ] Transform output is unchanged — this changes what may be *written*, not
      what is emitted
- [ ] `npm run build`, the full repo suite, and `refrakt contracts --check` pass

## Approach

**This is the breaking change.** `{% card reading="prose" %}` moves from a silent
no-op to a Markdoc validation error. Intended — the author gets no feedback at all
today — but it will fail builds on existing content.

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

{% /work %}
