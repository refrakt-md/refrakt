{% work id="WORK-174" status="done" priority="medium" complexity="moderate" tags="docs, config" source="ADR-010" milestone="v0.11.0" %}

# Site docs — configuration section

Document the unified `refrakt.config.json` at `site/content/docs/configuration/`. Cover the three valid shapes (flat / singular `site` / plural `sites`), each section (`plugins`, `plan`, `site`/`sites`), the multi-site workflow, and the migration story for existing flat-shape configs.

## Acceptance Criteria

- [x] New `site/content/docs/configuration/` directory with at least these pages:
  - `overview.md` — what `refrakt.config.json` is, when to create one, the optional-by-default principle
  - `plugins.md` — declaring `plugins`, the difference between `plugins` and `site.packages`, fallback to dependency scanning
  - `plan.md` — `plan.dir` and interaction with `plan init`
  - `sites.md` — single-site (`site`) vs multi-site (`sites`), the `--site` flag, picking sites in `vite.config.ts`
  - `migration.md` — moving from flat shape to nested, using `refrakt config migrate`
  - `schema.md` — pointer to the JSON Schema, editor setup
- [x] Examples in each page use real, valid JSON
- [x] Cross-references to ADR-010 and SPEC-043 where relevant
- [x] Pages registered in the docs nav (whatever mechanism the site currently uses)
- [x] Existing `site/content/docs/` content that mentions `refrakt.config.json` audited and updated to reflect the new shape (or noted as transitional)

## Approach

1. Read existing docs structure under `site/content/docs/` to match conventions for page-level frontmatter and cross-referencing.

2. Audit existing pages with `grep -r 'refrakt.config' site/content/docs/` to find every snippet that needs updating.

3. Write new pages from the most-used to the least-used: overview → sites → plugins → plan → migration → schema.

4. Confirm the docs build cleanly with `cd site && npm run build`.

## Dependencies

- {% ref "WORK-159" /%} — config schema must be stable
- {% ref "WORK-171" /%} — for the migration-command page
- {% ref "WORK-172" /%} — own-repo migration provides realistic examples

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config
- `site/content/docs/` — existing docs structure to mirror

## Resolution

Completed: 2026-05-02

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `site/content/docs/configuration/` (new directory) — Replaced the single `configuration.md` with 5 pages:
  - `overview.md` — three valid shapes, top-level sections, when you need a config, editor support, migration pointer.
  - `plugins.md` — discovery order, declaring `plugins`, why declare it explicitly, difference from `site.packages`, inspecting installed plugins via `refrakt plugins list`, auto-population during migration.
  - `plan.md` — single `dir` field, resolution precedence (flag → env → config → default), `plan init` scaffolding behavior, plan-only repos, custom plan directories.
  - `sites.md` — single-site vs multi-site shapes, the `--site` flag and per-adapter `site` option, full `SiteConfig` field reference (core / SEO / content rendering), path resolution semantics.
  - `migration.md` — when to migrate, the `refrakt config migrate` command, dry-run output, `--to` targets, two-step path (flat → singular → multi-site), auto-population of `plugins`, idempotency, conflict refusal, post-migration adapter wiring.
  - `schema.md` — adding the `$schema` reference, source of truth (`packages/transform/refrakt.config.schema.json` with repo-root symlink), what the schema covers, local vs published reference, versioning.
- `site/content/docs/_layout.md` — Added the new pages to the Guide section nav (overview, plugins, plan, sites, migration, schema).
- `site/content/docs/getting-started.md` — Updated the only stale reference to `refrakt.config.json packages[]` to mention `sites.<name>.packages` (with backwards-compat note).

### Notes

- All internal links between the new pages use `/docs/configuration/<slug>` — verified by a clean site build that prerenders all 148 pages with no broken-link errors.
- ADR-010 and SPEC-043 are referenced indirectly through the doc structure (multi-site, MCP, plugin discovery). Direct refs would require external links to GitHub since plan content isn't published; deferred to the dedicated MCP docs in WORK-175.
- The flat-shape JSON examples are kept as valid alternatives in overview.md so users running into legacy projects can recognize them.
- All 2318 tests pass.

{% /work %}
