{% work id="WORK-566" status="ready" priority="high" complexity="moderate" source="SPEC-130" tags="cli,tooling,schema-org,contracts" milestone="v0.35.0" %}

# Show a rune's resolved schema row in inspect, contracts and reference

Make the table reviewable. `refrakt inspect` shows a rune's resolved schema row,
`refrakt contracts` describes the structured data it currently omits, and
`refrakt reference` documents it.

## Why this lands before the migrations, not with them

{% ref "SPEC-130" /%} puts tooling on items 4–7, riding each migration. **That is
one step too late**, and D5 is why.

D5 dispenses with a validation mechanism on the grounds that a rune only ever
emits a type it has a row for. But it says plainly that "no mechanism" is not
"no risk": nothing checks a table against schema.org, because refrakt ships no
ontology. What replaces validation is *visibility* — "a wrong row is
reviewable".

If the review surface arrives with the last migration, then Groups A, B and C
were curated with no review surface at all. Thirty hand-written tables asserting
schema.org types on users' pages, reviewed by reading transforms — which is the
condition this milestone exists to end.

D2 is the proof it is not hypothetical. `organization` carries a curated
six-value enum, enforced by Markdoc, containing `NonProfit` — a type schema.org
does not have. The enum validates against itself, so nothing noticed. That is
first-party code that had been reviewed.

## Acceptance Criteria

- [ ] `refrakt inspect <rune>` shows the resolved schema row — type, property mapping, nested entities, child mappings — the way it already shows BEM classes and data attributes
- [ ] `--json` carries the same, so it is machine-readable
- [ ] `inspect --audit` reports a table naming a source the rune does not emit, alongside the CSS coverage it already audits
- [ ] The audit covers plugin runes, not just core (D7)
- [ ] `refrakt contracts` describes each rune's schema.org output, closing the gap between what `contracts` claims to cover and what it does
- [ ] `contracts --check` catches config-to-contract drift on the schema channel, as it does for structure
- [ ] `refrakt reference` documents a rune's structured data, and can order the resolved table by schema property regardless of authoring order — the review view need not match the authoring view
- [ ] `defineRune({ schemaOrgType })` is deleted or fed from the table, so the type is declared once
- [ ] Documentation says explicitly that these views are the review mechanism, and that no validation against schema.org exists (D5)

## Approach

**`inspect` matters most.** It is the per-rune tool an author actually reaches
for, and every claim in {% ref "SPEC-130" /%} was verified with it. Today it
shows RDFa only incidentally, as raw HTML in the rendered output.

**Delete `Rune.schemaOrgType` rather than leaving it.** It is assigned in
`packages/runes/src/rune.ts:59` and consumed by nothing — not `reference`, not
`contracts`, not the language server. It has already drifted: nine catalog
entries against thirty emitting runes, and `Accordion: 'FAQPage'` stopped being
unconditional when {% ref "WORK-552" /%} shipped. Leaving it in place means the
second stale declaration outlives the first, which is how this milestone's
problems started.

The audit is the piece with teeth. A table naming a `data-name` the rune does not
emit is the failure mode {% ref "WORK-561" /%} exists to prevent and that every
later migration can reintroduce — and unlike a wrong schema.org type, it is
mechanically checkable. Ship it here, so Groups A–C land against it.

## Blocked by

- {% ref "WORK-565" /%}

## Blocks

- {% ref "WORK-567" /%}
- {% ref "WORK-568" /%}
- {% ref "WORK-569" /%}

## References

- {% ref "SPEC-130" /%} — "What it unlocks", D2, D5, D7
- {% ref "WORK-552" /%} — why `Accordion: 'FAQPage'` is already stale
- `packages/runes/src/rune.ts:59` — the write-only `schemaOrgType`
- `packages/cli/src/commands/` — `inspect`, `contracts`, `reference`

{% /work %}
