{% work id="WORK-164" status="draft" priority="medium" complexity="moderate" tags="cli, config, multi-site" source="ADR-010" milestone="v0.11.0" %}

# Add --site flag to site-scoped CLI commands

Site-scoped commands (`inspect`, `contracts`, `validate`, `scaffold-css`, `package validate`) need to know which site they are operating on when the project declares multiple. Add a `--site <name>` flag that selects an entry from the normalized `sites` map; for single-site projects the flag is optional and resolves to the lone entry.

## Acceptance Criteria

- [ ] `--site <name>` flag accepted on `refrakt inspect`, `refrakt contracts`, `refrakt validate`, `refrakt scaffold-css`, and `refrakt package validate`
- [ ] When the project declares exactly one site, the flag is optional and defaults to that site
- [ ] When multiple sites are declared and `--site` is omitted, the command errors with a list of available site names
- [ ] When `--site <name>` references an undeclared site, the command errors with the available names and a "did you mean?" suggestion
- [ ] When no sites are declared at all (planning-only repo), site-scoped commands error with a clear "no site configured" message and a hint about adding a `site` section to `refrakt.config.json`
- [ ] `--help` for each affected command documents the flag
- [ ] Tests cover: single-site default, multi-site with explicit flag, multi-site without flag (error), unknown site name (error with suggestion), planning-only repo (error)

## Approach

1. Add a `resolveSite(config, requested?: string)` helper in `packages/cli/src/lib/sites.ts` that returns `{ name, site }` or throws a structured error.

2. Each site-scoped command parses `--site` and calls `resolveSite()` before doing its work.

3. Reuse the Levenshtein helper from WORK-162 for "did you mean?" suggestions.

## Dependencies

- {% ref "WORK-159" /%} — needs the normalized `sites` field

## References

- {% ref "ADR-010" /%} — Unified root-level refrakt config (multi-site sections)
- `packages/cli/src/commands/inspect.ts`, `contracts.ts`, `validate.ts`, `scaffold-css.ts`, `package-validate.ts`

{% /work %}
