{% work id="WORK-446" status="done" priority="high" complexity="moderate" source="SPEC-110" tags="cli,install,multisite,config" milestone="v0.25.0" %}

# Multi-site --site targeting and config read/write helpers

Multi-site projects currently make `theme install` hard-error ("cannot pick a target
automatically"). {% ref "SPEC-110" /%} §3 replaces that with a `--site` selector and extends
the config read/write helpers. The flag's existence rules differ by apply-mode (select an
existing site vs. name a new one), so the helpers must support both.

## Acceptance Criteria
- [x] `--site <name>` selects the target site; inferred when exactly one site exists; when multiple exist and `--site` is absent, list the site names and exit cleanly (no dead end)
- [x] `readThemeFromConfig` / `writeThemeIntoConfig` accept an explicit site key and can **create** a new site entry, not only update an existing one
- [x] Adding a second site to a singular `site:` config rewrites it to plural `sites: { default, <new> }`
- [x] Helpers are shared so the theme / template / preset apply-modes reuse them
- [x] Tests cover single-site infer, multi-site select, missing-flag listing, and singular→plural rewrite

## Approach
Extend the helpers in `packages/cli/src/commands/theme.ts` / `config-file.ts` to take a site
key and to distinguish "update existing" from "create new" (the latter is what full-site
template install needs). Normalise singular↔plural config shapes in one place.

## References
- {% ref "SPEC-110" /%} §3
- `packages/cli/src/commands/theme.ts`, `packages/cli/src/config-file.ts`, `packages/types/src/theme.ts`

## Resolution

Completed: 2026-06-23

Branch: `claude/v0.25.0-impl`

### What was done
- `install.ts` site helpers: `listSiteKeys`, `resolveTargetSite(raw, --site, 'existing'|'new')`, `setSiteTheme(key)`, `appendSitePreset(key)`, `createSite(key)` (migrates singular `site:` → plural `sites:{default,<new>}`).
- `themeInstallCommand`/`themeInfoCommand` take `--site`; ambiguous multi-site lists keys and exits cleanly instead of the old hard error.
- `bin.ts` parses `--site`/`--registry` for the theme subcommand.
- Tests cover single-site infer, multi-site select, missing-flag listing, collision on new-site, and singular→plural rewrite.

### Notes
- Helpers live in the shared install module so template (new-site) and preset (append) apply-modes reuse them.

{% /work %}
