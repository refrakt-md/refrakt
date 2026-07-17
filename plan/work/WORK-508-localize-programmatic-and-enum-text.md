{% work id="WORK-508" status="ready" priority="medium" complexity="moderate" source="SPEC-035" milestone="v0.29.0" tags="i18n,transform,runes,plan" %}

# Localize programmatic (Zone 2) and enum-as-text (Zone 6) display values

Two smaller server-side surfaces: strings built in code (`postTransform` / plan render) and rune
attribute values that double as visible display text.

## Scope

- **Zone 2 — programmatic text**: pass the `LocaleContext` into `postTransform` hooks and the plan render pipeline (`plugins/plan/src/render.ts`, `commands/render-pipeline.ts`). Re-audit the section/render model for remaining literals (`"Total"`, `"Per day"`, `"Relationships"`, `"Progress"`, `"criteria"`) — the v1.0 `KIND_LABELS`/`TYPE_LABELS` no longer exist. Use `resolvePluralString` for count-bearing text (e.g. criteria counts).
- **Zone 6 — enum-as-text**: when the `capitalize` transform applies to a `metaText` value, first check `{scope}.{block}.{value}` (e.g. `core.hint.warning`); if present, the translation replaces both the capitalize step and the raw value. Cover hint types, `details` fallback (`"Details"`), `embed` fallback (`"Embedded content"`), design typography weight names, design `palette` a11y badges, and docs-extract symbol group labels (both `typescript.ts` and `python.ts`).
- Tests for both zones incl. one plural case.

## Acceptance Criteria

- [ ] Zone 2 programmatic/plan-render strings resolve through `resolveLocaleString` / `resolvePluralString`; the re-audit is complete.
- [ ] Zone 6 enum display values resolve via `{scope}.{block}.{value}` keys, replacing the capitalize transform when a translation exists.
- [ ] Docs-extract symbol labels are localized in both the TypeScript and Python extractors.
- [ ] Zero-config English output unchanged.

## Blocked by

- {% ref "WORK-503" /%}

## References

- {% ref "SPEC-035" /%} — Zones 2 & 6, Decision D2.

{% /work %}
