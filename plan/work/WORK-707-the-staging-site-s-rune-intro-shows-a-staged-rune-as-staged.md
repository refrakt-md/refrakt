{% work id="WORK-707" status="in-progress" priority="low" complexity="moderate" source="SPEC-187,SPEC-181" tags="docs, staging, composition, reference, content, variables" milestone="v0.48.0" %}

# The staging site's rune intro shows a staged rune as staged

SPEC-187 D7: the committed intro data describes `main`, so staging.refrakt.md would call a staged
rune native. On `staging`, a rune `runes.prefer` resolves to `site/staged-runes/` shows a `Staged`
badge and that file as its source. A page cannot tell which site it is rendered for today, so this
adds a `$site` page variable first (D7, amended).

## Acceptance Criteria
- [ ] Normalizing `refrakt.config.json` tags each site with its key as `name`, for named sites and for a flat single-site config; an authored `name` that differs from the key is reported
- [ ] `buildPageContentVariables()` sets `$site.name` from the site config, so every adapter's pages get it with no adapter change; with no site config there is no `$site`
- [ ] The content-variables docs describe `$site`
- [ ] The intro data has one partition per site, keyed by site name; on `staging`, a rune resolved from `site/staged-runes/` is `staged`, with that file as its `source`
- [ ] On the `staging` site, a staged rune's intro shows a `Staged` badge in place of `Composition`, and its Source drawer shows `site/staged-runes/<rune>.md`
- [ ] On the `main` site, the same page is unchanged
- [ ] The SPEC-181 D3 test that `staging` matches `main` apart from `runes` still passes

## Blocked by
- {% ref "WORK-706" /%}

## References
- {% ref "SPEC-187" /%}: D7.
- {% ref "SPEC-181" /%}: D1, D3.

{% /work %}
