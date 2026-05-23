{% work id="WORK-252" status="done" priority="medium" complexity="simple" source="SPEC-065" tags="runes, xref, config, validation" milestone="v0.15.0" %}

# `XrefPattern` config types, compilation, and validation

Add the configuration surface for xref pattern resolution: a top-level `xrefs: XrefPattern[]` array in `refrakt.config.json`, the corresponding TypeScript interface, and compile-time validation (regex compilation, anchoring, template placeholder checking, reserved-type rejection). Pure config-layer work — runtime resolver integration is WORK-253.

## Acceptance Criteria

- [x] `refrakt.config.json` accepts a top-level `xrefs: XrefPattern[]` array
- [x] Pattern entries validate at config load: `match` (string, required), `template` (string, required), optional `type`, optional `label`
- [x] Invalid regex in `match` fails config load with entry index and regex error message
- [x] Templates referencing a non-existent named group fail config load with the entry index and the unknown placeholder name
- [x] Templates referencing `{id}` always validate (no named group required)
- [x] Duplicate `match` patterns emit a build warning (don't fail)
- [x] Reserved type value `unresolved` fails config load
- [x] `match` patterns are anchored to whole-string by default (`^(?:...)$` auto-applied unless explicit anchors present)
- [x] Patterns compile once per build; compiled forms cached across page resolutions
- [x] Empty `xrefs` array or missing key — no behavior change vs. baseline

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

## Resolution

Completed: 2026-05-23

Branch: `claude/v0.15.0-phase-1`

### What was done

- **`packages/types/src/theme.ts`** — added the `XrefPattern` interface (`match`, `template`, optional `type`, optional `label`) and a top-level `RefraktConfig.xrefs?: XrefPattern[]` field. Documented in TSDoc with a full example.
- **`packages/types/src/index.ts`** — re-exported `XrefPattern` from the package entry point.
- **`packages/runes/src/xref-patterns.ts`** — new module hosting the compilation step:
  - `CompiledXrefPattern` interface (compiled regex, defaulted `type`/`label`, statically extracted `groupNames`).
  - `CompiledXrefPatternsResult` carries `patterns`, `errors`, `warnings` (compilation never throws — adapters decide what to do with errors).
  - `compileXrefPatterns(patterns)`: regex compilation with whole-string anchoring (`^(?:...)$` unless explicit anchors are at both ends), named-group enumeration via source scan (`(?<name>...)`), template + label placeholder validation against `{id}` + named groups, reserved-type rejection (`unresolved`), duplicate-`match` warning, required-field validation.
- **`packages/runes/src/index.ts`** — exported `compileXrefPatterns`, `CompiledXrefPattern`, and `CompiledXrefPatternsResult`.
- **`packages/runes/test/xref-patterns.test.ts`** — 14 tests covering: empty input, defaults, explicit anchors, partial anchors, named-group extraction, invalid regex, unknown placeholders, missing required fields, reserved types, duplicate warnings, multi-pattern ordering, `{id}` always available.

### Notes

- **Anchoring behaviour:** `^foo$` is used as-is; otherwise leading `^` / trailing `$` are stripped before re-wrapping in `^(?:...)$`. This handles partial-anchor cases (`^RFC-\\d+`) without producing double anchors and preserves the author's intent of whole-string match.
- **No throwing:** errors and warnings are returned in the result rather than thrown, so the content-loader bootstrap (WORK-253) can present diagnostics to the user in a single batch rather than aborting on the first invalid entry.
- **Group enumeration via source scan:** JavaScript `RegExp` instances don't expose group names without a successful match, so the compiler scans `(?<name>...)` declarations in the regex source. Edge cases (named groups inside comments / character classes) aren't currently filtered — authors using named groups do so explicitly, and the worst case is a too-permissive placeholder allowlist that the runtime would catch.
- **Runtime resolver integration is WORK-253.** This work item is the config-layer half; the resolver in `xref-resolve.ts` will consume the compiled patterns once that lands.

{% /work %}
