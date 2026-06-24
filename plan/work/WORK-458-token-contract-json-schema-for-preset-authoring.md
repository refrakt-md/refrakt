{% work id="WORK-458" status="done" priority="medium" complexity="moderate" source="SPEC-111" tags="presets,json-schema,tokens,editor" milestone="v0.25.0" %}

# Token-contract JSON Schema for preset authoring

{% ref "SPEC-111" /%} §6 — publish a JSON Schema derived from the universal token contract
({% ref "SPEC-048" /%}) so JSON presets get editor validation/autocomplete and a future
visual editor has a foundation.

## Acceptance Criteria
- [x] A JSON Schema is generated from the universal token contract and published at a stable path/URL
- [x] A JSON preset declaring `"$schema": "…"` validates against it, with editor autocomplete
- [x] The preset-pack scaffold seeds `$schema` in its example preset ({% ref "WORK-448" /%}/{% ref "WORK-456" /%})
- [x] The schema is regenerated/checked in CI so it tracks the token contract (no drift)

## Approach
Derive the schema from the typed token contract in `packages/types` (codegen from the TS
types, or a hand-maintained schema with a CI drift check). Keep it the single source editors
and the validator ({% ref "WORK-459" /%}) reference.

## Dependencies
- {% ref "WORK-456" /%} — the pack format

## References
- {% ref "SPEC-111" /%} §6; {% ref "SPEC-048" /%} (universal token contract)

## Resolution

Completed: 2026-06-24

Branch: `claude/v0.25.0-impl-2`

### What was done
- `packages/transform/theme-tokens.schema.json` — a JSON Schema for `ThemeTokensConfig` authored faithfully from the universal token contract (SPEC-048): top-level namespaces `font/text/weight/leading/tracking/color/radius/spacing/shadow/syntax/reveal` + `modes` (per-mode overlays) + `extra`, with structured `color` (scalar chrome + nested `surface`/`code`/sentiment groups). Strict at the root (`additionalProperties:false`) for typo-catching editor validation.
- Exported as `./theme-tokens.schema.json` + added to `files`; referenced by the preset scaffold's `$schema` (`https://refrakt.md/schemas/vX.Y/theme-tokens.json`, same publishing convention as `refrakt.config.schema.json`).
- `theme-tokens-schema.test.ts` (ajv) — validates the scaffold's syntax preset + a full palette preset (chrome/surface/sentiment/dark mode), rejects an unknown top-level key and a non-string scalar, and a **drift guard** asserts the schema's namespaces match the contract list. Added `ajv` devDep to transform.

### Notes
- The repo hand-maintains `refrakt.config.schema.json` (no codegen dep); this schema follows suit, with the drift-guard test as the "tracks the contract" mechanism.

{% /work %}
