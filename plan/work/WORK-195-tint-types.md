{% work id="WORK-195" status="done" priority="high" complexity="simple" tags="tint, types, breaking-change" source="SPEC-053" milestone="v0.14.0" %}

# Update TintTokens / TintDefinition types

Replace `TintTokenSet` with `TintTokens`, rename five field names to match the token contract (`background → bg`, `primary → text`, `secondary → muted`, `accent → primary`, `surface` unchanged), and replace the three-valued `mode` field on `TintDefinition` with `lockMode?: 'light' | 'dark'`. Add `extends?: string` for tint variants. Pure type-surface work; downstream items wire up the merge logic, engine emit, and CSS bridge.

## Acceptance Criteria

- [x] `TintTokens` interface exported from `packages/transform/src/types.ts` with the six aligned field names (`bg`, `surface`, `text`, `muted`, `primary`, `border`)
- [x] `TintTokenSet` removed; downstream imports updated (renamed to `TintTokens` in the index export too)
- [x] `TintDefinition` updated: `mode` removed, `lockMode?: 'light' | 'dark'` added, `extends?: string` added
- [x] `SiteConfig.tints` in `packages/types/src/theme.ts` documents the `TintDefinition` shape via JSDoc; kept as `Record<string, Record<string, unknown>>` at the `@refrakt-md/types` level to avoid a cross-package type dependency (the actual `TintDefinition` lives in `@refrakt-md/transform`). Validated at config-load time downstream.
- [x] `RefraktConfig.tints` (the deprecated flat-shape field) removed entirely — per SPEC-053 decision. `config-normalize` no longer mirrors `tints` between flat and per-site shapes; only `sites.<name>.tints` / `site.tints` is accepted.
- [x] JSDoc on every renamed field clearly states the target `--rf-color-*` token
- [x] Build passes; full repo test suite (2429 tests + 10 new tint-extends tests) green

## Approach

Single type-rename PR. Mechanical change to `packages/transform/src/types.ts` and the corresponding import in `packages/types/src/theme.ts`.

Build will break immediately in `packages/lumina/src/config.ts` and any plugin that defines tints — that's expected and gets fixed in {% ref "WORK-198" /%}. Order matters: this type-only PR lands first, then the engine/CSS/config updates land together.

## Dependencies

None (or minimal — does not require SPEC-048 to be implemented). Independent of the rest of the SPEC-048 chain; can start in parallel.

## References

- {% ref "SPEC-053" /%} — full rationale for each rename and the `mode → lockMode` simplification
- `packages/transform/src/types.ts` — file being edited
- `packages/types/src/theme.ts` — file being edited

{% /work %}
