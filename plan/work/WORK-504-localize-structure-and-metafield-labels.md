{% work id="WORK-504" status="done" priority="high" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,engine,runes" pr="refrakt-md/refrakt#568" %}

# Localize structure & meta-field labels (Zone 1) with auto-derived keys

The highest-visibility surface: the ~68 labels emitted via `StructureEntry.label` and
`MetaField.label`. Resolve both through the locale table using **auto-derived** keys.

## Scope

- Derive the translation key from the config context: `{pluginScope}.{block}.{ref}` (Decision D1). Authors don't set keys manually.
- Add an optional explicit `i18nKey` override on a structure entry / meta field to pin a stable key across block renames.
- In `buildStructureElement()` and the MetaField renderers, resolve the label via `resolveLocaleString(ctx, derivedKey, entry.label)` — English literal remains the fallback.
- Apply to both label paths (legacy `StructureEntry.label` and the SPEC-080 `metaFields`/`blocks` `MetaField.label`) with one shared key-builder.
- Tests: derived key correctness for both paths, override wins, missing translation → English literal.

## Acceptance Criteria

- [x] Labels from both `StructureEntry.label` and `MetaField.label` resolve through `resolveLocaleString` with auto-derived keys.
- [x] Optional `i18nKey` override is honoured and documented.
- [x] A configured non-English locale renders translated labels; unconfigured keys fall back to the English literal.
- [x] Zero-config English output unchanged.

## Blocked by

- {% ref "WORK-503" /%}

## References

- {% ref "SPEC-035" /%} — Zone 1, Decision D1.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- Added `i18nKey?` override to `MetaField` and `StructureEntry`, and `scope?` to `RuneConfig` (`packages/transform/src/types.ts`).
- `assembleThemeConfig` stamps each plugin rune's `scope` from provenance (`pluginName`); core/local runes stay unstamped (engine defaults to `'core'`).
- Added `localizedLabel()` in the engine — resolves labels via the auto-derived key `{scope}.{block}.{ref}` (or `i18nKey` override), English fallback per key. Wired into `buildStructureElement` (metaText label), `renderDefListBlock` (`<dt>`), `buildChip`, `buildLinkValue`, `buildIconValue`.
- Tests: `i18n-labels.test.ts` (5) — derived-key translation, per-key fallback, override wins, scope default; assemble scope-stamping test.

### Notes
- Ref = the metaFields key / structure entry ref (verbatim), so extract round-trips. Zero-config English unchanged (606 transform tests pass).

{% /work %}
