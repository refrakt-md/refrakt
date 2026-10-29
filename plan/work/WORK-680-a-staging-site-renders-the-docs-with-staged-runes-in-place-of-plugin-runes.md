{% work id="WORK-680" status="ready" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, staging, site, config" milestone="v0.44.0" %}

# A staging site renders the docs with staged runes in place of plugin runes

A second site, `staging`, renders `site/content` with the project runes in `site/staged-runes/`
preferred over the plugin runes they replace ({% ref "SPEC-181" /%} D1). It uses only existing
configuration: `runes.dir` and `runes.prefer` (`__project__`).

## Acceptance Criteria

- [ ] `refrakt.config.json` declares a `staging` site with `main`'s `contentDir`, theme, tints, plugins, route rules and icons, plus `runes.dir: "site/staged-runes"`
- [ ] A test fails when `staging` differs from `main` in any field other than `runes` (SPEC-181 D3)
- [ ] `site/vite.config.ts` reads the site from `REFRAKT_SITE`, defaulting to `main`; `npm run dev:staging` serves the staging site on its own port and `npm run build:staging` builds it into its own output directory
- [ ] A test with a staged rune that shadows a plugin rune shows that the staged schema, generated config and aliases replace the plugin's, and that the plugin's hand-written theme entry for it is not applied
- [ ] `main`'s build output, `contracts --check` and `seo:baseline:check` are unchanged with runes staged
- [ ] Every other site-scoped command that defaults to a single site (`refrakt validate`, `inspect`, `contracts`) still resolves `main` here, or is pointed at it explicitly where it would now be ambiguous

## Approach

- `resolveSite` errors when several sites are declared and none is requested. Check each
  script and CI job that relied on the default before `staging` was added; `plan` was
  already a second site, so most should already name `main`.
- Dev rebuild on a rune edit is SPEC-153 D10. If editing `site/staged-runes/*.md` does not
  refresh the dev server, note it, and either fix it here if it is small or file a bug.

## Blocks

- {% ref "WORK-681" /%}

## References

- {% ref "SPEC-181" /%}: D1, D3.
- {% ref "SPEC-153" /%}: D4, D8, D10.

{% /work %}
