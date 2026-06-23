{% work id="WORK-457" status="ready" priority="medium" complexity="simple" source="SPEC-111" tags="presets,loader,json" milestone="v0.25.0" %}

# JSON preset carrier: loader extension detection

{% ref "SPEC-111" /%} §6 — presets are pure data, so support a declarative `.json` carrier
(the default for new packs) alongside JS/TS modules in the preset loader.

## Acceptance Criteria
- [ ] The preset loader (`packages/transform/src/preset-loader.ts`) detects a `.json` `module` by extension and reads it (`readFile` + `JSON.parse`) instead of `import()`-ing it
- [ ] Both carriers yield the same `ThemeTokensConfig` and satisfy the loader's existing "resolved export is a plain object" guard
- [ ] Lumina's `.ts` presets keep working unchanged
- [ ] A JSON preset requires no build step — its `module` points at the `.json` directly
- [ ] Tests cover JSON and JS/TS resolution plus a malformed-JSON error

## Approach
Add an extension check at the top of the loader's resolve path; everything downstream
(merge, scope filter) is unchanged.

## Dependencies
- {% ref "WORK-456" /%} — the pack format / `module` field

## References
- {% ref "SPEC-111" /%} §6; `packages/transform/src/preset-loader.ts`

{% /work %}
