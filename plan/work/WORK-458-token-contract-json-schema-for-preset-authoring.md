{% work id="WORK-458" status="ready" priority="medium" complexity="moderate" source="SPEC-111" tags="presets,json-schema,tokens,editor" milestone="v0.25.0" %}

# Token-contract JSON Schema for preset authoring

{% ref "SPEC-111" /%} §6 — publish a JSON Schema derived from the universal token contract
({% ref "SPEC-048" /%}) so JSON presets get editor validation/autocomplete and a future
visual editor has a foundation.

## Acceptance Criteria
- [ ] A JSON Schema is generated from the universal token contract and published at a stable path/URL
- [ ] A JSON preset declaring `"$schema": "…"` validates against it, with editor autocomplete
- [ ] The preset-pack scaffold seeds `$schema` in its example preset ({% ref "WORK-448" /%}/{% ref "WORK-456" /%})
- [ ] The schema is regenerated/checked in CI so it tracks the token contract (no drift)

## Approach
Derive the schema from the typed token contract in `packages/types` (codegen from the TS
types, or a hand-maintained schema with a CI drift check). Keep it the single source editors
and the validator ({% ref "WORK-459" /%}) reference.

## Dependencies
- {% ref "WORK-456" /%} — the pack format

## References
- {% ref "SPEC-111" /%} §6; {% ref "SPEC-048" /%} (universal token contract)

{% /work %}
