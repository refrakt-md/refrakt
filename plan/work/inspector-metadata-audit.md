{% work id="WORK-062" status="ready" priority="medium" complexity="simple" tags="cli, metadata" %}

# Inspector Metadata Audit

> Ref: SPEC-024 (Metadata System — Inspector Audit)

Depends on: WORK-060 (Annotate Rune Configs with Metadata Dimensions)

## Summary

Add a `--audit-meta` flag to `refrakt inspect` that verifies metadata configuration across all runes: which meta types are in use, which status/category fields have sentiment maps, and whether the theme provides CSS for all meta types and sentiments.

## Acceptance Criteria

- [ ] `refrakt inspect --audit-meta` shows meta types in use with rune counts
- [ ] Audit shows sentiment coverage — which fields with sentiment maps vs. which lack them
- [ ] Audit checks theme CSS for `[data-meta-type]`, `[data-meta-sentiment]`, and `[data-meta-rank]` selectors
- [ ] Missing theme rules are flagged as warnings
- [ ] Output is clear and actionable for theme developers
- [ ] `--json` flag works with `--audit-meta` for programmatic use

## Approach

Extend the existing inspector audit infrastructure. Walk all rune configs, collect structure entries with `metaType`, group by type/sentiment. Compare against CSS selectors found in the theme's stylesheets. Report gaps.

## References

- SPEC-024 (Metadata System — Inspector Audit)

{% /work %}
