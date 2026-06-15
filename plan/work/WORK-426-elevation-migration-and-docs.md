{% work id="WORK-426" status="done" priority="medium" complexity="moderate" source="SPEC-107" milestone="v0.23.0" tags="theme,surface,migration,docs,cli" %}

# Migration + docs for the surface axes

Land the breaking `elevation` rename safely and bring the site + docs onto the new vocabulary
({% ref "SPEC-107" /%} §5).

## Scope

- A `refrakt`-side codemod that rewrites authored `elevation="none|sm|md|lg"` in content to the
  new values (`none`→`flat`, `sm`/`md`→`raised`, `lg`→`floating`); run it across the site.
  **Scope it to the `elevation` attribute only** — `frame-shadow` carries the identical
  `none/sm/md/lg` values and must not be touched ({% ref "SPEC-107" /%} §1).
- Rewrite `surfaces.md` (the canonical surfaces reference) around the three axes — including
  the two-layer model (surface axes `elevation`/`prominence` vs the layout axis `width`) and
  the `elevation` ↔ `frame-shadow` boundary; migrate the `elevation=` usages in `figure.md`,
  `card.md`, `bento.md`; update `extend/theme-authoring/dimensions` (and any reference to the
  old named scale).
- Add a changeset documenting the breaking change + the alias deprecation window. Leave
  `releases.md` (historical) untouched.

## Acceptance Criteria

- [x] A codemod migrates `elevation` values in content; the site has no remaining `none|sm|md|lg` elevation usages. Authored `frame-shadow="none|sm|md|lg"` is left untouched.
- [x] `surfaces.md` documents `elevation` (ladder), `width` (bleed), and `prominence` (family) accurately; `figure`/`card`/`bento` examples use the new values.
- [x] A changeset records the breaking change and the deprecation window.

## Dependencies

- Requires {% ref "WORK-423" /%} (aliases to migrate from) and {% ref "WORK-425" /%} (final vocabulary in the theme).

## References

- {% ref "SPEC-107" /%} · `site/content/runes/surfaces.md` · `site/content/extend/theme-authoring/dimensions.md`.

## Resolution

Completed: 2026-06-15

Branch: `claude/v023-elevation-migration-demo`

### What was done
- **`refrakt migrate elevation` codemod** (new `packages/cli/src/commands/migrate.ts`, wired into `bin.ts`): rewrites authored `elevation="none|sm|md|lg"` → ladder (`none`→`flat`, `sm`/`md`→`raised`, `lg`→`floating`). Dry-run by default with a per-file diff; `--apply` to write; walks files/dirs recursively. Scoped to the `elevation` attribute only via `\belevation\s*=\s*"…"` — `frame-shadow` (same legacy values) is left untouched. Idempotent (ladder values pass through). 5 unit tests in `migrate-elevation.test.ts`.
- **Ran it across the site:** migrated `figure.md`, `card.md`, `marketing/bento.md` (and `surfaces.md`'s frame example). `releases.md` is historical and lives outside the runes tree, so it keeps its `elevation="md"` mention untouched (as required). No `none|sm|md|lg` elevation usages remain in authored runes content.
- **Rewrote `runes/surfaces.md`** around the three axes: `elevation` (depth ladder), `prominence` (section-header family), `width` (layout/bleed); the two-layer model (surface axes vs the layout axis) and the `elevation`↔`frame-shadow` boundary; a deprecation note pointing at the codemod.
- **Updated theme-authoring docs:** `dimensions.md`'s "Surface" section now describes the attribute-keyed elevation model (per-rune `defaultElevation`, `[data-elevation]` CSS) instead of the retired rune-name groups; `theme-authoring/surfaces.md`'s vocabulary table gains the ladder + a `prominence` row.
- **Changeset** `v023-surface-axes.md` records the breaking `elevation` rename + the alias deprecation window + the codemod.

### Notes
- Fixed two batch-1 schema-surface gaps that blocked authoring the axes (surfaced while verifying WORK-427): `elevation`'s schema `matches` was still the old `none|sm|md|lg` (now the ladder + deprecated aliases so old content still validates during the window), and `prominence` was missing from both `UNIVERSAL_ATTRIBUTE_NAMES` and the universal-attribute *forwarding* step in `createContentModelSchema` (so authored `prominence` was silently dropped before the engine). Added `prominence` to the gallery's `UNIVERSAL_AXES` exclusion so it isn't expanded into per-rune variant cells.
- `frame-shadow` deliberately keeps `none|sm|md|lg` (a different surface/property) — verified untouched by the codemod + a regression test.

{% /work %}
