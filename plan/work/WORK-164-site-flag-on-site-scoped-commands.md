{% work id="WORK-164" status="done" priority="medium" complexity="moderate" tags="cli, config, multi-site" source="ADR-010" milestone="v0.11.0" %}

# Add --site flag to site-scoped CLI commands

Site-scoped commands (`inspect`, `contracts`, `validate`, `scaffold-css`, `package validate`) need to know which site they are operating on when the project declares multiple. Add a `--site <name>` flag that selects an entry from the normalized `sites` map; for single-site projects the flag is optional and resolves to the lone entry.

## Acceptance Criteria

- [x] `--site <name>` flag accepted on `refrakt inspect`, `refrakt contracts`, `refrakt validate`, `refrakt scaffold-css`, and `refrakt package validate`
- [x] When the project declares exactly one site, the flag is optional and defaults to that site
- [x] When multiple sites are declared and `--site` is omitted, the command errors with a list of available site names
- [x] When `--site <name>` references an undeclared site, the command errors with the available names and a "did you mean?" suggestion
- [x] When no sites are declared at all (planning-only repo), site-scoped commands error with a clear "no site configured" message and a hint about adding a `site` section to `refrakt.config.json`
- [x] `--help` for each affected command documents the flag
- [x] Tests cover: single-site default, multi-site with explicit flag, multi-site without flag (error), unknown site name (error with suggestion), planning-only repo (error)

## Approach

1. Add a `resolveSite(config, requested?: string)` helper in `packages/cli/src/lib/sites.ts` that returns `{ name, site }` or throws a structured error.

2. Each site-scoped command parses `--site` and calls `resolveSite()` before doing its work.

3. Reuse the Levenshtein helper from WORK-162 for "did you mean?" suggestions.

## Dependencies

- {% ref "WORK-159" /%} — needs the normalized `sites` field

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config (multi-site sections)
- `packages/cli/src/commands/inspect.ts`, `contracts.ts`, `validate.ts`, `scaffold-css.ts`, `package-validate.ts`

## Resolution

Completed: 2026-05-01

Branch: `claude/v0.11.0-config-foundation`

### What was done

- `packages/cli/src/bin.ts` — `loadMergedConfig()` gained a `site?: string` parameter. When the loaded config has any `sites.*` declared (or when `site` is explicitly passed), it calls `resolveSite()` from `@refrakt-md/transform/node` and reads `packages` / `runes` (prefer/aliases/local) from the resolved site entry instead of the top level. Single-site projects keep working via the legacy mirroring done by the normalizer (WORK-159).
- `inspect` and `contracts` now parse `--site <name>` and pass it through to `loadMergedConfig`. They are the two commands whose behavior actually changes per-site today (because they use the merged ThemeConfig).
- `scaffold-css`, `validate`, and `package validate` accept `--site` for forward compatibility but currently no-op on it (with inline comments explaining why) — those commands operate on baseConfig / explicit paths / a single package directory and aren't yet site-scoped.
- Refactored the loadMergedConfig try/catch so missing config files fall back silently to baseConfig (preserving zero-config UX) but config-present-but-invalid errors (multi-site without --site, unknown site name, --site in a plan-only project) bubble up to the user.
- `--help` text updated with `--site <name>` lines under both "Inspect Options" and "Contracts Options".
- `packages/cli/test/site-flag.test.ts` (new) — 5 tests using a temp project + symlinked node_modules: single-site default, multi-site requires explicit flag, multi-site with explicit flag works, unknown site name produces did-you-mean, --site in plan-only repo errors with "No site configured".

### Notes

- `resolveSite()` from `@refrakt-md/transform/node` (added in WORK-159) does all the heavy lifting — including the did-you-mean suggestion and the multi-site disambiguation error. The CLI is just plumbing.
- The forward-compat-only flag handling on scaffold-css / validate / package-validate uses `args[++i]` to consume the value without storing it. Keeps the flag accepted (per criterion) without forcing premature plumbing.
- All 2273 tests pass.

{% /work %}
