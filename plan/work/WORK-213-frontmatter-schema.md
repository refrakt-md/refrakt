{% work id="WORK-213" status="done" priority="high" complexity="small" tags="frontmatter, schema, validation, tint" source="SPEC-052" milestone="v0.14.0" %}

# Frontmatter schema extension (tint, tint-mode, tint-lock)

Add the three cascade fields — `tint`, `tint-mode`, `tint-lock` — to the validated frontmatter shape for both `_layout.md` files and page frontmatter. Validates values, rejects invalid types/values with clear errors, distinguishes YAML `null` from missing per the cascade semantics.

## Acceptance Criteria

- [x] `tint?: string | null` accepted in layout and page frontmatter; named tints validated against the configured tint registry where possible (warn rather than fail if an unknown tint is referenced, since tints may be added/removed at runtime)
- [x] `tint-mode?: 'auto' | 'light' | 'dark'` accepted; invalid values produce a clear error (`"tint-mode must be one of: auto, light, dark"`)
- [x] `tint-lock?: boolean` accepted; non-boolean values rejected with a clear error
- [x] YAML `null` (`tint: ~` or `tint: null` in YAML) is preserved as JS `null` through parsing — distinguishable from missing
- [x] Missing fields don't appear in the parsed frontmatter object (or are explicitly `undefined`) — distinguishable from `null`
- [x] Validation errors include the source file path and line number when possible
- [x] Unit tests cover: each valid value, each invalid value type, null vs missing distinction, validation failure messages

## Approach

Schema extension in whichever module owns frontmatter parsing — likely `packages/content/` or `packages/types/`. Most projects use a runtime schema validator; check what refrakt already uses.

The `null` vs missing distinction is the most error-prone part. Most YAML parsers handle it correctly by default, but the JS layer often coerces both to `undefined`. Write a specific test that parses both `tint:` (empty) and `tint: ~` and confirms the parsed object distinguishes them.

The named-tint validation is *advisory*, not strict — a tint might be added in a plugin loaded after the page is parsed, or removed at runtime via config changes. Warn on unknown names; don't fail builds. The cascade resolution in {% ref "WORK-212" /%} will just pass the unknown name through; the engine in {% ref "WORK-214" /%} will set `data-tint="unknown-name"` which simply won't match any defined tint.

## Dependencies

None (or minimal — independent of SPEC-048 since frontmatter parsing already exists). Can start in parallel with the foundation work.

## References

- {% ref "SPEC-052" /%} — "Frontmatter Authoring Surface" section
- The frontmatter validation surface — locate during implementation; the field-naming convention is the same as the existing rune attributes

{% /work %}
