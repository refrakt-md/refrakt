{% work id="WORK-707" status="done" priority="low" complexity="moderate" source="SPEC-187,SPEC-181" tags="docs, staging, composition, reference, content, variables" milestone="v0.48.0" pr="refrakt-md/refrakt#772" %}

# The staging site's rune intro shows a staged rune as staged

SPEC-187 D7: the committed intro data describes `main`, so staging.refrakt.md would call a staged
rune native. On `staging`, a rune `runes.prefer` resolves to `site/staged-runes/` shows a `Staged`
badge and that file as its source. A page cannot tell which site it is rendered for today, so this
adds a `$site` page variable first (D7, amended).

## Acceptance Criteria
- [x] Normalizing `refrakt.config.json` tags each site with its key as `name`, for named sites and for a flat single-site config; an authored `name` that differs from the key is reported
- [x] `buildPageContentVariables()` sets `$site.name` from the site config, so every adapter's pages get it with no adapter change; with no site config there is no `$site`
- [x] The content-variables docs describe `$site`
- [x] The intro data has one partition per site, keyed by site name; on `staging`, a rune resolved from `site/staged-runes/` is `staged`, with that file as its `source`
- [x] On the `staging` site, a staged rune's intro shows a `Staged` badge in place of `Composition`, and its Source drawer shows `site/staged-runes/<rune>.md`
- [x] On the `main` site, the same page is unchanged
- [x] The SPEC-181 D3 test that `staging` matches `main` apart from `runes` still passes

## Blocked by
- {% ref "WORK-706" /%}

## References
- {% ref "SPEC-187" /%}: D7.
- {% ref "SPEC-181" /%}: D1, D3.

## Resolution

Completed: 2026-11-04

Branch: `claude/composition-usage-rune-pages-c87ar6`
PR: refrakt-md/refrakt#772

### What was done
- `packages/transform/src/config-normalize.ts`: each site is tagged with its key as `name` (named sites, singular and flat shapes alike); an authored `name` that differs from the key throws. `NamedSiteConfig` (exported from `@refrakt-md/transform/node`) types it, so the authored `SiteConfig` and the published schema are unchanged.
- `packages/content/src/site.ts`: `buildPageContentVariables` sets `$site.name` from the site config — the one place page variables are built, which every adapter reaches with `resolveSite().site`. No adapter changed. Tests: `config-normalize.test.ts`, `site-variable.test.ts`.
- `scripts/rune-intro.mjs` / `generate-rune-attributes.mjs`: `rune-intro.json` has one partition per site whose `contentDir` is main's (`main`, `staging`); staging's records are main's, with a rune the site resolves from its project rune dir marked `staged`, its `source` / `sourceUrl` the staged file. `compositionBadge` carries "composed and not staged".
- `site/content/_partials/rune-intro.md`: `root=$site.name`; `Staged` (caution) in place of `Composition`.
- Docs: `$site` on `docs/authoring/variables.md`; partials README; SPEC-187 D7 amended.

### Notes
- Per-site data rather than a value computed at build time: the record already decides everything the partial shows, and the staged state is a property of how a site resolves its runes, which the generator reads per site from `reference dump --site`.
- Built both sites: `steps` on staging shows `Staged` and its drawer the staged definition; on main it is unchanged (native source, no badge); hero shows `Composition` on both.
- A load with no site config has no `$site`; `data` then reports "references `$site.name`, which is not defined here" rather than falling back.

{% /work %}
