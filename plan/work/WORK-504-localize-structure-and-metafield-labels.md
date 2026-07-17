{% work id="WORK-504" status="ready" priority="high" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,engine,runes" %}

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

- [ ] Labels from both `StructureEntry.label` and `MetaField.label` resolve through `resolveLocaleString` with auto-derived keys.
- [ ] Optional `i18nKey` override is honoured and documented.
- [ ] A configured non-English locale renders translated labels; unconfigured keys fall back to the English literal.
- [ ] Zero-config English output unchanged.

## Blocked by

- {% ref "WORK-503" /%}

## References

- {% ref "SPEC-035" /%} — Zone 1, Decision D1.

{% /work %}
