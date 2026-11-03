{% work id="WORK-707" status="ready" priority="low" complexity="simple" source="SPEC-187,SPEC-181" tags="docs, staging, composition, reference" milestone="v0.48.0" %}

# The staging site's rune intro shows a staged rune as staged

SPEC-187 D7: the committed intro data describes `main`, so staging.refrakt.md would call a staged
rune native. On `staging`, a rune `runes.prefer` resolves to `site/staged-runes/` shows a `Staged`
badge and that file as its source.

## Acceptance Criteria
- [ ] On the `staging` site, a staged rune's intro shows a `Staged` badge in place of `Composition`, and its Source drawer shows `site/staged-runes/<rune>.md`
- [ ] On the `main` site, the same page is unchanged
- [ ] The SPEC-181 D3 test that `staging` matches `main` apart from `runes` still passes
- [ ] The resolution records whether this is a per-site data file or a value computed at build time, and why

## Blocked by
- {% ref "WORK-706" /%}

## References
- {% ref "SPEC-187" /%}: D7.
- {% ref "SPEC-181" /%}: D1, D3.

{% /work %}
