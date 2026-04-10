{% work id="WORK-051" status="in-progress" priority="high" complexity="complex" tags="editor, packages" milestone="v1.0.0" source="SPEC-001" %}

# Editor Package Awareness

> Ref: SPEC-001 (Community Runes — Product Boundaries, Editor Impact section of WORK-001)

## Summary

The editor (`packages/editor/`) only sees core runes. It doesn't load community or official packages from `refrakt.config.json`, so package runes don't appear in the palette, fail to parse in preview, and can't be edited. This gap existed before the official packages breakout but is now critical — official `@refrakt-md/*` runes like hero, character, and api are invisible to the editor.

The SvelteKit plugin (`packages/sveltekit/src/plugin.ts`) and CLI inspect command already load packages via `loadRunePackage()` + `mergePackages()`. The editor needs the same treatment.

## Acceptance Criteria

- [x] Editor loads packages from `refrakt.config.json` on startup using `loadRunePackage()` + `mergePackages()`
- [x] Package runes appear in the rune palette (`/api/runes` endpoint)
- [x] Package runes parse and render correctly in the preview panel
- [ ] Rune palette groups package runes by package name (using `RunePackage.displayName`)
- [ ] `CHILD_RUNES` set is derived from rune schemas rather than hardcoded
- [ ] `RUNE_CATEGORIES` map uses package `displayName` for package runes instead of hardcoded categories
- [ ] Package `RuneConfig` entries are included in the theme config sent to the client for preview rendering
- [ ] Package `postTransform` hooks survive the server→client serialisation boundary

## Approach

1. Pass `RefraktConfig` (or `config.packages`) through to `startEditor()` via `EditorOptions`
2. Call `loadRunePackage()` + `mergePackages()` in `packages/editor/src/server.ts` on startup
3. Feed merged tags into `Markdoc.transform()` in `packages/editor/src/preview.ts`
4. Feed merged rune metadata into the `/api/runes` response
5. Feed merged `RuneConfig` entries into the `themeConfig` sent to the client
6. Replace hardcoded `CHILD_RUNES` with schema-derived detection (runes with a parent tag are children)
7. Replace hardcoded `RUNE_CATEGORIES` with dynamic grouping: core runes keep functional categories, package runes use `RunePackage.displayName`

## References

- SPEC-001 (Community Runes — Product Boundaries)
- WORK-001 (Official Rune Packages — Editor impact section)

{% /work %}
