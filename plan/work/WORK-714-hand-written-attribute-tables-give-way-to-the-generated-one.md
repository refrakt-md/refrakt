{% work id="WORK-714" status="ready" priority="medium" complexity="simple" source="SPEC-193" tags="docs, runes, attributes" milestone="v0.49.0" %}

# Hand-written attribute tables give way to the generated one

SPEC-193 D3. About 24 pages carry hand-written attribute tables or attribute-by-attribute prose
beside the generated table; one (card) already contradicts it, and plan/work and plan/spec end with
two orphaned rows.

## Acceptance Criteria
- [ ] The hand-written tables listed in SPEC-193 F2 are removed; a section about an attribute explains the task and shows it
- [ ] card's stale `elevation` values are gone with its table
- [ ] The orphaned rows on plan/work and plan/spec are removed
- [ ] bar and deflist get the generated attribute include; link's hand-written table is replaced by it
- [ ] `check-rune-docs` fails on a hand-written attribute table on a rune page

## Blocked by
- {% ref "WORK-712" /%}

## References
- {% ref "SPEC-193" /%}: D3, F2.

{% /work %}
