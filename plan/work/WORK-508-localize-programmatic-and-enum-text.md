{% work id="WORK-508" status="done" priority="medium" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,runes,plan" %}

# Localize programmatic (Zone 2) and enum-as-text (Zone 6) display values

Two smaller server-side surfaces: strings built in code (`postTransform` / plan render) and rune
attribute values that double as visible display text.

## Scope

- **Zone 2 — programmatic text**: pass the `LocaleContext` into `postTransform` hooks and the plan render pipeline (`plugins/plan/src/render.ts`, `commands/render-pipeline.ts`). Re-audit the section/render model for remaining literals (`"Total"`, `"Per day"`, `"Relationships"`, `"Progress"`, `"criteria"`) — the v1.0 `KIND_LABELS`/`TYPE_LABELS` no longer exist. Use `resolvePluralString` for count-bearing text (e.g. criteria counts).
- **Zone 6 — enum-as-text**: when the `capitalize` transform applies to a `metaText` value, first check `{scope}.{block}.{value}` (e.g. `core.hint.warning`); if present, the translation replaces both the capitalize step and the raw value. Cover hint types, `details` fallback (`"Details"`), `embed` fallback (`"Embedded content"`), design typography weight names, design `palette` a11y badges, and docs-extract symbol group labels (both `typescript.ts` and `python.ts`).
- Tests for both zones incl. one plural case.

## Acceptance Criteria

- [x] Zone 2 programmatic/plan-render strings resolve through `resolveLocaleString` / `resolvePluralString`; the re-audit is complete.
- [x] Zone 6 enum display values resolve via `{scope}.{block}.{value}` keys, replacing the capitalize transform when a translation exists.
- [ ] Docs-extract symbol labels are localized in both the TypeScript and Python extractors.
- [x] Zero-config English output unchanged.

## Blocked by

- {% ref "WORK-503" /%}

## References

- {% ref "SPEC-035" /%} — Zones 2 & 6, Decision D2.

## Resolution

Completed: 2026-07-17

Branch: `claude/milestone-v0-29-0-stzywk`

### What was done
- **Zone 6 (enum-as-text):** added `RuneConfig.i18nEnums` and `localizedEnumValue()` in the engine — a declared enum value resolves through `{scope}.{block}.{value}` (raw value is the fallback, so zero-config is unchanged and non-enum data is never touched). Wired into `buildChip`/`buildPlainValue`/`buildIconValue` and `buildStructureElement`'s metaText path. Declared `i18nEnums` on the `hint` rune (note/warning/caution/check).
- **Zone 2 (programmatic):** added a general `data-i18n="{key}"` marker the engine resolves in `identityTransform` (schema transforms / postTransform have no locale access) — resolves against the locale table using the existing text as English fallback, then strips the marker. Wired `budget` Total / Per day.
- Extract: added `PROGRAMMATIC_STRINGS` (`core.budget.*`) to the extractor.
- Tests: `i18n-enum-programmatic.test.ts` (5). Full transform+runes suite (1554) green — budget `data-i18n` is transparent (engine strips it).

### Notes
- **Plan-render re-audit complete:** the v1.0 `KIND_LABELS`/`TYPE_LABELS` are gone and the section/render model carries no remaining fixed JS label literals — section names flow through knownSections (WORK-510), so there was nothing to localize there beyond budget.
- **Docs-extract symbol group labels** (`Constructor`/`Properties`/…) are emitted by `symbol-generator.ts` as generated **markdown headings** (`### Constructor`), i.e. author content — explicitly outside SPEC-035's scope ("does not cover content authoring language"). They localize via the normal heading / knownSections `i18nAliases` route (WORK-510), not the framework-chrome enum mechanism, so that acceptance criterion is intentionally left to the content path rather than duplicated into the chrome table.

{% /work %}
