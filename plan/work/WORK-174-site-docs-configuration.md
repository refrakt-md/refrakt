{% work id="WORK-174" status="draft" priority="medium" complexity="moderate" tags="docs, config" source="ADR-010" milestone="v0.11.0" %}

# Site docs — configuration section

Document the unified `refrakt.config.json` at `site/content/docs/configuration/`. Cover the three valid shapes (flat / singular `site` / plural `sites`), each section (`plugins`, `plan`, `site`/`sites`), the multi-site workflow, and the migration story for existing flat-shape configs.

## Acceptance Criteria

- [ ] New `site/content/docs/configuration/` directory with at least these pages:
  - `overview.md` — what `refrakt.config.json` is, when to create one, the optional-by-default principle
  - `plugins.md` — declaring `plugins`, the difference between `plugins` and `site.packages`, fallback to dependency scanning
  - `plan.md` — `plan.dir`, `plan.specsDir`, interaction with `plan init`
  - `sites.md` — single-site (`site`) vs multi-site (`sites`), the `--site` flag, picking sites in `vite.config.ts`
  - `migration.md` — moving from flat shape to nested, using `refrakt config migrate`
  - `schema.md` — pointer to the JSON Schema, editor setup
- [ ] Examples in each page use real, valid JSON
- [ ] Cross-references to ADR-010 and SPEC-043 where relevant
- [ ] Pages registered in the docs nav (whatever mechanism the site currently uses)
- [ ] Existing `site/content/docs/` content that mentions `refrakt.config.json` audited and updated to reflect the new shape (or noted as transitional)

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

{% /work %}
