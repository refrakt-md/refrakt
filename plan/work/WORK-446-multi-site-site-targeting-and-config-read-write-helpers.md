{% work id="WORK-446" status="ready" priority="high" complexity="moderate" source="SPEC-110" tags="cli,install,multisite,config" milestone="v0.25.0" %}

# Multi-site --site targeting and config read/write helpers

Multi-site projects currently make `theme install` hard-error ("cannot pick a target
automatically"). {% ref "SPEC-110" /%} §3 replaces that with a `--site` selector and extends
the config read/write helpers. The flag's existence rules differ by apply-mode (select an
existing site vs. name a new one), so the helpers must support both.

## Acceptance Criteria
- [ ] `--site <name>` selects the target site; inferred when exactly one site exists; when multiple exist and `--site` is absent, list the site names and exit cleanly (no dead end)
- [ ] `readThemeFromConfig` / `writeThemeIntoConfig` accept an explicit site key and can **create** a new site entry, not only update an existing one
- [ ] Adding a second site to a singular `site:` config rewrites it to plural `sites: { default, <new> }`
- [ ] Helpers are shared so the theme / template / preset apply-modes reuse them
- [ ] Tests cover single-site infer, multi-site select, missing-flag listing, and singular→plural rewrite

## Approach
Extend the helpers in `packages/cli/src/commands/theme.ts` / `config-file.ts` to take a site
key and to distinguish "update existing" from "create new" (the latter is what full-site
template install needs). Normalise singular↔plural config shapes in one place.

## References
- {% ref "SPEC-110" /%} §3
- `packages/cli/src/commands/theme.ts`, `packages/cli/src/config-file.ts`, `packages/types/src/theme.ts`

{% /work %}
