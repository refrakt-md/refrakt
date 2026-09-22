---
'@refrakt-md/transform': minor
'@refrakt-md/types': minor
---

Fix `validateManifest` rejecting every theme the project produces.

ADR-024 made themes framework-agnostic — no `target`, and layouts declare
regions rather than pointing at framework components. `validateManifest` was
never updated, so it still demanded `target`, `designTokens` and
`layouts.*.component`, and therefore rejected **the manifest `create-refrakt`
scaffolds** and **the manifest Lumina ships**.

All three are now optional:

- `target` — `ThemeManifest.target` was already optional and deprecated, with a
  doc comment naming the ADR. The validator simply hadn't caught up.
- `designTokens` and `layouts.*.component` — required by the type but read by no
  runtime code. A field nothing reads is not a contract.

`name` and `version` remain required. Optional fields are still type-checked
when present, so a typo is caught without the field being mandatory, and a
framework theme that *does* declare `target` and layout components still
validates.

`ThemeManifest.designTokens` and `LayoutDefinition.component` are now optional
in the types to match.

The test fixture was a pre-ADR-024 Svelte theme, which is how the check drifted
while its suite stayed green. It is now the manifest `create-refrakt` actually
emits, with Lumina's own manifest added as a case.
