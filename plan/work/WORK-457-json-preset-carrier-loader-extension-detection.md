{% work id="WORK-457" status="done" priority="medium" complexity="simple" source="SPEC-111" tags="presets,loader,json" milestone="v0.25.0" %}

# JSON preset carrier: loader extension detection

{% ref "SPEC-111" /%} §6 — presets are pure data, so support a declarative `.json` carrier
(the default for new packs) alongside JS/TS modules in the preset loader.

## Acceptance Criteria
- [x] The preset loader (`packages/transform/src/preset-loader.ts`) detects a `.json` `module` by extension and reads it (`readFile` + `JSON.parse`) instead of `import()`-ing it
- [x] Both carriers yield the same `ThemeTokensConfig` and satisfy the loader's existing "resolved export is a plain object" guard
- [x] Lumina's `.ts` presets keep working unchanged
- [x] A JSON preset requires no build step — its `module` points at the `.json` directly
- [x] Tests cover JSON and JS/TS resolution plus a malformed-JSON error

## Approach
Add an extension check at the top of the loader's resolve path; everything downstream
(merge, scope filter) is unchanged.

## Dependencies
- {% ref "WORK-456" /%} — the pack format / `module` field

## References
- {% ref "SPEC-111" /%} §6; `packages/transform/src/preset-loader.ts`

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `packages/transform/src/preset-loader.ts` — `loadPreset` now branches on a `.json` resolved specifier: reads the file and `JSON.parse`s it (via `fileURLToPath` + `readFileSync`) instead of `import()`. Works for relative, absolute, and package-resolved `.json` paths. JS/TS modules keep the `default`/`config` import path unchanged. Both carriers hit the same plain-object guard.
- Fixtures `preset-syntax.json` (valid) + `preset-not-object.json`; 2 new tests in `preset-loader.test.ts` (9 total, passing).

### Notes
- No build step needed for a JSON preset — its `module` points straight at the `.json`. This is the carrier WORK-448 scaffolds by default and the basis for the editor story (WORK-458 JSON Schema).

{% /work %}
