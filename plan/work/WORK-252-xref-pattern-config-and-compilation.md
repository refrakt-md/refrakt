{% work id="WORK-252" status="ready" priority="medium" complexity="simple" source="SPEC-065" tags="runes, xref, config, validation" milestone="v0.15.0" %}

# `XrefPattern` config types, compilation, and validation

Add the configuration surface for xref pattern resolution: a top-level `xrefs: XrefPattern[]` array in `refrakt.config.json`, the corresponding TypeScript interface, and compile-time validation (regex compilation, anchoring, template placeholder checking, reserved-type rejection). Pure config-layer work — runtime resolver integration is WORK-253.

## Acceptance Criteria

- [ ] `refrakt.config.json` accepts a top-level `xrefs: XrefPattern[]` array
- [ ] Pattern entries validate at config load: `match` (string, required), `template` (string, required), optional `type`, optional `label`
- [ ] Invalid regex in `match` fails config load with entry index and regex error message
- [ ] Templates referencing a non-existent named group fail config load with the entry index and the unknown placeholder name
- [ ] Templates referencing `{id}` always validate (no named group required)
- [ ] Duplicate `match` patterns emit a build warning (don't fail)
- [ ] Reserved type value `unresolved` fails config load
- [ ] `match` patterns are anchored to whole-string by default (`^(?:...)$` auto-applied unless explicit anchors present)
- [ ] Patterns compile once per build; compiled forms cached across page resolutions
- [ ] Empty `xrefs` array or missing key — no behavior change vs. baseline

## Approach

Per the spec's Engine Changes section:

- `packages/types/src/config.ts` (or wherever the refrakt config interface lives): add `XrefPattern` interface; add `RefraktConfig.xrefs?: XrefPattern[]`
- Compilation step at config load: regex compile, auto-anchor if missing, parse template for `{name}` placeholders, validate each name is either `id` or a named group of the corresponding regex
- Compiled form stored in `processContentTreeOptions` (or equivalent) so the resolver in WORK-253 can consume it
- Validation errors throw at config load with entry index in the message

## Dependencies

- None within v0.15.0. Foundation work item.

## References

- {% ref "SPEC-065" /%} — xref-resolution spec (full)
- `packages/runes/src/xref-resolve.ts` — runtime resolver (extended in WORK-253)
- `packages/types/src/registry.ts` — `EntityRegistry` interface (existing first-pass resolution source)

{% /work %}
